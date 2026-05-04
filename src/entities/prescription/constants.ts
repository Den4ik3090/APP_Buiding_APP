export const PRESCRIPTION_STATUSES = {
  OPEN:        'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED:   'completed',
  OVERDUE:     'overdue',
} as const;

export type PrescriptionStatusValue = typeof PRESCRIPTION_STATUSES[keyof typeof PRESCRIPTION_STATUSES];

export const PRESCRIPTION_STATUS_LABELS: Record<PrescriptionStatusValue, string> = {
  [PRESCRIPTION_STATUSES.OPEN]:        'Открыто',
  [PRESCRIPTION_STATUSES.IN_PROGRESS]: 'В работе',
  [PRESCRIPTION_STATUSES.COMPLETED]:   'Устранено',
  [PRESCRIPTION_STATUSES.OVERDUE]:     'Просрочено',
};
