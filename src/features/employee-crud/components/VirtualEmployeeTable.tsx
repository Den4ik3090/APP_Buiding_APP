import React, { useCallback, memo, useState, useMemo } from "react";
import WorkerTrainingDownloadButton from "@/features/employee-crud/components/WorkerTrainingDownloadButton";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { List, RowComponentProps } from "react-window";
import type { Employee } from "@/entities/employee";
import { DAYS_THRESHOLD, hasExpiredAdditional } from "@/entities/employee";
import type { NotificationType } from "@/shared/constants/toast";

const ROW_HEIGHT = 64;

interface VirtualEmployeeTableProps {
  employees: Employee[];
  getDaysDifference: (date: string) => number;
  emptyText?: string;
  onRetrain: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (emp: Employee) => void;
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
}

function VirtualEmployeeTable({
  employees,
  getDaysDifference,
  emptyText,
  onRetrain,
  onDelete,
  onEdit,
  addNotification,
}: VirtualEmployeeTableProps) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('all');

  const responsibles = useMemo(
    () => ['all', ...Array.from(new Set(employees.map((e) => e.responsible).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (responsibleFilter !== 'all') {
      result = result.filter((e) => e.responsible === responsibleFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      result = result.filter((e) => new Date(e.trainingDate).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      result = result.filter((e) => new Date(e.trainingDate).getTime() <= to);
    }
    return result;
  }, [employees, responsibleFilter, dateFrom, dateTo]);

  const RowComponent = useCallback(
    ({ index, style, ariaAttributes }: RowComponentProps) => {
      const emp = filteredEmployees[index];

      const trainingDate = emp?.trainingDate || "";
      const days = trainingDate ? getDaysDifference(trainingDate) : 0;
      const isExpired = trainingDate ? days >= DAYS_THRESHOLD : false;
      const additionalExpired = hasExpiredAdditional(emp?.additionalTrainings);

      return (
        <div style={style} {...ariaAttributes}>
          <div
            className={`virtual-row ${isExpired ? "expired" : "valid"}${
              additionalExpired ? " additional-expired" : ""
            }`}
          >
            <div className="virtual-cell name">{emp?.name || "—"}</div>
            <div className="virtual-cell org">{emp?.organization || "—"}</div>
            <div className="virtual-cell prof">{emp?.profession || "—"}</div>
            <div className="virtual-cell date">{trainingDate || "—"}</div>

            <div className="virtual-cell actions">
              <WorkerTrainingDownloadButton
                workerId={emp?.id}
                workerName={emp?.name}
                addNotification={addNotification}
              />
              <button
                className="btn-retrain"
                onClick={() => onRetrain(emp.id)}
                type="button"
              >
                Переподготовка
              </button>

              <button
                className="btn-edit"
                onClick={() => onEdit(emp)}
                type="button"
                aria-label="Редактировать сотрудника"
                title="Редактировать"
              >
                ✏️
              </button>

              <button
                className="btn-delete"
                onClick={() => onDelete(emp.id)}
                type="button"
                aria-label="Удалить сотрудника"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      );
    },
    [filteredEmployees, getDaysDifference, onDelete, onEdit, onRetrain, addNotification]
  );

  if (!employees || employees.length === 0) {
    return <div className="empty-state">{emptyText || "Нет данных"}</div>;
  }

  return (
    <div className="virtual-table" style={{ height: "60vh" }}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Период инструктажа
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            title="Начало периода"
          />
          <span className="text-xs text-zinc-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            title="Конец периода"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Сбросить даты
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Ответственный
          </span>
          <select
            value={responsibleFilter}
            onChange={(e) => setResponsibleFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">Все</option>
            {responsibles
              .filter((r) => r !== 'all')
              .map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
          </select>
        </div>
        {filteredEmployees.length !== employees.length && (
          <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
            Показано: {filteredEmployees.length} / {employees.length}
          </span>
        )}
      </div>

      <div className="virtual-header">
        <div className="virtual-th name">ФИО</div>
        <div className="virtual-th org">Организация</div>
        <div className="virtual-th prof">Профессия</div>
        <div className="virtual-th date">Дата инструктажа</div>
        <div className="virtual-th actions">Действия</div>
      </div>

      <div className="virtual-body">
        <AutoSizer
          renderProp={({ height, width }) => (
            <List
              defaultHeight={height ?? 0}
              rowCount={filteredEmployees.length}
              rowHeight={ROW_HEIGHT}
              rowComponent={RowComponent}
              rowProps={{}}
              overscanCount={6}
              style={{ width: width ?? "100%" }}
            />
          )}
        />
      </div>
    </div>
  );
}

export default memo(VirtualEmployeeTable);
