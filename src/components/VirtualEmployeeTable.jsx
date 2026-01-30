import React, { useCallback, memo } from "react";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { List } from "react-window";

import { DAYS_THRESHOLD } from "../utils/constants";

const ROW_HEIGHT = 64;

function VirtualEmployeeTable({
  employees,
  getDaysDifference,
  emptyText,
  onRetrain,
  onDelete,
  onEdit,
}) {
  const Row = useCallback(
    ({ index, style }) => {
      const emp = employees[index];

      // защита от пустых значений
      const trainingDate = emp?.trainingDate || "";
      const days = trainingDate ? getDaysDifference(trainingDate) : 0;
      const isExpired = trainingDate ? days >= DAYS_THRESHOLD : false;

      return (
        <div style={style}>
          <div className={`virtual-row ${isExpired ? "expired" : "valid"}`}>
            <div className="virtual-cell name">{emp?.name || "—"}</div>
            <div className="virtual-cell org">{emp?.organization || "—"}</div>
            <div className="virtual-cell prof">{emp?.profession || "—"}</div>
            <div className="virtual-cell date">{trainingDate || "—"}</div>

            <div className="virtual-cell actions">
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
    [employees, getDaysDifference, onDelete, onEdit, onRetrain]
  );

  if (!employees || employees.length === 0) {
    return <div className="empty-state">{emptyText || "Нет данных"}</div>;
  }

  return (
    <div className="virtual-table" style={{ height: "60vh" }}>
      <div className="virtual-header">
        <div className="virtual-th name">ФИО</div>
        <div className="virtual-th org">Организация</div>
        <div className="virtual-th prof">Профессия</div>
        <div className="virtual-th date">Дата инструктажа</div>
        <div className="virtual-th actions">Действия</div>
      </div>

      <div className="virtual-body">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={employees.length}
              itemSize={ROW_HEIGHT}
              overscanCount={6}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

export default memo(VirtualEmployeeTable);
