export interface FormAdditionalTraining {
  id: number;
  type: string;
  dateReceived: string;
  expiryMonths: number | string;
}

export interface EmployeeFormData {
  name: string;
  profession: string;
  birthDate: string;
  trainingDate: string;
  responsible: string;
  comment: string;
  photo_url: string;
  organization: string;
  additionalTrainings: FormAdditionalTraining[];
}

export interface FieldConfig {
  label: string;
  name: keyof Omit<EmployeeFormData, "additionalTrainings">;
  type: string;
  placeholder: string;
  required: boolean;
}

export interface TrainingStatusResult {
  isExpired: boolean;
  isSoon: boolean;
  daysLeft: number;
}

export interface EmployeeFormProps {
  onAddEmployee: (data: import("@/entities/employee").Employee) => Promise<void>;
  editingEmployee: import("@/entities/employee").Employee | null;
  onUpdateEmployee: (data: import("@/entities/employee").Employee) => Promise<void>;
  onCancelEdit: () => void;
  existingOrganizations?: string[];
  onPhotoUpload?: () => void;
  onPhotoError?: (error: Error) => void;
}
