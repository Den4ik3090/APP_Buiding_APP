import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./auth/auth.css"; // Tailwind + auth keyframes (animated gradient, blobs)
import "./index.css"; // ✅ Основные стили приложения
import "./style/modal.css";
import "./style/toast.css";

// Recovery from HMR chunk load errors (e.g. after dev server restart): full reload
if (typeof module !== "undefined" && module.hot) {
  module.hot.addStatusHandler((status) => {
    if (status === "fail") {
      window.location.reload();
    }
  });
  const isHmrChunkError = (msg) =>
    (msg && typeof msg === "string" && (msg.includes("Loading hot update chunk") || msg.includes("ChunkLoadError")));
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
    <App />
  </React.StrictMode>,
);
