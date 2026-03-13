import React, { useState, useEffect, useMemo, useRef } from "react";
import { FileText, Plus, TrendingUp } from "lucide-react";
import PermitsTable from "./PermitsTable";
import PermitsDashboard from "./PermitsDashboard";
import PermitForm from "./PermitForm";
import { supabase } from "../../supabaseClient";
import { TOAST_TYPES, TOAST_DURATION } from "../../utils/toastConfig";
import { PERMIT_STATUSES } from "../../utils/permitConstants";
import { isClosedStatus, getPermitStatus } from "../../utils/permitHelpers";
import "./PermitsRegistry.css";

/**
 * Главный компонент модуля "Реестр учета Нарядов-Допусков"
 */
export default function PermitsRegistry({ addNotification = () => {} }) {
  const [permits, setPermits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("registry"); // 'registry' | 'dashboard'
  const [showForm, setShowForm] = useState(false);
  const [editingPermit, setEditingPermit] = useState(null);
  const previousExpiredCountRef = useRef(null);

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

  const shouldAutoClosePermit = (permit) => {
    if (!permit || isClosedStatus(permit.status)) return false;
    if (permit.is_extended) return false;
    if (!permit.expiry_date) return false;

    const expiryDate = new Date(permit.expiry_date);
    if (Number.isNaN(expiryDate.getTime())) return false;

    const autoCloseDeadline = new Date(expiryDate);
    autoCloseDeadline.setDate(autoCloseDeadline.getDate() + 15);
    return new Date() > autoCloseDeadline;
  };

  const autoCloseExpiredPermits = async (rawPermits) => {
    const toClose = (Array.isArray(rawPermits) ? rawPermits : []).filter(
      (permit) => shouldAutoClosePermit(permit)
    );

    if (toClose.length === 0) return false;

    const today = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();
    const updates = toClose.map((permit) =>
      supabase
        .from("permits")
        .update({
          status: PERMIT_STATUSES.CLOSED,
          closed_date: permit.closed_date || today,
          updated_at: nowIso,
        })
        .eq("id", permit.id)
    );

    const results = await Promise.all(updates);
    const failed = results.find((res) => res.error);
    if (failed?.error) {
      console.error("Ошибка авто-закрытия нарядов:", failed.error);
      return false;
    }

    return true;
  };

  // Загрузка данных
  useEffect(() => {
    loadData();
    
    // Подписка на изменения в реальном времени
    const permitsSubscription = supabase
      .channel('permits_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'permits' },
        () => {
          loadPermits();
        }
      )
      .subscribe();

    return () => {
      permitsSubscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPermits(), loadEmployees()]);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      addNotification(
        "Ошибка загрузки данных",
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPermits = async (skipAutoClose = false) => {
    const { data, error } = await supabase
      .from("permits")
      .select(`
        *,
        responsible_person:employees!responsible_person_id (
          id,
          name,
          profession,
          organization
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки нарядов:", error);
      throw error;
    }

    if (!skipAutoClose) {
      const hasAutoClosed = await autoCloseExpiredPermits(data || []);
      if (hasAutoClosed) {
        await loadPermits(true);
        return;
      }
    }

    setPermits(data || []);
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, profession, organization")
      .order("name");

    if (error) {
      console.error("Ошибка загрузки сотрудников:", error);
      throw error;
    }

    setEmployees(data || []);
  };

  const handleCreatePermit = () => {
    setEditingPermit(null);
    setShowForm(true);
  };

  const handleEditPermit = (permit) => {
    setEditingPermit(permit);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPermit(null);
  };

  const handleSavePermit = async () => {
    await loadPermits();
    handleCloseForm();
    addNotification(
      editingPermit ? "Наряд обновлен" : "Наряд создан",
      TOAST_TYPES.SUCCESS,
      TOAST_DURATION.NORMAL
    );
  };

  const handleDeletePermit = async (permitId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот наряд?")) {
      return;
    }

    try {
      const deletePermit = () =>
        supabase
          .from("permits")
          .delete()
          .eq("id", permitId)
          .select("id");

      let { data, error } = await deletePermit();

      if (
        error &&
        (error.code === "23503" || /foreign key/i.test(error.message || ""))
      ) {
        const { error: auditDeleteError } = await supabase
          .from("permit_audit_log")
          .delete()
          .eq("permit_id", permitId);

        if (auditDeleteError && auditDeleteError.code !== "42P01") {
          throw auditDeleteError;
        }

        ({ data, error } = await deletePermit());
      }

      if (error) throw error;
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(
          "Наряд не удален. Возможны ограничения доступа (RLS) или отсутствует право DELETE."
        );
      }

      await loadPermits();
      addNotification(
        "Наряд удален",
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );
    } catch (error) {
      console.error("Ошибка удаления наряда:", error);
      addNotification(
        error?.message || "Ошибка удаления наряда",
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    }
  };

  if (loading) {
    return (
      <div className="permits-loading">
        <div className="spinner" />
        <p>Загрузка реестра нарядов...</p>
      </div>
    );
  }

  return (
    <div className="permits-registry">
      {/* Шапка модуля */}
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

        {/* Табы */}
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

      {/* Контент */}
      <div className="permits-content">
        {activeTab === "registry" && (
          <PermitsTable
            permits={permits}
            employees={employees}
            onEdit={handleEditPermit}
            onDelete={handleDeletePermit}
            onRefresh={loadPermits}
            addNotification={addNotification}
          />
        )}

        {activeTab === "dashboard" && (
          <PermitsDashboard permits={permits} />
        )}
      </div>

      {/* Модальное окно формы */}
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
