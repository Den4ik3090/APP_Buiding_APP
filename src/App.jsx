import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
  lazy,
} from "react";

import EmployeeForm from "./components/EmployeeForm";
import ToastContainer from "./components/ToastContainer.jsx";
import VirtualEmployeeTable from "./components/VirtualEmployeeTable.jsx";
import SkeletonLoader from "./components/Skeleton";
import { LoginPage } from "./auth";
import OrganizationsDocs from "./components/OrganizationManager.jsx";
import AdditionalTrainingsManager from "./components/AdditionalTrainingsManager.jsx";
import PermitsRegistry from "./components/PermitsRegistry/PermitsRegistry.jsx";
import OrdersRegistry from "./components/OrderRegistry/OrdersRegistry.jsx";


import { supabase } from "./supabaseClient";
import { useNotification } from "./hooks/useNotification";
import {
  TOAST_MESSAGES,
  TOAST_TYPES,
  TOAST_DURATION,
} from "./utils/toastConfig";
import { DAYS_THRESHOLD, getStatusKey } from "./utils/constants";
import { hasExpiredAdditional } from "./components/utils/helpers";

import logo from "./assets/img/logo_PUTEVI.png";

// Компоненты UI
import { ButtonGlow } from "./components/ui/ButtonGlow.jsx";

const EmployeeTable = lazy(() => import("./components/Table"));
const AnalyticsDashboard = lazy(() =>
  import("./components/AnalyticsDashboard.jsx")
);

function App() {
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // 'table', 'analytics', 'orgs'
  const [activeTab, setActiveTab] = useState("table");

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("Все");
  const [tableStatusFilter, setTableStatusFilter] = useState("all");

  const { notifications, addNotification, removeNotification } =
    useNotification();
  const prevExpiredRef = useRef(null);

  // --- AUTH bootstrap ---
  useEffect(() => {
    let isMounted = true;

    const fallbackTimer = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 10000);

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) console.error("getSession error:", error);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    }).catch((err) => {
      if (isMounted) {
        console.error("getSession failed:", err);
        setAuthLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session ?? null);
      if (event === "SIGNED_OUT") {
        setEmployees([]);
        setOrganizations([]);
        setSelectedOrg("Все");
        setActiveTab("table");
        setShowForm(false);
        setEditingEmployee(null);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      data?.subscription?.unsubscribe();
    };
  }, []);

  // --- Load app data ---
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    initialLoad();
    fetchOrganizations();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("organization");
      if (!error && data) {
        const uniqueOrgs = [
          ...new Set(data.map((i) => i.organization).filter(Boolean)),
        ];
        setOrganizations(uniqueOrgs.sort());
      }
    } catch (error) {
      console.error("Ошибка при загрузке организаций:", error);
    }
  };

  const initialLoad = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const timeoutMs = 30000;
      const cloudData = await Promise.race([
        fetchFromSupabase(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), timeoutMs)
        ),
      ]);
      setEmployees(cloudData);
    } catch (error) {
      console.error("initialLoad error:", error);
      setLoadError(true);
      addNotification(
        error?.message === "timeout"
          ? "Превышено время ожидания. Проверьте интернет и обновите страницу."
          : TOAST_MESSAGES.DB_ERROR,
        TOAST_TYPES.ERROR
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchFromSupabase = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at"
      )
      .order("name", { ascending: true });
    if (error) throw error;
    return formatDataForApp(data);
  };

  // ---------- Маппинг формы в формат БД ----------
  const mapFormToDb = (form) => ({
    name: form.name,
    profession: form.profession,
    birth_date: form.birthDate || null,
    training_date: form.trainingDate,
    responsible: form.responsible || null,
    comment: form.comment || null,
    photo_url: form.photo_url || null,
    organization: form.organization || null,
    additional_trainings: form.additionalTrainings || [],
  });

  // ---------- CRUD ----------
  const addEmployee = async (newEmployee) => {
    try {
      const payload = mapFormToDb(newEmployee);
      const { data, error } = await supabase
        .from("employees")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const mapped = formatDataForApp([data])[0];
      setEmployees((prev) =>
        [...prev, mapped].sort((a, b) => a.name.localeCompare(b.name))
      );

      // большой success‑toast вместо модалки
      addNotification(
        TOAST_MESSAGES.EMPLOYEE_ADDED || TOAST_MESSAGES.ADDED,
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.LONG
      );
      setShowForm(false);
      setEditingEmployee(null);
    } catch (e) {
      console.error("addEmployee error:", e);
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  };

  const updateEmployee = async (updated) => {
    try {
      const payload = mapFormToDb(updated);

      const { data, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", updated.id)
        .select(
          "id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at"
        )
        .single();

      if (error) throw error;

      const [mapped] = formatDataForApp([data]);

      setEmployees((prev) =>
        prev
          .map((emp) => (emp.id === mapped.id ? mapped : emp))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      addNotification(
        TOAST_MESSAGES.EMPLOYEE_UPDATED || TOAST_MESSAGES.UPDATED,
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );
      setShowForm(false);
      setEditingEmployee(null);
    } catch (e) {
      console.error("updateEmployee error:", e);
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить сотрудника?")) return;

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      addNotification(
        TOAST_MESSAGES.EMPLOYEE_DELETED || TOAST_MESSAGES.DELETED,
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );
    } catch (e) {
      console.error("handleDelete error:", e);
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  };

  const handleRetrain = async (id) => {
    const today = new Date().toISOString().split("T")[0];

    try {
      const { data, error } = await supabase
        .from("employees")
        .update({ training_date: today })
        .eq("id", id)
        .select(
          "id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at"
        )
        .single();

      if (error) throw error;

      const [mapped] = formatDataForApp([data]);

      setEmployees((prev) =>
        prev
          .map((emp) => (emp.id === mapped.id ? mapped : emp))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      addNotification(
        TOAST_MESSAGES.EMPLOYEE_RETRAINED || TOAST_MESSAGES.RETRAINED,
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );
    } catch (e) {
      console.error("handleRetrain error:", e);
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    }
  };

  // ---------- Форматирование данных ----------
  const formatDataForApp = (data) =>
    data.map((emp) => ({
      id: emp.id,
      name: emp.name,
      profession: emp.profession,
      birthDate: emp.birth_date,
      trainingDate: emp.training_date,
      responsible: emp.responsible || "",
      comment: emp.comment || "",
      photo_url: emp.photo_url || "",
      organization: emp.organization || "",
      additionalTrainings: emp.additional_trainings || [],
      createdAt: emp.created_at || null,
    }));

  const getDaysDifference = useCallback((trainingDate) => {
    const diff = new Date() - new Date(trainingDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, []);

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setShowForm(true);
    setActiveTab("table");
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setShowForm(true);
    setActiveTab("table");
  };

  const cancelEdit = () => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  const handleShowExpired = () => {
    setActiveTab("table");
    setTableStatusFilter("expired");
  };

  const filteredEmployees = useMemo(
    () =>
      employees.filter((emp) =>
        selectedOrg === "Все" ? true : emp.organization === selectedOrg
      ),
    [employees, selectedOrg]
  );

  const expiredCount = useMemo(() => {
    return filteredEmployees.filter((emp) => {
      const mainExpired =
        emp.trainingDate && getDaysDifference(emp.trainingDate) >= DAYS_THRESHOLD;
      const additionalExpired = hasExpiredAdditional(emp.additionalTrainings);
      return mainExpired || additionalExpired;
    }).length;
  }, [filteredEmployees, getDaysDifference]);

  useEffect(() => {
    if (prevExpiredRef.current === null) {
      prevExpiredRef.current = expiredCount;
      return;
    }
    if (expiredCount > prevExpiredRef.current) {
      addNotification(
        `Просрочено у ${expiredCount} сотрудников`,
        TOAST_TYPES.WARNING,
        TOAST_DURATION.NORMAL
      );
    }
    prevExpiredRef.current = expiredCount;
  }, [expiredCount, addNotification]);

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

  const exportCSV = () => {
    const SEP = ";";
    const BOM = "\uFEFF";
    const headers = [
      "ФИО",
      "Организация",
      "Профессия",
      "Дата рождения",
      "Дата основного инструктажа",
      "Статус",
      "Дополнительные обучения",
    ];

    const escapeCell = (val) => {
      const s = val == null ? "" : String(val);
      if (/[;"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const formatDate = (d) => {
      if (!d) return "";
      const date = new Date(d);
      return isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU");
    };

    const rows = filteredEmployees.map((emp) => {
      const days = getDaysDifference(emp.trainingDate);
      const status = days >= DAYS_THRESHOLD ? "Переподготовка" : "Актуален";
      const addTrain = Array.isArray(emp.additionalTrainings)
        ? emp.additionalTrainings
            .map((t) => (typeof t === "string" ? t : String(t)))
            .join("; ")
        : "";

      return [
        escapeCell(emp.name),
        escapeCell(emp.organization),
        escapeCell(emp.profession),
        escapeCell(formatDate(emp.birthDate)),
        escapeCell(formatDate(emp.trainingDate)),
        escapeCell(status),
        escapeCell(addTrain),
      ].join(SEP);
    });

    const csv = BOM + headers.join(SEP) + "\r\n" + rows.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instruction_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- UI Logic ---
if (authLoading || loading) {
  return (
    <div className="app app__loading">
      <div className="app__container">
        <SkeletonLoader rows={8} />
        {loading && (
          <p style={{ textAlign: "center", marginTop: 16, color: "#666", fontSize: 14 }}>
            Загрузка данных...
          </p>
        )}
      </div>
    </div>
  );
}

  if (loadError && employees.length === 0) {
    return (
      <div className="app">
        <div className="container" style={{ padding: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ color: "#666", marginBottom: 12 }}>
              Не удалось загрузить таблицу. Проверьте интернет и доступ к Supabase.
            </p>
            <button type="button" className="btn-primary" onClick={initialLoad}>
              Повторить загрузку
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        logoSrc={logo}
        onSuccess={() => {}}
        onError={(m) => addNotification(m, TOAST_TYPES.ERROR)}
        signIn={async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw new Error(error.message);
        }}
      />
    );
  }

  return (
    <div className="app">
      <ToastContainer
        notifications={notifications}
        onRemove={removeNotification}
      />

      <div className="container">
        {/* Header */}
        <div
          className="header-main"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <img src={logo} alt="Logo" className="logo__img" />
            <h1 className="header__title">Управление инструктажами</h1>
          </div>
          <button className="btn-danger" onClick={handleLogout}>
            Выйти
          </button>
        </div>

        {/* Stats Info */}
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
            title="�������� ������������"
          >
            {expiredCount}
          </button>
        </div>

        {/* Navigation & Filters */}
        <div
          className="toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div
            className="filter-group"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <label>Организация:</label>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="status-filter"
            >
              <option value="Все">Все организации</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
            <select
              value={tableStatusFilter}
              onChange={(e) => setTableStatusFilter(e.target.value)}
              className="status-filter"
            >
           <option value="all">Все статусы</option>
            <option value="valid">Действительные</option>
              <option value="warning">Скоро истекают</option>
            <option value="expired">Просроченные</option>

            </select>
          </div>

          <div
            className="tabs-navigation"
            style={{ display: "flex", gap: 10 }}
          >
            <button
              className={activeTab === "table" ? "btn-primary" : "btn-export"}
              onClick={() => setActiveTab("table")}
            >
              📋 Сотрудники
            </button>
            <button
              className={
                activeTab === "analytics" ? "btn-primary" : "btn-export"
              }
              onClick={() => setActiveTab("analytics")}
            >
              📊 Аналитика
            </button>
            <button
              className={activeTab === "orgs" ? "btn-primary" : "btn-export"}
              onClick={() => setActiveTab("orgs")}
            >
              🏢 Организации
            </button>
          <button
            className={activeTab === "trainings" ? "btn-primary" : "btn-export"}
            onClick={() => setActiveTab("trainings")}
            >
              🎓 Дополнительные обучения
            </button>
            <button
              className={activeTab === "permits" ? "btn-primary" : "btn-export"}
              onClick={() => setActiveTab("permits")}
              >
              📄 Наряды‑допуски
            </button>
            <button
              className={activeTab === "orders" ? "btn-primary" : "btn-export"}
              onClick={() => setActiveTab("orders")}
              >
              Приказы
            </button>
          </div>
        </div>

        {/* Main Content Render */}
        {activeTab === "table" && (
          <>
            <div className="form-actions" style={{ marginBottom: 15 }}>
              {/* <button className="btn-primary" onClick={handleAddNew}>
                + Добавить сотрудника
              </button> */}
              <ButtonGlow 
              text="Добавить сотрудника" 
              onClick={handleAddNew} 
  />
               <ButtonGlow 
              text="Экспорт CSV" 
              onClick={exportCSV} 
  />
              {/* <button className="btn-export" onClick={exportCSV}>
                📊 Экспорт CSV
              </button> */}
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
              {filteredEmployees.length > 300 ? (
                <VirtualEmployeeTable
                  employees={tableEmployees}
                  getDaysDifference={getDaysDifference}
                  onRetrain={handleRetrain}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  addNotification={addNotification}
                />
              ) : (
                <EmployeeTable
                  employees={tableEmployees}
                  getDaysDifference={getDaysDifference}
                  onRetrain={handleRetrain}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  addNotification={addNotification}
                  statusFilterValue={tableStatusFilter}
                  onStatusFilterChange={setTableStatusFilter}
                />
              )}
            </Suspense>
          </>
        )}

        {activeTab === "analytics" && (
          <Suspense fallback={<SkeletonLoader rows={6} />}>
            <AnalyticsDashboard
              employees={tableEmployees}
              getDaysDifference={getDaysDifference}
            />
          </Suspense>
        )}

        {activeTab === "orgs" && <OrganizationsDocs employees={employees} />}
        {activeTab === "trainings" && <AdditionalTrainingsManager employees={employees} />}
        {activeTab === "permits" && (
          <PermitsRegistry addNotification={addNotification} />)}
        {activeTab === "orders" && (
          <OrdersRegistry addNotification={addNotification} />)}
      </div>
    </div>
  );
}

export default App;





