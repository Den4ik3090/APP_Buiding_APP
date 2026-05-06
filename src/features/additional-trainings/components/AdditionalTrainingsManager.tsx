import React, { useState, useMemo } from "react";
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCardTitle,
  CRow,
  CCol,
  CFormInput,
  CFormSelect,
  CButton,
  CBadge,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CTableBody,
  CSpinner,
  CTabs,
  CTabList,
  CTab,
  CTabContent,
  CTabPanel,
} from "@coreui/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  BarChart3,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  Users,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ADDITIONAL_TRAINING_TYPES } from "@/entities/employee";
import { isTrainingExpired } from "@/entities/employee";
import type { Employee, AdditionalTraining } from "@/entities/employee";
import "./AdditionalTrainingsManager.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend,
  Title
);

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

export default function AdditionalTrainingsManager({
  employees = [],
  loading = false,
}: AdditionalTrainingsManagerProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

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

  const trainingsByTypeChart = {
    labels: analytics.byType.slice(0, 8).map((item) => item.label),
    datasets: [
      {
        label: "Количество обучений",
        data: analytics.byType.slice(0, 8).map((item) => item.value),
        backgroundColor: "#3b82f6",
        borderRadius: 8,
      },
    ],
  };

  const statusChart = {
    labels: ["Действительные", "Просроченные"],
    datasets: [
      {
        data: [analytics.valid, analytics.expired],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const monthlyTrendChart = {
    labels: analytics.byMonth.map((item) => item.label),
    datasets: [
      {
        label: "Обучения по месяцам",
        data: analytics.byMonth.map((item) => item.value),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.15)",
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const topRiskChart = {
    labels: analytics.byEmployee.slice(0, 8).map((item) => item.employeeName),
    datasets: [
      {
        label: "Просроченные обучения",
        data: analytics.byEmployee.slice(0, 8).map((item) => item.expired),
        backgroundColor: "#f97316",
        borderRadius: 8,
      },
    ],
  };

  const handleExportExcel = () => {
    const rows = analytics.filtered.map((t) => ({
      "ФИО сотрудника": t.employeeName,
      Организация: t.organization,
      Профессия: t.profession,
      "Тип обучения": t.type,
      "Дата получения": t.dateReceived
        ? new Date(t.dateReceived).toLocaleDateString("ru-RU")
        : "—",
      "Срок действия (мес.)": t.expiryMonths || "—",
      Часы: t.hours || "—",
      Статус: t.expired ? "Просрочено" : "Действительно",
      Сертификат: t.certificate || "",
    }));

    if (!rows.length) {
      alert("Нет данных для экспорта");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 22 },
      { wch: 22 },
      { wch: 30 },
      { wch: 18 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Обучения");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const today = new Date().toISOString().slice(0, 10);
    saveAs(blob, `additional-trainings-${today}.xlsx`);
  };

  if (loading) {
    return (
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="g-3">
            {[...Array(4)].map((_, i) => (
              <CCol lg={3} key={i}>
                <div className="p-4 bg-light rounded">
                  <CSpinner />
                </div>
              </CCol>
            ))}
          </CRow>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div className="c-app">
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center">
          <BarChart3 size={24} className="me-2" />
          <CCardTitle className="mb-0">
            Дополнительные обучения
          </CCardTitle>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-4">
            <CCol lg={3}>
              <CCard color="info" className="text-white">
                <CCardBody className="p-4">
                  <div className="d-flex align-items-center">
                    <GraduationCap size={28} className="me-3" />
                    <div>
                      <div className="fs-4 fw-bold">{analytics.total}</div>
                      <div className="text-white-50">Всего обучений</div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={3}>
              <CCard color="success" className="text-white">
                <CCardBody className="p-4">
                  <div className="d-flex align-items-center">
                    <ShieldCheck size={28} className="me-3" />
                    <div>
                      <div className="fs-4 fw-bold">{analytics.valid}</div>
                      <div className="text-white-50">Действительные</div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={3}>
              <CCard color="danger" className="text-white">
                <CCardBody className="p-4">
                  <div className="d-flex align-items-center">
                    <AlertTriangle size={28} className="me-3" />
                    <div>
                      <div className="fs-4 fw-bold">{analytics.expired}</div>
                      <div className="text-white-50">Просроченные</div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>

            <CCol lg={3}>
              <CCard color="warning" className="text-white">
                <CCardBody className="p-4">
                  <div className="d-flex align-items-center">
                    <Users size={28} className="me-3" />
                    <div>
                      <div className="fs-4 fw-bold">{analytics.compliance}%</div>
                      <div className="text-white-50">Compliance</div>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex gap-2 flex-wrap">
            <CFormInput
              type="text"
              placeholder="🔍 Поиск по ФИО сотрудника..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-auto"
            />
            <CFormSelect
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-auto"
            >
              <option value="all">Все типы</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </CFormSelect>
            <CFormSelect
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-auto"
            >
              <option value="all">Все статусы</option>
              <option value="valid">✅ Действительные</option>
              <option value="expired">⚠️ Просроченные</option>
            </CFormSelect>
          </div>

          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" onClick={resetFilters}>
              <Filter size={16} className="me-1" />
              Сбросить
            </CButton>
            <CButton color="primary" onClick={handleExportExcel}>
              Экспорт Excel
            </CButton>
          </div>
        </CCardHeader>
      </CCard>

      <CTabs activeItemKey={activeTab} onChange={(key) => setActiveTab(key as "list" | "analytics")}>
        <CTabList variant="tabs">
          <CTab itemKey="list">
            Список ({analytics.groupedEmployees.length})
          </CTab>
          <CTab itemKey="analytics">
            Аналитика ({analytics.total})
          </CTab>
        </CTabList>

        <CTabContent>
          <CTabPanel itemKey="list">
            <CCard className="mb-0">
              <CCardHeader>
                <CCardTitle className="mb-0">
                  Сотрудники с дополнительными обучениями
                </CCardTitle>
              </CCardHeader>
              <CCardBody className="pt-0">
                {analytics.groupedEmployees.length === 0 ? (
                  <div className="text-center py-5">
                    <GraduationCap
                      size={64}
                      className="text-muted mb-3 opacity-50"
                    />
                    <h5 className="text-muted">Нет данных</h5>
                    <p className="text-muted mb-0">
                      Попробуйте изменить фильтры или добавьте сотрудников с
                      обучением
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <CTable responsive hover align="middle">
                      <CTableHead color="light">
                        <CTableRow>
                          <CTableHeaderCell style={{ width: "56px" }} />
                          <CTableHeaderCell>Сотрудник</CTableHeaderCell>
                          <CTableHeaderCell>Организация</CTableHeaderCell>
                          <CTableHeaderCell>Профессия</CTableHeaderCell>
                          <CTableHeaderCell>Всего</CTableHeaderCell>
                          <CTableHeaderCell>Действ.</CTableHeaderCell>
                          <CTableHeaderCell>Проср.</CTableHeaderCell>
                          <CTableHeaderCell>Риск</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>

                      <CTableBody>
                        {analytics.groupedEmployees.map((emp) => (
                          <React.Fragment key={emp.employeeId}>
                            <CTableRow
                              onClick={() => toggleRow(emp.employeeId)}
                              style={{ cursor: "pointer" }}
                              className={
                                expandedRows[emp.employeeId]
                                  ? "table-active"
                                  : ""
                              }
                            >
                              <CTableDataCell className="text-center fw-bold">
                                {expandedRows[emp.employeeId] ? "▼" : "▶"}
                              </CTableDataCell>

                              <CTableDataCell className="fw-semibold">
                                {emp.employeeName}
                              </CTableDataCell>

                              <CTableDataCell>{emp.organization}</CTableDataCell>
                              <CTableDataCell>{emp.profession}</CTableDataCell>
                              <CTableDataCell>{emp.total}</CTableDataCell>

                              <CTableDataCell>
                                <CBadge color="success" shape="rounded-pill">
                                  {emp.valid}
                                </CBadge>
                              </CTableDataCell>

                              <CTableDataCell>
                                <CBadge
                                  color={
                                    emp.expired > 0 ? "danger" : "secondary"
                                  }
                                  shape="rounded-pill"
                                >
                                  {emp.expired}
                                </CBadge>
                              </CTableDataCell>

                              <CTableDataCell>
                                <CBadge
                                  color={
                                    emp.expired > 2
                                      ? "danger"
                                      : emp.expired > 0
                                        ? "warning"
                                        : "success"
                                  }
                                >
                                  {emp.expired > 2
                                    ? "Высокий"
                                    : emp.expired > 0
                                      ? "Средний"
                                      : "Низкий"}
                                </CBadge>
                              </CTableDataCell>
                            </CTableRow>

                            {expandedRows[emp.employeeId] && (
                              <CTableRow>
                                <CTableDataCell colSpan={8} className="bg-light">
                                  <div className="p-3">
                                    <div className="fw-semibold mb-3">
                                      Обучения сотрудника: {emp.employeeName}
                                    </div>

                                    <div className="d-flex flex-column gap-3">
                                      {emp.trainings.map((training, idx) => (
                                        <div
                                          key={`${emp.employeeId}-${idx}`}
                                          className="border rounded p-3 bg-white"
                                        >
                                          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                                            <div className="fw-semibold">
                                              {training.type}
                                            </div>
                                            <CBadge
                                              color={
                                                training.expired
                                                  ? "danger"
                                                  : "success"
                                              }
                                              shape="rounded-pill"
                                            >
                                              {training.expired
                                                ? "Просрочено"
                                                : "Действительно"}
                                            </CBadge>
                                          </div>

                                          <CRow className="g-3">
                                            <CCol md={3}>
                                              <div className="text-muted small">
                                                Дата получения
                                              </div>
                                              <div>
                                                {training.dateReceived
                                                  ? new Date(
                                                    training.dateReceived
                                                  ).toLocaleDateString(
                                                    "ru-RU"
                                                  )
                                                  : "—"}
                                              </div>
                                            </CCol>

                                            <CCol md={2}>
                                              <div className="text-muted small">
                                                Срок
                                              </div>
                                              <div>
                                                {training.expiryMonths || "—"}{" "}
                                                мес.
                                              </div>
                                            </CCol>

                                            <CCol md={2}>
                                              <div className="text-muted small">
                                                Часы
                                              </div>
                                              <div>{training.hours || "—"}</div>
                                            </CCol>

                                            <CCol md={5}>
                                              <div className="text-muted small">
                                                Действия
                                              </div>
                                              <div className="d-flex gap-2 flex-wrap">
                                                <CButton
                                                  size="sm"
                                                  color="primary"
                                                  variant="ghost"
                                                >
                                                  ✏️ Редактировать
                                                </CButton>

                                                {training.certificate && (
                                                  <CButton
                                                    size="sm"
                                                    color="info"
                                                    variant="ghost"
                                                    href={training.certificate}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    📄 Сертификат
                                                  </CButton>
                                                )}
                                              </div>
                                            </CCol>
                                          </CRow>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </CTableDataCell>
                              </CTableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </CTableBody>
                    </CTable>
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CTabPanel>

          <CTabPanel itemKey="analytics">
            <div className="pt-3">
              <CRow className="g-4 mb-4">
                <CCol lg={8}>
                  <CCard>
                    <CCardHeader>
                      <CCardTitle className="mb-0">
                        Динамика обучений
                      </CCardTitle>
                    </CCardHeader>
                    <CCardBody>
                      {analytics.byMonth.length > 0 ? (
                        <Line data={monthlyTrendChart} />
                      ) : (
                        <div className="text-center py-5 text-muted">
                          Нет данных для графика
                        </div>
                      )}
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={4}>
                  <CCard>
                    <CCardHeader>
                      <CCardTitle className="mb-0">Статусы</CCardTitle>
                    </CCardHeader>
                    <CCardBody>
                      <Doughnut data={statusChart} />
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              <CRow className="g-4 mb-4">
                <CCol lg={7}>
                  <CCard>
                    <CCardHeader>
                      <CCardTitle className="mb-0">
                        Обучения по типам
                      </CCardTitle>
                    </CCardHeader>
                    <CCardBody>
                      <Bar data={trainingsByTypeChart} />
                    </CCardBody>
                  </CCard>
                </CCol>

                <CCol lg={5}>
                  <CCard>
                    <CCardHeader>
                      <CCardTitle className="mb-0">
                        Топ сотрудников по риску
                      </CCardTitle>
                    </CCardHeader>
                    <CCardBody>
                      <Bar data={topRiskChart} />
                    </CCardBody>
                  </CCard>
                </CCol>
              </CRow>

              <CCard>
                <CCardHeader>
                  <CCardTitle className="mb-0">
                    Сводка по сотрудникам
                  </CCardTitle>
                </CCardHeader>
                <CCardBody>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
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
                            <td className="text-success fw-semibold">
                              {emp.valid}
                            </td>
                            <td className="text-danger fw-semibold">
                              {emp.expired}
                            </td>
                            <td>
                              <CBadge
                                color={
                                  emp.expired > 2
                                    ? "danger"
                                    : emp.expired > 0
                                      ? "warning"
                                      : "success"
                                }
                              >
                                {emp.expired > 2
                                  ? "Высокий"
                                  : emp.expired > 0
                                    ? "Средний"
                                    : "Низкий"}
                              </CBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CCardBody>
              </CCard>
            </div>
          </CTabPanel>
        </CTabContent>
      </CTabs>
    </div>
  );
}
