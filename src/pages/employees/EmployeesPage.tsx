import React, { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import EmployeeForm from "@/components/EmployeeForm";
import VirtualEmployeeTable from "@/components/VirtualEmployeeTable";
import SkeletonLoader from "@/shared/ui/Skeleton";
import { ButtonGlow } from "@/shared/ui/ButtonGlow";
import { TOAST_MESSAGES, TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";
import { getStatusKey, hasExpiredAdditional } from "@/entities/employee";
import { useEmployeeContext } from "@/features/employee-crud/EmployeeProvider";
import { useNotificationContext } from "@/app/providers/NotificationProvider";
import { exportToCSV } from "@/features/employee-export/exportToCSV";

const EmployeeTable = lazy(() => import("@/features/employee-crud/components/EmployeeTable"));

export default function EmployeesPage() {
  const {
    employees,
    organizations,
    loading,
    loadError,
    reload,
    showForm,
    editingEmployee,
    getDaysDifference,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    retrainEmployee,
    handleEdit,
    handleAddNew,
    cancelEdit,
  } = useEmployeeContext();

  const { addNotification } = useNotificationContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedOrg = searchParams.get("org") ?? "Все";
  const tableStatusFilter = searchParams.get("status") ?? "all";

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        selectedOrg === "Все" ? true : emp.organization === selectedOrg
      ),
    [employees, selectedOrg]
  );

  const tableEmployees = useMemo(() => {
    if (tableStatusFilter === "all") return filteredEmployees;
    return filteredEmployees.filter((emp) => {
      const days = emp.trainingDate ? getDaysDifference(emp.trainingDate) : 0;
      const status = getStatusKey(days);
      const additionalExpired = hasExpiredAdditional(emp.additionalTrainings);
      if (tableStatusFilter === "expired") return status === "expired" || additionalExpired;
      if (tableStatusFilter === "warning") return status === "warning";
      if (tableStatusFilter === "valid") return status === "valid" && !additionalExpired;
      return true;
    });
  }, [filteredEmployees, tableStatusFilter, getDaysDifference]);

  const onStatusFilterChange = (status: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (status === "all") next.delete("status");
        else next.set("status", status);
        return next;
      },
      { replace: true }
    );
  };

  if (loading) return <SkeletonLoader rows={8} />;

  if (loadError && employees.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ color: "#666", marginBottom: 12 }}>
          Не удалось загрузить таблицу. Проверьте интернет и доступ к Supabase.
        </p>
        <button type="button" className="btn-primary" onClick={reload}>
          Повторить загрузку
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="form-actions" style={{ marginBottom: 15 }}>
        <ButtonGlow text="Добавить сотрудника" onClick={handleAddNew} />
        <ButtonGlow
          text="Экспорт CSV"
          onClick={() => exportToCSV(filteredEmployees)}
        />
      </div>

      {showForm && (
        <EmployeeForm
          onAddEmployee={addEmployee}
          editingEmployee={editingEmployee}
          onUpdateEmployee={updateEmployee}
          onCancelEdit={cancelEdit}
          existingOrganizations={organizations as any}
          onPhotoUpload={() =>
            addNotification(
              TOAST_MESSAGES.PHOTO_UPLOADED,
              TOAST_TYPES.SUCCESS,
              TOAST_DURATION.NORMAL
            )
          }
          onPhotoError={() =>
            addNotification(
              TOAST_MESSAGES.PHOTO_UPLOAD_ERROR,
              TOAST_TYPES.ERROR,
              TOAST_DURATION.NORMAL
            )
          }
        />
      )}

      <Suspense fallback={<SkeletonLoader rows={8} />}>
        {filteredEmployees.length > 1000 ? (
          <VirtualEmployeeTable
            employees={tableEmployees as any[]}
            getDaysDifference={getDaysDifference}
            emptyText="Сотрудников не найдено"
            onRetrain={retrainEmployee}
            onDelete={deleteEmployee}
            onEdit={handleEdit}
            addNotification={addNotification}
          />
        ) : (
          <EmployeeTable
            employees={tableEmployees as any}
            getDaysDifference={getDaysDifference}
            onRetrain={retrainEmployee}
            onDelete={deleteEmployee}
            onEdit={handleEdit}
            addNotification={addNotification}
            statusFilterValue={tableStatusFilter}
            onStatusFilterChange={onStatusFilterChange}
          />
        )}
      </Suspense>
    </>
  );
}
