import React from "react";

/**
 * Компонент отдельного Toast уведомления
 * Позиция и контейнер задаются в ToastContainer
 */
function Toast({ id, message, type = "info", onRemove }) {
  const getIcon = (t) => {
    switch (t) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  const getTitle = (t) => {
    switch (t) {
      case "success":
        return "Успех";
      case "error":
        return "Ошибка";
      case "warning":
        return "Внимание";
      case "info":
      default:
        return "Информация";
    }
  };

  return (
    <div className={`toast toast--${type}`}>
      <div className="toast__icon">{getIcon(type)}</div>
      <div className="toast__body">
        <div className="toast__title">{getTitle(type)}</div>
        <div className="toast__message">{message}</div>
      </div>
      <button
        className="toast__close"
        onClick={() => onRemove(id)}
        aria-label="Закрыть уведомление"
      >
        ×
      </button>
    </div>
  );
}

export default Toast;
