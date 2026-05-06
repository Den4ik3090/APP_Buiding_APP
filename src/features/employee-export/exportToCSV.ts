import { DAYS_THRESHOLD, getDaysDifference } from "@/entities/employee";
import type { Employee } from "@/entities/employee";

export const exportToCSV = (employees: Employee[]): void => {
  const SEP = ";";
  const BOM = "﻿";
  const headers = [
    "ФИО",
    "Организация",
    "Профессия",
    "Дата рождения",
    "Дата основного инструктажа",
    "Статус",
    "Дополнительные обучения",
  ];

  const escapeCell = (val: unknown): string => {
    const s = val == null ? "" : String(val);
    if (/[;"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const formatDate = (d: unknown): string => {
    if (!d) return "";
    const date = new Date(d as string);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU");
  };

  const rows = employees.map((emp) => {
    const days = getDaysDifference(emp.trainingDate);
    const status = days >= DAYS_THRESHOLD ? "Переподготовка" : "Актуален";
    const addTrain = Array.isArray(emp.additionalTrainings)
      ? emp.additionalTrainings
          .map((t: unknown) => (typeof t === "string" ? t : String(t)))
          .join("; ")
      : "";

    return [
      escapeCell(emp.name),
      escapeCell(emp.organization),
      escapeCell(emp.profession),
      escapeCell(formatDate(emp.birthDate)),
      escapeCell(formatDate(emp.trainingDate)),
      escapeCell(status),
      escapeCell(addTrain),
    ].join(SEP);
  });

  const csv = BOM + headers.join(SEP) + "\r\n" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `instruction_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
