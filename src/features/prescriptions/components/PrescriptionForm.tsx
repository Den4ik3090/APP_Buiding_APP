import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { createPrescription, updatePrescription } from "../services/prescriptionsService";
import type { RegistryEmployee } from "../services/prescriptionsService";
import { TOAST_DURATION, TOAST_TYPES } from "@/shared/constants/toast";
import type { NotificationType } from "@/shared/constants/toast";
import {
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_STATUS_LABELS,
} from "@/entities/prescription";
import type { PrescriptionInsert, PrescriptionUpdate } from "@/entities/prescription";
import type { PrescriptionStatusValue } from "@/entities/prescription";
import ResponsiblePersonSelect from "./ResponsiblePersonSelect";

type AddNotificationFn = (message: string, type: NotificationType, duration?: number) => void;

type PrescriptionFormRow = {
  id: string;
  prescription_number?: string;
  title?: string;
  issue_date?: string;
  deadline?: string | null;
  object?: string | null;
  organization?: string | null;
  responsible_person_id?: string | null;
  status?: string;
  description?: string | null;
  document_url?: string | null;
};

interface PrescriptionFormState {
  prescription_number: string;
  title: string;
  issue_date: string;
  deadline: string;
  object: string;
  organization: string;
  responsible_person_id: string | null;
  status: string;
  description: string;
  document_url: string;
}

type SaveResult = {
  isEdit: boolean;
  prescription: PrescriptionFormRow | Record<string, unknown>;
};

interface PrescriptionFormProps {
  prescription?: PrescriptionFormRow | null;
  employees?: RegistryEmployee[];
  onClose?: () => void;
  onSave?: (result: SaveResult) => void | Promise<void>;
  addNotification?: AddNotificationFn;
}

const getTodayDateValue = (): string => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const createDefaultFormState = (): PrescriptionFormState => ({
  prescription_number: "",
  title: "",
  issue_date: getTodayDateValue(),
  deadline: "",
  object: "",
  organization: "",
  responsible_person_id: null,
  status: PRESCRIPTION_STATUSES.OPEN,
  description: "",
  document_url: "",
});

const mapPrescriptionToFormState = (prescription: PrescriptionFormRow): PrescriptionFormState => ({
  prescription_number: prescription.prescription_number || "",
  title: prescription.title || "",
  issue_date: prescription.issue_date || getTodayDateValue(),
  deadline: prescription.deadline || "",
  object: prescription.object || "",
  organization: prescription.organization || "",
  responsible_person_id: prescription.responsible_person_id || null,
  status: prescription.status || PRESCRIPTION_STATUSES.OPEN,
  description: prescription.description || "",
  document_url: prescription.document_url || "",
});

export default function PrescriptionForm({
  prescription,
  employees = [],
  onClose = () => {},
  onSave = async () => {},
  addNotification = () => {},
}: PrescriptionFormProps) {
  const isEdit = Boolean(prescription);
  const organizationFieldId = useId();
  const responsibleFieldId = useId();
  const statusFieldId = useId();

  const [form, setForm] = useState<PrescriptionFormState>(() =>
    prescription
      ? mapPrescriptionToFormState(prescription)
      : createDefaultFormState()
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const employeesById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees]
  );

  const organizations = useMemo(() => {
    const uniqueOrganizations = new Set<string>(
      employees.map((employee) => employee.organization).filter(Boolean)
    );

    if (prescription?.organization) {
      uniqueOrganizations.add(prescription.organization);
    }

    return Array.from(uniqueOrganizations).sort((left, right) =>
      left.localeCompare(right, "ru", { sensitivity: "base" })
    );
  }, [employees, prescription?.organization]);

  const selectedEmployee = useMemo(
    () =>
      form.responsible_person_id
        ? employeesById.get(form.responsible_person_id) ?? null
        : null,
    [employeesById, form.responsible_person_id]
  );

  const availableResponsibleCount = useMemo(() => {
    if (!form.organization) {
      return employees.length;
    }
    return employees.filter(
      (employee) => employee.organization === form.organization
    ).length;
  }, [employees, form.organization]);

  useEffect(() => {
    setForm(
      prescription
        ? mapPrescriptionToFormState(prescription)
        : createDefaultFormState()
    );
    setErrors({});
  }, [prescription]);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.cssText = `position: fixed; top: -${scrollY}px; width: 100%; overflow-y: scroll;`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    getFocusable()[0]?.focus();

    const handleTab = (event: KeyboardEvent) => {
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const setFieldValue = useCallback(<K extends keyof PrescriptionFormState>(
    field: K,
    value: PrescriptionFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: null };
    });
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setFieldValue(name as keyof PrescriptionFormState, value);
    },
    [setFieldValue]
  );

  const handleResponsiblePersonChange = useCallback(
    (personId: string | null) => {
      setForm((prev) => ({ ...prev, responsible_person_id: personId }));
      setErrors((prev) => {
        if (!prev.responsible_person_id) return prev;
        return { ...prev, responsible_person_id: null };
      });
    },
    []
  );

  const validateForm = useCallback(() => {
    const nextErrors: Record<string, string> = {};

    if (!form.prescription_number.trim()) {
      nextErrors.prescription_number = "Введите номер предписания.";
    }

    if (!form.title.trim()) {
      nextErrors.title = "Введите название или описание нарушения.";
    }

    if (!form.issue_date) {
      nextErrors.issue_date = "Укажите дату выписки.";
    }

    if (!form.responsible_person_id) {
      nextErrors.responsible_person_id = "Выберите ответственное лицо.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !saving) {
        onClose();
      }
    },
    [onClose, saving]
  );

  const handleModalClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!validateForm()) {
        addNotification(
          "Заполните обязательные поля перед сохранением.",
          TOAST_TYPES.WARNING,
          TOAST_DURATION.NORMAL
        );
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      setSaving(true);

      const payload: PrescriptionInsert & { description?: string | null; document_url?: string | null } = {
        prescription_number: form.prescription_number.trim(),
        title: form.title.trim(),
        issue_date: form.issue_date,
        deadline: form.deadline || null,
        object: form.object.trim() || null,
        organization: form.organization.trim() || null,
        responsible_person_id: form.responsible_person_id,
        status: form.status,
        description: form.description.trim() || null,
        document_url: form.document_url.trim() || null,
      };

      try {
        if (isEdit && prescription) {
          await updatePrescription(prescription.id, payload as PrescriptionUpdate);
        } else {
          await createPrescription(payload as unknown as PrescriptionInsert);
        }

        if (signal.aborted) return;

        await onSave({
          isEdit,
          prescription: isEdit && prescription ? { ...prescription, ...payload } : payload,
        });
      } catch (error) {
        if (signal.aborted) return;
        console.error("Ошибка сохранения предписания:", error);
        addNotification(
          "Не удалось сохранить предписание. Проверьте данные и попробуйте ещё раз.",
          TOAST_TYPES.ERROR,
          TOAST_DURATION.NORMAL
        );
      } finally {
        if (!signal.aborted) setSaving(false);
      }
    },
    [
      addNotification,
      form,
      isEdit,
      onSave,
      prescription,
      validateForm,
    ]
  );

  return (
    <div className="prescriptions-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className="prescriptions-modal"
        onClick={handleModalClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-form-title"
      >
        <div className="prescriptions-modal-content">
          <div className="prescriptions-modal-header">
            <div className="prescriptions-modal-title-section">
              <div className="prescriptions-modal-icon">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2
                  id="prescription-form-title"
                  className="prescriptions-modal-title"
                >
                  {isEdit ? "Редактирование предписания" : "Новое предписание"}
                </h2>
                <p className="prescriptions-modal-subtitle">
                  {isEdit
                    ? "Внесите изменения в данные предписания"
                    : "Заполните информацию о выписанном предписании"}
                </p>
              </div>
            </div>

            <button
              type="button"
              className="prescriptions-modal-close"
              onClick={onClose}
              disabled={saving}
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>

          <form className="prescriptions-form" onSubmit={handleSubmit}>
            <div className="prescriptions-overview">
              <span className="prescriptions-overview-badge">
                <Calendar size={14} />
                {form.issue_date || "Дата не указана"}
              </span>

              <span className="prescriptions-overview-badge">
                <Building2 size={14} />
                {form.organization || "Все организации"}
              </span>

              <span
                className={`prescriptions-overview-badge prescriptions-status-badge-mini prescription-status-${form.status}`}
              >
                {PRESCRIPTION_STATUS_LABELS[form.status as PrescriptionStatusValue]}
              </span>
            </div>

            <section className="prescriptions-form-section">
              <div className="prescriptions-section-heading">
                <h3>Основные данные</h3>
                <p>Номер, дата выписки и описание нарушения.</p>
              </div>

              <div className="prescriptions-form-grid">
                <div className="prescriptions-form-group">
                  <label htmlFor="prescription_issue_date">
                    Дата выписки <span className="required">*</span>
                  </label>
                  <input
                    id="prescription_issue_date"
                    name="issue_date"
                    type="date"
                    value={form.issue_date}
                    onChange={handleInputChange}
                    className={errors.issue_date ? "input-error" : ""}
                    aria-invalid={Boolean(errors.issue_date)}
                  />
                  {errors.issue_date && (
                    <p className="prescriptions-error">{errors.issue_date}</p>
                  )}
                </div>

                <div className="prescriptions-form-group">
                  <label htmlFor="prescription_number">
                    Номер предписания <span className="required">*</span>
                  </label>
                  <input
                    id="prescription_number"
                    name="prescription_number"
                    type="text"
                    value={form.prescription_number}
                    onChange={handleInputChange}
                    placeholder="Например: 01/2024"
                    className={errors.prescription_number ? "input-error" : ""}
                    aria-invalid={Boolean(errors.prescription_number)}
                    autoComplete="off"
                  />
                  {errors.prescription_number && (
                    <p className="prescriptions-error">
                      {errors.prescription_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="prescriptions-form-group">
                <label htmlFor="prescription_title">
                  Название / Описание нарушения{" "}
                  <span className="required">*</span>
                </label>
                <input
                  id="prescription_title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Например: Отсутствие ограждения на высоте"
                  className={errors.title ? "input-error" : ""}
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title && (
                  <p className="prescriptions-error">{errors.title}</p>
                )}
              </div>
            </section>

            <section className="prescriptions-form-section">
              <div className="prescriptions-section-heading">
                <h3>Организация и объект</h3>
                <p>Укажите, где было выявлено нарушение.</p>
              </div>

              <div className="prescriptions-form-grid">
                <div className="prescriptions-form-group">
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
                  <p className="prescriptions-form-hint">
                    {form.organization
                      ? `Доступно сотрудников: ${availableResponsibleCount}`
                      : "Выберите организацию, чтобы сузить список ответственных."}
                  </p>
                </div>

                <div className="prescriptions-form-group">
                  <label htmlFor="prescription_object">Объект</label>
                  <input
                    id="prescription_object"
                    name="object"
                    type="text"
                    value={form.object}
                    onChange={handleInputChange}
                    placeholder="Например: Участок №3"
                  />
                </div>
              </div>
            </section>

            <section className="prescriptions-form-section">
              <div className="prescriptions-field-heading">
                <div>
                  <label htmlFor={responsibleFieldId}>
                    Ответственное лицо <span className="required">*</span>
                  </label>
                  <p>
                    Выберите сотрудника, ответственного за устранение нарушения.
                  </p>
                </div>
              </div>

              <div className="responsible-person-selector">
                <ResponsiblePersonSelect
                  employees={employees}
                  inputId={responsibleFieldId}
                  selectedPersonId={form.responsible_person_id}
                  organization={form.organization}
                  onChange={handleResponsiblePersonChange}
                  placeholder="Выберите ответственного сотрудника"
                />
              </div>

              {errors.responsible_person_id && (
                <p className="prescriptions-error">
                  {errors.responsible_person_id}
                </p>
              )}

              {selectedEmployee &&
                form.organization &&
                selectedEmployee.organization !== form.organization && (
                  <div className="prescriptions-inline-note">
                    <span>
                      Выбранный сотрудник относится к другой организации (
                      {selectedEmployee.organization}).
                    </span>
                  </div>
                )}
            </section>

            <section className="prescriptions-form-section">
              <div className="prescriptions-section-heading">
                <h3>Срок устранения и статус</h3>
                <p>Укажите крайний срок и текущий статус предписания.</p>
              </div>

              <div className="prescriptions-form-grid">
                <div className="prescriptions-form-group">
                  <label htmlFor="prescription_deadline">
                    Срок устранения
                  </label>
                  <input
                    id="prescription_deadline"
                    name="deadline"
                    type="date"
                    value={form.deadline}
                    onChange={handleInputChange}
                    min={form.issue_date}
                  />
                  <p className="prescriptions-form-hint">
                    Дата, до которой нарушение должно быть устранено.
                  </p>
                </div>

                <div className="prescriptions-form-group">
                  <label htmlFor={statusFieldId}>Статус</label>
                  <select
                    id={statusFieldId}
                    name="status"
                    value={form.status}
                    onChange={handleInputChange}
                  >
                    <option value={PRESCRIPTION_STATUSES.OPEN}>
                      {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.OPEN]}
                    </option>
                    <option value={PRESCRIPTION_STATUSES.IN_PROGRESS}>
                      {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.IN_PROGRESS]}
                    </option>
                    <option value={PRESCRIPTION_STATUSES.COMPLETED}>
                      {PRESCRIPTION_STATUS_LABELS[PRESCRIPTION_STATUSES.COMPLETED]}
                    </option>
                  </select>
                  <p className="prescriptions-form-hint">
                    Просроченные предписания определяются автоматически.
                  </p>
                </div>
              </div>
            </section>

            <section className="prescriptions-form-section">
              <div className="prescriptions-section-heading">
                <h3>Дополнительно</h3>
                <p>Детальное описание и ссылка на документ.</p>
              </div>

              <div className="prescriptions-form-group">
                <label htmlFor="prescription_description">
                  Детальное описание
                </label>
                <textarea
                  id="prescription_description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Подробное описание нарушения, мер по устранению и т.д."
                />
              </div>

              <div className="prescriptions-form-group">
                <label htmlFor="prescription_document_url">
                  <Upload size={16} />
                  <span>Ссылка на документ</span>
                </label>
                <input
                  id="prescription_document_url"
                  name="document_url"
                  type="text"
                  value={form.document_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/prescription.pdf или /storage/prescriptions/doc.pdf"
                  autoComplete="off"
                  spellCheck={false}
                  className={errors.document_url ? "input-error" : ""}
                  aria-invalid={Boolean(errors.document_url)}
                />
                {errors.document_url ? (
                  <p className="prescriptions-error">{errors.document_url}</p>
                ) : (
                  <p className="prescriptions-form-hint">
                    Можно указать прямую ссылку на скан предписания или путь к
                    файлу.
                  </p>
                )}
              </div>
            </section>

            <div className="prescriptions-form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={saving}
              >
                Отмена
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Сохранение..."
                  : isEdit
                    ? "Сохранить изменения"
                    : "Создать предписание"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
