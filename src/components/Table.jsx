import React, { useState, useMemo, useEffect } from 'react';
import StatusBadge from './StatusBadge';
import { DAYS_THRESHOLD, WARNING_THRESHOLD } from '../utils/constants';
import { sendToTelegram } from '../utils/sendToTelegram';

function EmployeeTable({
  employees,
  onClear,
  onExport,
  getDaysDifference,
  emptyText,
  onRetrain,
  onDelete,
  onEdit
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'days', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [professionFilter, setProfessionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Дебаунс поиска по ФИО — чтобы не пересчитывать всё на каждую клавишу
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400); // можно 300–500 мс

    return () => clearTimeout(id);
  }, [searchQuery]);

  const getStatusInfo = (trainingDate) => {
    const days = getDaysDifference(trainingDate);
    const expired = days >= DAYS_THRESHOLD;
    const warning = days >= WARNING_THRESHOLD && days < DAYS_THRESHOLD;

    const nextDate = new Date(trainingDate);
    nextDate.setDate(nextDate.getDate() + DAYS_THRESHOLD);

    return { days, expired, warning, nextDate };
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Вспомогательная функция для отчёта
  const isToday = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Предрасчёт days / expired / warning / nextDate, чтобы не считать много раз
  const preparedEmployees = useMemo(() => {
    return employees.map((emp) => {
      const { days, expired, warning, nextDate } = getStatusInfo(emp.trainingDate);
      return { ...emp, days, expired, warning, nextDate };
    });
  }, [employees]);

  // ✅ ОТПРАВКА ОТЧЁТА В TELEGRAM (используем уже подготовленные данные)
  const handleSendReport = async () => {
    try {
      const expired = preparedEmployees.filter((emp) => emp.days > DAYS_THRESHOLD).length;
      const warning = preparedEmployees.filter(
        (emp) => emp.days <= DAYS_THRESHOLD && emp.days > WARNING_THRESHOLD
      ).length;
      const valid = preparedEmployees.length - expired - warning;

      const newToday = preparedEmployees
        .filter((e) => isToday(e.createdAt))
        .map((e) => `• ${e.name} — ${e.organization || '—'}`)
        .slice(0, 30);

      const report = `
Отчёт по инструктажам:
🔴 Просрочено: ${expired}
🟡 Предупреждение: ${warning}
🟢 Норма: ${valid}
📈 Всего: ${preparedEmployees.length}

Новые сотрудники сегодня:
${newToday.length ? newToday.join('\n') : '— нет'}
      `.trim();

      await sendToTelegram(report);
      alert('✅ Отчёт отправлен в Telegram!');
    } catch (error) {
      alert('❌ Ошибка отправки');
      console.error(error);
    }
  };

  const sortedAndFilteredEmployees = useMemo(() => {
    let result = [...preparedEmployees];

    // Поиск по ФИО — на основе debouncedSearch
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((emp) => emp.name.toLowerCase().includes(q));
    }

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      result = result.filter((emp) => {
        if (statusFilter === 'expired') return emp.expired;
        if (statusFilter === 'warning') return emp.warning;
        if (statusFilter === 'valid') return !emp.expired && !emp.warning;
        return true;
      });
    }

    // Фильтр по должности
    if (professionFilter !== 'all') {
      result = result.filter((emp) => emp.profession === professionFilter);
    }

    // Сортировка
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue;
        let bValue;

        if (sortConfig.key === 'days') {
          aValue = a.days;
          bValue = b.days;
        } else if (sortConfig.key === 'trainingDate') {
          // можно использовать trainingDate или nextDate — оставим trainingDate
          aValue = new Date(a.trainingDate).getTime();
          bValue = new Date(b.trainingDate).getTime();
        } else {
          aValue = (a[sortConfig.key] || '').toString().toLowerCase();
          bValue = (b[sortConfig.key] || '').toString().toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [preparedEmployees, debouncedSearch, statusFilter, professionFilter, sortConfig]);

  const professions = useMemo(() => {
    return ['all', ...new Set(employees.map((emp) => emp.profession).filter(Boolean))];
  }, [employees]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-header">
        <div className="table-header__title">
          <h3>📊 Реестр сотрудников ({sortedAndFilteredEmployees.length})</h3>

          <button className="btn-telegram" onClick={handleSendReport}>
            📱 Telegram
          </button>
        </div>

        <div className="filters-panel">
          <input
            type="text"
            placeholder="🔍 Поиск по ФИО..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />

          <select
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
          >
            <option value="all">Все должности</option>
            {professions
              .filter((p) => p !== 'all')
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="valid">✅ Актуален</option>
            <option value="warning">🟡 Скоро истекает</option>
            <option value="expired">🔴 Просрочен</option>
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Фото</th>
              <th onClick={() => handleSort('name')} className="sortable">
                ФИО {getSortIcon('name')}
              </th>
              <th onClick={() => handleSort('profession')} className="sortable">
                Должность {getSortIcon('profession')}
              </th>
              <th onClick={() => handleSort('trainingDate')} className="sortable">
                Инструктаж {getSortIcon('trainingDate')}
              </th>
              <th>Следующий</th>
              <th onClick={() => handleSort('days')} className="sortable">
                Дней {getSortIcon('days')}
              </th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredEmployees.map((employee, index) => {
              const rowClass = employee.expired
                ? 'row-expired'
                : employee.warning
                ? 'row-warning'
                : 'row-valid';

              return (
                <tr
                  key={employee.id}
                  className={rowClass}
                  onDoubleClick={() => onEdit(employee)}
                >
                  <td>{index + 1}</td>

                  <td>
                    <div className="table-photo-circle">
                      {employee.photo_url ? (
                        <img src={employee.photo_url} alt="" />
                      ) : (
                        <span className="photo-placeholder-mini">👤</span>
                      )}
                    </div>
                  </td>

                  <td className="font-bold">{employee.name}</td>
                  <td>{employee.profession}</td>
                  <td>
                    {new Date(employee.trainingDate).toLocaleDateString('ru-RU')}
                  </td>
                  <td>{employee.nextDate.toLocaleDateString('ru-RU')}</td>
                  <td
                    className={`days-cell ${
                      employee.expired ? 'text-red' : employee.warning ? 'text-orange' : ''
                    }`}
                  >
                    {employee.days}
                  </td>
                  <td>
                    <StatusBadge
                      expired={employee.expired}
                      warning={employee.warning}
                      days={employee.days}
                    />
                  </td>
                  <td>
                    <div
                      className="table__action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onEdit(employee)}
                        className="btn-icon"
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => onRetrain(employee.id)}
                        className="btn-retrain"
                        title="Обновить дату на сегодня"
                      >
                        ОБНОВИТЬ
                      </button>
                      <button
                        onClick={() => onDelete(employee.id)}
                        className="btn-icon btn-del"
                        title="Удалить"
                      >
                        ❌
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeTable;
