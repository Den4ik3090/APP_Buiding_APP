import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import '../style/OrganizationManager.css';

export default function OrganizationManager({ employees = [] }) {
  const [docsData, setDocsData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Создаем список уникальных организаций
  const uniqueOrgs = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    return [...new Set(employees.map(e => e.organization).filter(Boolean))];
  }, [employees]);

  // Стандартный набор документов
  const getDefaultDocs = () => ({
    "Акт допуск": false,
    "Приказы": false,
    "Удостоверения": false,
    "Проектная док.": false,
    "Инструкции": false,
    "Журналы": false,
    "Обучения сотрудников": false,
  });

  // 2. Загрузка данных (Мост с базой)
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("organization_docs").select("*");
      if (error) throw error;

      const currentDbData = data || [];
      const merged = uniqueOrgs.map(orgName => {
        const existing = currentDbData.find(d => d.org_name === orgName);
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

  // 3. Переключение чекбокса
  const handleCheck = async (orgName, key) => {
    const targetOrg = docsData.find(d => d.org_name === orgName);
    if (!targetOrg) return;

    const updatedStatus = { 
      ...targetOrg.docs_status, 
      [key]: !targetOrg.docs_status[key] 
    };

    // Оптимистичное обновление UI
    setDocsData(prev => prev.map(d => 
      d.org_name === orgName ? { ...d, docs_status: updatedStatus } : d
    ));

    await supabase.from("organization_docs").upsert({
      org_name: orgName,
      docs_status: updatedStatus,
      updated_at: new Date()
    }, { onConflict: 'org_name' });
  };

  // 4. Добавление новой колонки (Локально + сохранение при клике)
  const addColumn = () => {
    const name = prompt("Введите название нового документа:");
    if (!name) return;
    setDocsData(prev => prev.map(d => ({
      ...d, 
      docs_status: { ...d.docs_status, [name]: false }
    })));
  };

  // 5. ОПТИМИЗИРОВАННОЕ удаление (Массовое обновление)
  const removeColumn = async (columnName) => {
    if (!window.confirm(`Вы уверены, что хотите удалить "${columnName}" для всех организаций?`)) return;

    setLoading(true); // Пока идет тяжелая операция, покажем загрузку
    try {
      // Подготавливаем данные для всех строк разом
      const payload = docsData.map(org => {
        const newStatus = { ...org.docs_status };
        delete newStatus[columnName];
        return {
          org_name: org.org_name,
          docs_status: newStatus,
          updated_at: new Date()
        };
      });

      // ОДИН запрос вместо цикла!
      const { error } = await supabase
        .from("organization_docs")
        .upsert(payload, { onConflict: 'org_name' });

      if (error) throw error;

      // Обновляем экран только после успеха в базе
      setDocsData(payload);
      alert("Параметр удален успешно");
    } catch (err) {
      console.error("Ошибка при массовом удалении:", err);
      alert("Не удалось удалить параметр. Проверьте интернет.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Обработка данных...</div>;

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
              {docsData.length > 0 && docsData[0].docs_status ? (
                Object.keys(docsData[0].docs_status).map(col => (
                  <th key={col} className="tr__parametr">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {col}
                      <span 
                        onClick={() => removeColumn(col)} 
                        style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: '14px' }}
                        title="Удалить этот параметр у всех"
                      >
                        🗑️
                      </span>
                    </div>
                  </th>
                ))
              ) : null}
            </tr>
          </thead>
          <tbody>
            {docsData.map(org => (
  <tr key={org.org_name}>
    <td style={{ fontWeight: 'bold' }}>{org.org_name}</td>
    
    {/* ГЛАВНОЕ ИСПРАВЛЕНИЕ ТУТ: */}
    {/* Мы берем ключи из первой организации (заголовки) и по ним отрисовываем ячейки для всех */}
    {docsData[0] && Object.keys(docsData[0].docs_status).map(key => (
      <td key={key} style={{ textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={org.docs_status[key] || false} // Если ключа нет - ставим false
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