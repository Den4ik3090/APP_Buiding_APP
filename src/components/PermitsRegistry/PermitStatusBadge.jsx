import React from "react";
import { STATUS_COLORS, STATUS_EMOJI } from "../../utils/permitConstants";
import {
  needsWarning,
  getDaysUntilExpiry,
  isClosedStatus,
  getPermitStatus,
} from "../../utils/permitHelpers";

/**
 * Компонент бейджа статуса наряда
 * Отображает статус с цветовым индикатором и эмодзи
 */
export default function PermitStatusBadge({
  permit,
  showDays = false,
  statusOverride,
}) {
  const status = statusOverride || getPermitStatus(permit);
  const colors = STATUS_COLORS[status] || STATUS_COLORS["Активен"];
  const emoji = STATUS_EMOJI[status] || "⚪";
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
