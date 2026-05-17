import { useState, useCallback } from 'react';
import type { NotificationType } from '@/shared/constants/toast';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  duration?: number;
  timer?: ReturnType<typeof setTimeout>;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (message: string, type: NotificationType = 'success', duration: number = 4000): number => {
      const id = Date.now();

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeNotification(id);
        }, duration);
        setNotifications((prev) => [...prev, { id, message, type, duration, timer }]);
      } else {
        setNotifications((prev) => [...prev, { id, message, type, duration }]);
      }

      return id;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const removeNotification = useCallback((id: number): void => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id);
      if (notification?.timer) {
        clearTimeout(notification.timer);
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const removeAllNotifications = useCallback((): void => {
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
