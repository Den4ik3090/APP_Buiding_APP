import React from "react";
import AdditionalTrainingsManager from "@/features/additional-trainings/components/AdditionalTrainingsManager";
import { useEmployeesQuery } from "@/features/employee-crud/hooks/useEmployees";

export default function AdditionalTrainingsPage() {
  const { data: employees = [] } = useEmployeesQuery();
  return <AdditionalTrainingsManager employees={employees} />;
}
