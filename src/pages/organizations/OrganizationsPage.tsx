import React from "react";
import OrganizationsDocs from "@/components/OrganizationManager";
import { useEmployeeContext } from "@/features/employee-crud/EmployeeProvider";

export default function OrganizationsPage() {
  const { employees } = useEmployeeContext();
  return <OrganizationsDocs employees={employees as any} />;
}
