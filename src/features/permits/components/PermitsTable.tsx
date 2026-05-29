import React, { useMemo, useState } from "react";
import { Search, Filter, ArrowUpDown, AlertTriangle } from "lucide-react";
import PermitStatusBadge from "./PermitStatusBadge";
import PermitActions from "./PermitActions";
import { PERMIT_TYPES, PERMIT_STATUSES } from "@/entities/permit";
import { formatDate, getPermitStatus } from "@/entities/permit";
import type { Permit } from "@/entities/permit";
import type { RegistryEmployee, PermitWithEmployee } from "../services/permitsService";

type PermitRow = PermitWithEmployee & { responsible_person_name?: string };

import type { NotificationType } from "@/shared/constants/toast";

type AddNotificationFn = (message: string, type?: NotificationType, duration?: number) => void;

interface PermitsTableProps {
  permits?: PermitRow[];
  employees?: RegistryEmployee[];
  onEdit?: (permit: Permit) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => Promise<void>;
  addNotification?: AddNotificationFn;
}

export default function PermitsTable({
  permits = [],
  employees: _employees = [],
  onEdit = () => {},
  onDelete = () => {},
  onRefresh = async () => {},
  addNotification = () => {},
}: PermitsTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [sortField, setSortField] = useState("issue_date");
  const [sortDir, setSortDir] = useState("desc");

  const safePermits = Array.isArray(permits) ? permits : [];

  const uniqueOrgs = useMemo(
    () =>
      Array.from(
        new Set(
          safePermits
            .map((p) => p.organization)
            .filter((v) => typeof v === "string" && v.trim() !== "")
        )
      ).sort(),
    [safePermits]
  );

  const toggleSort = (field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
  };

  const filteredPermits = useMemo(() => {
    return safePermits
      .filter((p) => {
        const effectiveStatus = getPermitStatus(p);
        if (typeFilter !== "all" && p.permit_type !== typeFilter) return false;
        if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
          return false;
        }
        if (orgFilter !== "all" && p.organization !== orgFilter) return false;

        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const responsibleName =
          (p.responsible_person && p.responsible_person.name) ||
          p.responsible_person_name ||
          "";
        return (
          (p.permit_number || "").toLowerCase().includes(q) ||
          (p.organization || "").toLowerCase().includes(q) ||
          responsibleName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        let av = (a as unknown as Record<string, unknown>)[sortField];
        let bv = (b as unknown as Record<string, unknown>)[sortField];

        if (
          sortField === "issue_date" ||
          sortField === "expiry_date" ||
          sortField === "extended_date"
        ) {
          av = av ? new Date(av as string).getTime() : 0;
          bv = bv ? new Date(bv as string).getTime() : 0;
        }

        if ((av as string | number) < (bv as string | number)) return -1 * dir;
        if ((av as string | number) > (bv as string | number)) return 1 * dir;
        return 0;
      });
  }, [
    safePermits,
    search,
    typeFilter,
    statusFilter,
    orgFilter,
    sortField,
    sortDir,
  ]);

  const statusValues =
    PERMIT_STATUSES && typeof PERMIT_STATUSES === "object"
      ? Object.values(PERMIT_STATUSES)
      : [];
  const statusSamples = useMemo(
    () =>
      Array.from(
        new Set(
          safePermits
            .map((p) => p.status)
            .filter((s) => typeof s === "string" && s.trim() !== "")
        )
      ),
    [safePermits]
  );

  return (
    <div className="permits-table-wrapper">
      <div className="permits-filters">
        <div className="permits-filters-left">
          <div className="permits-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Поиск по номеру, ФИО или организации…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="permits-filter-selects">
            <div className="permits-filter-select">
              <Filter size={14} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Все типы</option>
                {Array.isArray(PERMIT_TYPES) &&
                  PERMIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
            </div>

            <div className="permits-filter-select">
              <AlertTriangle size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Все статусы</option>
                {statusValues.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="permits-filter-select">
              <span>Орг.</span>
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
              >
                <option value="all">Все организации</option>
                {uniqueOrgs.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-export"
          onClick={onRefresh}
        >
          🔄 Обновить
        </button>
      </div>

      <div className="permits-table-container">
        <table className="permits-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("permit_number")}>
                № наряда
                <ArrowUpDown size={14} />
              </th>
              <th>Тип</th>
              <th onClick={() => toggleSort("issue_date")}>
                Выдан
                <ArrowUpDown size={14} />
              </th>
              <th onClick={() => toggleSort("expiry_date")}>
                Действителен до
                <ArrowUpDown size={14} />
              </th>
              <th>Ответственный</th>
              <th>Организация</th>
              <th>Статус</th>
              <th style={{ width: 190 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {(!Array.isArray(filteredPermits) ||
              filteredPermits.length === 0) && (
              <tr>
                <td colSpan={8} className="permits-empty">
                  Нет нарядов по текущим фильтрам
                </td>
              </tr>
            )}

            {Array.isArray(filteredPermits) &&
              filteredPermits.map((permit) => {
                const effectiveStatus = getPermitStatus(permit);
                const rowClassName =
                  effectiveStatus === PERMIT_STATUSES.EXPIRED
                    ? "permit-row-expired"
                    : "";

                return (
                  <tr key={permit.id} className={rowClassName}>
                    <td>{permit.permit_number}</td>
                    <td>{permit.permit_type}</td>
                    <td>{formatDate(permit.issue_date)}</td>
                    <td>
                      {formatDate(permit.extended_date || permit.expiry_date)}
                    </td>
                    <td>
                      {permit.responsible_person?.name ||
                        permit.responsible_person_name ||
                        "—"}
                    </td>
                    <td>{permit.organization}</td>
                    <td>
                      <PermitStatusBadge
                        permit={permit}
                        statusOverride={effectiveStatus}
                      />
                    </td>
                    <td>
                      <PermitActions
                        permit={permit}
                        statusSamples={statusSamples}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onRefresh={onRefresh}
                        addNotification={addNotification}
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
