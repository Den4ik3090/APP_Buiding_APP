import React, { memo, useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { ADDITIONAL_TRAINING_TYPES } from "@/entities/employee";
import type { FormAdditionalTraining } from "./employeeFormTypes";
import { checkTrainingStatus } from "./employeeFormHelpers";
import { TrainingStatus } from "./EmployeeFormTrainingStatus";

export const TrainingRow = memo(function TrainingRow({
  training,
  onUpdate,
  onRemove,
}: {
  training: FormAdditionalTraining;
  onUpdate: (
    id: number,
    field: keyof FormAdditionalTraining,
    value: string
  ) => void;
  onRemove: (id: number) => void;
}) {
  const handleTypeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) =>
      onUpdate(training.id, "type", event.target.value),
    [onUpdate, training.id]
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onUpdate(training.id, "dateReceived", event.target.value),
    [onUpdate, training.id]
  );

  const handleExpiryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onUpdate(training.id, "expiryMonths", event.target.value),
    [onUpdate, training.id]
  );

  const handleRemove = useCallback(() => {
    onRemove(training.id);
  }, [onRemove, training.id]);

  const rowStatus = useMemo(
    () => checkTrainingStatus(training.dateReceived, training.expiryMonths),
    [training.dateReceived, training.expiryMonths]
  );

  return (
    <tr className={rowStatus.isExpired ? "employees-training-row-expired" : ""}>
      <td>
        <select value={training.type} onChange={handleTypeChange}>
          {ADDITIONAL_TRAINING_TYPES.map((t: string) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="date"
          value={training.dateReceived}
          onChange={handleDateChange}
        />
      </td>
      <td>
        <input
          type="number"
          value={training.expiryMonths}
          onChange={handleExpiryChange}
          min={1}
          max={120}
        />
      </td>
      <td>
        <TrainingStatus training={training} />
      </td>
      <td>
        <button
          type="button"
          className="employees-icon-button employees-icon-button--danger"
          onClick={handleRemove}
          aria-label="Удалить обучение"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
});
