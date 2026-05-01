import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useUpdateTask } from "../hooks/useTasks";
import type { Task } from "../model";
import "./tasksModal.scss";

interface TaskEditModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskEditModal({ task, open, onClose }: TaskEditModalProps) {
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(task.title ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(
    task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""
  );
  const [priority, setPriority] = useState(task.priority ?? "medium");
  const [status, setStatus] = useState(task.status ?? "pending");

  useEffect(() => {
    if (!open) return;

    setTitle(task.title ?? "");
    setDescription(task.description ?? "");
    setDueDate(
      task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : ""
    );
    setPriority(task.priority ?? "medium");
    setStatus(task.status ?? "pending");
  }, [task, open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !updateTask.isPending) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, updateTask.isPending]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    await updateTask.mutateAsync({
      id: task.id,
      payload: {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        priority,
        status,
      },
    });

    onClose();
  }

  return createPortal(
    <div
      className="tasks-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !updateTask.isPending) {
          onClose();
        }
      }}
    >
      <div
        className="tasks-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-edit-title"
      >
        <div className="tasks-modal-header">
          <div>
            <h2 id="task-edit-title" className="tasks-modal-title">
              Редактировать задачу
            </h2>
            <p className="tasks-modal-subtitle">
              Измените основные параметры задачи.
            </p>
          </div>

          <button
            type="button"
            className="tasks-modal-close"
            onClick={onClose}
            disabled={updateTask.isPending}
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </div>

        <div className="tasks-modal-body">
          <form className="tasks-form" onSubmit={handleSubmit}>
            <div className="tasks-form-group">
              <label>Название задачи</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="tasks-form-group">
              <label>Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="tasks-form-grid">
              <div className="tasks-form-group">
                <label>Срок</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="tasks-form-group">
                <label>Приоритет</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                  <option value="critical">Критический</option>
                </select>
              </div>
            </div>

            <div className="tasks-form-group">
              <label>Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Ожидает</option>
                <option value="in_progress">В работе</option>
                <option value="resolved">Выполнена</option>
                <option value="overdue">Просрочена</option>
              </select>
            </div>

            <div className="tasks-form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={updateTask.isPending}
              >
                Отмена
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={updateTask.isPending}
              >
                {updateTask.isPending ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}