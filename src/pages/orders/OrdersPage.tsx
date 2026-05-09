import React from "react";
import OrdersRegistry from "@/features/orders/components/OrdersRegistry";
import { useNotificationContext } from "@/app/providers/NotificationProvider";

export default function OrdersPage() {
  const { addNotification } = useNotificationContext();
  return <OrdersRegistry addNotification={addNotification} />;
}
