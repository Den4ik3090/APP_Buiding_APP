import React, { memo, useMemo } from "react";
import type { FormAdditionalTraining } from "./employeeFormTypes";
import { checkTrainingStatus } from "./employeeFormHelpers";

export const TrainingStatus = memo(function TrainingStatus({
  training,
}: {
  training: FormAdditionalTraining;
}) {
  const { isExpired, isSoon, daysLeft } = useMemo(
    () => checkTrainingStatus(training.dateReceived, training.expiryMonths),
    [training.dateReceived, training.expiryMonths]
  );

  if (!training.dateReceived || !training.expiryMonths) {
    return (
      <span className="employees-status employees-status--neutral">
        Не заполнено
      </span>
    );
  }

  if (isExpired) {
    return (
      <span className="employees-status employees-status--expired">
        Истекло ({Math.abs(daysLeft)} дн.)
      </span>
    );
  }

  if (isSoon) {
    return (
      <span className="employees-status employees-status--warning">
        Скоро истекает ({daysLeft} дн.)
      </span>
    );
  }

  return (
    <span className="employees-status employees-status--actual">
      Актуально ({daysLeft} дн.)
    </span>
  );
});
