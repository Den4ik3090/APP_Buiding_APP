import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Plus, TrendingUp } from "lucide-react";
import PermitsTable from "./PermitsTable";
import PermitsDashboard from "./PermitsDashboard";
import PermitForm from "./PermitForm";
import { useQueryClient } from "@tanstack/react-query";
import { TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";
import type { NotificationType } from "@/shared/constants/toast";
import { subscribeToPermits } from "@/features/permits/services/permitsService";
import type { PermitWithEmployee } from "@/features/permits/services/permitsService";
import { PERMIT_STATUSES } from "@/entities/permit";
import type { Permit } from "@/entities/permit";
import { isClosedStatus, getPermitStatus } from "@/entities/permit";
import {
  usePermitsQuery,
  usePermitEmployeesQuery,
  useDeletePermitMutation,
} from "@/features/permits/hooks/usePermits";
import "./PermitsRegistry.css";

type AddNotificationFn = (message: string, type?: NotificationType, duration?: number) => void;

interface PermitsRegistryProps {
  addNotification: AddNotificationFn;
}

export default function PermitsRegistry({ addNotification }: PermitsRegistryProps) {
  const queryClient = useQueryClient();

  const { data: permits = [], isLoading: permitsLoading } = usePermitsQuery();
  const { data: employees = [] } = usePermitEmployeesQuery();
  const deletePermitMutation = useDeletePermitMutation();

  const [activeTab, setActiveTab] = useState<'registry' | 'dashboard'>('registry');
  const [showForm, setShowForm] = useState(false);
  const [editingPermit, setEditingPermit] = useState<PermitWithEmployee | null>(null);
  const previousExpiredCountRef = useRef<number | null>(null);

  const expiredCount = useMemo(
    () =>
      (Array.isArray(permits) ? permits : []).filter(
        (permit) => getPermitStatus(permit) === PERMIT_STATUSES.EXPIRED
      ).length,
    [permits]
  );

  useEffect(() => {
    if (previousExpiredCountRef.current === null) {
      if (expiredCount > 0) {
        addNotification(
          `Просроченных нарядов: ${expiredCount}`,
          TOAST_TYPES.WARNING,
          TOAST_DURATION.NORMAL
        );
      }
      previousExpiredCountRef.current = expiredCount;
      return;
    }

    if (expiredCount > previousExpiredCountRef.current) {
      addNotification(
        `Просроченных нарядов: ${expiredCount}`,
        TOAST_TYPES.WARNING,
        TOAST_DURATION.NORMAL
      );
    }
    previousExpiredCountRef.current = expiredCount;
  }, [expiredCount, addNotification]);

  useEffect(() => {
    const channel = subscribeToPermits(() => {
      queryClient.invalidateQueries({ queryKey: ['permits'] });
    });
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  const handleCreatePermit = () => {
    setEditingPermit(null);
    setShowForm(true);
  };

  const handleEditPermit = (permit: Permit) => {
    setEditingPermit(permit as PermitWithEmployee);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPermit(null);
  };

  const handleSavePermit = async () => {
    await queryClient.invalidateQueries({ queryKey: ['permits'] });
    handleCloseForm();
    addNotification(
      editingPermit ? "Наряд обновлен" : "Наряд создан",
      TOAST_TYPES.SUCCESS,
      TOAST_DURATION.NORMAL
    );
  };

  const handleDeletePermit = async (permitId: string) => {
    try {
      await deletePermitMutation.mutateAsync(permitId);
      addNotification("Наряд удален", TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
    } catch (error) {
      console.error("Ошибка удаления наряда:", error);
      addNotification(
        (error as { message?: string })?.message || "Ошибка удаления наряда",
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    }
  };

  if (permitsLoading) {
    return (
      <div className="permits-loading">
        <div className="spinner" />
        <p>Загрузка реестра нарядов...</p>
      </div>
    );
  }

  return (
    <div className="permits-registry">
      <div className="permits-header">
        <div className="permits-header-content">
          <div className="permits-header-title">
            <FileText size={32} />
            <div>
              <h1>Реестр учета Нарядов-Допусков</h1>
              <p>Управление и контроль нарядов-допусков на производстве</p>
            </div>
          </div>
          <button
            className="btn-primary btn-create-permit"
            onClick={handleCreatePermit}
          >
            <Plus size={20} />
            Создать наряд
          </button>
        </div>

        <div className="permits-tabs">
          <button
            className={`tab ${activeTab === "registry" ? "active" : ""}`}
            onClick={() => setActiveTab("registry")}
          >
            <FileText size={18} />
            Реестр нарядов
          </button>
          <button
            className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <TrendingUp size={18} />
            Статистика
          </button>
        </div>
      </div>

      <div className="permits-content">
        {activeTab === "registry" && (
          <PermitsTable
            permits={permits}
            employees={employees}
            onEdit={handleEditPermit}
            onDelete={handleDeletePermit}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['permits'] })}
            addNotification={addNotification}
          />
        )}

        {activeTab === "dashboard" && (
          <PermitsDashboard permits={permits} />
        )}
      </div>

      {showForm && (
        <PermitForm
          permit={editingPermit}
          employees={employees}
          permits={permits}
          onClose={handleCloseForm}
          onSave={handleSavePermit}
          addNotification={addNotification}
        />
      )}
    </div>
  );
}
