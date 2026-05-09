import React from "react";
import { Sun, Moon } from "lucide-react";
import logo from "@/assets/img/logo_PUTEVI.jpg";

interface AppHeaderProps {
  onLogout: () => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
}

export function AppHeader({ onLogout, onToggleTheme, isDark }: AppHeaderProps) {
  return (
    <div className="header-main">
      <div className="header-main__left">
        <img src={logo} alt="PUTEVI Logo" className="logo__img" />
        <h1 className="header__title">Управление инструктажами</h1>
      </div>

      <div className="header-main__right">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 44,
              minHeight: 44,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "transparent",
              cursor: "pointer",
              color: isDark ? "#f59e0b" : "#6b7280",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        <button
          className="btn-danger"
          onClick={onLogout}
          style={{ minHeight: 44, minWidth: 72, fontWeight: 600 }}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
