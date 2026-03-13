import React, { useEffect, useMemo, useState } from "react";
import { PERMIT_TYPES } from "../../utils/permitConstants";
import {
  generatePermitNumber,
  calculateExpiryDate,
  formatDateInput,
  validatePermitData,
} from "../../utils/permitHelpers";
import { supabase } from "../../supabaseClient";



const DEFAULT_TYPE =
  Array.isArray(PERMIT_TYPES) && PERMIT_TYPES.length > 0
    ? PERMIT_TYPES[0]
    : "";

export default function PermitForm({
  permit,
  employees = [],
  permits = [],
  onClose,
  onSave,
  addNotification = () => {},
}) {
  const isEdit = Boolean(permit);
  const organizations = useMemo(
    () =>
      Array.from(
        new Set(
          (Array.isArray(employees) ? employees : [])
            .map((emp) => emp.organization)
            .filter((org) => typeof org === "string" && org.trim() !== "")
        )
      ).sort(),
    [employees]
  );
  const [form, setForm] = useState({
    permit_type: DEFAULT_TYPE,
    issue_date: new Date().toISOString().slice(0, 10),
    responsible_person_id: "",
    organization: "",
    comments: "",
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (permit) {
      setForm({
        permit_type: permit.permit_type || DEFAULT_TYPE,
        issue_date: formatDateInput(permit.issue_date),
        responsible_person_id: permit.responsible_person_id || "",
        organization: permit.organization || "",
        comments: permit.comments || "",
      });
    }
  }, [permit]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validation = validatePermitData(form);
    if (!validation.valid) {
      setErrors(validation.errors || {});
      return;
    }
    setErrors({});

    try {
      setSaving(true);
      const issueDate = new Date(form.issue_date);
      const expiryDate = calculateExpiryDate(issueDate);
      const expiryStr = expiryDate.toISOString().slice(0, 10);

      if (isEdit) {
        const { error } = await supabase
          .from("permits")
          .update({
            permit_type: form.permit_type,
            issue_date: form.issue_date,
            expiry_date: expiryStr,
            responsible_person_id: form.responsible_person_id || null,
            organization: form.organization,
            comments: form.comments || null,
          })
          .eq("id", permit.id);

        if (error) throw error;
      } else {
        const number = generatePermitNumber(issueDate, permits || []);

        const { error } = await supabase.from("permits").insert({
          permit_number: number,
          permit_type: form.permit_type,
          issue_date: form.issue_date,
          expiry_date: expiryStr,
          responsible_person_id: form.responsible_person_id || null,
          organization: form.organization,
          comments: form.comments || null,
          status: "Активен",
          is_extended: false,
          extension_count: 0,
        });

        if (error) throw error;
      }

      if (onSave) await onSave();
    } catch (error) {
      console.error("Ошибка сохранения наряда:", error);
      if (error?.code === "23514") {
        addNotification(
          "Тип наряда не проходит проверку БД. Выберите тип из существующих.",
          "error",
          "normal"
        );
      }
      addNotification("Ошибка сохранения наряда", "error", "normal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="permits-modal-overlay" onClick={onClose}>
      <div className="permits-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Редактировать наряд" : "Создать наряд"}</h2>

        <form className="permits-form" onSubmit={handleSubmit}>
          <div className="permits-form-grid">
            <div className="permits-form-group">
              <label>Тип наряда</label>
              <select
                value={form.permit_type}
                onChange={handleChange("permit_type")}
              >
                {Array.isArray(PERMIT_TYPES) &&
                  PERMIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
              </select>
              {errors.permit_type && (
                <p className="permits-error">{errors.permit_type}</p>
              )}
            </div>

            <div className="permits-form-group">
              <label>Дата выдачи</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={handleChange("issue_date")}
              />
              {errors.issue_date && (
                <p className="permits-error">{errors.issue_date}</p>
              )}
            </div>

            <div className="permits-form-group">
              <label>Ответственный</label>
              <select
                value={form.responsible_person_id}
                onChange={handleChange("responsible_person_id")}
              >
                <option value="">Не выбрано</option>
                {Array.isArray(employees) &&
                  employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.organization})
                    </option>
                  ))}
              </select>
              {errors.responsible_person_id && (
                <p className="permits-error">
                  {errors.responsible_person_id}
                </p>
              )}
            </div>

            <div className="permits-form-group">
              <label>Организация</label>
              <select
                value={form.organization}
                onChange={handleChange("organization")}
              >
                <option value="">Выберите организацию</option>
                {form.organization &&
                  !organizations.includes(form.organization) && (
                    <option value={form.organization}>{form.organization}</option>
                  )}
                {organizations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
              {errors.organization && (
                <p className="permits-error">{errors.organization}</p>
              )}
            </div>
          </div>

          <div className="permits-form-group">
            <label>Комментарии</label>
            <textarea
              rows={3}
              value={form.comments}
              onChange={handleChange("comments")}
            />
          </div>

          <div className="permits-form-actions">
            <button
              type="button"
              className="btn-danger"
              onClick={onClose}
              disabled={saving}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving
                ? "Сохранение..."
                : isEdit
                ? "Сохранить изменения"
                : "Создать наряд"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
