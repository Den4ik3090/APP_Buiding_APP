
import { useState, useCallback } from 'react';

/**
 * Кастомный хук для управления Toast уведомлениями
 * Использование:
 * const { notifications, addNotification, removeNotification } = useNotification();
 */
export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    const notification = { id, message, type };

    setNotifications((prev) => [...prev, notification]);

    // Автоматически удалить уведомление через duration миллисекунд
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeNotification(id);
      }, duration);

      // Сохраняем таймер для возможности отмены
      notification.timer = timer;
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id);
      if (notification && notification.timer) {
        clearTimeout(notification.timer);
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const removeAllNotifications = useCallback(() => {
    setNotifications((prev) => {
      prev.forEach((n) => {
        if (n.timer) clearTimeout(n.timer);
      });
      return [];
    });
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    removeAllNotifications,
  };
};

export default useNotification;