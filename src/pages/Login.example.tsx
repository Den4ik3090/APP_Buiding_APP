/**
 * Example: how to use LoginPage as a route.
 * This file is for reference only; the app currently uses LoginPage
 * directly in App.jsx when !session (no router).
 *
 * With React Router (e.g. react-router-dom v6):
 *
 *   // In your router config:
 *   <Route path="/login" element={<LoginPageWrapper />} />
 *
 *   // LoginPageWrapper.tsx:
 */
import React from "react";
import { LoginPage } from "../auth";
import { supabase } from "../supabaseClient";

// Optional: logo for the login page
import logo from "../assets/img/logo_PUTEVI.png";

export function LoginPageWrapper() {
  return (
    <LoginPage
      logoSrc={logo}
      onSuccess={() => {
        // e.g. navigate("/") or window.location.href = "/"
      }}
      onError={(message) => {
        console.error("Auth error:", message);
        // e.g. toast.error(message)
      }}
      signIn={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw new Error(error.message);
      }}
      reducedMotion={false}
    />
  );
}
