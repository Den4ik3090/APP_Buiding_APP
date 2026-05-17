import type { Employee } from "@/entities/employee";
import type {
  EmployeeFormData,
  FieldConfig,
  FormAdditionalTraining,
  TrainingStatusResult,
} from "./employeeFormTypes";

export const getTodayDateValue = (): string => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export const createInitialFormData = (): EmployeeFormData => ({
  name: "",
  profession: "",
  birthDate: "",
  trainingDate: getTodayDateValue(),
  responsible: "",
  comment: "",
  photo_url: "",
  organization: "",
  additionalTrainings: [],
});

export const mapEmployeeToFormData = (employee: Employee): EmployeeFormData => ({
  name: employee?.name || "",
  profession: employee?.profession || "",
  birthDate: employee?.birthDate || "",
  trainingDate: employee?.trainingDate || getTodayDateValue(),
  responsible: employee?.responsible || "",
  comment: employee?.comment || "",
  photo_url: employee?.photo_url || "",
  organization: employee?.organization || "",
  additionalTrainings: Array.isArray(employee?.additionalTrainings)
    ? (employee.additionalTrainings as unknown as FormAdditionalTraining[])
    : [],
});

export const GENERAL_FIELDS: FieldConfig[] = [
  {
    label: "ФИО",
    name: "name",
    type: "text",
    placeholder: "Иван Петров",
    required: true,
  },
  {
    label: "Должность",
    name: "profession",
    type: "text",
    placeholder: "Инженер по охране труда",
    required: true,
  },
  {
    label: "Дата рождения",
    name: "birthDate",
    type: "date",
    placeholder: "",
    required: false,
  },
  {
    label: "Дата инструктажа",
    name: "trainingDate",
    type: "date",
    placeholder: "",
    required: true,
  },
  {
    label: "Ответственное лицо",
    name: "responsible",
    type: "text",
    placeholder: "ФИО ответственного",
    required: false,
  },
];

export const checkTrainingStatus = (
  dateReceived: string | undefined,
  months: number | string | undefined
): TrainingStatusResult => {
  if (!dateReceived || !months) {
    return { isExpired: false, isSoon: false, daysLeft: 0 };
  }

  const start = new Date(dateReceived);
  const expiryDate = new Date(start);
  expiryDate.setMonth(expiryDate.getMonth() + parseInt(String(months), 10));

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const daysLeft = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isExpired: daysLeft <= 0,
    isSoon: daysLeft > 0 && daysLeft <= 30,
    daysLeft,
  };
};
