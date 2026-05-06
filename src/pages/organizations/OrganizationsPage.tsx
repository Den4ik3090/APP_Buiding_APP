import React from "react";
import OrganizationsDocs from "@/features/organization-docs/components/OrganizationManager";
import { useEmployeesQuery } from "@/features/employee-crud/hooks/useEmployees";

export default function OrganizationsPage() {
  const { data: employees = [] } = useEmployeesQuery();
  return <OrganizationsDocs employees={employees} />;
}
