import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, User, AlertCircle, Calendar, AlignLeft } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useCreateTask } from "../hooks/useTasks";
import { supabase } from "@/shared/api/supabase";
import "./tasks.css";
import "./tasksModal.scss";

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
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const create = useCreateTask();

  const titleId = useId();
  const assigneeId = useId();
  const priorityId = useId();
  const dueDateId = useId();
  const statusId = useId();
  const descriptionId = useId();

  const siteIdParam = params.get("siteId");
  const siteId = isUuid(siteIdParam) ? siteIdParam : null;

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      setEmployeesLoading(true);

      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Ошибка загрузки сотрудников:", error);
        if (!cancelled) setEmployees([]);
      } else {
        if (!cancelled) {
          setEmployees(
            (data ?? []).map((item) => ({
              id: item.id,
              name: item.name,
            }))
          );
        }
      }

      if (!cancelled) setEmployeesLoading(false);
    }

    if (open) {
      loadEmployees();
    }

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !create.isPending) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, create.isPending]);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  function setField(field: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  }

  function validate() {
    const nextErrors: Partial<typeof EMPTY> = {};

    if (!form.title.trim()) nextErrors.title = "Введите название задачи.";
    if (!form.due_date) nextErrors.due_date = "Укажите срок выполнения.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    await create.mutateAsync({
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: new Date(form.due_date).toISOString(),
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      site_id: siteId,
    });

    setForm(EMPTY);
    onClose();
  }

  const selectedPriority = PRIORITIES.find((item) => item.value === form.priority);

  return createPortal(
    <div
      className="tasks-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !create.isPending) {
          onClose();
        }
      }}
    >
      <div
        className="tasks-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-modal-title"
      >
        <div className="tasks-modal-header">
          <div>
            <h2 id="tasks-modal-title" className="tasks-modal-title">
              Новая задача
            </h2>
            <p className="tasks-modal-subtitle">
              Заполните основные параметры задачи и назначьте исполнителя.
            </p>
          </div>

          <button
            type="button"
            className="tasks-modal-close"
            onClick={onClose}
            disabled={create.isPending}
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </div>

        <div className="tasks-modal-body">
          <form className="tasks-form" onSubmit={handleSubmit}>
            <div className="tasks-form-overview">
              <span className="tasks-overview-badge">
                <Plus size={14} />
                Создание
              </span>

              <span className="tasks-overview-badge">
                <AlertCircle size={14} />
                {selectedPriority?.label || "Средний"}
              </span>

              <span className="tasks-overview-badge">
                <Calendar size={14} />
                {form.due_date || "Срок не указан"}
              </span>
            </div>

            <section className="tasks-form-section">
              <div className="tasks-section-heading">
                <h3>Основные данные</h3>
                <p>Название задачи, срок выполнения и начальный статус.</p>
              </div>

              <div className="tasks-form-group">
                <label htmlFor={titleId}>
                  Название задачи <span className="required">*</span>
                </label>
                <input
                  id={titleId}
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Например: Проверить наличие СИЗ на 2 этаже"
                  className={errors.title ? "input-error" : ""}
                  aria-invalid={Boolean(errors.title)}
                  autoFocus
                />
                {errors.title && <p className="tasks-error">{errors.title}</p>}
              </div>

              <div className="tasks-form-grid">
                <div className="tasks-form-group">
                  <label htmlFor={dueDateId}>
                    Срок устранения <span className="required">*</span>
                  </label>
                  <input
                    id={dueDateId}
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setField("due_date", e.target.value)}
                    className={errors.due_date ? "input-error" : ""}
                    aria-invalid={Boolean(errors.due_date)}
                  />
                  {errors.due_date && (
                    <p className="tasks-error">{errors.due_date}</p>
                  )}
                </div>

                <div className="tasks-form-group">
                  <label htmlFor={statusId}>Начальный статус</label>
                  <select
                    id={statusId}
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="pending">Ожидает</option>
                    <option value="in_progress">В работе</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="tasks-form-section">
              <div className="tasks-section-heading">
                <h3>Исполнитель и приоритет</h3>
                <p>Назначьте ответственного и выберите уровень срочности.</p>
              </div>

              <div className="tasks-form-grid">
                <div className="tasks-form-group">
                  <label htmlFor={assigneeId}>
                    <User size={16} />
                    <span>Ответственный</span>
                  </label>
                  <select
                    id={assigneeId}
                    value={form.assigned_to}
                    onChange={(e) => setField("assigned_to", e.target.value)}
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

                <div className="tasks-form-group">
                  <label htmlFor={priorityId}>
                    <AlertCircle size={16} />
                    <span>Приоритет</span>
                  </label>
                  <select
                    id={priorityId}
                    value={form.priority}
                    onChange={(e) => setField("priority", e.target.value)}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                  <p className="tasks-form-hint">
                    Текущий приоритет: {selectedPriority?.label}
                  </p>
                </div>
              </div>
            </section>

            <section className="tasks-form-section">
              <div className="tasks-section-heading">
                <h3>Описание</h3>
                <p>Укажите детали задачи, требования или контекст.</p>
              </div>

              <div className="tasks-form-group">
                <label htmlFor={descriptionId}>
                  <AlignLeft size={16} />
                  <span>Подробное описание</span>
                </label>
                <textarea
                  id={descriptionId}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Опишите детали нарушения или требования..."
                  rows={4}
                />
              </div>
            </section>

            <div className="tasks-form-actions">
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