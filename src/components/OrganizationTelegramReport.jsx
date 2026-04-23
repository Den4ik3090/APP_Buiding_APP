import React, { useState, useMemo } from "react";
import { sendToTelegram } from "../utils/sendToTelegram";
import { DAYS_THRESHOLD, WARNING_THRESHOLD } from "../utils/constants";

/**
 * Компонент для отправки списка сотрудников выбранной организации в Telegram
 */
function OrganizationTelegramReport({ employees, getDaysDifference }) {
  const [selectedOrg, setSelectedOrg] = useState("");
  const [sending, setSending] = useState(false);

  // Получаем уникальный список организаций
  const organizations = useMemo(() => {
    const orgSet = new Set();
    employees.forEach((emp) => {
      const org = emp.organization?.trim();
      if (org) orgSet.add(org);
    });
    return Array.from(orgSet).sort();
  }, [employees]);

  // Фильтруем сотрудников по выбранной организации
  const filteredEmployees = useMemo(() => {
    if (!selectedOrg) return [];
    return employees.filter((emp) => emp.organization === selectedOrg);
  }, [employees, selectedOrg]);

  // Формируем отчет
  const handleSendReport = async () => {
    if (!selectedOrg || filteredEmployees.length === 0) {
      alert("Выберите организацию");
      return;
    }

    setSending(true);

    try {
      // Подготовка данных сотрудников
      const employeesList = filteredEmployees.map((emp) => {
        const days = getDaysDifference(emp.trainingDate);
        const expired = days >= DAYS_THRESHOLD;
        const warning = days >= WARNING_THRESHOLD && days < DAYS_THRESHOLD;

        let statusIcon = "🟢";
        let statusText = "Норма";

        if (expired) {
          statusIcon = "🔴";
          statusText = "Просрочено";
        } else if (warning) {
          statusIcon = "🟡";
          statusText = "Скоро истекает";
        }

        return {
          name: emp.name,
          profession: emp.profession || "—",
          trainingDate: emp.trainingDate
            ? new Date(emp.trainingDate).toLocaleDateString("ru-RU")
            : "—",
          days,
          status: `${statusIcon} ${statusText}`,
          expired,
          warning,
        };
      });

      // Сортируем: сначала просроченные, потом предупреждения, потом норма
      employeesList.sort((a, b) => {
        if (a.expired && !b.expired) return -1;
        if (!a.expired && b.expired) return 1;
        if (a.warning && !b.warning) return -1;
        if (!a.warning && b.warning) return 1;
        return b.days - a.days;
      });

      // Подсчет статистики
      const total = employeesList.length;
      const expiredCount = employeesList.filter((e) => e.expired).length;
      const warningCount = employeesList.filter((e) => e.warning).length;
      const validCount = total - expiredCount - warningCount;

      // Формируем текст отчета
      let report = `📊 ОТЧЕТ ПО ОРГАНИЗАЦИИ\n`;
      report += `━━━━━━━━━━━━━━━━━━━━\n`;
      report += `🏢 Организация: ${selectedOrg}\n\n`;
      report += `📈 Статистика:\n`;
      report += `• Всего сотрудников: ${total}\n`;
      report += `• 🟢 Норма: ${validCount}\n`;
      report += `• 🟡 Скоро истекает: ${warningCount}\n`;
      report += `• 🔴 Просрочено: ${expiredCount}\n`;
      report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

      // Добавляем список сотрудников (максимум 30, чтобы не превысить лимит Telegram)
      const maxEmployees = 30;
      const displayList = employeesList.slice(0, maxEmployees);

      report += `👥 СПИСОК СОТРУДНИКОВ:\n\n`;

      displayList.forEach((emp, index) => {
        report += `${index + 1}. ${emp.name}\n`;
        report += `   • Должность: ${emp.profession}\n`;
        report += `   • Инструктаж: ${emp.trainingDate}\n`;

      });




      // Отправляем в Telegram
      const result = await sendToTelegram(report);

      if (result.success) {
        alert(`✅ Отчет по организации "${selectedOrg}" отправлен в Telegram!`);
      } else {
        alert(`❌ Ошибка отправки: ${result.error}`);
      }
    } catch (error) {
      console.error("Ошибка отправки отчета:", error);
      alert("❌ Ошибка при формировании отчета");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📱 Отправить отчет в Telegram</h3>
        <p style={styles.subtitle}>
          Выберите организацию для получения списка сотрудников
        </p>
      </div>

      <div style={styles.controls}>
        <select
          style={styles.select}
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          disabled={sending}
        >
          <option value="">-- Выберите организацию --</option>
          {organizations.map((org) => (
            <option key={org} value={org}>
              {org}
            </option>
          ))}
        </select>

        {selectedOrg && (
          <div style={styles.info}>
            <span style={styles.infoText}>
              Сотрудников в организации: <strong>{filteredEmployees.length}</strong>
            </span>
          </div>
        )}

        <button
          type="button"
          style={{
            ...styles.button,
            ...((!selectedOrg || sending) && styles.buttonDisabled),
          }}
          onClick={handleSendReport}
          disabled={!selectedOrg || sending}
        >
          {sending ? "⏳ Отправка..." : "📤 Отправить в Telegram"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #eef2ff",
    marginBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: "#64748b",
  },
  controls: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  select: {
    width: "100%",
    padding: "12px 16px",
    fontSize: 14,
    border: "2px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    transition: "all 0.2s",
    outline: "none",
  },
  info: {
    padding: "12px 16px",
    background: "#f1f5f9",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
  },
  infoText: {
    fontSize: 14,
    color: "#475569",
  },
  button: {
    padding: "14px 24px",
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.3s",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  buttonDisabled: {
    background: "#cbd5e1",
    cursor: "not-allowed",
    boxShadow: "none",
  },
};

export default OrganizationTelegramReport;