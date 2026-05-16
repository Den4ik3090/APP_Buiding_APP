import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart3,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  Users,
  Filter,
} from "lucide-react";
import { saveAs } from "file-saver";
import { isTrainingExpired } from "@/entities/employee";
import type { Employee, AdditionalTraining } from "@/entities/employee";
import "./AdditionalTrainingsManager.css";

// AdditionalTraining has [key: string]: unknown — this alias surfaces the known runtime fields
type TrainingData = AdditionalTraining & {
  type?: string;
  title?: string;
  hours?: string | number;
  duration?: string | number;
  certificate?: string;
  certificate_url?: string;
};

interface TrainingRecord {
  employeeId: string;
  employeeName: string;
  profession: string;
  organization: string;
  type: string;
  dateReceived: string;
  expiryMonths: number;
  hours: string | number;
  certificate: string;
  expired: boolean;
  trainingIndex: number;
}

interface EmployeeGroup {
  employeeId: string;
  employeeName: string;
  profession: string;
  organization: string;
  trainings: TrainingRecord[];
  total: number;
  expired: number;
  valid: number;
}

interface ByTypeItem {
  label: string;
  value: number;
}

interface ByMonthItem {
  sortKey: string;
  label: string;
  value: number;
}

interface AdditionalTrainingsManagerProps {
  employees?: Employee[];
  loading?: boolean;
}

const PIE_COLORS = ["#10b981", "#ef4444"];

function riskColor(expired: number): string {
  if (expired > 2) return "#ef4444";
  if (expired > 0) return "#f59e0b";
  return "#10b981";
}

function riskLabel(expired: number): string {
  if (expired > 2) return "Высокий";
  if (expired > 0) return "Средний";
  return "Низкий";
}

export default function AdditionalTrainingsManager({
  employees = [],
  loading = false,
}: AdditionalTrainingsManagerProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [exportError, setExportError] = useState<string | null>(null);

  const toggleRow = (employeeId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [employeeId]: !prev[employeeId],
    }));
  };

  const resetFilters = () => {
    setSelectedType("all");
    setSelectedStatus("all");
    setSearchQuery("");
  };

  const analytics = useMemo(() => {
    const trainings: TrainingRecord[] = [];

    employees.forEach((emp) => {
      (emp.additionalTrainings || []).forEach((rawTraining, index) => {
        const training = rawTraining as TrainingData;
        const expired = isTrainingExpired(
          training.dateReceived,
          training.expiryMonths
        );

        trainings.push({
          employeeId: emp.id,
          employeeName: emp.name || "—",
          profession: emp.profession || "—",
          organization: emp.organization || "—",
          type: training.type || training.title || "Без названия",
          dateReceived: training.dateReceived || "",
          expiryMonths: Number(training.expiryMonths || 0),
          hours: training.hours || training.duration || "",
          certificate:
            training.certificate || training.certificate_url || "",
          expired,
          trainingIndex: index,
        });
      });
    });

    const filtered = trainings.filter((t) => {
      if (selectedType !== "all" && t.type !== selectedType) return false;
      if (selectedStatus === "expired" && !t.expired) return false;
      if (selectedStatus === "valid" && t.expired) return false;

      if (
        searchQuery.trim() &&
        !t.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    });

    const byTypeMap = new Map<string, number>();
    const byMonthMap = new Map<string, ByMonthItem>();
    const byEmployeeMap = new Map<string, EmployeeGroup>();

    filtered.forEach((t) => {
      byTypeMap.set(t.type, (byTypeMap.get(t.type) || 0) + 1);

      const monthDate = t.dateReceived ? new Date(t.dateReceived) : null;
      const monthKey =
        monthDate && !Number.isNaN(monthDate.getTime())
          ? `${monthDate.getFullYear()}-${String(
            monthDate.getMonth() + 1
          ).padStart(2, "0")}`
          : "Без даты";

      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, {
          sortKey: monthKey,
          label:
            monthKey === "Без даты"
              ? "Без даты"
              : monthDate!.toLocaleDateString("ru-RU", {
                year: "numeric",
                month: "short",
              }),
          value: 0,
        });
      }
      byMonthMap.get(monthKey)!.value += 1;

      if (!byEmployeeMap.has(t.employeeId)) {
        byEmployeeMap.set(t.employeeId, {
          employeeId: t.employeeId,
          employeeName: t.employeeName,
          profession: t.profession,
          organization: t.organization,
          trainings: [],
          total: 0,
          expired: 0,
          valid: 0,
        });
      }

      const empGroup = byEmployeeMap.get(t.employeeId)!;
      empGroup.trainings.push(t);
      empGroup.total += 1;
      if (t.expired) empGroup.expired += 1;
      else empGroup.valid += 1;
    });

    const byType: ByTypeItem[] = Array.from(byTypeMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const byMonth: ByMonthItem[] = Array.from(byMonthMap.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );

    const byEmployee: EmployeeGroup[] = Array.from(byEmployeeMap.values()).sort(
      (a, b) => b.expired - a.expired || b.total - a.total
    );

    const total = filtered.length;
    const expired = filtered.filter((t) => t.expired).length;
    const valid = total - expired;
    const compliance = total ? Math.round((valid / total) * 100) : 0;
    const totalHours = filtered.reduce((sum, t) => {
      const value = Number(t.hours);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    return {
      filtered,
      groupedEmployees: byEmployee,
      total,
      expired,
      valid,
      compliance,
      totalHours,
      byType,
      byMonth,
      byEmployee,
    };
  }, [employees, selectedType, selectedStatus, searchQuery]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();

    employees.forEach((emp) => {
      (emp.additionalTrainings || []).forEach((rawT) => {
        const t = rawT as TrainingData;
        types.add(t.type || t.title || "Без названия");
      });
    });

    return Array.from(types).sort();
  }, [employees]);

  const handleExportExcel = async () => {
    if (!analytics.filtered.length) {
      setExportError("Нет данных для экспорта");
      return;
    }

    setExportError(null);

    const ExcelJS = await import("exceljs");

    const workbook = new ExcelJS.default.Workbook();
    const worksheet = workbook.addWorksheet("Обучения");

    // Headers + widths in one declaration. Width numbers preserved from the
    // previous xlsx wch values (28, 22, 22, 30, 18, 20, 12, 18, 40).
    worksheet.columns = [
      { header: "ФИО сотрудника",      key: "name",   width: 28 },
      { header: "Организация",          key: "org",    width: 22 },
      { header: "Профессия",            key: "prof",   width: 22 },
      { header: "Тип обучения",         key: "type",   width: 30 },
      { header: "Дата получения",       key: "date",   width: 18 },
      { header: "Срок действия (мес.)", key: "expiry", width: 20 },
      { header: "Часы",                 key: "hours",  width: 12 },
      { header: "Статус",               key: "status", width: 18 },
      { header: "Сертификат",           key: "cert",   width: 40 },
    ];

    analytics.filtered.forEach((t) => {
      worksheet.addRow({
        name:   t.employeeName,
        org:    t.organization,
        prof:   t.profession,
        type:   t.type,
        date:   t.dateReceived
          ? new Date(t.dateReceived).toLocaleDateString("ru-RU")
          : "—",
        expiry: t.expiryMonths || "—",
        hours:  t.hours || "—",
        status: t.expired ? "Просрочено" : "Действительно",
        cert:   t.certificate || "",
      });
    });

    // writeBuffer is async — handleExportExcel is already async, no signature change.
    const buffer = await workbook.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const today = new Date().toISOString().slice(0, 10);
    saveAs(blob, `additional-trainings-${today}.xlsx`);
  };

  if (loading) {
    return (
      <div className="trainings-manager">
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card" style={{ borderLeftColor: "#94a3b8" }}>
              <div className="stat-icon">
                <div className="spinner-border spinner-border-sm text-secondary" role="status" />
              </div>
              <div className="stat-content">
                <div className="stat-value">—</div>
                <div className="stat-title">Загрузка...</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const byTypeData = analytics.byType.slice(0, 8);
  const byMonthData = analytics.byMonth;
  const statusData = [
    { name: "Действительные", value: analytics.valid },
    { name: "Просроченные", value: analytics.expired },
  ];
  const topRiskData = analytics.byEmployee
    .slice(0, 8)
    .map((e) => ({ name: e.employeeName, value: e.expired }));

  return (
    <div className="trainings-manager">
      {/* ── Stat cards ──────────────────────────────────────── */}
      <div className="trainings-stats">
        <div className="stats-grid">
          <div className="stat-card" style={{ borderLeftColor: "#3b82f6" }}>
            <div className="stat-icon"><GraduationCap size={32} color="#3b82f6" /></div>
            <div className="stat-content">
              <div className="stat-title">Всего обучений</div>
              <div className="stat-value" style={{ color: "#3b82f6" }}>{analytics.total}</div>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeftColor: "#10b981" }}>
            <div className="stat-icon"><ShieldCheck size={32} color="#10b981" /></div>
            <div className="stat-content">
              <div className="stat-title">Действительные</div>
              <div className="stat-value" style={{ color: "#10b981" }}>{analytics.valid}</div>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeftColor: "#ef4444" }}>
            <div className="stat-icon"><AlertTriangle size={32} color="#ef4444" /></div>
            <div className="stat-content">
              <div className="stat-title">Просроченные</div>
              <div className="stat-value" style={{ color: "#ef4444" }}>{analytics.expired}</div>
            </div>
          </div>

          <div className="stat-card" style={{ borderLeftColor: "#f59e0b" }}>
            <div className="stat-icon"><Users size={32} color="#f59e0b" /></div>
            <div className="stat-content">
              <div className="stat-title">Compliance</div>
              <div className="stat-value" style={{ color: "#f59e0b" }}>{analytics.compliance}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="trainings-filters">
        <input
          type="text"
          className="form-input search-input"
          placeholder="🔍 Поиск по ФИО сотрудника..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="form-input status-filter"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">Все типы</option>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          className="form-input status-filter"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="valid">✅ Действительные</option>
          <option value="expired">⚠️ Просроченные</option>
        </select>

        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn-cancel" onClick={resetFilters} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={16} />
            Сбросить
          </button>
          <button className="btn-save" onClick={handleExportExcel}>
            Экспорт Excel
          </button>
          {exportError && (
            <span style={{ color: "#dc2626", fontSize: 13 }}>⚠️ {exportError}</span>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="trainings-content">
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
          {(["list", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                color: activeTab === tab ? "#3b82f6" : "#64748b",
                borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: -2,
                transition: "color 0.2s",
              }}
            >
              {tab === "list"
                ? `Список (${analytics.groupedEmployees.length})`
                : `Аналитика (${analytics.total})`}
            </button>
          ))}
        </div>

        {/* ── List tab ──────────────────────────────────────── */}
        {activeTab === "list" && (
          <>
            <h3 className="trainings-title">Сотрудники с дополнительными обучениями</h3>

            {analytics.groupedEmployees.length === 0 ? (
              <div className="empty-state">
                <GraduationCap size={64} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Нет данных</div>
                <div>Попробуйте изменить фильтры или добавьте сотрудников с обучением</div>
              </div>
            ) : (
              <div className="employees-list">
                {analytics.groupedEmployees.map((emp) => (
                  <div key={emp.employeeId} className="employee-card">
                    <div
                      className="employee-header"
                      onClick={() => toggleRow(emp.employeeId)}
                    >
                      <div className="employee-info">
                        <h4 className="employee-name">{emp.employeeName}</h4>
                        <div className="employee-meta">
                          <span className="meta-item">{emp.organization}</span>
                          <span className="meta-divider">·</span>
                          <span className="meta-item">{emp.profession}</span>
                        </div>
                      </div>

                      <div className="employee-badges">
                        <span className="badge badge-total">{emp.total} всего</span>
                        <span className="badge badge-valid">{emp.valid} действ.</span>
                        {emp.expired > 0 && (
                          <span className="badge badge-expired-small">{emp.expired} проср.</span>
                        )}
                        <span
                          className="badge"
                          style={{
                            background: emp.expired > 2 ? "#fee2e2" : emp.expired > 0 ? "#fef3c7" : "#dcfce7",
                            color: riskColor(emp.expired),
                          }}
                        >
                          {riskLabel(emp.expired)}
                        </span>
                      </div>

                      <button className="expand-btn">
                        {expandedRows[emp.employeeId] ? "▼" : "▶"}
                      </button>
                    </div>

                    {expandedRows[emp.employeeId] && (
                      <div className="trainings-list">
                        {emp.trainings.map((training, idx) => (
                          <div
                            key={`${emp.employeeId}-${idx}`}
                            className={`training-item ${training.expired ? "expired" : "valid"}`}
                          >
                            <div className="training-header">
                              <span className="training-status-icon">
                                {training.expired ? "⚠️" : "✅"}
                              </span>
                              <span className="training-type">{training.type}</span>
                              <button className="btn-edit-training" title="Редактировать">
                                ✏️
                              </button>
                              {training.certificate && (
                                <a
                                  className="certificate-link"
                                  href={training.certificate}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  📄 Сертификат
                                </a>
                              )}
                            </div>

                            <div className="training-details">
                              <div className="detail-row">
                                <span className="detail-label">Дата получения</span>
                                <span className="detail-value">
                                  {training.dateReceived
                                    ? new Date(training.dateReceived).toLocaleDateString("ru-RU")
                                    : "—"}
                                </span>
                              </div>
                              <div className="detail-row">
                                <span className="detail-label">Срок действия</span>
                                <span className="detail-value">
                                  {training.expiryMonths ? `${training.expiryMonths} мес.` : "—"}
                                </span>
                              </div>
                              {training.hours && (
                                <div className="detail-row">
                                  <span className="detail-label">Часы</span>
                                  <span className="detail-value">{training.hours}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Analytics tab ─────────────────────────────────── */}
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
              {/* Line chart — monthly trend */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>
                  Динамика обучений
                </div>
                {byMonthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={byMonthData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Обучений"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ padding: "40px 0" }}>
                    Нет данных для графика
                  </div>
                )}
              </div>

              {/* Pie chart — status */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>
                  Статусы
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                    >
                      {statusData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
              {/* Bar chart — by type */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>
                  Обучения по типам
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={byTypeData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" name="Количество" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart — top risk */}
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>
                  Топ сотрудников по риску
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topRiskData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f97316" name="Просроченных" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary table */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>
                Сводка по сотрудникам
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="table table-hover align-middle" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>Сотрудник</th>
                      <th>Профессия</th>
                      <th>Всего</th>
                      <th>Действительно</th>
                      <th>Просрочено</th>
                      <th>Риск</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byEmployee.map((emp, idx) => (
                      <tr key={`${emp.employeeId}-${idx}`}>
                        <td>{emp.employeeName}</td>
                        <td>{emp.profession}</td>
                        <td>{emp.total}</td>
                        <td style={{ color: "#16a34a", fontWeight: 600 }}>{emp.valid}</td>
                        <td style={{ color: "#dc2626", fontWeight: 600 }}>{emp.expired}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: emp.expired > 2 ? "#fee2e2" : emp.expired > 0 ? "#fef3c7" : "#dcfce7",
                              color: riskColor(emp.expired),
                            }}
                          >
                            {riskLabel(emp.expired)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
