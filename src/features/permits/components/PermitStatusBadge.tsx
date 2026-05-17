import React from "react";
import { STATUS_COLORS, STATUS_EMOJI } from "@/entities/permit";
import {
  needsWarning,
  getDaysUntilExpiry,
  isClosedStatus,
  getPermitStatus,
} from "@/entities/permit";
import type { Permit, PermitStatusValue } from "@/entities/permit";

interface PermitStatusBadgeProps {
  permit: Partial<Permit>;
  showDays?: boolean;
  statusOverride?: string;
}

export default function PermitStatusBadge({
  permit,
  showDays = false,
  statusOverride,
}: PermitStatusBadgeProps) {
  const status = statusOverride || getPermitStatus(permit);
  const colors = STATUS_COLORS[status as PermitStatusValue] || STATUS_COLORS["Активен" as PermitStatusValue];
  const emoji = STATUS_EMOJI[status as PermitStatusValue] || "⚪";
  const hasWarning = needsWarning(permit);
  const daysLeft = getDaysUntilExpiry(permit);

  return (
    <span
      className={`permit-status-badge ${hasWarning ? "warning-pulse" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: "14px" }}>{emoji}</span>
      <span>{status}</span>
      {showDays && !isClosedStatus(status) && (
        <span style={{ fontSize: "12px", opacity: 0.8 }}>
          {daysLeft > 0 ? `${daysLeft} дн.` : "истек"}
        </span>
      )}
    </span>
  );
}
