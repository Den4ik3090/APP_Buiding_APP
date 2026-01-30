import React from 'react';
import Toast from './Toast';

/**
 * Контейнер для отображения всех Toast уведомлений
 */
function ToastContainer({ notifications, onRemove }) {
  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export default ToastContainer;