import React, { createContext, useContext } from "react";
import { useNotification } from "@/shared/hooks/useNotification";

type NotificationContextValue = ReturnType<typeof useNotification>;

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const value = useNotification();
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotificationContext: компонент должен быть внутри <NotificationProvider>"
    );
  }
  return ctx;
}
