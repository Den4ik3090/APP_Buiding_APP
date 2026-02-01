import { DAYS_THRESHOLD, WARNING_THRESHOLD } from "./constants";

export function getStatusByDays(days) {
  if (days >= DAYS_THRESHOLD) return "expired";
  if (days >= WARNING_THRESHOLD) return "warning";
  return "valid";
}

export function computeAnalytics(employees, getDaysDifference) {
  const now = new Date();

  const rows = employees
    .filter((e) => e?.trainingDate)
    .map((e) => {
      const days = getDaysDifference(e.trainingDate);
      const status = getStatusByDays(days);

      const nextDate = new Date(e.trainingDate);
      nextDate.setDate(nextDate.getDate() + DAYS_THRESHOLD);

      const daysToExpire = Math.ceil((nextDate - now) / (1000 * 60 * 60 * 24));

      return {
        ...e,
        days,
        status,
        nextDate,
        daysToExpire,
        organization: e.organization || "—",
        responsible: e.responsible || "—",
      };
    });

  const total = rows.length;
  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { valid: 0, warning: 0, expired: 0 },
  );

  const conformityRate = total === 0 ? 0 : (counts.valid / total) * 100;

  const overdueDays = rows
    .filter((r) => r.status === "expired")
    .map((r) => Math.max(0, r.days - DAYS_THRESHOLD));

  const avgDaysOverdue =
    overdueDays.length === 0
      ? 0
      : overdueDays.reduce((a, b) => a + b, 0) / overdueDays.length;

  const upcoming = (n) =>
    rows.filter((r) => r.daysToExpire >= 0 && r.daysToExpire <= n).length;

  const byOrg = groupCompliance(rows, "organization");
  const byManager = groupCompliance(rows, "responsible");

  return {
    total,
    counts,
    conformityRate,
    avgDaysOverdue,
    upcoming: {
      d7: upcoming(7),
      d14: upcoming(14),
      d30: upcoming(30),
    },
    byOrg,
    byManager,
    rows, // можно использовать для экспорта/детализации
  };
}

function groupCompliance(rows, key) {
  const map = new Map();

  for (const r of rows) {
    const k = r[key] || "—";
    if (!map.has(k)) {
      map.set(k, { name: k, total: 0, valid: 0, warning: 0, expired: 0 });
    }
    const item = map.get(k);
    item.total += 1;
    item[r.status] += 1;
  }

  const out = Array.from(map.values()).map((x) => ({
    ...x,
    conformityRate: x.total === 0 ? 0 : (x.valid / x.total) * 100,
    overdueRate: x.total === 0 ? 0 : (x.expired / x.total) * 100,
  }));

  // худшие сверху
  out.sort((a, b) => a.conformityRate - b.conformityRate);
  return out;
}
