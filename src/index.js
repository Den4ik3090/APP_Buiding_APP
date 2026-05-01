import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./app/App";
import { NotificationProvider } from "./app/providers/NotificationProvider";
import '@coreui/coreui/dist/css/coreui.min.css'
import "./auth/auth.css";
import "./index.css";
import "./style/modal.css";
import "./style/toast.css";

const queryClient = new QueryClient();

if (typeof module !== "undefined" && module.hot) {
  module.hot.addStatusHandler((status) => {
    if (status === "fail") {
      window.location.reload();
    }
  });
  const isHmrChunkError = (msg) =>
    msg &&
    typeof msg === "string" &&
    (msg.includes("Loading hot update chunk") ||
      msg.includes("ChunkLoadError"));
  window.addEventListener("error", (e) => {
    if (isHmrChunkError(e.message)) {
      e.preventDefault();
      window.location.reload();
    }
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (isHmrChunkError(e.reason?.message)) {
      e.preventDefault();
      window.location.reload();
    }
  });
}

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
);