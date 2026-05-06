import React, { useState, useMemo, useEffect } from 'react';
import StatusBadge from '@/shared/ui/StatusBadge';
import { DAYS_THRESHOLD, WARNING_THRESHOLD, hasExpiredAdditional } from '@/entities/employee';
import type { Employee } from '@/entities/employee';
import type { NotificationType } from '@/shared/constants/toast';
import { sendToTelegram } from '@/shared/api/telegram';
import WorkerTrainingDownloadButton from './WorkerTrainingDownloadButton';
import OrganizationTelegramReport from './OrganizationTelegramReport';

interface PreparedEmployee extends Employee {
  days: number;
  expired: boolean;
  warning: boolean;
  nextDate: Date;
  additionalExpired: boolean;
}

interface EmployeeTableProps {
  employees: Employee[];
  getDaysDifference: (date: string) => number;
  emptyText?: string;
  onRetrain: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (employee: Employee) => void;
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  statusFilterValue?: string;
  onStatusFilterChange?: (value: string) => void;
}

type SortKey = 'days' | 'trainingDate' | 'name' | 'profession';
type SortDirection = 'asc' | 'desc';

const ROW_CLASSES: Record<'expired' | 'warning' | 'valid', string> = {
  expired: 'bg-red-50 dark:bg-red-950/20',
  warning: 'bg-amber-50 dark:bg-amber-950/20',
  valid:   'bg-white dark:bg-zinc-900',
};

function EmployeeTable({
  employees,
  getDaysDifference,
  emptyText = 'Сотрудников пока нет',
  onRetrain,
  onDelete,
  onEdit,
  addNotification,
  statusFilterValue,
  onStatusFilterChange,
}: EmployeeTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'days',
    direction: 'desc',
  });
  const [statusFilter, setStatusFilter] = useState(statusFilterValue ?? 'all');
  const [professionFilter, setProfessionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showOrgReport, setShowOrgReport] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(id);
  }, [searchQuery]);

  useEffect(() => {
    if (typeof statusFilterValue === 'string') setStatusFilter(statusFilterValue);
  }, [statusFilterValue]);

  const getStatusInfo = (trainingDate: string) => {
    const days = getDaysDifference(trainingDate);
    const expired = days >= DAYS_THRESHOLD;
    const warning = days >= WARNING_THRESHOLD && days < DAYS_THRESHOLD;
    const nextDate = new Date(trainingDate);
    nextDate.setDate(nextDate.getDate() + DAYS_THRESHOLD);
    return { days, expired, warning, nextDate };
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const isToday = (iso?: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const preparedEmployees = useMemo<PreparedEmployee[]>(
    () =>
      employees.map((emp) => {
        const { days, expired, warning, nextDate } = getStatusInfo(emp.trainingDate);
        const additionalExpired = hasExpiredAdditional(emp.additionalTrainings);
        return { ...emp, days, expired, warning, nextDate, additionalExpired };
      }),
    [employees],
  );

  const handleSendGeneralReport = async () => {
    try {
      const expired = preparedEmployees.filter((e) => e.days > DAYS_THRESHOLD).length;
      const warning = preparedEmployees.filter(
        (e) => e.days <= DAYS_THRESHOLD && e.days > WARNING_THRESHOLD,
      ).length;
      const valid = preparedEmployees.length - expired - warning;
      const newToday = preparedEmployees
        .filter((e) => isToday(e.createdAt))
        .map((e) => `• ${e.name} — ${e.organization ?? '—'}`)
        .slice(0, 30);

      const report = `
📊 ОБЩИЙ ОТЧЕТ ПО ИНСТРУКТАЖАМ
━━━━━━━━━━━━━━━━━━━━
🔴 Просрочено: ${expired}
🟡 Предупреждение: ${warning}
🟢 Норма: ${valid}
📈 Всего: ${preparedEmployees.length}

👥 Новые сотрудники сегодня:
${newToday.length ? newToday.join('\n') : '— нет'}

📅 Дата: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}
      `.trim();

      await sendToTelegram(report);
      alert('✅ Общий отчёт отправлен в Telegram!');
    } catch {
      alert('❌ Ошибка отправки');
    }
  };

  const sortedAndFilteredEmployees = useMemo(() => {
    let result = [...preparedEmployees];

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => {
        if (statusFilter === 'expired') return e.expired;
        if (statusFilter === 'warning') return e.warning;
        if (statusFilter === 'valid') return !e.expired && !e.warning;
        return true;
      });
    }

    if (professionFilter !== 'all') {
      result = result.filter((e) => e.profession === professionFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;
        if (sortConfig.key === 'days') {
          aVal = a.days; bVal = b.days;
        } else if (sortConfig.key === 'trainingDate') {
          aVal = new Date(a.trainingDate).getTime();
          bVal = new Date(b.trainingDate).getTime();
        } else {
          aVal = String(a[sortConfig.key] ?? '').toLowerCase();
          bVal = String(b[sortConfig.key] ?? '').toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [preparedEmployees, debouncedSearch, statusFilter, professionFilter, sortConfig]);

  const professions = useMemo(
    () => ['all', ...new Set(employees.map((e) => e.profession).filter(Boolean))],
    [employees],
  );

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  if (employees.length === 0) {
    return (
      <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
          {emptyText}
        </div>
      </div>
    );
  }

  const thBase =
    'border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
  const thSortable = `${thBase} cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200`;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      {showOrgReport && (
        <OrganizationTelegramReport
          employees={preparedEmployees}
          getDaysDifference={getDaysDifference}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            Список сотрудников
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowOrgReport((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                showOrgReport
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  : 'bg-slate-500 hover:bg-slate-600'
              }`}
            >
              {showOrgReport ? '📊 Скрыть отчет' : '📊 Отчет по организации'}
            </button>
            <button
              type="button"
              onClick={handleSendGeneralReport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
            >
              📈 Общий отчет
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Поиск по ФИО…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              onStatusFilterChange?.(e.target.value);
            }}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">Все статусы</option>
            <option value="valid">Норма</option>
            <option value="warning">Скоро просрочка</option>
            <option value="expired">Просрочено</option>
          </select>
          <select
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">Все должности</option>
            {professions
              .filter((p) => p !== 'all')
              .map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${thBase} w-[60px]`}>№</th>
              <th className={`${thBase} w-[70px]`}>Фото</th>
              <th className={`${thSortable} min-w-[220px]`} onClick={() => handleSort('name')}>
                ФИО {getSortIcon('name')}
              </th>
              <th className={`${thSortable} min-w-[200px]`} onClick={() => handleSort('profession')}>
                Должность {getSortIcon('profession')}
              </th>
              <th className={`${thSortable} w-[140px]`} onClick={() => handleSort('trainingDate')}>
                Инструктаж {getSortIcon('trainingDate')}
              </th>
              <th className={`${thBase} w-[140px]`}>Следующий</th>
              <th className={`${thSortable} w-[110px]`} onClick={() => handleSort('days')}>
                Дней {getSortIcon('days')}
              </th>
              <th className={`${thBase} w-[140px]`}>Статус</th>
              <th className={`${thBase} w-[260px]`}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredEmployees.map((employee, index) => {
              const rowTone = employee.expired ? 'expired' : employee.warning ? 'warning' : 'valid';
              return (
                <tr
                  key={employee.id}
                  className={`border-b border-zinc-100 transition-colors last:border-0 dark:border-zinc-800 ${ROW_CLASSES[rowTone]} ${employee.additionalExpired ? 'ring-1 ring-inset ring-orange-300 dark:ring-orange-700' : ''}`}
                >
                  <td className="px-3 py-2.5 text-xs text-zinc-500">{index + 1}</td>

                  <td className="px-3 py-2.5">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
                      {employee.photo_url ? (
                        <img
                          src={employee.photo_url}
                          alt={employee.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base">👤</span>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-2.5 font-medium text-zinc-800 dark:text-zinc-100">
                    {employee.name}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-300">
                    {employee.profession}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-300">
                    {new Date(employee.trainingDate).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-600 dark:text-zinc-300">
                    {employee.nextDate.toLocaleDateString('ru-RU')}
                  </td>

                  <td className="px-3 py-2.5">
                    <span
                      className={`text-sm font-semibold ${
                        employee.expired
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {employee.days}
                    </span>
                  </td>

                  <td className="px-3 py-2.5">
                    <StatusBadge tone={rowTone} days={employee.days} />
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <WorkerTrainingDownloadButton
                        workerId={employee.id}
                        workerName={employee.name}
                        addNotification={addNotification}
                      />
                      <button
                        type="button"
                        onClick={() => onRetrain(employee.id)}
                        className="rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                      >
                        Обновить
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(employee)}
                        className="rounded-md px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(employee.id)}
                        className="rounded-md px-2 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40" />
          Инструктаж в норме
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" />
          Скоро просрочка
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40" />
          Инструктаж просрочен
        </span>
      </div>
    </div>
  );
}

export default EmployeeTable;
