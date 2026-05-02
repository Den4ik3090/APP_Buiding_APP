import React from 'react';
import Toast from './Toast';
import type { ToastType } from './Toast';
import type { Notification } from '@/shared/hooks/useNotification';

interface ToastContainerProps {
  notifications: Notification[];
  onRemove: (id: number) => void;
}

function ToastContainer({ notifications, onRemove }: ToastContainerProps) {
  if (!notifications.length) return null;

  return (
    <div
      className="fixed right-5 top-5 z-[9999] flex flex-col gap-2.5"
      translate="no"
    >
      {notifications.map((n) => (
        <Toast
          key={n.id}
          id={n.id}
          message={n.message}
          type={n.type as ToastType}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
