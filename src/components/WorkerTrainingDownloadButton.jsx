import React, { useState } from "react";
import { downloadWorkerTrainings } from "@/features/employee-crud/services/downloadTrainingsService";
import { TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";
import './WorkerTrainingDownloadButton.scss';

function WorkerTrainingDownloadButton({ workerId, workerName, addNotification }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!workerId || !workerName || loading) return;

    setLoading(true);
    try {
      const { count } = await downloadWorkerTrainings(workerId, workerName);
      if (count === 0) {
        addNotification("Обучения не найдены", TOAST_TYPES.WARNING, TOAST_DURATION.NORMAL);
        return;
      }
      addNotification("Обучения загружены", TOAST_TYPES.SUCCESS, TOAST_DURATION.NORMAL);
    } catch (error) {
      const message = error?.message || "Ошибка загрузки";
      addNotification(message, TOAST_TYPES.ERROR, TOAST_DURATION.NORMAL);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-download"
      onClick={handleClick}
      disabled={loading}
      aria-busy={loading}
    >
      {loading ? (
        <span className="btn-download__content">
          <span className="btn-download__spinner" aria-hidden="true" />
          Загрузка...
        </span>
      ) : (
        <span className="btn-download__content">Скачать обучения</span>
      )}
    </button>
  );
}

export default WorkerTrainingDownloadButton;
