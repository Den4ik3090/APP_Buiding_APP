// filepath: src/shared/ui/Toast/Toast.tsx
import React, { useEffect, memo } from 'react';

/**
 * Компонент отдельного Toast уведомления с защитой от DOM-коллизий
 */
const Toast = memo(({ id, message, type = "info", onRemove }) => {

  // Автоматическое удаление через 5 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const getIcon = (t) => {
    switch (t) {
      case "success": return "✅";
      case "error": return "❌";
      case "warning": return "⚠️";
      case "info":
      default: return "ℹ️";
    }
  };

  const getTitle = (t) => {
    switch (t) {
      case "success": return "Успех";
      case "error": return "Ошибка";
      case "warning": return "Внимание";
      case "info":
      default: return "Информация";
    }
  };

  return (
    <div
      className={`toast toast--${type}`}
      // translate="no" предотвращает вмешательство Google Translate в DOM этого узла
      translate="no"
      role="alert"
    >
      <div className="toast__icon">
        {/* Обертка в span защищает текстовый эмодзи */}
        <span>{getIcon(type)}</span>
      </div>

      <div className="toast__body">
        <div className="toast__title">
          {/* Обертка в strong/span защищает заголовки */}
          <strong>{getTitle(type)}</strong>
        </div>
        <div className="toast__message">
          {/* КРИТИЧНО: Сообщение ОБЯЗАТЕЛЬНО внутри span, 
              чтобы React не терял текстовый узел при удалении */}
          <span>{message}</span>
        </div>
      </div>

      <button
        type="button"
        className="toast__close"
        onClick={() => onRemove(id)}
        aria-label="Закрыть уведомление"
      >
        ×
      </button>
    </div>
  );
});

export default Toast;