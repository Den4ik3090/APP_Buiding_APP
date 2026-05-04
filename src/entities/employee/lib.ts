import { DAYS_THRESHOLD, WARNING_THRESHOLD } from './constants';
import type { AdditionalTraining } from './model';

export type StatusKey = 'expired' | 'warning' | 'valid';

export const getDaysDifference = (date: string): number =>
  Math.floor((Date.now() - new Date(date).getTime()) / 86400000);

export const getStatusKey = (days: number): StatusKey => {
  if (days >= DAYS_THRESHOLD) return 'expired';
  if (days >= WARNING_THRESHOLD) return 'warning';
  return 'valid';
};

export const isTrainingExpired = (
  dateReceived: string | null | undefined,
  expiryMonths: number | string | null | undefined,
): boolean => {
  if (!dateReceived || !expiryMonths) return false;
  const start = new Date(dateReceived);
  const expiryDate = new Date(start.setMonth(start.getMonth() + parseInt(String(expiryMonths))));
  return new Date() > expiryDate;
};

export const hasExpiredAdditional = (trainings: AdditionalTraining[] | unknown[] | undefined): boolean => {
  if (!trainings || trainings.length === 0) return false;
  return trainings.some((t) => {
    const training = t as AdditionalTraining;
    return isTrainingExpired(training.dateReceived, training.expiryMonths);
  });
};
