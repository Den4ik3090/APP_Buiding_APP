import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { useNotificationContext } from "./providers/NotificationProvider";
import { LoginPage } from "@/auth";
import { EmployeeProvider } from "@/features/employee-crud/EmployeeProvider";
import { AppHeader } from "@/widgets/app-header/AppHeader";
import { StatsBar } from "@/widgets/stats-bar/StatsBar";
import { AppNav } from "@/widgets/app-nav/AppNav";
import { AppRouter } from "./router";
import ToastContainer from "@/shared/ui/Toast/ToastContainer";
import SkeletonLoader from "@/shared/ui/Skeleton";
import { TOAST_TYPES } from "@/shared/constants/toast";
import logo from "@/assets/img/logo_PUTEVI.png";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const { notifications, addNotification, removeNotification } = useNotificationContext();

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = setTimeout(() => { if (isMounted) setAuthLoading(false); }, 10000);

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) console.error("getSession error:", error);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    }).catch((err) => {
      if (isMounted) { console.error("getSession failed:", err); setAuthLoading(false); }
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session ?? null);
      if (event === "SIGNED_OUT") navigate("/");
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      data?.subscription?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  if (authLoading) {
    return (
      <div className="app app__loading">
        <div className="app__container">
          <SkeletonLoader rows={8} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        logoSrc={logo}
        onSuccess={() => {}}
        onError={(m) => addNotification(m, TOAST_TYPES.ERROR)}
        signIn={async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw new Error(error.message);
        }}
      />
    );
  }

  return (
    <div className="app">
      <ToastContainer notifications={notifications} onRemove={removeNotification} />
      <div className="container">
        <EmployeeProvider>
          <AppHeader onLogout={handleLogout} />
          <StatsBar />
          <AppNav />
          <AppRouter />
        </EmployeeProvider>
      </div>
    </div>
  );
}
