import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./app/App";
import { NotificationProvider } from "./app/providers/NotificationProvider";
import '@coreui/coreui/dist/css/coreui.min.css'
import "./auth/auth.css";
import "./index.css";
import "./shared/styles/modal.css";

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
    <HashRouter>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </HashRouter>
  </React.StrictMode>
);