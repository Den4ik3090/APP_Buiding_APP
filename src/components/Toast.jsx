import React from 'react';

/**
 * Компонент отдельного Toast уведомления
 */
function Toast({ id, message, type, onRemove }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className={`toast toast--${type}`} role="alert">
      <div className="toast__content">
        <span className="toast__icon">{getIcon(type)}</span>
        <span className="toast__message">{message}</span>
      </div>
      <button
        className="toast__close"
        onClick={() => onRemove(id)}
        aria-label="Закрыть уведомление"
      >
        ✕
      </button>
    </div>
  );
}

export default Toast;