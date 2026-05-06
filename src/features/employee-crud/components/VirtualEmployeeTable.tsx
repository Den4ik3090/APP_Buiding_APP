import React, { useCallback, memo } from "react";
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
  const RowComponent = useCallback(
    ({ index, style, ariaAttributes }: RowComponentProps) => {
      const emp = employees[index];

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
    [employees, getDaysDifference, onDelete, onEdit, onRetrain, addNotification]
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
        <AutoSizer
          renderProp={({ height, width }) => (
            <List
              defaultHeight={height ?? 0}
              rowCount={employees.length}
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
