import React from "react";
import OrganizationsDocs from "@/features/organization-docs/components/OrganizationManager";
import { useEmployeesQuery } from "@/features/employee-crud/hooks/useEmployees";
import { useNotificationContext } from "@/app/providers/NotificationProvider";

export default function OrganizationsPage() {
  const { data: employees = [] } = useEmployeesQuery();
  const { addNotification } = useNotificationContext();
  return <OrganizationsDocs employees={employees} addNotification={addNotification} />;
}
