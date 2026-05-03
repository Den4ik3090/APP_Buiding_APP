import React, {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  CalendarDays,
  GraduationCap,
  Image as ImageIcon,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { ADDITIONAL_TRAINING_TYPES } from "../utils/constants";
import "./EmployeeForm.scss";

const getTodayDateValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const createInitialFormData = () => ({
  name: "",
  profession: "",
  birthDate: "",
  trainingDate: getTodayDateValue(),
  responsible: "",
  comment: "",
  photo_url: "",
  organization: "",
  additionalTrainings: [],
});

const mapEmployeeToFormData = (employee) => ({
  name: employee?.name || "",
  profession: employee?.profession || "",
  birthDate: employee?.birthDate || "",
  trainingDate: employee?.trainingDate || getTodayDateValue(),
  responsible: employee?.responsible || "",
  comment: employee?.comment || "",
  photo_url: employee?.photo_url || "",
  organization: employee?.organization || "",
  additionalTrainings: Array.isArray(employee?.additionalTrainings)
    ? employee.additionalTrainings
    : [],
});

const GENERAL_FIELDS = [
  {
    label: "ФИО",
    name: "name",
    type: "text",
    placeholder: "Иван Петров",
    required: true,
  },
  {
    label: "Должность",
    name: "profession",
    type: "text",
    placeholder: "Инженер по охране труда",
    required: true,
  },
  {
    label: "Дата рождения",
    name: "birthDate",
    type: "date",
    placeholder: "",
    required: false,
  },
  {
    label: "Дата инструктажа",
    name: "trainingDate",
    type: "date",
    placeholder: "",
    required: true,
  },
  {
    label: "Ответственное лицо",
    name: "responsible",
    type: "text",
    placeholder: "ФИО ответственного",
    required: false,
  },
];

const checkTrainingStatus = (dateReceived, months) => {
  if (!dateReceived || !months) {
    return { isExpired: false, isSoon: false, daysLeft: 0 };
  }

  const start = new Date(dateReceived);
  const expiryDate = new Date(start);
  expiryDate.setMonth(expiryDate.getMonth() + parseInt(months, 10));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysLeft = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isExpired: daysLeft <= 0,
    isSoon: daysLeft > 0 && daysLeft <= 30,
    daysLeft,
  };
};

const TrainingStatus = memo(function TrainingStatus({ training }) {
  const { isExpired, isSoon, daysLeft } = useMemo(
    () => checkTrainingStatus(training.dateReceived, training.expiryMonths),
    [training.dateReceived, training.expiryMonths]
  );

  if (!training.dateReceived || !training.expiryMonths) {
    return <span className="employees-status employees-status--neutral">Не заполнено</span>;
  }

  if (isExpired) {
    return (
      <span className="employees-status employees-status--expired">
        Истекло ({Math.abs(daysLeft)} дн.)
      </span>
    );
  }

  if (isSoon) {
    return (
      <span className="employees-status employees-status--warning">
        Скоро истекает ({daysLeft} дн.)
      </span>
    );
  }

  return (
    <span className="employees-status employees-status--actual">
      Актуально ({daysLeft} дн.)
    </span>
  );
});

const TrainingRow = memo(function TrainingRow({ training, onUpdate, onRemove }) {
  const handleTypeChange = useCallback(
    (event) => onUpdate(training.id, "type", event.target.value),
    [onUpdate, training.id]
  );

  const handleDateChange = useCallback(
    (event) => onUpdate(training.id, "dateReceived", event.target.value),
    [onUpdate, training.id]
  );

  const handleExpiryChange = useCallback(
    (event) => onUpdate(training.id, "expiryMonths", event.target.value),
    [onUpdate, training.id]
  );

  const handleRemove = useCallback(() => {
    onRemove(training.id);
  }, [onRemove, training.id]);

  const rowStatus = useMemo(
    () => checkTrainingStatus(training.dateReceived, training.expiryMonths),
    [training.dateReceived, training.expiryMonths]
  );

  return (
    <tr className={rowStatus.isExpired ? "employees-training-row-expired" : ""}>
      <td>
        <select
          value={training.type}
          onChange={handleTypeChange}
          className="employees-table-control"
        >
          {ADDITIONAL_TRAINING_TYPES.map((type, index) => (
            <option key={`${type}-${index}`} value={type}>
              {type}
            </option>
          ))}
        </select>
      </td>

      <td>
        <input
          type="date"
          value={training.dateReceived || ""}
          onChange={handleDateChange}
          className="employees-table-control"
        />
      </td>

      <td>
        <div className="employees-duration-wrap">
          <input
            type="number"
            value={training.expiryMonths || ""}
            onChange={handleExpiryChange}
            min="1"
            className="employees-table-control employees-table-control--small"
          />
          <span className="employees-duration-label">мес.</span>
        </div>
      </td>

      <td>
        <TrainingStatus training={training} />
      </td>

      <td className="employees-table-actions-cell">
        <button
          type="button"
          onClick={handleRemove}
          className="employees-icon-button employees-icon-button--danger"
          aria-label="Удалить обучение"
          title="Удалить обучение"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
});

const GeneralField = memo(function GeneralField({
  field,
  value,
  error,
  onChange,
}) {
  return (
    <div className="employees-form-group">
      <label htmlFor={field.name}>
        {field.label}{" "}
        {field.required && <span className="required">*</span>}
      </label>

      <input
        id={field.name}
        name={field.name}
        type={field.type}
        value={value || ""}
        onChange={onChange}
        placeholder={field.placeholder || ""}
        className={error ? "input-error" : ""}
        aria-invalid={Boolean(error)}
      />

      {error && <p className="employees-error">{error}</p>}
    </div>
  );
});

function EmployeeForm({
  onAddEmployee,
  editingEmployee,
  onUpdateEmployee,
  onCancelEdit,
  existingOrganizations = [],
  onPhotoUpload,
  onPhotoError,
}) {
  const isEdit = Boolean(editingEmployee);
  const organizationFieldId = useId();
  const photoInputId = useId();

  const [activeTab, setActiveTab] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(() =>
    editingEmployee ? mapEmployeeToFormData(editingEmployee) : createInitialFormData()
  );
  const [errors, setErrors] = useState({});

  const modalRef = useRef(null);
  const abortRef = useRef(null);

  const organizations = useMemo(() => {
    const uniqueOrganizations = new Set(
      existingOrganizations.filter(Boolean).map((item) => item.trim())
    );

    if (editingEmployee?.organization) {
      uniqueOrganizations.add(editingEmployee.organization);
    }

    return Array.from(uniqueOrganizations).sort((left, right) =>
      left.localeCompare(right, "ru", { sensitivity: "base" })
    );
  }, [existingOrganizations, editingEmployee?.organization]);

  const trainingStats = useMemo(() => {
    const trainings = formData.additionalTrainings || [];

    return trainings.reduce(
      (acc, training) => {
        const { isExpired, isSoon } = checkTrainingStatus(
          training.dateReceived,
          training.expiryMonths
        );

        if (isExpired) acc.expired += 1;
        else if (isSoon) acc.soon += 1;
        else if (training.dateReceived && training.expiryMonths) acc.actual += 1;
        else acc.unfilled += 1;

        return acc;
      },
      { expired: 0, soon: 0, actual: 0, unfilled: 0 }
    );
  }, [formData.additionalTrainings]);

  useEffect(() => {
    setFormData(
      editingEmployee
        ? mapEmployeeToFormData(editingEmployee)
        : createInitialFormData()
    );
    setErrors({});
    setActiveTab("general");
  }, [editingEmployee]);

  // Escape key to close
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving && !uploading) {
        onCancelEdit();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancelEdit, saving, uploading]);

  // Body scroll lock while modal is mounted
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.cssText = `position: fixed; top: -${scrollY}px; width: 100%; overflow-y: scroll;`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Auto-focus first focusable element; trap Tab inside modal
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    getFocusable()[0]?.focus();

    const handleTab = (event) => {
      if (event.key !== "Tab") return;
      const els = getFocusable();
      const first = els[0];
      const last = els[els.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, []);

  // Abort any in-flight save request on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const setFieldValue = useCallback((field, value) => {
    setFormData((prev) => {
      if (prev[field] === value) {
        return prev;
      }

      return {
        ...prev,
        [field]: value,
      };
    });

    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      return {
        ...prev,
        [field]: "",
      };
    });
  }, []);

  const handleChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      setFieldValue(name, value);
    },
    [setFieldValue]
  );

  const handleAddNewOrg = useCallback(() => {
    const newOrg = window.prompt("Введите название новой организации:");
    if (!newOrg?.trim()) return;

    const trimmed = newOrg.trim();
    setFieldValue("organization", trimmed);
  }, [setFieldValue]);

  const addTrainingRow = useCallback(() => {
    const newTraining = {
      id: Date.now(),
      type: ADDITIONAL_TRAINING_TYPES[0] || "Прочее",
      dateReceived: getTodayDateValue(),
      expiryMonths: 12,
    };

    setFormData((prev) => ({
      ...prev,
      additionalTrainings: [...prev.additionalTrainings, newTraining],
    }));
  }, []);

  const removeTrainingRow = useCallback((id) => {
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: prev.additionalTrainings.filter((item) => item.id !== id),
    }));
  }, []);

  const updateTrainingRow = useCallback((id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: prev.additionalTrainings.map((item) =>
        item.id === id
          ? {
            ...item,
            [field]: field === "expiryMonths" ? value : value,
          }
          : item
      ),
    }));
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Введите ФИО сотрудника.";
    }

    if (!formData.profession.trim()) {
      nextErrors.profession = "Введите должность.";
    }

    if (!formData.trainingDate) {
      nextErrors.trainingDate = "Укажите дату инструктажа.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const handleOverlayClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget && !saving && !uploading) {
        onCancelEdit();
      }
    },
    [onCancelEdit, saving, uploading]
  );

  // Memoized tab switchers — avoid new function references on every render
  const handleTabGeneral = useCallback(() => setActiveTab("general"), []);
  const handleTabTrainings = useCallback(() => setActiveTab("trainings"), []);
  const handleClearPhoto = useCallback(
    () => setFieldValue("photo_url", ""),
    [setFieldValue]
  );

  const handlePhotoUpload = useCallback(
    async (event) => {
      try {
        setUploading(true);

        const files = event.target.files;
        if (!files || files.length === 0) {
          return;
        }

        const file = files[0];

        if (file.size > 5 * 1024 * 1024) {
          onPhotoError?.(new Error("Размер файла не должен превышать 5MB"));
          return;
        }

        if (!file.type.startsWith("image/")) {
          onPhotoError?.(new Error("Пожалуйста, выберите изображение"));
          return;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("employee-photos")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("employee-photos")
          .getPublicUrl(filePath);

        setFormData((prev) => ({
          ...prev,
          photo_url: data.publicUrl,
        }));

        onPhotoUpload?.();
      } catch (error) {
        console.error("Ошибка загрузки фото:", error);
        onPhotoError?.(error);
      } finally {
        setUploading(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [onPhotoError, onPhotoUpload]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!validateForm()) {
        setActiveTab("general");
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      setSaving(true);

      try {
        const payload = {
          ...formData,
          name: formData.name.trim(),
          profession: formData.profession.trim(),
          responsible: formData.responsible.trim(),
          comment: formData.comment.trim(),
          organization: formData.organization.trim(),
        };

        if (editingEmployee) {
          await onUpdateEmployee(payload);
        } else {
          await onAddEmployee(payload);
        }
      } finally {
        if (!signal.aborted) setSaving(false);
      }
    },
    [editingEmployee, formData, onAddEmployee, onUpdateEmployee, validateForm]
  );

  return (
    <div className="employees-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="employees-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employees-modal-title"
      >
        <div className="employees-modal-header">
          <div>
            <h2 id="employees-modal-title" className="employees-modal-title">
              {isEdit ? "Редактирование сотрудника" : "Новый сотрудник"}
            </h2>
            <p className="employees-modal-subtitle">
              Заполните основные данные сотрудника, организацию и дополнительное
              обучение.
            </p>
          </div>

          <button
            type="button"
            className="employees-modal-close"
            onClick={onCancelEdit}
            disabled={saving || uploading}
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </div>

        <div className="employees-modal-body">
          <form className="employees-form" onSubmit={handleSubmit}>
            <div className="employees-form-overview">
              <span className="employees-overview-badge">
                <User size={14} />
                {isEdit ? "Редактирование" : "Создание"}
              </span>

              <span className="employees-overview-badge">
                <Building2 size={14} />
                {formData.organization || "Организация не выбрана"}
              </span>

              <span className="employees-overview-badge">
                <GraduationCap size={14} />
                Обучений: {formData.additionalTrainings.length}
              </span>

              <span className="employees-overview-badge">
                <ImageIcon size={14} />
                {formData.photo_url ? "Фото загружено" : "Без фото"}
              </span>
            </div>

            <div className="employees-tabs">
              <button
                type="button"
                className={`employees-tab ${activeTab === "general" ? "is-active" : ""}`}
                onClick={handleTabGeneral}
              >
                Основные данные
              </button>

              <button
                type="button"
                className={`employees-tab ${activeTab === "trainings" ? "is-active" : ""}`}
                onClick={handleTabTrainings}
              >
                Дополнительное обучение
                {trainingStats.expired > 0 && (
                  <span className="employees-tab-counter employees-tab-counter--danger">
                    {trainingStats.expired}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "general" && (
              <>
                <section className="employees-form-section">
                  <div className="employees-section-heading">
                    <h3>Профиль сотрудника</h3>
                    <p>Фотография используется в карточке сотрудника и списках.</p>
                  </div>

                  <div className="employees-profile-card">
                    <div className="employees-photo-preview">
                      {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Фото сотрудника" />
                      ) : (
                        <div className="employees-photo-placeholder">
                          <ImageIcon size={28} />
                        </div>
                      )}
                    </div>

                    <div className="employees-photo-meta">
                      <div className="employees-photo-title">
                        <h4>Фотография</h4>
                        <p>Поддерживаются PNG, JPG и WEBP размером до 5MB.</p>
                      </div>

                      <div className="employees-photo-actions">
                        <label
                          htmlFor={photoInputId}
                          className={`employees-upload-button ${uploading ? "is-disabled" : ""
                            }`}
                        >
                          {uploading ? "Загрузка..." : "Загрузить фото"}
                        </label>

                        <input
                          id={photoInputId}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          disabled={uploading}
                          hidden
                        />

                        {formData.photo_url && (
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={handleClearPhoto}
                            disabled={uploading}
                          >
                            Удалить фото
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="employees-form-section">
                  <div className="employees-section-heading">
                    <h3>Основные данные</h3>
                    <p>ФИО, должность, даты и ответственное лицо.</p>
                  </div>

                  <div className="employees-form-grid">
                    {GENERAL_FIELDS.map((field) => (
                      <GeneralField
                        key={field.name}
                        field={field}
                        value={formData[field.name]}
                        error={errors[field.name]}
                        onChange={handleChange}
                      />
                    ))}

                    <div className="employees-form-group">
                      <label htmlFor={organizationFieldId}>Организация</label>

                      <div className="employees-organization-row">
                        <select
                          id={organizationFieldId}
                          name="organization"
                          value={formData.organization}
                          onChange={handleChange}
                        >
                          <option value="">Не выбрана</option>
                          {organizations.map((organization) => (
                            <option key={organization} value={organization}>
                              {organization}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="employees-icon-button"
                          onClick={handleAddNewOrg}
                          title="Добавить новую организацию"
                          aria-label="Добавить новую организацию"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <p className="employees-form-hint">
                        Можно выбрать организацию из списка или добавить новую.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="employees-form-section">
                  <div className="employees-section-heading">
                    <h3>Комментарий</h3>
                    <p>Дополнительные сведения о сотруднике, роли или назначении.</p>
                  </div>

                  <div className="employees-form-group">
                    <label htmlFor="comment">Комментарий</label>
                    <textarea
                      id="comment"
                      name="comment"
                      rows={4}
                      value={formData.comment}
                      onChange={handleChange}
                      placeholder="Дополнительная информация о сотруднике..."
                    />
                  </div>
                </section>
              </>
            )}

            {activeTab === "trainings" && (
              <>
                <section className="employees-form-section">
                  <div className="employees-section-heading">
                    <h3>Дополнительное обучение</h3>
                    <p>
                      Ведите список обучений, даты получения и сроки действия.
                    </p>
                  </div>

                  <div className="employees-training-summary">
                    <span className="employees-overview-badge">
                      <CalendarDays size={14} />
                      Актуально: {trainingStats.actual}
                    </span>

                    <span className="employees-overview-badge employees-overview-badge--warning">
                      <Users size={14} />
                      Скоро истекает: {trainingStats.soon}
                    </span>

                    <span className="employees-overview-badge employees-overview-badge--danger">
                      <GraduationCap size={14} />
                      Истекло: {trainingStats.expired}
                    </span>
                  </div>

                  <div className="employees-trainings-toolbar">
                    <button
                      type="button"
                      onClick={addTrainingRow}
                      className="btn-primary"
                    >
                      Добавить обучение
                    </button>
                  </div>

                  {formData.additionalTrainings.length > 0 ? (
                    <div className="employees-table-scroll">
                      <table className="employees-trainings-table">
                        <thead>
                          <tr>
                            <th>Тип обучения</th>
                            <th>Дата получения</th>
                            <th>Срок действия</th>
                            <th>Статус</th>
                            <th>Действие</th>
                          </tr>
                        </thead>

                        <tbody>
                          {formData.additionalTrainings.map((training) => (
                            <TrainingRow
                              key={training.id}
                              training={training}
                              onUpdate={updateTrainingRow}
                              onRemove={removeTrainingRow}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="employees-empty-state">
                      <GraduationCap size={22} />
                      <p>
                        Дополнительные обучения пока не добавлены. Используйте кнопку
                        выше, чтобы создать первую запись.
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}

            <div className="employees-form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onCancelEdit}
                disabled={saving || uploading}
              >
                Отмена
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving || uploading}
              >
                {saving
                  ? "Сохранение..."
                  : isEdit
                    ? "Сохранить изменения"
                    : "Добавить сотрудника"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EmployeeForm;
