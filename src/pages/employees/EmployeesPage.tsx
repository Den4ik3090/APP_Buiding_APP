import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EmployeeForm from "@/features/employee-crud/components/EmployeeForm";
import VirtualEmployeeTable from "@/features/employee-crud/components/VirtualEmployeeTable";
import SkeletonLoader from "@/shared/ui/Skeleton";
import { ButtonGlow } from "@/shared/ui/ButtonGlow";
import { TOAST_MESSAGES, TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";
import { getDaysDifference, getStatusKey, hasExpiredAdditional } from "@/entities/employee";
import type { Employee } from "@/entities/employee";
import { useNotificationContext } from "@/app/providers/NotificationProvider";
import { exportToCSV } from "@/features/employee-export/exportToCSV";
import {
  useEmployeesQuery,
  useOrganizationsQuery,
  useAddEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useRetrainEmployeeMutation,
} from "@/features/employee-crud/hooks/useEmployees";

const EmployeeTable = lazy(() => import("@/features/employee-crud/components/EmployeeTable"));

export default function EmployeesPage() {
  const { addNotification } = useNotificationContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: employees = [], isLoading: loading, isError: loadError, refetch: reload } = useEmployeesQuery();
  const { data: organizations = [] } = useOrganizationsQuery();
  const addMutation = useAddEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const deleteMutation = useDeleteEmployeeMutation();
  const retrainMutation = useRetrainEmployeeMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

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
  }, [filteredEmployees, tableStatusFilter]);

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

  const handleEdit = useCallback((emp: Employee) => {
    setEditingEmployee(emp);
    setShowForm(true);
    navigate("/");
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    setEditingEmployee(null);
    setShowForm(true);
    navigate("/");
  }, [navigate]);

  const cancelEdit = useCallback(() => {
    setEditingEmployee(null);
    setShowForm(false);
  }, []);

  const addEmployee = useCallback(async (data: Employee) => {
    try {
      await addMutation.mutateAsync(data);
      addNotification(TOAST_MESSAGES.EMPLOYEE_ADDED, TOAST_TYPES.SUCCESS, TOAST_DURATION.LONG);
      setShowForm(false);
      setEditingEmployee(null);
    } catch {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  }, [addMutation, addNotification]);

  const updateEmployee = useCallback(async (data: Employee) => {
    try {
      await updateMutation.mutateAsync(data);
      addNotification(TOAST_MESSAGES.EMPLOYEE_UPDATED, TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
      setShowForm(false);
      setEditingEmployee(null);
    } catch {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  }, [updateMutation, addNotification]);

  const deleteEmployee = useCallback(async (id: unknown) => {
    try {
      await deleteMutation.mutateAsync(id as string);
      addNotification(TOAST_MESSAGES.EMPLOYEE_DELETED, TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
    } catch {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  }, [deleteMutation, addNotification]);

  const retrainEmployee = useCallback(async (id: unknown) => {
    try {
      await retrainMutation.mutateAsync(id as string);
      addNotification(TOAST_MESSAGES.EMPLOYEE_RETRAINED, TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
    } catch {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  }, [retrainMutation, addNotification]);

  if (loading) return <SkeletonLoader rows={8} />;

  if (loadError && employees.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0" }}>
        <p style={{ color: "#666", marginBottom: 12 }}>
          Не удалось загрузить таблицу. Проверьте интернет и доступ к Supabase.
        </p>
        <button type="button" className="btn-primary" onClick={() => reload()}>
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
          existingOrganizations={organizations}
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
            employees={tableEmployees}
            getDaysDifference={getDaysDifference}
            emptyText="Сотрудников не найдено"
            onRetrain={retrainEmployee}
            onDelete={deleteEmployee}
            onEdit={handleEdit}
            addNotification={addNotification}
          />
        ) : (
          <EmployeeTable
            employees={tableEmployees}
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
