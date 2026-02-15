import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import "../style/OrganizationManager.css";

export default function OrganizationManager({ employees = [] }) {
  const [docsData, setDocsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const uniqueOrgs = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return [...new Set(employees.map((e) => e.organization).filter(Boolean))];
  }, [employees]);

  const getDefaultDocs = () => ({
    "Акт допуск": false,
    Приказы: false,
    Удостоверения: false,
    "Проектная док.": false,
    Инструкции: false,
    Журналы: false,
    "Обучения сотрудников": false,
  });

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("organization_docs").select("*");
      if (error) throw error;

      const currentDbData = data || [];
      const merged = uniqueOrgs.map((orgName) => {
        const existing = currentDbData.find((d) => d.org_name === orgName);
        return existing || { org_name: orgName, docs_status: getDefaultDocs() };
      });

      setDocsData(merged);
    } catch (err) {
      console.error("Ошибка при загрузке:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [uniqueOrgs]);

  const handleCheck = async (orgName, key) => {
    const targetOrg = docsData.find((d) => d.org_name === orgName);
    if (!targetOrg) return;

    const updatedStatus = {
      ...targetOrg.docs_status,
      [key]: !targetOrg.docs_status[key],
    };

    setDocsData((prev) =>
      prev.map((d) =>
        d.org_name === orgName ? { ...d, docs_status: updatedStatus } : d
      )
    );

    await supabase
      .from("organization_docs")
      .upsert(
        {
          org_name: orgName,
          docs_status: updatedStatus,
          updated_at: new Date(),
        },
        { onConflict: "org_name" }
      );
  };

  const addColumn = () => {
    const name = prompt("Введите название нового документа:");
    if (!name) return;
    setDocsData((prev) =>
      prev.map((d) => ({
        ...d,
        docs_status: { ...d.docs_status, [name]: false },
      }))
    );
  };

  const removeColumn = async (columnName) => {
    if (
      !window.confirm(
        `Удалить колонку «${columnName}» для всех организаций?`
      )
    )
      return;

    setLoading(true);
    try {
      const payload = docsData.map((org) => {
        const newStatus = { ...org.docs_status };
        delete newStatus[columnName];
        return {
          org_name: org.org_name,
          docs_status: newStatus,
          updated_at: new Date(),
        };
      });

      const { error } = await supabase
        .from("organization_docs")
        .upsert(payload, { onConflict: "org_name" });

      if (error) throw error;
      setDocsData(payload);
    } catch (err) {
      console.error("Ошибка при удалении:", err);
      alert("Не удалось удалить параметр. Проверьте подключение.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="org-manager org-manager--loading">
        <div className="org-manager__skeleton">
          <div className="org-manager__skeleton-header" />
          <div className="org-manager__skeleton-table">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="org-manager__skeleton-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="org-manager" aria-labelledby="org-manager-title">
      <header className="org-manager__header">
        <div className="org-manager__header-content">
          <h2 id="org-manager-title" className="org-manager__title">
            Документация организаций
          </h2>
          <p className="org-manager__subtitle">
            Отметки наличия документов по каждой организации
          </p>
        </div>
        <div className="org-manager__header-actions">
          <span className="org-manager__badge">{uniqueOrgs.length} орг.</span>
          <button
            type="button"
            className="org-manager__btn-add"
            onClick={addColumn}
          >
            <span className="org-manager__btn-add-icon" aria-hidden>+</span>
            Добавить колонку
          </button>
        </div>
      </header>

      <div className="org-manager__table-wrap">
        <table className="org-table" role="grid">
          <thead>
            <tr>
              <th className="org-table__th org-table__th--org">Организация</th>
              {docsData.length > 0 &&
                docsData[0].docs_status &&
                Object.keys(docsData[0].docs_status).map((col) => (
                  <th key={col} className="org-table__th org-table__th--doc">
                    <span className="org-table__doc-name">{col}</span>
                    <button
                      type="button"
                      className="org-table__doc-remove"
                      onClick={() => removeColumn(col)}
                      title={`Удалить «${col}» у всех организаций`}
                      aria-label={`Удалить колонку ${col}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {docsData.map((org, rowIndex) => (
              <tr
                key={org.org_name}
                className="org-table__row"
                style={{ animationDelay: `${rowIndex * 0.02}s` }}
              >
                <td className="org-table__cell org-table__cell--org">
                  <span className="org-table__org-name">{org.org_name}</span>
                </td>
                {docsData[0] &&
                  Object.keys(docsData[0].docs_status).map((key) => (
                    <td key={key} className="org-table__cell org-table__cell--check">
                      <label className="org-table__check-label">
                        <input
                          type="checkbox"
                          className="org-table__checkbox doc-checkbox"
                          checked={!!org.docs_status[key]}
                          onChange={() => handleCheck(org.org_name, key)}
                          aria-label={`${org.org_name}, ${key}`}
                        />
                        <span className="org-table__check-mark" aria-hidden />
                      </label>
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
