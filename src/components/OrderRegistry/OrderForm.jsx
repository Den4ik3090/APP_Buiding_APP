import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Building2, FileText, Upload, Users, X } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { TOAST_DURATION, TOAST_TYPES } from "../../utils/toastConfig";
import ResponsiblePersonsMultiSelect from "./ResponsiblePersonMultiSelect";

const getTodayDateValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const createDefaultFormState = () => ({
  order_number: "",
  order_name: "",
  creation_date: getTodayDateValue(),
  object: "",
  responsible_persons: [],
  organization: "",
  description: "",
  document_url: "",
});

const mapOrderToFormState = (order) => ({
  order_number: order?.order_number || "",
  order_name: order?.order_name || "",
  creation_date: order?.creation_date || getTodayDateValue(),
  object: order?.object || "",
  responsible_persons: Array.isArray(order?.responsible_persons)
    ? order.responsible_persons
    : [],
  organization: order?.organization || "",
  description: order?.description || "",
  document_url: order?.document_url || "",
});

/**
 * Форма создания/редактирования приказа
 */
export default function OrderForm({
  order,
  employees = [],
  onClose = () => {},
  onSave = async () => {},
  addNotification = () => {},
}) {
  const isEdit = Boolean(order);
  const organizationFieldId = useId();
  const responsibleFieldId = useId();
  const [form, setForm] = useState(() =>
    order ? mapOrderToFormState(order) : createDefaultFormState()
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const organizations = useMemo(() => {
    const uniqueOrganizations = new Set(
      employees.map((employee) => employee.organization).filter(Boolean)
    );

    if (order?.organization) {
      uniqueOrganizations.add(order.organization);
    }

    return Array.from(uniqueOrganizations).sort((left, right) =>
      left.localeCompare(right, "ru", { sensitivity: "base" })
    );
  }, [employees, order?.organization]);

  const selectedEmployees = useMemo(
    () =>
      form.responsible_persons
        .map((personId) => employeesById.get(personId))
        .filter(Boolean),
    [employeesById, form.responsible_persons]
  );

  const availableResponsibleCount = useMemo(() => {
    if (!form.organization) {
      return employees.length;
    }

    return employees.filter(
      (employee) => employee.organization === form.organization
    ).length;
  }, [employees, form.organization]);

  const mismatchedResponsibleCount = useMemo(() => {
    if (!form.organization) {
      return 0;
    }

    return selectedEmployees.filter(
      (employee) => employee.organization && employee.organization !== form.organization
    ).length;
  }, [form.organization, selectedEmployees]);

  useEffect(() => {
    setForm(order ? mapOrderToFormState(order) : createDefaultFormState());
    setErrors({});
  }, [order]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const setFieldValue = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      return { ...prev, [field]: null };
    });
  }, []);

  const handleInputChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      setFieldValue(name, value);
    },
    [setFieldValue]
  );

  const handleResponsiblePersonsChange = useCallback((nextPersons) => {
    setForm((prev) => ({ ...prev, responsible_persons: nextPersons }));
    setErrors((prev) => {
      if (!prev.responsible_persons) {
        return prev;
      }

      return { ...prev, responsible_persons: null };
    });
  }, []);

  const clearMismatchedResponsiblePersons = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      responsible_persons: prev.responsible_persons.filter((personId) => {
        const employee = employeesById.get(personId);
        return employee && employee.organization === prev.organization;
      }),
    }));
  }, [employeesById]);

  const validateForm = useCallback(() => {
    const nextErrors = {};

    if (!form.order_number.trim()) {
      nextErrors.order_number = "Введите номер приказа.";
    }

    if (!form.order_name.trim()) {
      nextErrors.order_name = "Введите наименование приказа.";
    }

    if (!form.creation_date) {
      nextErrors.creation_date = "Укажите дату создания.";
    }

    if (!form.responsible_persons.length) {
      nextErrors.responsible_persons = "Выберите хотя бы одного ответственного.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleOverlayClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget && !saving) {
        onClose();
      }
    },
    [onClose, saving]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!validateForm()) {
        addNotification(
          "Заполните обязательные поля перед сохранением.",
          TOAST_TYPES.WARNING,
          TOAST_DURATION.NORMAL
        );
        return;
      }

      setSaving(true);

      const payload = {
        order_number: form.order_number.trim(),
        order_name: form.order_name.trim(),
        creation_date: form.creation_date,
        object: form.object.trim() || null,
        responsible_persons: form.responsible_persons,
        organization: form.organization.trim() || null,
        description: form.description.trim() || null,
        document_url: form.document_url.trim() || null,
      };
        console.log('=== PAYLOAD ===', payload); // <- ДОБАВЬ ЭТО
    console.log('isEdit:', isEdit); // 

      try {
        const { error } = isEdit
          ? await supabase.from("orders").update(payload).eq("id", order.id)
          : await supabase.from("orders").insert(payload);

        if (error) {
          throw error;
        }

        await onSave({
          isEdit,
          order: isEdit ? { ...order, ...payload } : payload,
        });
      } catch (error) {
        console.error("Ошибка сохранения приказа:", error);
        addNotification(
          "Не удалось сохранить приказ. Проверьте данные и попробуйте ещё раз.",
          TOAST_TYPES.ERROR,
          TOAST_DURATION.NORMAL
        );
      } finally {
        setSaving(false);
      }
    },
    [addNotification, form, isEdit, onSave, order?.id, validateForm]
  );

  return (
    <div className="orders-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="orders-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orders-modal-title"
      >
        <div className="orders-modal-header">
          <div>
            <h2 id="orders-modal-title" className="orders-modal-title">
              {isEdit ? "Редактирование приказа" : "Новый приказ"}
            </h2>
            <p className="orders-modal-subtitle">
              Заполните реквизиты приказа и назначьте ответственных сотрудников.
            </p>
          </div>

          <button
            type="button"
            className="orders-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </div>

        <div className="orders-modal-body">
          <form className="orders-form" onSubmit={handleSubmit}>
            <div className="orders-form-overview">
              <span className="orders-overview-badge">
                <FileText size={14} />
                {isEdit ? "Редактирование" : "Создание"}
              </span>

              <span className="orders-overview-badge">
                <Users size={14} />
                Ответственных: {form.responsible_persons.length}
              </span>

              <span className="orders-overview-badge">
                <Building2 size={14} />
                {form.organization || "Все организации"}
              </span>
            </div>

            <section className="orders-form-section">
              <div className="orders-section-heading">
                <h3>Основные данные</h3>
                <p>Номер, дата и краткое название приказа.</p>
              </div>

              <div className="orders-form-grid">
                <div className="orders-form-group">
                  <label htmlFor="order_creation_date">
                    Дата создания <span className="required">*</span>
                  </label>
                  <input
                    id="order_creation_date"
                    name="creation_date"
                    type="date"
                    value={form.creation_date}
                    onChange={handleInputChange}
                    className={errors.creation_date ? "input-error" : ""}
                    aria-invalid={Boolean(errors.creation_date)}
                  />
                  {errors.creation_date && (
                    <p className="orders-error">{errors.creation_date}</p>
                  )}
                </div>

                <div className="orders-form-group">
                  <label htmlFor="order_number">
                    Номер приказа <span className="required">*</span>
                  </label>
                  <input
                    id="order_number"
                    name="order_number"
                    type="text"
                    value={form.order_number}
                    onChange={handleInputChange}
                    placeholder="Например: 123-ОТ"
                    className={errors.order_number ? "input-error" : ""}
                    aria-invalid={Boolean(errors.order_number)}
                    autoComplete="off"
                  />
                  {errors.order_number && (
                    <p className="orders-error">{errors.order_number}</p>
                  )}
                </div>
              </div>

              <div className="orders-form-group">
                <label htmlFor="order_name">
                  Наименование приказа <span className="required">*</span>
                </label>
                <input
                  id="order_name"
                  name="order_name"
                  type="text"
                  value={form.order_name}
                  onChange={handleInputChange}
                  placeholder="Например: О назначении ответственного за охрану труда"
                  className={errors.order_name ? "input-error" : ""}
                  aria-invalid={Boolean(errors.order_name)}
                />
                {errors.order_name && (
                  <p className="orders-error">{errors.order_name}</p>
                )}
              </div>
            </section>

            <section className="orders-form-section">
              <div className="orders-section-heading">
                <h3>Организация и объект</h3>
                <p>Организация помогает быстрее выбрать ответственных сотрудников.</p>
              </div>

              <div className="orders-form-grid">
                <div className="orders-form-group">
                  <label htmlFor={organizationFieldId}>Организация</label>
                  <select
                    id={organizationFieldId}
                    name="organization"
                    value={form.organization}
                    onChange={handleInputChange}
                  >
                    <option value="">Все организации</option>
                    {organizations.map((organization) => (
                      <option key={organization} value={organization}>
                        {organization}
                      </option>
                    ))}
                  </select>
                  <p className="orders-form-hint">
                    {form.organization
                      ? `Доступно сотрудников: ${availableResponsibleCount}`
                      : "Выберите организацию, чтобы сузить список ответственных."}
                  </p>
                </div>

                <div className="orders-form-group">
                  <label htmlFor="order_object">Объект</label>
                  <input
                    id="order_object"
                    name="object"
                    type="text"
                    value={form.object}
                    onChange={handleInputChange}
                    placeholder="Например: Стройплощадка №5"
                  />
                </div>
              </div>
            </section>

            <section className="orders-form-section">
              <div className="orders-field-heading">
                <div>
                  <label htmlFor={responsibleFieldId}>
                    Ответственные лица <span className="required">*</span>
                  </label>
                  <p>
                    Поиск работает по имени, должности и организации. При выборе
                    организации список сотрудников автоматически сужается.
                  </p>
                </div>

                <div className="orders-field-stat">
                  Выбрано: {form.responsible_persons.length}
                </div>
              </div>

              <div className="responsible-persons-selector">
                <ResponsiblePersonsMultiSelect
                  employees={employees}
                  inputId={responsibleFieldId}
                  selectedPersons={form.responsible_persons}
                  organization={form.organization}
                  onChange={handleResponsiblePersonsChange}
                  placeholder="Выберите ответственных сотрудников"
                />
              </div>

              {errors.responsible_persons && (
                <p className="orders-error">{errors.responsible_persons}</p>
              )}

              {mismatchedResponsibleCount > 0 && (
                <div className="orders-inline-note">
                  <span>
                    В списке есть сотрудники из других организаций:{" "}
                    {mismatchedResponsibleCount}
                  </span>
                  <button
                    type="button"
                    className="orders-inline-action"
                    onClick={clearMismatchedResponsiblePersons}
                  >
                    Оставить только сотрудников выбранной организации
                  </button>
                </div>
              )}
            </section>

            <section className="orders-form-section">
              <div className="orders-section-heading">
                <h3>Дополнительно</h3>
                <p>Описание приказа и ссылка на скан или PDF.</p>
              </div>

              <div className="orders-form-group">
                <label htmlFor="order_description">Описание / комментарии</label>
                <textarea
                  id="order_description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Дополнительная информация о приказе..."
                />
              </div>

              <div className="orders-form-group">
                <label htmlFor="order_document_url">
                  <Upload size={16} />
                  <span>Ссылка на документ</span>
                </label>
                <input
                  id="order_document_url"
                  name="document_url"
                  type="text"
                  value={form.document_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/order.pdf или /storage/orders/order.pdf"
                  autoComplete="off"
                  spellCheck={false}
                  className={errors.document_url ? "input-error" : ""}
                  aria-invalid={Boolean(errors.document_url)}
                />
                {errors.document_url ? (
                  <p className="orders-error">{errors.document_url}</p>
                ) : (
                  <p className="orders-form-hint">
                    Можно указать прямую ссылку, относительный путь или адрес источника,
                    откуда файл будет открыт для скачивания.
                  </p>
                )}
              </div>
            </section>

            <div className="orders-form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={saving}
              >
                Отмена
              </button>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving
                  ? "Сохранение..."
                  : isEdit
                    ? "Сохранить изменения"
                    : "Создать приказ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
