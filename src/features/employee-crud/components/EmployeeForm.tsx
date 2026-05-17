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
  User,
  Users,
  X,
} from "lucide-react";
import { uploadEmployeePhoto } from "../services/employeesService";
import type { Employee } from "@/entities/employee";
import type { EmployeeFormData, EmployeeFormProps } from "./employeeFormTypes";
import {
  createInitialFormData,
  mapEmployeeToFormData,
  GENERAL_FIELDS,
  checkTrainingStatus,
} from "./employeeFormHelpers";
import { TrainingRow } from "./EmployeeFormTrainingRow";
import { GeneralField } from "./EmployeeFormGeneralField";
import "./EmployeeForm.scss";

function EmployeeForm({
  onAddEmployee,
  editingEmployee,
  onUpdateEmployee,
  onCancelEdit,
  existingOrganizations = [],
  onPhotoUpload,
  onPhotoError,
}: EmployeeFormProps) {
  const isEdit = Boolean(editingEmployee);
  const organizationFieldId = useId();
  const photoInputId = useId();

  const [activeTab, setActiveTab] = useState<"general" | "trainings">(
    "general"
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(() =>
    editingEmployee ? mapEmployeeToFormData(editingEmployee) : createInitialFormData()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const organizations = useMemo(() => {
    const base = Array.isArray(existingOrganizations) ? existingOrganizations : [];
    const current = formData.organization.trim();
    if (current && !base.includes(current)) return [...base, current].sort();
    return base;
  }, [existingOrganizations, formData.organization]);

  const trainingStats = useMemo(() => {
    let actual = 0;
    let soon = 0;
    let expired = 0;

    formData.additionalTrainings.forEach((t) => {
      const { isExpired, isSoon } = checkTrainingStatus(
        t.dateReceived,
        t.expiryMonths
      );
      if (isExpired) expired += 1;
      else if (isSoon) soon += 1;
      else actual += 1;
    });

    return { actual, soon, expired };
  }, [formData.additionalTrainings]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving && !uploading) onCancelEdit();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancelEdit, saving, uploading]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, []);

  const setFieldValue = useCallback(
    (name: keyof EmployeeFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => {
        if (!prev[name as string]) return prev;
        const next = { ...prev };
        delete next[name as string];
        return next;
      });
    },
    []
  );

  const handleChange = useCallback(
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { name, value } = event.target;
      setFieldValue(name as keyof EmployeeFormData, value);
    },
    [setFieldValue]
  );

  const handleAddNewOrg = useCallback(() => {
    const name = window.prompt("Название новой организации:");
    if (name?.trim()) {
      setFieldValue("organization", name.trim());
    }
  }, [setFieldValue]);

  const addTrainingRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: [
        ...prev.additionalTrainings,
        {
          id: Date.now(),
          type: "Пожарно-технический минимум",
          dateReceived: "",
          expiryMonths: 12,
        },
      ],
    }));
  }, []);

  const removeTrainingRow = useCallback((id: number) => {
    setFormData((prev) => ({
      ...prev,
      additionalTrainings: prev.additionalTrainings.filter(
        (item) => item.id !== id
      ),
    }));
  }, []);

  const updateTrainingRow = useCallback(
    (
      id: number,
      field: keyof import("./employeeFormTypes").FormAdditionalTraining,
      value: string
    ) => {
      setFormData((prev) => ({
        ...prev,
        additionalTrainings: prev.additionalTrainings.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      }));
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const nextErrors: Record<string, string> = {};

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
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !saving && !uploading) {
        onCancelEdit();
      }
    },
    [onCancelEdit, saving, uploading]
  );

  const handleTabGeneral = useCallback(() => setActiveTab("general"), []);
  const handleTabTrainings = useCallback(() => setActiveTab("trainings"), []);
  const handleClearPhoto = useCallback(
    () => setFieldValue("photo_url", ""),
    [setFieldValue]
  );

  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        setUploading(true);

        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        if (file.size > 5 * 1024 * 1024) {
          onPhotoError?.(new Error("Размер файла не должен превышать 5MB"));
          return;
        }

        if (!file.type.startsWith("image/")) {
          onPhotoError?.(new Error("Пожалуйста, выберите изображение"));
          return;
        }

        const publicUrl = await uploadEmployeePhoto(file);

        setFormData((prev) => ({ ...prev, photo_url: publicUrl }));

        onPhotoUpload?.();
      } catch (error) {
        console.error("Ошибка загрузки фото:", error);
        onPhotoError?.(error as Error);
      } finally {
        setUploading(false);
        if (event.target) event.target.value = "";
      }
    },
    [onPhotoError, onPhotoUpload]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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
        } as unknown as Employee;

        if (editingEmployee) {
          await onUpdateEmployee({ ...payload, id: editingEmployee.id });
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
                    <p>
                      Фотография используется в карточке сотрудника и списках.
                    </p>
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
                          className={`employees-upload-button ${uploading ? "is-disabled" : ""}`}
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
                    <p>
                      Дополнительные сведения о сотруднике, роли или
                      назначении.
                    </p>
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
                        Дополнительные обучения пока не добавлены. Используйте
                        кнопку выше, чтобы создать первую запись.
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

export default memo(EmployeeForm);
