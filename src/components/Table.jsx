import React, { useState, useMemo } from 'react';
import StatusBadge from './StatusBadge';
import { DAYS_THRESHOLD, WARNING_THRESHOLD } from '../utils/constants';
import { sendToTelegram } from '../utils/sendToTelegram';

function EmployeeTable({ employees, onClear, onExport, getDaysDifference, emptyText, onRetrain, onDelete, onEdit }) {
  const [sortConfig, setSortConfig] = useState({ key: 'days', direction: 'desc' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [professionFilter, setProfessionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // ✅ НОВАЯ ФУНКЦИЯ ОТПРАВКИ ОТЧЁТА
  const handleSendReport = async () => {
    try {
      const expired = employees.filter(emp => {
        const days = getDaysDifference(emp.trainingDate);
        return days > DAYS_THRESHOLD;
      }).length;

      const warning = employees.filter(emp => {
        const days = getDaysDifference(emp.trainingDate);
        return days <= DAYS_THRESHOLD && days > WARNING_THRESHOLD;
      }).length;
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

const newToday = employees
  .filter((e) => isToday(e.createdAt))
  .map((e) => `• ${e.name} — ${e.organization || "—"}`)
  .slice(0, 30); // чтобы не было слишком длинно
      const valid = employees.length - expired - warning;

  const report = `
Отчёт по инструктажам:
🔴 Просрочено: ${expired}
🟡 Предупреждение: ${warning}
🟢 Норма: ${valid}
📈 Всего: ${employees.length}

Новые сотрудники сегодня:
${newToday.length ? newToday.join("\n") : "— нет"}
`.trim();

      await sendToTelegram(report);
      alert('✅ Отчёт отправлен в Telegram!');
    } catch (error) {
      alert('❌ Ошибка отправки');
      console.error(error);
    }
  };

  const sortedAndFilteredEmployees = useMemo(() => {
    let result = [...employees];

    if (searchQuery.trim()) {
      result = result.filter(emp => 
        emp.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(emp => {
        const { expired, warning } = getStatusInfo(emp.trainingDate);
        if (statusFilter === 'expired') return expired;
        if (statusFilter === 'warning') return warning;
        if (statusFilter === 'valid') return !expired && !warning;
        return true;
      });
    }

    if (professionFilter !== 'all') {
      result = result.filter(emp => emp.profession === professionFilter);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'days') {
          aValue = getDaysDifference(a.trainingDate);
          bValue = getDaysDifference(b.trainingDate);
        } else if (sortConfig.key === 'trainingDate') {
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
  }, [employees, searchQuery, statusFilter, professionFilter, sortConfig]);

  const professions = useMemo(() => {
    return ['all', ...new Set(employees.map(emp => emp.profession).filter(Boolean))];
  }, [employees]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
  };

  if (employees.length === 0) {
    return <div className="empty-state"><p>{emptyText}</p></div>;
  }

  return (
    <div className="table-container">
      <div className="table-header">
        <div className="table-header__title">
          <h3>📊 Реестр сотрудников ({sortedAndFilteredEmployees.length})</h3>
          
          {/* ✅ КНОПКА TELEGRAM */}
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

          <select value={professionFilter} onChange={(e) => setProfessionFilter(e.target.value)}>
            <option value="all">Все должности</option>
            {professions.filter(p => p !== 'all').map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
              <th onClick={() => handleSort('name')} className="sortable">ФИО {getSortIcon('name')}</th>
              <th onClick={() => handleSort('profession')} className="sortable">Должность {getSortIcon('profession')}</th>
              <th onClick={() => handleSort('trainingDate')} className="sortable">Инструктаж {getSortIcon('trainingDate')}</th>
              <th>Следующий</th>
              <th onClick={() => handleSort('days')} className="sortable">Дней {getSortIcon('days')}</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredEmployees.map((employee, index) => {
              const { days, expired, warning, nextDate } = getStatusInfo(employee.trainingDate);
              const rowClass = expired ? 'row-expired' : warning ? 'row-warning' : 'row-valid';

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
                  <td>{new Date(employee.trainingDate).toLocaleDateString('ru-RU')}</td>
                  <td>{nextDate.toLocaleDateString('ru-RU')}</td>
                  <td className={`days-cell ${expired ? 'text-red' : warning ? 'text-orange' : ''}`}>
                    {days}
                  </td>
                  <td>
                    <StatusBadge expired={expired} warning={warning} days={days} />
                  </td>
                  <td>
                    <div className='table__action' onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onEdit(employee)} className="btn-icon" title="Редактировать">✏️</button>
                      <button onClick={() => onRetrain(employee.id)} className="btn-retrain" title="Обновить дату на сегодня">ОБНОВИТЬ</button>
                      <button onClick={() => onDelete(employee.id)} className="btn-icon btn-del" title="Удалить">❌</button>
                    
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
