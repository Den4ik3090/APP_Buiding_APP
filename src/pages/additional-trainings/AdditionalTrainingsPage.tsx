import React from "react";
import AdditionalTrainingsManager from "@/components/AdditionalTrainingsManager";
import { useEmployeeContext } from "@/features/employee-crud/EmployeeProvider";

export default function AdditionalTrainingsPage() {
  const { employees } = useEmployeeContext();
  return <AdditionalTrainingsManager employees={employees as any} />;
}
