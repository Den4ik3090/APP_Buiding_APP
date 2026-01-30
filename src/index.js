import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css"; // ✅ Твои основные стили
import "./style/modal.css"; // ✅ Новый файл модалки

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
