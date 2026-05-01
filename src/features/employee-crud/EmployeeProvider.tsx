import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationContext } from "@/app/providers/NotificationProvider";
import { TOAST_MESSAGES, TOAST_TYPES } from "@/shared/constants/toast";
import {
  fetchFromSupabase,
  fetchOrganizations,
  addEmployee as apiAdd,
  updateEmployee as apiUpdate,
  deleteEmployee as apiDelete,
  getDaysDifference,
  type AnyEmployee,
} from "./api";
import { retrainEmployee as apiRetrain } from "@/features/employee-retrain/api";

interface EmployeeContextValue {
  employees: AnyEmployee[];
  organizations: string[];
  loading: boolean;
  loadError: boolean;
  showForm: boolean;
  editingEmployee: AnyEmployee | null;
  getDaysDifference: (date: string) => number;
  reload: () => Promise<void>;
  addEmployee: (data: AnyEmployee) => Promise<void>;
  updateEmployee: (data: AnyEmployee) => Promise<void>;
  deleteEmployee: (id: unknown) => Promise<void>;
  retrainEmployee: (id: unknown) => Promise<void>;
  handleEdit: (emp: AnyEmployee) => void;
  handleAddNew: () => void;
  cancelEdit: () => void;
}

const EmployeeContext = createContext<EmployeeContextValue | null>(null);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<AnyEmployee[]>([]);
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AnyEmployee | null>(null);

  const navigate = useNavigate();
  const { addNotification } = useNotificationContext();

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await Promise.race([
        fetchFromSupabase(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 30000)
        ),
      ]);
      setEmployees(data);
    } catch (error: unknown) {
      console.error("initialLoad error:", error);
      setLoadError(true);
      addNotification(
        (error as Error)?.message === "timeout"
          ? "Превышено время ожидания. Проверьте интернет и обновите страницу."
          : TOAST_MESSAGES.DB_ERROR,
        TOAST_TYPES.ERROR
      );
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const loadOrgs = useCallback(async () => {
    const orgs = await fetchOrganizations();
    setOrganizations(orgs);
  }, []);

  useEffect(() => {
    reload();
    loadOrgs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddEmployee = useCallback(
    (data: AnyEmployee) =>
      apiAdd(data, addNotification, setEmployees, setShowForm, setEditingEmployee),
    [addNotification]
  );

  const handleUpdateEmployee = useCallback(
    (data: AnyEmployee) =>
      apiUpdate(data, addNotification, setEmployees, setShowForm, setEditingEmployee),
    [addNotification]
  );

  const handleDeleteEmployee = useCallback(
    (id: unknown) => apiDelete(id, addNotification, setEmployees),
    [addNotification]
  );

  const handleRetrainEmployee = useCallback(
    (id: unknown) => apiRetrain(id, addNotification, setEmployees),
    [addNotification]
  );

  const handleEdit = useCallback(
    (emp: AnyEmployee) => {
      setEditingEmployee(emp);
      setShowForm(true);
      navigate("/");
    },
    [navigate]
  );

  const handleAddNew = useCallback(() => {
    setEditingEmployee(null);
    setShowForm(true);
    navigate("/");
  }, [navigate]);

  const cancelEdit = useCallback(() => {
    setEditingEmployee(null);
    setShowForm(false);
  }, []);

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        organizations,
        loading,
        loadError,
        showForm,
        editingEmployee,
        getDaysDifference,
        reload,
        addEmployee: handleAddEmployee,
        updateEmployee: handleUpdateEmployee,
        deleteEmployee: handleDeleteEmployee,
        retrainEmployee: handleRetrainEmployee,
        handleEdit,
        handleAddNew,
        cancelEdit,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployeeContext(): EmployeeContextValue {
  const ctx = useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployeeContext: must be inside <EmployeeProvider>");
  return ctx;
}
