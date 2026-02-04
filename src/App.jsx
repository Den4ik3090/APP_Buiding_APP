import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from "react";

import EmployeeForm from "./components/EmployeeForm";
import ToastContainer from "./components/ToastContainer.jsx";
import VirtualEmployeeTable from "./components/VirtualEmployeeTable.jsx";
import SkeletonLoader from "./components/Skeleton";
import AnalyticsDashboard from "./components/AnalyticsDashboard.jsx";
import LoginModal from "./components/LoginModal.jsx";

import { supabase } from "./supabaseClient";
import { useNotification } from "./hooks/useNotification";
import { TOAST_MESSAGES, TOAST_TYPES, TOAST_DURATION } from "./utils/toastConfig";
import { DAYS_THRESHOLD } from "./utils/constants";

import logo from "./assets/img/logo_PUTEVI.png";

const EmployeeTable = lazy(() => import("./components/Table"));

function App() {
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ AUTH state (в App оставляем только session + authLoading)
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ✅ ВАЖНО: эти состояния нужны для фильтра
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("Все");

  // ✅ View: table | analytics
  const [view, setView] = useState("table");

  const { notifications, addNotification, removeNotification } = useNotification();

  // --- AUTH bootstrap: check session + subscribe ---
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) console.error("getSession error:", error);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session ?? null);

      if (event === "SIGNED_OUT") {
        setEmployees([]);
        setOrganizations([]);
        setSelectedOrg("Все");
        setView("table");
        setShowForm(false);
        setEditingEmployee(null);
      }
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  // --- Load app data ONLY when authorized ---
  useEffect(() => {
    if (!session) return;
    initialLoad();
    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase.from("employees").select("organization");
      if (!error && data) {
        const uniqueOrgs = [...new Set(data.map((i) => i.organization).filter(Boolean))];
        setOrganizations(uniqueOrgs.sort());
      }
    } catch (error) {
      console.error("Ошибка при загрузке организаций:", error);
    }
  };

  const initialLoad = async () => {
    setLoading(true);
    try {
      const cloudData = await fetchFromSupabase();

      if (cloudData.length === 0) {
        const localData = JSON.parse(localStorage.getItem("employees") || "[]");
        if (localData.length > 0) {
          await migrateLocalDataToCloud(localData);
        } else {
          setEmployees([]);
        }
      } else {
        setEmployees(cloudData);
      }
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
      console.error("Ошибка при загрузке:", error);
    } finally {
      setLoading(false);
    }
  };

  const migrateLocalDataToCloud = async (localData) => {
    try {
      const preparedData = localData.map(({ id, ...rest }) => ({
        name: rest.name,
        profession: rest.profession,
        birth_date: rest.birthDate || null,
        training_date: rest.trainingDate,
        responsible: rest.responsible || null,
        comment: rest.comment || null,
        organization: rest.organization || null,
        additional_trainings: rest.additionalTrainings || [],
      }));

      const { data, error } = await supabase
        .from("employees")
        .insert(preparedData)
        .select();

      if (!error && data) {
        setEmployees(formatDataForApp(data));
        localStorage.removeItem("employees");
        addNotification("Данные успешно перенесены в облако ☁️", TOAST_TYPES.SUCCESS);
        await fetchOrganizations();
      } else {
        throw error;
      }
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
      console.error("Ошибка при миграции:", error);
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

  const addEmployee = async (newEmployee) => {
    try {
      if (!newEmployee.name || !newEmployee.trainingDate) {
        addNotification(
          TOAST_MESSAGES.VALIDATION_ERROR,
          TOAST_TYPES.WARNING,
          TOAST_DURATION.LONG
        );
        return;
      }

      const { data, error } = await supabase
        .from("employees")
        .insert([
          {
            name: newEmployee.name,
            profession: newEmployee.profession,
            birth_date: newEmployee.birthDate || null,
            training_date: newEmployee.trainingDate,
            responsible: newEmployee.responsible || null,
            comment: newEmployee.comment || null,
            photo_url: newEmployee.photo_url || null,
            organization: newEmployee.organization || null,
            additional_trainings: newEmployee.additionalTrainings || [],
          },
        ])
        .select();

      if (!error && data) {
        setEmployees((prev) => [formatDataForApp(data)[0], ...prev]);
        setShowForm(false);
        addNotification(TOAST_MESSAGES.EMPLOYEE_ADDED, TOAST_TYPES.SUCCESS);
        await fetchOrganizations();
      } else {
        throw error;
      }
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR, TOAST_DURATION.LONG);
      console.error("Ошибка при добавлении:", error);
    }
  };

  const updateEmployee = async (updated) => {
    try {
      if (!updated.name || !updated.trainingDate) {
        addNotification(
          TOAST_MESSAGES.VALIDATION_ERROR,
          TOAST_TYPES.WARNING,
          TOAST_DURATION.LONG
        );
        return;
      }

      const { error } = await supabase
        .from("employees")
        .update({
          name: updated.name,
          profession: updated.profession,
          birth_date: updated.birthDate,
          training_date: updated.trainingDate,
          responsible: updated.responsible,
          comment: updated.comment,
          photo_url: updated.photo_url,
          organization: updated.organization,
          additional_trainings: updated.additionalTrainings,
        })
        .eq("id", updated.id);

      if (!error) {
        setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        cancelEdit();
        addNotification(TOAST_MESSAGES.EMPLOYEE_UPDATED, TOAST_TYPES.SUCCESS);
        await fetchOrganizations();
      } else {
        throw error;
      }
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR, TOAST_DURATION.LONG);
      console.error("Ошибка при обновлении:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить сотрудника безвозвратно?")) return;

    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (!error) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        addNotification(TOAST_MESSAGES.EMPLOYEE_DELETED, TOAST_TYPES.SUCCESS);
        await fetchOrganizations();
      } else {
        throw error;
      }
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR, TOAST_DURATION.LONG);
      console.error("Ошибка при удалении:", error);
    }
  };

  const handleRetrain = async (id) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("employees")
        .update({ training_date: today })
        .eq("id", id);

      if (!error) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === id ? { ...e, trainingDate: today } : e))
        );
        addNotification(TOAST_MESSAGES.EMPLOYEE_RETRAINED, TOAST_TYPES.SUCCESS);
      } else {
        throw error;
      }
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR, TOAST_DURATION.LONG);
      console.error("Ошибка при переподготовке:", error);
    }
  };

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
    setView("table");
  };

  const handleAddNew = () => {
    setEditingEmployee(null);
    setShowForm(true);
    setView("table");
  };

  const cancelEdit = () => {
    setEditingEmployee(null);
    setShowForm(false);
  };

  const todayText = useMemo(() => new Date().toLocaleDateString("ru-RU"), []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) =>
      selectedOrg === "Все" ? true : emp.organization === selectedOrg
    );
  }, [employees, selectedOrg]);

  const expiredCount = useMemo(() => {
    return filteredEmployees.filter(
      (emp) => getDaysDifference(emp.trainingDate) >= DAYS_THRESHOLD
    ).length;
  }, [filteredEmployees, getDaysDifference]);

  const exportCSV = () => {
    try {
      const headers = ["ФИО", "Организация", "Профессия", "Дата инструктажа", "Статус"];
      const rows = filteredEmployees.map((emp) => {
        const days = getDaysDifference(emp.trainingDate);
        const status = days >= DAYS_THRESHOLD ? "Переподготовка" : "Актуален";
        return [emp.name, emp.organization, emp.profession, emp.trainingDate, status].join(";");
      });

      const csvContent = headers.join(";") + "\n" + rows.join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `report_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      addNotification(TOAST_MESSAGES.EXPORT_SUCCESS, TOAST_TYPES.SUCCESS);
    } catch (error) {
      addNotification(TOAST_MESSAGES.EXPORT_ERROR, TOAST_TYPES.ERROR, TOAST_DURATION.LONG);
      console.error("Ошибка при экспорте:", error);
    }
  };

  // --- UI states: auth first ---
  if (authLoading) {
    return (
      <div className="app">
        <ToastContainer notifications={notifications} onRemove={removeNotification} />
        <div className="container">
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <ToastContainer notifications={notifications} onRemove={removeNotification} />
        <LoginModal
          logo={logo}
          onSuccess={() => addNotification("Вход выполнен", TOAST_TYPES.SUCCESS)}
          onError={(message) =>
            addNotification(message || "Ошибка входа", TOAST_TYPES.ERROR, TOAST_DURATION.LONG)
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app">
        <ToastContainer notifications={notifications} onRemove={removeNotification} />
        <div className="container">
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <ToastContainer notifications={notifications} onRemove={removeNotification} />

      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={logo} alt="Logo" className="logo__img" />
            <h1 style={{ margin: 0 }}>Управление инструктажами</h1>
          </div>

          <button className="btn-export" onClick={handleLogout} title="Выйти">
            Выйти
          </button>
        </div>

        <div className="info">
          Сегодня: <strong>{todayText}</strong> | Показано:{" "}
          <strong>{filteredEmployees.length}</strong> | Просрочено:{" "}
          <strong>{expiredCount}</strong>
        </div>

        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor="org-filter">Организация:</label>
            <select
              id="org-filter"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="status-filter"
            >
              <option value="Все">Все</option>
              {organizations.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => setView("table")}
              title="Таблица"
              style={{ opacity: view === "table" ? 1 : 0.8 }}
            >
              Таблица
            </button>
            <button
              className="btn-export"
              onClick={() => setView("analytics")}
              title="Analytics"
              style={{ opacity: view === "analytics" ? 1 : 0.8 }}
            >
              Analytics
            </button>
          </div>
        </div>

        {view === "table" && (
          <div className="form-actions">
            <button className="btn-primary form-actions__btn-add" onClick={handleAddNew}>
              + Добавить сотрудника
            </button>
            <button className="btn-export" onClick={exportCSV}>
              📊 Экспортировать в CSV
            </button>
          </div>
        )}

        {view === "analytics" ? (
          <AnalyticsDashboard employees={filteredEmployees} getDaysDifference={getDaysDifference} />
        ) : (
          <>
            {showForm && (
              <EmployeeForm
                onAddEmployee={addEmployee}
                editingEmployee={editingEmployee}
                onUpdateEmployee={updateEmployee}
                onCancelEdit={cancelEdit}
                existingOrganizations={organizations}
                onPhotoUpload={() =>
                  addNotification(TOAST_MESSAGES.PHOTO_UPLOADED, TOAST_TYPES.SUCCESS)
                }
                onPhotoError={() =>
                  addNotification(TOAST_MESSAGES.PHOTO_UPLOAD_ERROR, TOAST_TYPES.ERROR)
                }
              />
            )}

            <Suspense fallback={<SkeletonLoader rows={8} />}>
              {filteredEmployees.length > 300 ? (
                <VirtualEmployeeTable
                  employees={filteredEmployees}
                  getDaysDifference={getDaysDifference}
                  emptyText="Нет данных для отображения"
                  onRetrain={handleRetrain}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ) : (
                <EmployeeTable
                  employees={filteredEmployees}
                  getDaysDifference={getDaysDifference}
                  emptyText="Нет данных для отображения"
                  onRetrain={handleRetrain}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onExport={exportCSV}
                />
              )}
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
