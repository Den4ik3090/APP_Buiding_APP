import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import AnalyticsDashboard from "@/widgets/analytics-dashboard";
import { getDaysDifference, getStatusKey, hasExpiredAdditional } from "@/entities/employee";
import { useEmployeesQuery } from "@/features/employee-crud/hooks/useEmployees";

export default function AnalyticsPage() {
  const { data: employees = [] } = useEmployeesQuery();
  const [searchParams] = useSearchParams();

  const selectedOrg = searchParams.get("org") ?? "Все";
  const statusFilter = searchParams.get("status") ?? "all";

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        selectedOrg === "Все" ? true : emp.organization === selectedOrg
      ),
    [employees, selectedOrg]
  );

  const tableEmployees = useMemo(() => {
    if (statusFilter === "all") return filteredEmployees;
    return filteredEmployees.filter((emp) => {
      const days = emp.trainingDate ? getDaysDifference(emp.trainingDate) : 0;
      const status = getStatusKey(days);
      const additionalExpired = hasExpiredAdditional(emp.additionalTrainings);
      if (statusFilter === "expired") return status === "expired" || additionalExpired;
      if (statusFilter === "warning") return status === "warning";
      if (statusFilter === "valid") return status === "valid" && !additionalExpired;
      return true;
    });
  }, [filteredEmployees, statusFilter]);

  return (
    <AnalyticsDashboard employees={tableEmployees} getDaysDifference={getDaysDifference} />
  );
}
