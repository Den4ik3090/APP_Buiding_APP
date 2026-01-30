// Проверка конкретного обучения
export const isTrainingExpired = (dateReceived, expiryMonths) => {
  if (!dateReceived || !expiryMonths) return false;
  const start = new Date(dateReceived);
  const expiryDate = new Date(
    start.setMonth(start.getMonth() + parseInt(expiryMonths)),
  );
  return new Date() > expiryDate;
};

// Проверка всех обучений сотрудника
export const hasExpiredAdditional = (trainings) => {
  if (!trainings || trainings.length === 0) return false;
  return trainings.some((t) =>
    isTrainingExpired(t.dateReceived, t.expiryMonths),
  );
};
