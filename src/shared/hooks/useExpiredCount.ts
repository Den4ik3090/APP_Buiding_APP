import { useMemo, useEffect, useRef } from "react";
import { useNotificationContext } from "@/app/providers/NotificationProvider";
import { TOAST_TYPES, TOAST_DURATION } from "@/shared/constants/toast";
import { DAYS_THRESHOLD, hasExpiredAdditional } from "@/entities/employee";
import type { AnyEmployee } from "@/features/employee-crud/api";

export function useExpiredCount(
  filteredEmployees: AnyEmployee[],
  getDaysDiff: (date: string) => number
): number {
  const { addNotification } = useNotificationContext();
  const prevRef = useRef<number | null>(null);

  const expiredCount = useMemo(
    () =>
      filteredEmployees.filter((emp) => {
        const mainExpired =
          emp.trainingDate && getDaysDiff(emp.trainingDate) >= DAYS_THRESHOLD;
        const additionalExpired = hasExpiredAdditional(emp.additionalTrainings);
        return mainExpired || additionalExpired;
      }).length,
    [filteredEmployees, getDaysDiff]
  );

  useEffect(() => {
    if (prevRef.current === null) {
      prevRef.current = expiredCount;
      return;
    }
    if (expiredCount > prevRef.current) {
      addNotification(
        `Просрочено у ${expiredCount} сотрудников`,
        TOAST_TYPES.WARNING,
        TOAST_DURATION.NORMAL
      );
    }
    prevRef.current = expiredCount;
  }, [expiredCount, addNotification]);

  return expiredCount;
}
