export type { Employee, EmployeeInsert, EmployeeUpdate, AdditionalTraining } from './model';
export { STORAGE_KEY, DAYS_THRESHOLD, WARNING_THRESHOLD, ADDITIONAL_TRAINING_TYPES } from './constants';
export { getDaysDifference, getStatusKey, isTrainingExpired, hasExpiredAdditional } from './lib';
export type { StatusKey } from './lib';
