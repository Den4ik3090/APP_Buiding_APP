import React, { useState, useMemo } from "react";
import { ADDITIONAL_TRAINING_TYPES } from "../utils/constants";
import { isTrainingExpired } from "./utils/helpers";
import "./AdditionalTrainingsManager.css";
import { GraduationCap,ShieldCheck, Edit2, Calendar, Clock } from "lucide-react";

/**
 * Компонент для управления и просмотра дополнительных обучений всех сотрудников
 */
export default function AdditionalTrainingsManager({ employees = [] }) {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  
  // State для модального окна редактирования
  const [editingTraining, setEditingTraining] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Собираем все обучения со всех сотрудников
  const allTrainings = useMemo(() => {
    const trainings = [];

    employees.forEach((emp) => {
      if (!emp.additionalTrainings || !Array.isArray(emp.additionalTrainings)) {
        return;
      }

      emp.additionalTrainings.forEach((training) => {
        const expired = isTrainingExpired(
          training.dateReceived,
          training.expiryMonths
        );

        trainings.push({
          employeeId: emp.id,
          employeeName: emp.name,
          organization: emp.organization || "—",
          profession: emp.profession || "—",
          type: training.type || training.title || "—",
          dateReceived: training.dateReceived,
          expiryMonths: training.expiryMonths || 0,
          certificate: training.certificate || training.certificate_url || "",
          hours: training.hours || training.duration || "—",
          expired,
        });
      });
    });

    return trainings;
  }, [employees]);

  // Группировка по сотрудникам с применением фильтров
  const employeesWithTrainings = useMemo(() => {
    const map = new Map();

    employees.forEach((emp) => {
      if (!emp.additionalTrainings || emp.additionalTrainings.length === 0) {
        return;
      }

      // Применяем фильтры к обучениям сотрудника
      let trainings = emp.additionalTrainings.map((t) => ({
        ...t,
        expired: isTrainingExpired(t.dateReceived, t.expiryMonths),
      }));

      // Фильтр по типу обучения
      if (selectedType !== "all") {
        trainings = trainings.filter((t) => (t.type || t.title) === selectedType);
      }

      // Фильтр по статусу
      if (selectedStatus === "expired") {
        trainings = trainings.filter((t) => t.expired);
      } else if (selectedStatus === "valid") {
        trainings = trainings.filter((t) => !t.expired);
      }

      // Поиск по имени сотрудника
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!emp.name.toLowerCase().includes(query)) {
          return; // Пропускаем этого сотрудника
        }
      }

      // Если после фильтрации не осталось обучений, не добавляем сотрудника
      if (trainings.length === 0) {
        return;
      }

      const expiredCount = trainings.filter((t) => t.expired).length;
      const validCount = trainings.length - expiredCount;

      map.set(emp.id, {
        id: emp.id,
        name: emp.name,
        organization: emp.organization || "—",
        profession: emp.profession || "—",
        trainings,
        total: trainings.length,
        expired: expiredCount,
        valid: validCount,
      });
    });

    return Array.from(map.values());
  }, [employees, selectedType, selectedStatus, searchQuery]);

  // Статистика
  const stats = useMemo(() => {
    const totalTrainings = allTrainings.length;
    const expiredTrainings = allTrainings.filter((t) => t.expired).length;
    const validTrainings = totalTrainings - expiredTrainings;

    const employeesWithExpired = employeesWithTrainings.filter(
      (e) => e.expired > 0
    ).length;

    const employeesWithTrainingsCount = employeesWithTrainings.length;

    return {
      totalTrainings,
      expiredTrainings,
      validTrainings,
      employeesWithExpired,
      employeesWithTrainingsCount,
      employeesTotal: employees.length,
    };
  }, [allTrainings, employeesWithTrainings, employees]);

  // Уникальные типы обучений
  const trainingTypes = useMemo(() => {
    const types = new Set();
    allTrainings.forEach((t) => types.add(t.type));
    return Array.from(types).sort();
  }, [allTrainings]);

  const toggleEmployee = (empId) => {
    setExpandedEmployee(expandedEmployee === empId ? null : empId);
  };

  // Открыть модальное окно для редактирования
  const handleEditTraining = (employeeId, trainingIndex, training) => {
    setEditingTraining({
      employeeId,
      trainingIndex,
      ...training,
    });
    setShowEditModal(true);
  };

  // Закрыть модальное окно
  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingTraining(null);
  };

  return (
    <div className="trainings-manager">
      {/* Статистика */}
      <div className="trainings-stats">
        <div className="stats-grid">
          <StatCard
            title="Всего обучений"
            value={stats.totalTrainings}
            color="#3b82f6"
            icon={<GraduationCap size={44} color="#170707" />}
          />
          <StatCard
            title="Действительные"
            value={stats.validTrainings}
            color="#10b981"
            icon={<ShieldCheck size={44} color="#09ff05" />}
          />
          <StatCard
            title="Просроченные"
            value={stats.expiredTrainings}
            color="#ef4444"
            icon="⚠️"
          />
          <StatCard
            title="Сотрудников с обучениями"
            value={`${stats.employeesWithTrainingsCount} / ${stats.employeesTotal}`}
            color="#8b5cf6"
            icon="👥"
          />
        </div>
      </div>

      {/* Фильтры */}
      <div className="trainings-filters">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Поиск по ФИО сотрудника..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="status-filter"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">Все типы обучений</option>
          {trainingTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          className="status-filter"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="valid">✅ Действительные</option>
          <option value="expired">⚠️ Просроченные</option>
        </select>
      </div>

      {/* Список сотрудников с обучениями */}
      <div className="trainings-content">
        <h3 className="trainings-title">
          Сотрудники с дополнительными обучениями
        </h3>

        {employeesWithTrainings.length === 0 ? (
          <div className="empty-state">
            Нет сотрудников с дополнительными обучениями
          </div>
        ) : (
          <div className="employees-list">
            {employeesWithTrainings.map((emp) => (
              <div key={emp.id} className="employee-card">
                <div
                  className="employee-header"
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <div className="employee-info">
                    <h4 className="employee-name">{emp.name}</h4>
                    <div className="employee-meta">
                      <span className="meta-item">{emp.organization}</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-item">{emp.profession}</span>
                    </div>
                  </div>

                  <div className="employee-badges">
                    <span className="badge badge-total">
                      Всего: {emp.total}
                    </span>
                    {emp.valid > 0 && (
                      <span className="badge badge-valid">
                        ✅ {emp.valid}
                      </span>
                    )}
                    {emp.expired > 0 && (
                      <span className="badge badge-expired-small">
                        ⚠️ {emp.expired}
                      </span>
                    )}
                    <button
                      className="expand-btn"
                      aria-label="Развернуть/свернуть"
                    >
                      {expandedEmployee === emp.id ? "▼" : "▶"}
                    </button>
                  </div>
                </div>

                {expandedEmployee === emp.id && (
                  <div className="trainings-list">
                    {emp.trainings.map((training, idx) => (
                      <div
                        key={idx}
                        className={`training-item ${
                          training.expired ? "expired" : "valid"
                        }`}
                        onDoubleClick={() => handleEditTraining(emp.id, idx, training)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="training-header">
                          <span className="training-status-icon">
                            {training.expired ? "⚠️" : "✅"}
                          </span>
                          <span className="training-type">
                            {training.type || training.title || "Без названия"}
                          </span>
                          <button
                            className="btn-edit-training"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTraining(emp.id, idx, training);
                            }}
                            title="Редактировать обучение"
                          >
                            ✏️
                          </button>
                        </div>

                        <div className="training-details">
                          <div className="detail-row">
                            <span className="detail-label">Дата получения:</span>
                            <span className="detail-value">
                              {training.dateReceived
                                ? new Date(
                                    training.dateReceived
                                  ).toLocaleDateString("ru-RU")
                                : "—"}
                            </span>
                          </div>

                          <div className="detail-row">
                            <span className="detail-label">Срок действия:</span>
                            <span className="detail-value">
                              {training.expiryMonths
                                ? `${training.expiryMonths} мес.`
                                : "—"}
                            </span>
                          </div>

                          {training.hours && (
                            <div className="detail-row">
                              <span className="detail-label">Часов:</span>
                              <span className="detail-value">
                                {training.hours}
                              </span>
                            </div>
                          )}

                          {training.certificate && (
                            <div className="detail-row">
                              <span className="detail-label">Сертификат:</span>
                              <a
                                href={training.certificate}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="certificate-link"
                              >
                                📄 Открыть
                              </a>
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
      </div>

      {/* Модальное окно редактирования */}
      {showEditModal && editingTraining && (
        <EditTrainingModal
          training={editingTraining}
          onClose={handleCloseModal}
          employees={employees}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-title">{title}</div>
        <div className="stat-value" style={{ color }}>
          {value}
        </div>
      </div>
    </div>
  );
}

/**
 * Модальное окно для редактирования обучения
 */
function EditTrainingModal({ training, onClose, employees }) {
  const [formData, setFormData] = useState({
    type: training.type || training.title || "",
    dateReceived: training.dateReceived || "",
    expiryMonths: training.expiryMonths || "",
    hours: training.hours || training.duration || "",
    certificate: training.certificate || training.certificate_url || "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Находим сотрудника
      const employee = employees.find((emp) => emp.id === training.employeeId);
      if (!employee) {
        alert("Сотрудник не найден");
        return;
      }

      // Обновляем обучение
      const updatedTrainings = [...employee.additionalTrainings];
      updatedTrainings[training.trainingIndex] = {
        ...updatedTrainings[training.trainingIndex],
        type: formData.type,
        title: formData.type,
        dateReceived: formData.dateReceived,
        expiryMonths: parseInt(formData.expiryMonths) || 0,
        hours: formData.hours,
        duration: formData.hours,
        certificate: formData.certificate,
        certificate_url: formData.certificate,
      };

      // Импортируем supabase
      const { supabase } = await import("../supabaseClient");

      // Сохраняем в базу данных
      const { error } = await supabase
        .from("employees")
        .update({ additional_trainings: updatedTrainings })
        .eq("id", training.employeeId);

      if (error) throw error;

      alert("✅ Обучение успешно обновлено!");
      onClose();
      
      // Перезагружаем страницу для обновления данных
      window.location.reload();
    } catch (error) {
      console.error("Ошибка при сохранении:", error);
      alert("❌ Ошибка при сохранении обучения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">✏️ Редактирование обучения</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">
              Тип обучения <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value)}
              required
            >
              <option value="">-- Выберите тип --</option>
              {ADDITIONAL_TRAINING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Дата получения <span className="required">*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={formData.dateReceived}
                onChange={(e) => handleChange("dateReceived", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Срок действия (мес.) <span className="required">*</span>
              </label>
              <input
                type="number"
                className="form-input"
                value={formData.expiryMonths}
                onChange={(e) => handleChange("expiryMonths", e.target.value)}
                min="1"
                max="120"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Количество часов</label>
            <input
              type="text"
              className="form-input"
              value={formData.hours}
              onChange={(e) => handleChange("hours", e.target.value)}
              placeholder="Например: 40"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ссылка на сертификат</label>
            <input
              type="url"
              className="form-input"
              value={formData.certificate}
              onChange={(e) => handleChange("certificate", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving}
            >
              {saving ? "Сохранение..." : "💾 Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}