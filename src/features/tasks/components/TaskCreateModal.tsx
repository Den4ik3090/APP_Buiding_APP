import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, User, AlertCircle, Calendar, AlignLeft } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useCreateTask, useTaskEmployeesQuery } from "../hooks/useTasks";
import styles from "./tasksModal.module.scss";

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
}

interface EmployeeOption {
  id: string;
  name: string;
}

const PRIORITIES = [
  { value: "low", label: "Низкий", color: "#437a22" },
  { value: "medium", label: "Средний", color: "#d19900" },
  { value: "high", label: "Высокий", color: "#da7101" },
  { value: "critical", label: "Критический", color: "#a13544" },
] as const;

const EMPTY = {
  title: "",
  description: "",
  due_date: "",
  status: "pending" as const,
  priority: "medium",
  assigned_to: "",
};

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function TaskCreateModal({ open, onClose }: TaskCreateModalProps) {
  const [params] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<typeof EMPTY>>({});
  const { data: employeeData = [], isLoading: employeesLoading } = useTaskEmployeesQuery();
  const employees: EmployeeOption[] = employeeData;
  const create = useCreateTask();

  const titleId = useId();
  const assigneeId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const statusId = useId();
  const descriptionId = useId();

  const modalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const siteIdParam = params.get("siteId");
  const siteId = isUuid(siteIdParam) ? siteIdParam : null;

  // ── Callbacks (before early return — hooks must be unconditional) ──────────

  const setField = useCallback((field: keyof typeof EMPTY, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setField(name as keyof typeof EMPTY, value);
    },
    [setField]
  );

  const validate = useCallback(() => {
    const nextErrors: Partial<typeof EMPTY> = {};
    if (!form.title.trim()) nextErrors.title = "Введите название задачи.";
    if (!form.due_date) nextErrors.due_date = "Укажите срок выполнения.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !create.isPending) {
        onClose();
      }
    },
    [onClose, create.isPending]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!validate()) return;

      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      await create.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        due_date: new Date(form.due_date).toISOString(),
        status: form.status,
        priority: form.priority as (typeof PRIORITIES)[number]["value"],
        assigned_to: form.assigned_to || null,
        site_id: siteId,
      });

      if (signal.aborted) return;

      setForm(EMPTY);
      onClose();
    },
    [create, form, onClose, siteId, validate]
  );

  const selectedPriority = useMemo(
    () => PRIORITIES.find((item) => item.value === form.priority),
    [form.priority]
  );

  // ── Effects ───────────────────────────────────────────────────────────────


  // Escape key to close
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !create.isPending) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose, create.isPending]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  // Body scroll lock while modal is open — position: fixed preserves scrollbar width
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.cssText = `position: fixed; top: -${scrollY}px; width: 100%; overflow-y: scroll;`;
    return () => {
      document.body.style.cssText = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Auto-focus first focusable element; trap Tab inside modal
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Abort any in-flight mutation on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Early return ──────────────────────────────────────────────────────────

  if (!open) return null;

  return createPortal(
    <div className={styles['tasks-modal-overlay']} onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        className={styles['tasks-modal']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-modal-title"
      >
        <div className={styles['tasks-modal-header']}>
          <div>
            <h2 id="tasks-modal-title" className={styles['tasks-modal-title']}>
              Новая задача
            </h2>
            <p className={styles['tasks-modal-subtitle']}>
              Заполните основные параметры задачи и назначьте исполнителя.
            </p>
          </div>

          <button
            type="button"
            className={styles['tasks-modal-close']}
            onClick={onClose}
            disabled={create.isPending}
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles['tasks-modal-body']}>
          <form className={styles['tasks-form']} onSubmit={handleSubmit}>
            <div className={styles['tasks-form-overview']}>
              <span className={styles['tasks-overview-badge']}>
                <Plus size={14} />
                Создание
              </span>

              <span className={styles['tasks-overview-badge']}>
                <AlertCircle size={14} />
                {selectedPriority?.label || "Средний"}
              </span>

              <span className={styles['tasks-overview-badge']}>
                <Calendar size={14} />
                {form.due_date || "Срок не указан"}
              </span>
            </div>

            <section className={styles['tasks-form-section']}>
              <div className={styles['tasks-section-heading']}>
                <h3>Основные данные</h3>
                <p>Название задачи, срок выполнения и начальный статус.</p>
              </div>

              <div className={styles['tasks-form-group']}>
                <label htmlFor={titleId}>
                  Название задачи <span className={styles['required']}>*</span>
                </label>
                <input
                  id={titleId}
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Например: Проверить наличие СИЗ на 2 этаже"
                  className={errors.title ? styles['input-error'] : ""}
                  aria-invalid={Boolean(errors.title)}
                  autoFocus
                />
                {errors.title && <p className={styles['tasks-error']}>{errors.title}</p>}
              </div>

              <div className={styles['tasks-form-grid']}>
                <div className={styles['tasks-form-group']}>
                  <label htmlFor={dueDateId}>
                    Срок устранения <span className={styles['required']}>*</span>
                  </label>
                  <input
                    id={dueDateId}
                    name="due_date"
                    type="date"
                    value={form.due_date}
                    onChange={handleChange}
                    className={errors.due_date ? styles['input-error'] : ""}
                    aria-invalid={Boolean(errors.due_date)}
                  />
                  {errors.due_date && (
                    <p className={styles['tasks-error']}>{errors.due_date}</p>
                  )}
                </div>

                <div className={styles['tasks-form-group']}>
                  <label htmlFor={statusId}>Начальный статус</label>
                  <select
                    id={statusId}
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="pending">Ожидает</option>
                    <option value="in_progress">В работе</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={styles['tasks-form-section']}>
              <div className={styles['tasks-section-heading']}>
                <h3>Исполнитель и приоритет</h3>
                <p>Назначьте ответственного и выберите уровень срочности.</p>
              </div>

              <div className={styles['tasks-form-grid']}>
                <div className={styles['tasks-form-group']}>
                  <label htmlFor={assigneeId}>
                    <User size={16} />
                    <span>Ответственный</span>
                  </label>
                  <select
                    id={assigneeId}
                    name="assigned_to"
                    value={form.assigned_to}
                    onChange={handleChange}
                    disabled={employeesLoading}
                  >
                    <option value="">
                      {employeesLoading ? "Загрузка сотрудников..." : "Не назначен"}
                    </option>
                    {employees.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles['tasks-form-group']}>
                  <label htmlFor={priorityId}>
                    <AlertCircle size={16} />
                    <span>Приоритет</span>
                  </label>
                  <select
                    id={priorityId}
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                  <p className={styles['tasks-form-hint']}>
                    Текущий приоритет: {selectedPriority?.label}
                  </p>
                </div>
              </div>
            </section>

            <section className={styles['tasks-form-section']}>
              <div className={styles['tasks-section-heading']}>
                <h3>Описание</h3>
                <p>Укажите детали задачи, требования или контекст.</p>
              </div>

              <div className={styles['tasks-form-group']}>
                <label htmlFor={descriptionId}>
                  <AlignLeft size={16} />
                  <span>Подробное описание</span>
                </label>
                <textarea
                  id={descriptionId}
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Опишите детали нарушения или требования..."
                  rows={4}
                />
              </div>
            </section>

            <div className={styles['tasks-form-actions']}>
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={create.isPending}
              >
                Отмена
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={create.isPending}
              >
                {create.isPending ? "Создание..." : "Создать задачу"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
