import React, { useMemo } from "react";
import { computeAnalytics } from "../utils/analytics";
import { sendToTelegram } from "../utils/sendToTelegram";

export default function AnalyticsDashboard({ employees, getDaysDifference }) {
  const a = useMemo(
    () => computeAnalytics(employees, getDaysDifference),
    [employees, getDaysDifference]
  );

  const sendWeeklySnapshot = async () => {
    const text =
      `Отчет (Analytics)\n` +
      `Всего сотрудников: ${a.total}\n` +
      `Conformity Rate: ${a.conformityRate.toFixed(1)}%\n` +
      `Просрочено: ${a.counts.expired}, Предупр.: ${a.counts.warning}, В норме: ${a.counts.valid}\n` +
      `Avg Days Overdue: ${a.avgDaysOverdue.toFixed(1)}\n` +
      `Скоро истекает: 7д=${a.upcoming.d7}, 14д=${a.upcoming.d14}, 30д=${a.upcoming.d30}`;

    await sendToTelegram(text);
    alert("Отправлено в Telegram");
  };

  return (
    <div className="form-section">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Аналитическая сводка для руководителя </h3>
        <button className="btn-export" onClick={sendWeeklySnapshot}>
          Отправить отчет в Telegram
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
        <Kpi title="% сотрудников в норме" value={`${a.conformityRate.toFixed(1)}%`} hint="Цель: >95%" />
        <Kpi title="Средняя просрочка " value={a.avgDaysOverdue.toFixed(1)} hint="Цель: 0" />
        <Kpi title="Подходят к дедлайну 7/14/30" value={`${a.upcoming.d7} / ${a.upcoming.d14} / ${a.upcoming.d30}`} hint="Сколько истекает скоро" />
        <Kpi title="Expired / Warning / Valid" value={`${a.counts.expired} / ${a.counts.warning} / ${a.counts.valid}`} hint="Текущее состояние" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14, marginTop: 16 }}>
        <MiniTable title="Статистика по организациям " rows={a.byOrg} />
        <MiniTable title="Статистика по ответственным" rows={a.byManager} />
      </div>
    </div>
  );
}

function Kpi({ title, value, hint }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #eef2ff" }}>
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{value}</div>
      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function MiniTable({ title, rows }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: 14, border: "1px solid #eef2ff" }}>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Название</th>
              <th style={th}>Всего</th>
              <th style={th}>В норме</th>
              <th style={th}>Предупр.</th>
              <th style={th}>Просроч.</th>
              <th style={th}>CR%</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((r) => (
              <tr key={r.name}>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.total}</td>
                <td style={td}>{r.valid}</td>
                <td style={td}>{r.warning}</td>
                <td style={td}>{r.expired}</td>
                <td style={td}>{r.conformityRate.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
        Сортировка: худшие сверху.
      </div>
    </div>
  );
}

const th = { textAlign: "left", fontSize: 12, color: "#6b7280", padding: "8px 6px", borderBottom: "1px solid #eef2ff" };
const td = { padding: "8px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
