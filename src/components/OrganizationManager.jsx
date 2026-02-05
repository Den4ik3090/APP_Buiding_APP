import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import '../style/OrganizationManager.css';

export default function OrganizationManager({ employees = [] }) { // Добавили = [] для защиты
  const [docsData, setDocsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Получаем уникальный список организаций из пропса employees
  // Добавляем проверку на существование массива
  const uniqueOrgs = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return [...new Set(employees.map(e => e.organization).filter(Boolean))];
  }, [employees]);

  useEffect(() => {
    fetchDocs();
  }, [uniqueOrgs]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("organization_docs").select("*");
      
      if (error) throw error;

      // Используем data || [], чтобы избежать ошибки map, если в таблице пусто
      const currentDbData = data || [];

      const merged = uniqueOrgs.map(orgName => {
        const existing = currentDbData.find(d => d.org_name === orgName);
        return existing || { org_name: orgName, docs_status: getDefaultDocs() };
      });

      setDocsData(merged);
    } catch (err) {
      console.error("Ошибка в OrganizationManager:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultDocs = () => ({
    "Акт допуск": false,
    "Приказы": false,
    "Удостоверения": false,
    "Проектная док.": false,
    "Инструкции": false,
    "Журналы": false
  });

  const handleCheck = async (orgName, key) => {
    const targetOrg = docsData.find(d => d.org_name === orgName);
    if (!targetOrg) return;

    const updatedStatus = { ...targetOrg.docs_status, [key]: !targetOrg.docs_status[key] };

    setDocsData(prev => prev.map(d => d.org_name === orgName ? { ...d, docs_status: updatedStatus } : d));

    await supabase.from("organization_docs").upsert({
      org_name: orgName,
      docs_status: updatedStatus,
      updated_at: new Date()
    }, { onConflict: 'org_name' });
  };

  const addColumn = () => {
    const name = prompt("Введите название нового документа:");
    if (!name) return;
    setDocsData(prev => prev.map(d => ({
      ...d, 
      docs_status: { ...d.docs_status, [name]: false }
    })));
  };

  if (loading) return <div style={{ padding: 20 }}>Загрузка данных организаций...</div>;

  return (
    <div className="table-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Документация организаций ({uniqueOrgs.length})</h2>
        <button className="btn-primary" onClick={addColumn}>+ Добавить колонку</button>
      </div>

      <div className="table-wrapper">
        <table className="employee-table">
          <thead>
            <tr>
              <th className="th__ogranization">Организация</th>
              {/* Защита: берем ключи только если есть данные */}
              {docsData.length > 0 && docsData[0].docs_status ? (
                Object.keys(docsData[0].docs_status).map(col => (
                  <th key={col} className="tr__parametr">{col}</th>
                ))
              ) : null}
            </tr>
          </thead>
          <tbody>
            {docsData.map(org => (
              <tr key={org.org_name}>
                <td style={{ fontWeight: 'bold' }}>{org.org_name}</td>
                {org.docs_status && Object.entries(org.docs_status).map(([key, val]) => (
                  <td key={key} style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={val} 
                      onChange={() => handleCheck(org.org_name, key)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Не забудь импортировать useMemo из react в начале файла
import { useMemo } from "react";