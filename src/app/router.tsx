import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import SkeletonLoader from "@/shared/ui/Skeleton";

const EmployeesPage = lazy(() => import("@/pages/employees/EmployeesPage"));
const AnalyticsPage = lazy(() => import("@/pages/analytics/AnalyticsPage"));
const OrganizationsPage = lazy(() => import("@/pages/organizations/OrganizationsPage"));
const AdditionalTrainingsPage = lazy(
  () => import("@/pages/additional-trainings/AdditionalTrainingsPage")
);
const PermitsPage = lazy(() => import("@/pages/permits/PermitsPage"));
const OrdersPage = lazy(() => import("@/pages/orders/OrdersPage"));
const PrescriptionsPage = lazy(() => import("@/pages/prescriptions/PrescriptionsPage"));
const TasksPage = lazy(() => import("@/pages/tasks/TasksPage"));

export function AppRouter() {
  return (
    <Suspense fallback={<SkeletonLoader rows={8} />}>
      <Routes>
        <Route path="/" element={<EmployeesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/additional-trainings" element={<AdditionalTrainingsPage />} />
        <Route path="/permits" element={<PermitsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/prescriptions" element={<PrescriptionsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
      </Routes>
    </Suspense>
  );
}