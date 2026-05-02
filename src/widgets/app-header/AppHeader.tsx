import React from "react";
import logo from "@/assets/img/logo_PUTEVI.jpg";

interface AppHeaderProps {
  onLogout: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  return (
    <div
      className="header-main"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <img src={logo} alt="Logo" className="logo__img" />
        <h1 className="header__title">Управление инструктажами</h1>
      </div>
      <button className="btn-danger" onClick={onLogout}>
        Выйти
      </button>
    </div>
  );
}
