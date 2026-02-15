import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DAYS_THRESHOLD } from "../utils/constants";

const BLUE_PALETTE = [
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
];
const RED_ACCENT = "#ef4444";
const CHART_COLORS = [...BLUE_PALETTE, "#64748b"];

export default function Dashboard({ employees, getDaysDifference }) {
  const stats = useMemo(() => {
    const total = employees.length;
    const needRetrain = employees.filter(
      (e) => getDaysDifference(e.trainingDate) >= DAYS_THRESHOLD
    ).length;
    const orgSet = new Set(
      employees.map((e) => e.organization || "—").filter(Boolean)
    );
    const orgCount = orgSet.size;

    const byOrg = {};
    employees.forEach((e) => {
      const key = e.organization || "Без организации";
      byOrg[key] = (byOrg[key] || 0) + 1;
    });
    const pieData = Object.entries(byOrg).map(([name, value]) => ({
      name,
      value,
    }));

    const byProf = {};
    employees.forEach((e) => {
      const key = e.profession || "—";
      byProf[key] = (byProf[key] || 0) + 1;
    });
    const barData = Object.entries(byProf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const expiringSoon = employees
      .map((e) => ({
        ...e,
        days: getDaysDifference(e.trainingDate),
      }))
      .filter(
        (e) =>
          e.days >= DAYS_THRESHOLD - 30 && e.days < DAYS_THRESHOLD
      )
      .sort((a, b) => b.days - a.days)
      .slice(0, 5);

    return { total, needRetrain, orgCount, pieData, barData, expiringSoon };
  }, [employees, getDaysDifference]);

  return (
    <div className="dashboard" style={styles.container}>
      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <KpiCard
          title="Всего сотрудников"
          value={stats.total}
          color="#3b82f6"
        />
        <KpiCard
          title="Требуют переподготовки"
          value={stats.needRetrain}
          color={RED_ACCENT}
        />
        <KpiCard
          title="Количество организаций"
          value={stats.orgCount}
          color="#2563eb"
        />
      </div>

      {/* Charts Row */}
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Распределение по организациям</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {stats.pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>
            Топ‑5 профессий по количеству сотрудников
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.barData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                interval={0}
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Сотрудников" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expiring Soon Card */}
      <div style={styles.expiringCard}>
        <h3 style={styles.chartTitle}>
          Ближайшие 5 человек, у которых скоро истечёт основной инструктаж
          <span style={{ color: RED_ACCENT, fontSize: 14, marginLeft: 8 }}>
            (в ближайшие 30 дней)
          </span>
        </h3>
        {stats.expiringSoon.length === 0 ? (
          <p style={styles.emptyText}>Нет сотрудников в этой группе</p>
        ) : (
          <div style={styles.expiringList}>
            {stats.expiringSoon.map((emp, i) => (
              <div key={emp.id} style={styles.expiringRow}>
                <span style={styles.expiringNum}>{i + 1}.</span>
                <span style={styles.expiringName}>{emp.name}</span>
                <span style={styles.expiringOrg}>{emp.organization || "—"}</span>
                <span style={styles.expiringDate}>
                  {emp.trainingDate
                    ? new Date(emp.trainingDate).toLocaleDateString("ru-RU")
                    : "—"}
                </span>
                <span style={styles.expiringDays}>
                  {emp.days} дн. / до просрочки: {DAYS_THRESHOLD - emp.days} дн.
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, color }) {
  return (
    <div style={{ ...styles.kpiCard, borderLeftColor: color }}>
      <div style={styles.kpiTitle}>{title}</div>
      <div style={{ ...styles.kpiValue, color }}>{value}</div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  kpiCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #eef2ff",
    borderLeftWidth: 4,
    borderLeftStyle: "solid",
  },
  kpiTitle: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: 600,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 800,
    marginTop: 8,
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 24,
  },
  chartCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #eef2ff",
    minHeight: 340,
  },
  chartTitle: {
    margin: "0 0 16px 0",
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
  },
  expiringCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    border: "1px solid #eef2ff",
    borderLeft: `4px solid ${RED_ACCENT}`,
  },
  expiringList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  expiringRow: {
    display: "grid",
    gridTemplateColumns: "32px 1fr 140px 110px auto",
    gap: 16,
    alignItems: "center",
    padding: "10px 12px",
    background: "#fef2f2",
    borderRadius: 8,
    fontSize: 14,
  },
  expiringNum: {
    color: "#6b7280",
    fontWeight: 600,
  },
  expiringName: {
    fontWeight: 600,
    color: "#1e293b",
  },
  expiringOrg: {
    color: "#64748b",
  },
  expiringDate: {
    color: "#64748b",
  },
  expiringDays: {
    color: RED_ACCENT,
    fontWeight: 600,
    fontSize: 13,
  },
  emptyText: {
    color: "#94a3b8",
    margin: 0,
  },
};
