import React, { useState, useMemo, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import { DAYS_THRESHOLD, WARNING_THRESHOLD } from "../utils/constants";
import { sendToTelegram } from "../utils/sendToTelegram";

/**
 * Современная таблица сотрудников (2026)
 */
function EmployeeTable({
  employees,
  getDaysDifference,
  emptyText = "Сотрудников пока нет",
  onRetrain,
  onDelete,
  onEdit,
}) {
  const [sortConfig, setSortConfig] = useState({
    key: "days",
    direction: "desc",
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Дебаунс поиска по ФИО
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
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
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

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

  // Предрасчёт days / expired / warning / nextDate
  const preparedEmployees = useMemo(
    () =>
      employees.map((emp) => {
        const { days, expired, warning, nextDate } = getStatusInfo(
          emp.trainingDate
        );
        return { ...emp, days, expired, warning, nextDate };
      }),
    [employees]
  );

  // Отчёт в Telegram
  const handleSendReport = async () => {
    try {
      const expired = preparedEmployees.filter(
        (emp) => emp.days > DAYS_THRESHOLD
      ).length;
      const warning = preparedEmployees.filter(
        (emp) => emp.days <= DAYS_THRESHOLD && emp.days > WARNING_THRESHOLD
      ).length;
      const valid = preparedEmployees.length - expired - warning;

      const newToday = preparedEmployees
        .filter((e) => isToday(e.createdAt))
        .map((e) => `• ${e.name} — ${e.organization || "—"}`)
        .slice(0, 30);

      const report = `
Отчёт по инструктажам:
🔴 Просрочено: ${expired}
🟡 Предупреждение: ${warning}
🟢 Норма: ${valid}
📈 Всего: ${preparedEmployees.length}

Новые сотрудники сегодня:
${newToday.length ? newToday.join("\n") : "— нет"}
      `.trim();

      await sendToTelegram(report);
      alert("✅ Отчёт отправлен в Telegram!");
    } catch (error) {
      alert("❌ Ошибка отправки");
      console.error(error);
    }
  };

  const sortedAndFilteredEmployees = useMemo(() => {
    let result = [...preparedEmployees];

    // Поиск по ФИО
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((emp) => emp.name.toLowerCase().includes(q));
    }

    // Фильтр по статусу
    if (statusFilter !== "all") {
      result = result.filter((emp) => {
        if (statusFilter === "expired") return emp.expired;
        if (statusFilter === "warning") return emp.warning;
        if (statusFilter === "valid") return !emp.expired && !emp.warning;
        return true;
      });
    }

    // Фильтр по должности
    if (professionFilter !== "all") {
      result = result.filter((emp) => emp.profession === professionFilter);
    }

    // Сортировка
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue;
        let bValue;

        if (sortConfig.key === "days") {
          aValue = a.days;
          bValue = b.days;
        } else if (sortConfig.key === "trainingDate") {
          aValue = new Date(a.trainingDate).getTime();
          bValue = new Date(b.trainingDate).getTime();
        } else {
          aValue = (a[sortConfig.key] || "").toString().toLowerCase();
          bValue = (b[sortConfig.key] || "").toString().toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [preparedEmployees, debouncedSearch, statusFilter, professionFilter, sortConfig]);

  const professions = useMemo(
    () => [
      "all",
      ...new Set(
        employees.map((emp) => emp.profession).filter(Boolean)
      ),
    ],
    [employees]
  );

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return "↕";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  if (employees.length === 0) {
    return (
      <div className="table-container">
        <div className="empty-state">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="table-container">
      {/* Шапка таблицы */}
      <div className="table-header">
        <div className="table-header__title">
          <h3>Список сотрудников</h3>
          <button
            type="button"
            className="btn-telegram"
            onClick={handleSendReport}
          >
            📲 Отправить отчёт в Telegram
          </button>
        </div>

        <div>
          <input
            className="search-input"
            type="text"
            placeholder="Поиск по ФИО…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Все статусы</option>
            <option value="valid">Норма</option>
            <option value="warning">Скоро просрочка</option>
            <option value="expired">Просрочено</option>
          </select>

          <select
            className="status-filter"
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
          >
            <option value="all">Все должности</option>
            {professions
              .filter((p) => p !== "all")
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Таблица */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th style={{ width: "60px" }}>№</th>
              <th style={{ width: "70px" }}>Фото</th>
              <th
                onClick={() => handleSort("name")}
                style={{ cursor: "pointer", minWidth: "220px" }}
              >
                ФИО {getSortIcon("name")}
              </th>
              <th
                onClick={() => handleSort("profession")}
                style={{ cursor: "pointer", minWidth: "200px" }}
              >
                Должность {getSortIcon("profession")}
              </th>
              <th
                onClick={() => handleSort("trainingDate")}
                style={{ cursor: "pointer", width: "140px" }}
              >
                Инструктаж {getSortIcon("trainingDate")}
              </th>
              <th style={{ width: "140px" }}>Следующий</th>
              <th
                onClick={() => handleSort("days")}
                style={{ cursor: "pointer", width: "110px" }}
              >
                Дней {getSortIcon("days")}
              </th>
              <th style={{ width: "140px" }}>Статус</th>
              <th style={{ width: "190px" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredEmployees.map((employee, index) => (
              <tr
                key={employee.id}
                className={
                  employee.expired
                    ? "expired"
                    : employee.warning
                    ? "warning"
                    : "valid"
                }
              >
                <td>{index + 1}</td>

                <td>
                  <div className="table-photo-circle">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.name} />
                    ) : (
                      <span className="photo-placeholder-mini">👤</span>
                    )}
                  </div>
                </td>

                <td>{employee.name}</td>
                <td>{employee.profession}</td>

                <td>
                  {new Date(employee.trainingDate).toLocaleDateString("ru-RU")}
                </td>

                <td>
                  {employee.nextDate.toLocaleDateString("ru-RU")}
                </td>

                <td>
                  <span
                    className={
                      "days-count" + (employee.expired ? " expired" : "")
                    }
                  >
                    {employee.days}
                  </span>
                </td>

                <td>
                  <StatusBadge
                    days={employee.days}
                    expired={employee.expired}
                    warning={employee.warning}
                  />
                </td>

                <td>
                  <div className="table__action">
                    <button
                      type="button"
                      className="btn-retrain"
                      onClick={() => onRetrain(employee.id)}
                    >
                      Обновить
                    </button>
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => onEdit(employee)}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => onDelete(employee.id)}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Легенда */}
      <div className="legend">
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ background: "#ecfdf3", borderColor: "#bbf7d0" }}
          />
          <span>Инструктаж в норме</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ background: "#fffbeb", borderColor: "#fed7aa" }}
          />
          <span>Скоро просрочка</span>
        </div>
        <div className="legend-item">
          <div
            className="legend-color"
            style={{ background: "#fef2f2", borderColor: "#fecaca" }}
          />
          <span>Инструктаж просрочен</span>
        </div>
      </div>
    </div>
  );
}

export default EmployeeTable;
