import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { TOAST_DURATION, TOAST_TYPES } from "../../utils/toastConfig";
import PrescriptionForm from "./PrescriptionForm.jsx";
import PrescriptionsTable from "./PrescriptionsTable.jsx";
import "./PrescriptionsRegistryStyle.css";

const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

const normalizeText = (value = "") => String(value).trim().toLowerCase();

// Статусы предписаний
export const PRESCRIPTION_STATUSES = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  OVERDUE: "overdue",
};

export const PRESCRIPTION_STATUS_LABELS = {
  [PRESCRIPTION_STATUSES.OPEN]: "Открыто",
  [PRESCRIPTION_STATUSES.IN_PROGRESS]: "В работе",
  [PRESCRIPTION_STATUSES.COMPLETED]: "Устранено",
  [PRESCRIPTION_STATUSES.OVERDUE]: "Просрочено",
};

/**
 * Главный компонент модуля "Реестр предписаний"
 */
export default function PrescriptionsRegistry({ addNotification = () => {} }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [objectFilter, setObjectFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadPrescriptions = useCallback(async () => {
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .order("issue_date", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки предписаний:", error);
      throw error;
    }

    setPrescriptions(data || []);
  }, []);

  const loadEmployees = useCallback(async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, profession, organization")
      .order("name");

    if (error) {
      console.error("Ошибка загрузки сотрудников:", error);
      throw error;
    }

    setEmployees(data || []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      await Promise.all([loadPrescriptions(), loadEmployees()]);
    } catch (error) {
      console.error("Ошибка загрузки данных реестра предписаний:", error);
      addNotification(
        "Не удалось загрузить реестр предписаний.",
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    } finally {
      setLoading(false);
    }
  }, [addNotification, loadEmployees, loadPrescriptions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const prescriptionsSubscription = supabase
      .channel("prescriptions_registry_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions" },
        () => {
          loadPrescriptions().catch((error) => {
            console.error("Ошибка фонового обновления предписаний:", error);
          });
        }
      )
      .subscribe();

    return () => {
      prescriptionsSubscription.unsubscribe();
    };
  }, [loadPrescriptions]);

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const prescriptionsWithMeta = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];

    return prescriptions.map((prescription) => {
      const responsiblePerson = prescription.responsible_person_id
        ? employeesById.get(prescription.responsible_person_id)
        : null;

      // Определяем реальный статус с учетом просрочки
      let actualStatus = prescription.status;
      if (
        prescription.status !== PRESCRIPTION_STATUSES.COMPLETED &&
        prescription.deadline &&
        prescription.deadline < today
      ) {
        actualStatus = PRESCRIPTION_STATUSES.OVERDUE;
      }

      return {
        ...prescription,
        responsible_person: responsiblePerson,
        actual_status: actualStatus,
      };
    });
  }, [employeesById, prescriptions]);

  const uniqueOrganizations = useMemo(() => {
    return Array.from(
      new Set(
        prescriptionsWithMeta.map((p) => p.organization).filter(Boolean)
      )
    ).sort((left, right) => collator.compare(left, right));
  }, [prescriptionsWithMeta]);

  const uniqueObjects = useMemo(() => {
    return Array.from(
      new Set(prescriptionsWithMeta.map((p) => p.object).filter(Boolean))
    ).sort((left, right) => collator.compare(left, right));
  }, [prescriptionsWithMeta]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: prescriptionsWithMeta.length,
      [PRESCRIPTION_STATUSES.OPEN]: 0,
      [PRESCRIPTION_STATUSES.IN_PROGRESS]: 0,
      [PRESCRIPTION_STATUSES.COMPLETED]: 0,
      [PRESCRIPTION_STATUSES.OVERDUE]: 0,
    };

    prescriptionsWithMeta.forEach((prescription) => {
      counts[prescription.actual_status] =
        (counts[prescription.actual_status] || 0) + 1;
    });

    return counts;
  }, [prescriptionsWithMeta]);

  const filteredPrescriptions = useMemo(() => {
    const normalizedQuery = normalizeText(deferredSearchQuery);

    return prescriptionsWithMeta.filter((prescription) => {
      if (normalizedQuery) {
        const responsibleName = prescription.responsible_person?.name || "";
        const searchIndex = [
          prescription.prescription_number,
          prescription.title,
          prescription.organization,
          prescription.object,
          responsibleName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchIndex.includes(normalizedQuery)) {
          return false;
        }
      }

      if (
        statusFilter !== "all" &&
        prescription.actual_status !== statusFilter
      ) {
        return false;
      }

      if (
        organizationFilter !== "all" &&
        prescription.organization !== organizationFilter
      ) {
        return false;
      }

      if (objectFilter !== "all" && prescription.object !== objectFilter) {
        return false;
      }

      if (dateFrom && prescription.issue_date < dateFrom) {
        return false;
      }

      if (dateTo && prescription.issue_date > dateTo) {
        return false;
      }

      return true;
    });
  }, [
    dateFrom,
    dateTo,
    deferredSearchQuery,
    objectFilter,
    organizationFilter,
    prescriptionsWithMeta,
    statusFilter,
  ]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== "all" ||
      organizationFilter !== "all" ||
      objectFilter !== "all" ||
      dateFrom ||
      dateTo
  );

  const handleCreatePrescription = useCallback(() => {
    setEditingPrescription(null);
    setShowForm(true);
  }, []);

  const handleEditPrescription = useCallback((prescription) => {
    setEditingPrescription(prescription);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingPrescription(null);
  }, []);

  const handleSavePrescription = useCallback(
    async ({ isEdit, prescription: updatedPrescription }) => {
      if (isEdit) {
        setPrescriptions((prev) =>
          prev.map((p) =>
            p.id === updatedPrescription.id ? { ...p, ...updatedPrescription } : p
          )
        );
      }

      addNotification(
        isEdit ? "Изменения сохранены." : "Предписание создано.",
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );

      handleCloseForm();
    },
    [addNotification, handleCloseForm]
  );

  const handleDeletePrescription = useCallback(
    async (prescriptionId) => {
      if (!window.confirm("Удалить это предписание из реестра?")) {
        return;
      }

      try {
        const { error } = await supabase
          .from("prescriptions")
          .delete()
          .eq("id", prescriptionId);

        if (error) {
          throw error;
        }

        await loadPrescriptions();
        addNotification(
          "Предписание удалено.",
          TOAST_TYPES.SUCCESS,
          TOAST_DURATION.NORMAL
        );
      } catch (error) {
        console.error("Ошибка удаления предписания:", error);
        addNotification(
          "Не удалось удалить предписание.",
          TOAST_TYPES.ERROR,
          TOAST_DURATION.NORMAL
        );
      }
    },
    [addNotification, loadPrescriptions]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setOrganizationFilter("all");
    setObjectFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  if (loading) {
    return (
      <div className="prescriptions-loading">
        <div className="spinner" />
        <p>Загрузка реестра предписаний...</p>
      </div>
    );
  }

  return (
    <div className="prescriptions-registry">
      <div className="prescriptions-header">
        <div className="prescriptions-header-content">
          <div className="prescriptions-header-title">
            <div className="prescriptions-header-icon">
              <AlertTriangle size={28} />
            </div>

            <div>
              <h1>Реестр предписаний</h1>
              <p>
                Контроль выписанных предписаний, сроков устранения и
                ответственных лиц.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary btn-create-prescription"
            onClick={handleCreatePrescription}
          >
            <Plus size={18} />
            Добавить предписание
          </button>
        </div>
      </div>

      <div className="prescriptions-stats">
        <div className="prescriptions-stat-card">
          <div className="prescriptions-stat-icon prescriptions-stat-icon-primary">
            <AlertTriangle size={20} />
          </div>
          <div className="prescriptions-stat-content">
            <div className="prescriptions-stat-value">{statusCounts.all}</div>
            <div className="prescriptions-stat-label">Всего предписаний</div>
          </div>
        </div>

        <div className="prescriptions-stat-card">
          <div className="prescriptions-stat-icon prescriptions-stat-icon-warning">
            <Clock size={20} />
          </div>
          <div className="prescriptions-stat-content">
            <div className="prescriptions-stat-value">
              {statusCounts[PRESCRIPTION_STATUSES.OPEN]}
            </div>
            <div className="prescriptions-stat-label">Открыто</div>
          </div>
        </div>

        <div className="prescriptions-stat-card">
          <div className="prescriptions-stat-icon prescriptions-stat-icon-info">
            <Clock size={20} />
          </div>
          <div className="prescriptions-stat-content">
            <div className="prescriptions-stat-value">
              {statusCounts[PRESCRIPTION_STATUSES.IN_PROGRESS]}
            </div>
            <div className="prescriptions-stat-label">В работе</div>
          </div>
        </div>

        <div className="prescriptions-stat-card">
          <div className="prescriptions-stat-icon prescriptions-stat-icon-success">
            <CheckCircle2 size={20} />
          </div>
          <div className="prescriptions-stat-content">
            <div className="prescriptions-stat-value">
              {statusCounts[PRESCRIPTION_STATUSES.COMPLETED]}
            </div>
            <div className="prescriptions-stat-label">Устранено</div>
          </div>
        </div>

        <div className="prescriptions-stat-card">
          <div className="prescriptions-stat-icon prescriptions-stat-icon-danger">
            <XCircle size={20} />
          </div>
          <div className="prescriptions-stat-content">
            <div className="prescriptions-stat-value">
              {statusCounts[PRESCRIPTION_STATUSES.OVERDUE]}
            </div>
            <div className="prescriptions-stat-label">Просрочено</div>
          </div>
        </div>
      </div>

      <div className="prescriptions-filters">
        <div className="prescriptions-filters-row">
          <div className="prescriptions-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Поиск по номеру, названию, организации или ответственному"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="prescriptions-filter-select">
            <Filter size={14} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Все статусы</option>
              <option value={PRESCRIPTION_STATUSES.OPEN}>
                {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.OPEN]}
              </option>
              <option value={PRESCRIPTION_STATUSES.IN_PROGRESS}>
                {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.IN_PROGRESS]}
              </option>
              <option value={PRESCRIPTION_STATUSES.COMPLETED}>
                {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.COMPLETED]}
              </option>
              <option value={PRESCRIPTION_STATUSES.OVERDUE}>
                {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.OVERDUE]}
              </option>
            </select>
          </div>

          <div className="prescriptions-filter-select">
            <Building2 size={14} />
            <select
              value={organizationFilter}
              onChange={(event) => setOrganizationFilter(event.target.value)}
            >
              <option value="all">Все организации</option>
              {uniqueOrganizations.map((organization) => (
                <option key={organization} value={organization}>
                  {organization}
                </option>
              ))}
            </select>
          </div>

          <div className="prescriptions-filter-select">
            <Filter size={14} />
            <select
              value={objectFilter}
              onChange={(event) => setObjectFilter(event.target.value)}
            >
              <option value="all">Все объекты</option>
              {uniqueObjects.map((objectName) => (
                <option key={objectName} value={objectName}>
                  {objectName}
                </option>
              ))}
            </select>
          </div>

          <div className="prescriptions-date-filter">
            <Calendar size={14} />
            <label htmlFor="prescriptions_date_from">От</label>
            <input
              id="prescriptions_date_from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>

          <div className="prescriptions-date-filter">
            <Calendar size={14} />
            <label htmlFor="prescriptions_date_to">До</label>
            <input
              id="prescriptions_date_to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={handleResetFilters}
            >
              Сбросить фильтры
            </button>
          )}
        </div>

        <div className="prescriptions-results-info">
          Показано <strong>{filteredPrescriptions.length}</strong> из{" "}
          <strong>{prescriptions.length}</strong> предписаний
        </div>
      </div>

      <div className="prescriptions-content">
        <PrescriptionsTable
          prescriptions={filteredPrescriptions}
          onEdit={handleEditPrescription}
          onDelete={handleDeletePrescription}
          hasFilters={hasActiveFilters}
        />
      </div>

      {showForm && (
        <PrescriptionForm
          prescription={editingPrescription}
          employees={employees}
          onClose={handleCloseForm}
          onSave={handleSavePrescription}
          addNotification={addNotification}
        />
      )}
    </div>
  );
}