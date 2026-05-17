export interface AdditionalTraining {
  dateReceived?: string | null;
  expiryMonths?: number | string | null;
  [key: string]: unknown;
}

// App-side shape (camelCase) — output of formatDataForApp
export interface Employee {
  id: string;
  name: string;
  profession: string;
  birthDate: string | null;
  trainingDate: string;
  responsible: string;
  comment: string;
  photo_url: string;
  organization: string;
  additionalTrainings: AdditionalTraining[];
  createdAt: string | null;
  isDismissed: boolean;
  dismissedAt: string | null;
}

export type EmployeeInsert = Omit<Employee, 'id' | 'createdAt' | 'isDismissed' | 'dismissedAt'>;
export type EmployeeUpdate = Partial<EmployeeInsert>;
