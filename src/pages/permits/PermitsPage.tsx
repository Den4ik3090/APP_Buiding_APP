import React from "react";
import PermitsRegistry from "@/features/permits/components/PermitsRegistry";
import { useNotificationContext } from "@/app/providers/NotificationProvider";

export default function PermitsPage() {
  const { addNotification } = useNotificationContext();
  return <PermitsRegistry addNotification={addNotification} />;
}
