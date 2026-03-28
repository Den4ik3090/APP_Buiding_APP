import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Building2,
  Calendar,
  FileText,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { TOAST_DURATION, TOAST_TYPES } from "../../utils/toastConfig";
import OrderForm from "./OrderForm";
import OrdersTable from "./OrdersTable";
import "./OrdersRegistry.css";

const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});

const normalizeText = (value = "") => String(value).trim().toLowerCase();

/**
 * Главный компонент модуля "Реестр приказов и распорядительных документов"
 */
export default function OrdersRegistry({ addNotification = () => {} }) {
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [objectFilter, setObjectFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("creation_date", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки приказов:", error);
      throw error;
    }

    setOrders(data || []);
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
      await Promise.all([loadOrders(), loadEmployees()]);
    } catch (error) {
      console.error("Ошибка загрузки данных реестра приказов:", error);
      addNotification(
        "Не удалось загрузить реестр приказов.",
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    } finally {
      setLoading(false);
    }
  }, [addNotification, loadEmployees, loadOrders]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const ordersSubscription = supabase
      .channel("orders_registry_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders().catch((error) => {
            console.error("Ошибка фонового обновления приказов:", error);
          });
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, [loadOrders]);

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const ordersWithMeta = useMemo(() => {
    return orders.map((order) => ({
      ...order,
      responsible_persons_names: (order.responsible_persons || [])
        .map((personId) => employeesById.get(personId)?.name)
        .filter(Boolean),
    }));
  }, [employeesById, orders]);

  const uniqueObjects = useMemo(() => {
    return Array.from(
      new Set(ordersWithMeta.map((order) => order.object).filter(Boolean))
    ).sort((left, right) => collator.compare(left, right));
  }, [ordersWithMeta]);

  const uniqueOrganizations = useMemo(() => {
    return Array.from(
      new Set(ordersWithMeta.map((order) => order.organization).filter(Boolean))
    ).sort((left, right) => collator.compare(left, right));
  }, [ordersWithMeta]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = normalizeText(deferredSearchQuery);

    return ordersWithMeta.filter((order) => {
      if (normalizedQuery) {
        const responsibleSearchText = (order.responsible_persons_names || []).join(" ");
        const searchIndex = [
          order.order_number,
          order.order_name,
          order.object,
          order.organization,
          responsibleSearchText,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchIndex.includes(normalizedQuery)) {
          return false;
        }
      }

      if (objectFilter !== "all" && order.object !== objectFilter) {
        return false;
      }

      if (organizationFilter !== "all" && order.organization !== organizationFilter) {
        return false;
      }

      if (dateFrom && order.creation_date < dateFrom) {
        return false;
      }

      if (dateTo && order.creation_date > dateTo) {
        return false;
      }

      return true;
    });
  }, [dateFrom, dateTo, deferredSearchQuery, objectFilter, ordersWithMeta, organizationFilter]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      objectFilter !== "all" ||
      organizationFilter !== "all" ||
      dateFrom ||
      dateTo
  );

  const handleCreateOrder = useCallback(() => {
    setEditingOrder(null);
    setShowForm(true);
  }, []);

  const handleEditOrder = useCallback((order) => {
    setEditingOrder(order);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingOrder(null);
  }, []);

const handleSaveOrder = useCallback(
  async ({ isEdit, order: updatedOrder }) => {
    // Обновить state сразу
    if (isEdit) {
      setOrders(prev => 
        prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o)
      );
    }

    addNotification(
      isEdit ? "Изменения сохранены." : "Приказ создан.",
      TOAST_TYPES.SUCCESS,
      TOAST_DURATION.NORMAL
    );

    handleCloseForm();
  },
  [addNotification, handleCloseForm]
);

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (!window.confirm("Удалить этот приказ из реестра?")) {
        return;
      }

      try {
        const { error } = await supabase.from("orders").delete().eq("id", orderId);

        if (error) {
          throw error;
        }

        await loadOrders();
        addNotification(
          "Приказ удалён.",
          TOAST_TYPES.SUCCESS,
          TOAST_DURATION.NORMAL
        );
      } catch (error) {
        console.error("Ошибка удаления приказа:", error);
        addNotification(
          "Не удалось удалить приказ.",
          TOAST_TYPES.ERROR,
          TOAST_DURATION.NORMAL
        );
      }
    },
    [addNotification, loadOrders]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setObjectFilter("all");
    setOrganizationFilter("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  if (loading) {
    return (
      <div className="orders-loading">
        <div className="spinner" />
        <p>Загрузка реестра приказов...</p>
      </div>
    );
  }

  return (
    <div className="orders-registry">
      <div className="orders-header">
        <div className="orders-header-content">
          <div className="orders-header-title">
            <div className="orders-header-icon">
              <FileText size={28} />
            </div>

            <div>
              <h1>Реестр приказов и распорядительных документов</h1>
              <p>
                Управляйте приказами, ответственными лицами и ссылками на
                подтверждающие документы.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary btn-create-order"
            onClick={handleCreateOrder}
          >
            <Plus size={18} />
            Создать приказ
          </button>
        </div>
      </div>

      <div className="orders-filters">
        <div className="orders-filters-row">
          <div className="orders-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Поиск по номеру, названию, организации или ответственным"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="orders-filter-select">
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

          <div className="orders-filter-select">
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

          <div className="orders-date-filter">
            <Calendar size={14} />
            <label htmlFor="orders_date_from">От</label>
            <input
              id="orders_date_from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>

          <div className="orders-date-filter">
            <Calendar size={14} />
            <label htmlFor="orders_date_to">До</label>
            <input
              id="orders_date_to"
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

        <div className="orders-results-info">
          Показано <strong>{filteredOrders.length}</strong> из{" "}
          <strong>{orders.length}</strong> приказов
        </div>
      </div>

      <div className="orders-content">
        <OrdersTable
          orders={filteredOrders}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
          hasFilters={hasActiveFilters}
        />
      </div>

      {showForm && (
        <OrderForm
          order={editingOrder}
          employees={employees}
          onClose={handleCloseForm}
          onSave={handleSaveOrder}
          addNotification={addNotification}
        />
      )}
    </div>
  );
}
