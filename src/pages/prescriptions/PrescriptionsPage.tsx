import React from "react";
import PrescriptionsRegistry from "@/features/prescriptions/components/PrescriptionsRegistry";
import { useNotificationContext } from "@/app/providers/NotificationProvider";

export default function PrescriptionsPage() {
  const { addNotification } = useNotificationContext();
  return <PrescriptionsRegistry addNotification={addNotification} />;
}
