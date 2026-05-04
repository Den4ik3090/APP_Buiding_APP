import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Task, TaskResolution } from "../model";
import { fetchResolutionsByTask } from "../services/tasksService";
import styles from "./tasksModal.module.scss";

interface TaskResolutionViewerModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskResolutionViewerModal({
  task,
  open,
  onClose,
}: TaskResolutionViewerModalProps) {
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState<TaskResolution | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadResolution() {
      setLoading(true);
      try {
        const items = await fetchResolutionsByTask(task.id);
        if (!cancelled) {
          setResolution(items[0] ?? null);
        }
      } catch (error) {
        console.error("Ошибка загрузки фото устранения:", error);
        if (!cancelled) {
          setResolution(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadResolution();

    return () => {
      cancelled = true;
    };
  }, [open, task.id]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles['tasks-modal-overlay']}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={styles['tasks-modal']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-resolution-title"
      >
        <div className={styles['tasks-modal-header']}>
          <div>
            <h2 id="task-resolution-title" className={styles['tasks-modal-title']}>
              Фото устранения
            </h2>
            <p className={styles['tasks-modal-subtitle']}>{task.title}</p>
          </div>

          <button
            type="button"
            className={styles['tasks-modal-close']}
            onClick={onClose}
            aria-label="Закрыть окно"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles['tasks-modal-body']}>
          {loading ? (
            <p>Загрузка...</p>
          ) : !resolution ? (
            <p>Фото устранения пока не загружено.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {resolution.photo_url ? (
                <img
                  src={resolution.photo_url}
                  alt="Фото устранения"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    objectFit: "cover",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                />
              ) : (
                <p>У записи нет фото.</p>
              )}

              {resolution.comments && (
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 6 }}>Комментарий</p>
                  <p style={{ margin: 0, color: "#6b7280" }}>{resolution.comments}</p>
                </div>
              )}

              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Выполнено:{" "}
                {resolution.completed_at
                  ? new Date(resolution.completed_at).toLocaleString("ru-RU")
                  : "—"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}