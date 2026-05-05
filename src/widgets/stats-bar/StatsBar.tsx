import React, { useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEmployeeContext } from "@/features/employee-crud/EmployeeProvider";
import { useNotificationContext } from "@/app/providers/NotificationProvider";
import { useExpiredCount } from "@/shared/hooks/useExpiredCount";

export function StatsBar() {
  const { employees, getDaysDifference, loading } = useEmployeeContext();
  const { addNotification } = useNotificationContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedOrg = searchParams.get("org") ?? "Все";

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        selectedOrg === "Все" ? true : emp.organization === selectedOrg
      ),
    [employees, selectedOrg]
  );

  const expiredCount = useExpiredCount(filteredEmployees as any, getDaysDifference, addNotification);

  const handleShowExpired = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set("status", "expired");
    navigate({ pathname: "/", search: next.toString() });
  }, [searchParams, navigate]);

  if (loading) return null;

  return (
    <div className="info">
      Показано: <strong>{filteredEmployees.length}</strong> | Просрочено:{" "}
      <button
        type="button"
        onClick={handleShowExpired}
        style={{
          background: "none",
          border: "none",
          color: "red",
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
        }}
        title="Показать просроченных"
      >
        {expiredCount}
      </button>
    </div>
  );
}
