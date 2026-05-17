import React from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { useOrganizationsQuery } from "@/features/employee-crud/hooks/useEmployees";
import {
  SuccessIcon,
  PlayPauseIcon,
  MenuCloseIcon,
  CopiedIcon,
  LockUnlockIcon,
  DownloadDoneIcon,
  SendIcon,
  ToggleIcon,
  NotificationIcon,
  EyeToggleIcon,
} from "@/shared/ui/AnimatedStateIcons";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `tab-btn${isActive ? " tab-btn--active" : ""}`;

export function AppNav() {
  const { data: organizations = [] } = useOrganizationsQuery();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedOrg = searchParams.get("org") ?? "Все";
  const statusFilter = searchParams.get("status") ?? "all";

  const setSelectedOrg = (org: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (org === "Все") next.delete("org");
        else next.set("org", org);
        return next;
      },
      { replace: true }
    );
  };

  const setStatusFilter = (status: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (status === "all") next.delete("status");
        else next.set("status", status);
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div
      className="toolbar"
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 20,
      }}
    >
      <div
        className="filter-group"
        style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
      >
        <label>Организация:</label>
        <select
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="status-filter"
        >
          <option value="Все">Все организации</option>
          {organizations.map((org) => (
            <option key={org} value={org}>
              {org}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="all">Все статусы</option>
          <option value="valid">Действительные</option>
          <option value="warning">Скоро истекают</option>
          <option value="expired">Просроченные</option>
        </select>
      </div>

      <nav className="tabs-navigation">
        <NavLink to="/" end className={navClass}>
          <span className="tab-btn__icon"><SuccessIcon size={24} /></span>
          <span className="tab-btn__label">Сотрудники</span>
        </NavLink>
        <NavLink to="/analytics" className={navClass}>
          <span className="tab-btn__icon"><PlayPauseIcon size={24} /></span>
          <span className="tab-btn__label">Аналитика</span>
        </NavLink>
        <NavLink to="/organizations" className={navClass}>
          <span className="tab-btn__icon"><MenuCloseIcon size={24} /></span>
          <span className="tab-btn__label">Организации</span>
        </NavLink>
        <NavLink to="/additional-trainings" className={navClass}>
          <span className="tab-btn__icon"><CopiedIcon size={24} /></span>
          <span className="tab-btn__label">Дополнительные обучения</span>
        </NavLink>
        <NavLink to="/permits" className={navClass}>
          <span className="tab-btn__icon"><LockUnlockIcon size={24} /></span>
          <span className="tab-btn__label">Наряды-допуски</span>
        </NavLink>
        <NavLink to="/orders" className={navClass}>
          <span className="tab-btn__icon"><DownloadDoneIcon size={24} /></span>
          <span className="tab-btn__label">Приказы</span>
        </NavLink>
        <NavLink to="/prescriptions" className={navClass}>
          <span className="tab-btn__icon"><SendIcon size={24} /></span>
          <span className="tab-btn__label">Предписания</span>
        </NavLink>
        <NavLink to="/tasks" className={navClass}>
          <span className="tab-btn__icon"><ToggleIcon size={24} /></span>
          <span className="tab-btn__label">Задачи</span>
        </NavLink>
        <NavLink to="/about" className={navClass}>
          <span className="tab-btn__icon"><NotificationIcon size={24} /></span>
          <span className="tab-btn__label">О проекте</span>
        </NavLink>
        <NavLink to="/newcomponent" className={navClass}>
          <span className="tab-btn__icon"><EyeToggleIcon size={24} /></span>
          <span className="tab-btn__label">Тестовый React</span>
        </NavLink>
      </nav>
    </div>
  );
}
