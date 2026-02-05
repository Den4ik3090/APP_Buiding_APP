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
import OrganizationsDocs from "./components/OrganizationManager.jsx"; // Тот самый новый компонент

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
  
  // Объединяем навигацию в одну переменную activeTab для чистоты кода
  // Возможные значения: 'table', 'analytics', 'orgs'
  const [activeTab, setActiveTab] = useState('table');

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("Все");

  const { notifications, addNotification, removeNotification } = useNotification();

  // --- AUTH bootstrap ---
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
        setActiveTab("table");
        setShowForm(false);
        setEditingEmployee(null);
      }
    });

    return () => {
      isMounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  // --- Load app data ---
  useEffect(() => {
    if (!session) return;
    initialLoad();
    fetchOrganizations();
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
      setEmployees(cloudData);
    } catch (error) {
      addNotification(TOAST_MESSAGES.DB_ERROR, TOAST_TYPES.ERROR);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromSupabase = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id,name,profession,birth_date,training_date,responsible,comment,photo_url,organization,additional_trainings,created_at")
      .order("name", { ascending: true });
    if (error) throw error;
    return formatDataForApp(data);
  };

  // ... (addEmployee, updateEmployee, handleDelete, handleRetrain остаются без изменений) ...
  const addEmployee = async (newEmployee) => { /* твой код из промпта */ };
  const updateEmployee = async (updated) => { /* твой код из промпта */ };
  const handleDelete = async (id) => { /* твой код из промпта */ };
  const handleRetrain = async (id) => { /* твой код из промпта */ };

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

  const exportCSV = () => { /* твой код из промпта */ };

  // --- UI Logic ---
  if (authLoading || loading) {
    return (
      <div className="app">
        <div className="container"><SkeletonLoader rows={8} /></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <LoginModal logo={logo} onSuccess={() => {}} onError={(m) => addNotification(m, TOAST_TYPES.ERROR)} />
      </div>
    );
  }

  return (
    <div className="app">
      <ToastContainer notifications={notifications} onRemove={removeNotification} />

      <div className="container">
        {/* Header */}
        <div className="header-main" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <img src={logo} alt="Logo" className="logo__img" />
            <h1 style={{ margin: 0 }}>Управление инструктажами</h1>
          </div>
          <button className="btn-danger" onClick={handleLogout}>Выйти</button>
        </div>

        {/* Stats Info */}
        <div className="info">
          Показано: <strong>{filteredEmployees.length}</strong> | 
          Просрочено: <strong style={{color: 'red'}}>{expiredCount}</strong>
        </div>

        {/* Navigation & Filters */}
        <div className="toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <div className="filter-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label>Организация:</label>
            <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} className="status-filter">
              <option value="Все">Все организации</option>
              {organizations.map((org) => <option key={org} value={org}>{org}</option>)}
            </select>
          </div>

          <div className="tabs-navigation" style={{ display: "flex", gap: 10 }}>
            <button 
              className={activeTab === 'table' ? 'btn-primary' : 'btn-export'} 
              onClick={() => setActiveTab('table')}
            >
              📋 Сотрудники
            </button>
            <button 
              className={activeTab === 'analytics' ? 'btn-primary' : 'btn-export'} 
              onClick={() => setActiveTab('analytics')}
            >
              📊 Аналитика
            </button>
            <button 
              className={activeTab === 'orgs' ? 'btn-primary' : 'btn-export'} 
              onClick={() => setActiveTab('orgs')}
            >
              🏢 Организации
            </button>
          </div>
        </div>

        {/* Main Content Render */}
        {activeTab === 'table' && (
          <>
            <div className="form-actions" style={{ marginBottom: 15 }}>
              <button className="btn-primary" onClick={handleAddNew}>+ Добавить сотрудника</button>
              <button className="btn-export" onClick={exportCSV}>📊 Экспорт CSV</button>
            </div>

            {showForm && (
              <EmployeeForm
                onAddEmployee={addEmployee}
                editingEmployee={editingEmployee}
                onUpdateEmployee={updateEmployee}
                onCancelEdit={cancelEdit}
                existingOrganizations={organizations}
                onPhotoUpload={() => addNotification(TOAST_MESSAGES.PHOTO_UPLOADED, TOAST_TYPES.SUCCESS)}
                onPhotoError={() => addNotification(TOAST_MESSAGES.PHOTO_UPLOAD_ERROR, TOAST_TYPES.ERROR)}
              />
            )}

            <Suspense fallback={<SkeletonLoader rows={8} />}>
              {filteredEmployees.length > 300 ? (
                <VirtualEmployeeTable
                  employees={filteredEmployees}
                  getDaysDifference={getDaysDifference}
                  onRetrain={handleRetrain}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ) : (
                <EmployeeTable
                  employees={filteredEmployees}
                  getDaysDifference={getDaysDifference}
                  onRetrain={handleRetrain}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              )}
            </Suspense>
          </>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard employees={filteredEmployees} getDaysDifference={getDaysDifference} />
        )}

        {activeTab === 'orgs' && (
          <OrganizationsDocs employees={employees} />
        )}
      </div>
    </div>
  );
}

export default App;