import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { List } from "react-window";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { DAYS_THRESHOLD } from "../utils/constants";

const MANAGER_COLORS = [
  "#60a5fa",
  "#38bdf8",
  "#818cf8",
  "#a5b4fc",
  "#f472b6",
  "#facc15",
  "#22d3ee",
];
const ROW_HEIGHT = 62;
const DROPDOWN_MAX_HEIGHT = 200;

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("ru-RU");
};

export default function AnalyticsDashboard({ employees, getDaysDifference }) {
  const [professionFilter, setProfessionFilter] = useState("all");
  const [openResponsible, setOpenResponsible] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const dropdownRef = useRef(null);
// Авто-детект тёмной темы (useEffect #1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event) => {
      setIsDarkMode(event.matches);
    };
    setIsDarkMode(media.matches);
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener);
    }
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, []);
// Закрытие дропдауна по клику наружу (useEffect #2)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenResponsible(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
// Запись данных професии и сотрировка\фильтр
  const enrichedEmployees = useMemo(
    () =>
      employees.map((emp) => ({
        ...emp,
        responsibleLabel: emp.responsible?.trim() || "Не назначено",
        professionLabel: emp.profession?.trim() || "Без профессии",
        daysSinceTraining: emp.trainingDate
          ? getDaysDifference(emp.trainingDate)
          : null,
      })),
    [employees, getDaysDifference]
  );

  const professionOptions = useMemo(() => {
    const unique = new Set(enrichedEmployees.map((emp) => emp.professionLabel));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [enrichedEmployees]);

  const filteredEmployees = useMemo(() => {
    if (professionFilter === "all") return enrichedEmployees;
    return enrichedEmployees.filter(
      (emp) => emp.professionLabel === professionFilter
    );
  }, [enrichedEmployees, professionFilter]);

  const responsibleGroups = useMemo(() => {
    const collector = new Map();
    filteredEmployees.forEach((emp) => {
      const bucket = collector.get(emp.responsibleLabel) ?? [];
      bucket.push(emp);
      collector.set(emp.responsibleLabel, bucket);
    });
    return Array.from(collector.entries())
      .map(([name, list]) => ({
        name,
        employees: list,
        count: list.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees]);
// Топ 6 профессий + Другие для диаграммы 
  const managerPieData = useMemo(() => {
    if (!responsibleGroups.length) return [{ name: "Нет данных", value: 1 }];
    const top = responsibleGroups.slice(0, 6).map((group) => ({
      name: group.name,
      value: group.count,
    }));
    const remainder = responsibleGroups
      .slice(6)
      .reduce((acc, group) => acc + group.count, 0);
    if (remainder > 0) {
      top.push({ name: "Другие", value: remainder });
    }
    return top;
  }, [responsibleGroups]);
// Топ 8 профессий для столбчатых 
  const professionBarData = useMemo(() => {
    const counter = new Map();
    filteredEmployees.forEach((emp) => {
      counter.set(
        emp.professionLabel,
        (counter.get(emp.professionLabel) ?? 0) + 1
      );
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [filteredEmployees]);

  const total = filteredEmployees.length; //Общее количество
  const needsRetrain = filteredEmployees.filter(
    (emp) =>
      emp.daysSinceTraining !== null && emp.daysSinceTraining >= DAYS_THRESHOLD
  ).length;                               //Нужна переподготовка
  //Среднее количество дней с инсруктажа
  const avgDaysSince =
    filteredEmployees.length === 0
      ? 0
      : filteredEmployees.reduce(
          (sum, emp) => sum + (emp.daysSinceTraining ?? 0),
          0
        ) / filteredEmployees.length;
// Список сотрудников которым нужен инсруктаж в ближайшие 30 дней 
  const dueSoonList = useMemo(
    () =>
      filteredEmployees
        .filter((emp) => emp.daysSinceTraining !== null)
        .map((emp) => ({
          ...emp,
          daysUntilRefresh: DAYS_THRESHOLD - emp.daysSinceTraining,
        }))
        .filter((emp) => emp.daysUntilRefresh >= 0 && emp.daysUntilRefresh <= 10)
        .sort((a, b) => a.daysUntilRefresh - b.daysUntilRefresh)
        .slice(0, 5),
    [filteredEmployees]
  );

  const activeGroup = useMemo(
    () =>
      responsibleGroups.find((group) => group.name === openResponsible) ?? null,
    [responsibleGroups, openResponsible]
  );
  const dropdownEmployees = activeGroup?.employees ?? [];

  const handleCardClick = (name) => {
    setOpenResponsible((prev) => (prev === name ? null : name));
  };

  const handleEmployeeClick = useCallback((employee) => {
    setSelectedEmployee(employee);
    setOpenResponsible(null);
  }, []);

  const RowComponent = useCallback(
    ({ index, style }) => {
      const employee = dropdownEmployees[index];
      if (!employee) return null;
      return (
        <div style={{ ...style, padding: 0 }}>
          <button
            type="button"
            onClick={() => handleEmployeeClick(employee)}
            className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/20 bg-white/80 px-4 py-3 text-left text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:bg-indigo-900/40 dark:hover:text-white"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">{employee.name}</p>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {employee.professionLabel}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
              {employee.daysSinceTraining ?? "—"} дн.
            </span>
          </button>
        </div>
      );
    },
    [dropdownEmployees, handleEmployeeClick]
  );

  const dropdownHeight =
    dropdownEmployees.length > 0
      ? Math.min(DROPDOWN_MAX_HEIGHT, dropdownEmployees.length * ROW_HEIGHT)
      : ROW_HEIGHT;

  // const panelGlass =
  //   (isDarkMode
  //     ? "border border-slate-700/60 bg-slate-900/60 text-slate-50 shadow-[0_25px_60px_rgba(15,23,42,0.5)]"
  //     : "border border-white/40 bg-white/80 text-slate-900 shadow-[0_25px_60px_rgba(15,23,42,0.25)]") +
  //   " backdrop-blur-3xl";

  const dropdownGlass = isDarkMode
    ? "bg-slate-900/80 border border-slate-700/60 text-slate-100"
    : "bg-white/90 border border-slate-200 text-slate-900";

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-300">
            Analytics
          </p>
          <h2 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white">
            Гибкая аналитика по сотрудникам
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-300">
            Распределение по ответственным, фильтрация по профессии и
            визуализация трендов в стиле 2026 года с glassmorphic слоями и
            легкими микровзаимодействиями.
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg shadow-slate-900/10 dark:border-slate-700/50 dark:bg-slate-900/70 dark:text-slate-100">
          Профессия
          <select
            className="ml-2 rounded-xl border-none bg-transparent text-sm font-semibold outline-none focus:ring-0"
            value={professionFilter}
            onChange={(event) => setProfessionFilter(event.target.value)}
          >
            <option value="all">Все профессии</option>
            {professionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Всего сотрудников", value: total },
          {
            label: "Дней с последней подготовки",
            value: filteredEmployees.length
              ? avgDaysSince.toFixed(1)
              : "—",
          },
          { label: "Требуют переобучения", value: needsRetrain },
          { label: "Скоро подойдут", value: dueSoonList.length },
        ].map((card) => (
          <article
            key={card.label}
            className={`rounded-3xl border px-5 py-6 text-lg transition-transform duration-300 ease-out hover:-translate-y-1 `}
          >
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400 dark:text-slate-400">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-semibold leading-tight">
              {card.value}
            </p>
          </article>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
            Ответственные
          </h3>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
            Кликайте, чтобы увидеть команду
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {responsibleGroups.map((group, index) => {
            const active = openResponsible === group.name;
            return (
              <div key={group.name} className="relative">
                <button
                  type="button"
                  onClick={() => handleCardClick(group.name)}
                  className={`group w-full rounded-3xl border px-5 py-6 text-left transition-transform duration-300 ease-out hover:-translate-y-1  ${
                    active
                      ? "ring-2 ring-indigo-300 dark:ring-indigo-500/60"
                      : "hover:ring-1 hover:ring-indigo-200/80"
                  }`}
                >
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    {group.name}
                  </p>
                  <p className="mt-2 text-4xl font-bold">{group.count}</p>
                  <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                    {group.employees.length} сотрудник
                    {group.employees.length % 10 === 1 &&
                    group.employees.length % 100 !== 11
                      ? ""
                      : "ов"}
                  </p>
                </button>
                {active && (
                  <div
                    ref={dropdownRef}
                    className={`absolute left-0 z-30 mt-3 w-full max-w-sm rounded-3xl p-3 shadow-2xl ${dropdownGlass} backdrop-blur-3xl`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Сотрудники
                    </p>
                    {dropdownEmployees.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                        Нет сотрудников в этой категории.
                      </p>
                    ) : (
                    <List
                      height={Math.min(
                        DROPDOWN_MAX_HEIGHT,
                        dropdownEmployees.length * ROW_HEIGHT
                      )}
                      rowCount={dropdownEmployees.length}
                      rowHeight={ROW_HEIGHT}
                      width="100%"
                      className="mt-3 overflow-hidden rounded-2xl"
                      rowComponent={RowComponent}
                      rowProps={{}}
                    />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!responsibleGroups.length && (
            <p className="col-span-full rounded-3xl border px-5 py-6 text-sm text-slate-500 dark:text-slate-300">
              Фильтр пока не вернул сотрудников.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className={`rounded-3xl p-5 `}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Распределение по менеджерам
          </h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={managerPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  paddingAngle={4}
                  labelLine={false}
                  label={({ percent }) =>
                    percent ? `${(percent * 100).toFixed(0)}%` : ""
                  }
                >
                  {managerPieData.map((entry, index) => (
                    <Cell
                      key={entry.name + index}
                      fill={MANAGER_COLORS[index % MANAGER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    background:
                      "lightgrey",
                    borderColor: "transparent",
                    color: "#fff",
                  }}
                  formatter={(value, name) => [`${value} чел.`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className={`rounded-3xl p-5 `}>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Топ профессий
          </h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={
                  professionBarData.length
                    ? professionBarData
                    : [{ name: "Нет данных", count: 1 }]
                }
                margin={{ top: 10, right: 8, left: -8, bottom: 50 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.4)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} чел.`, "Сотрудников"]}
                  contentStyle={{
                    borderRadius: 12,
                    background:
                      "rgba(15,23,42,0.95)",
                    borderColor: "transparent",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  barSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className={`rounded-3xl p-5 `}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Скоро подойдут (10 дней)
          </h3>
          <span className="text-xs font-semibold text-indigo-500">
            {dueSoonList.length} в очереди
          </span>
        </div>
        {dueSoonList.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
            Пока все сотрудники в зоне комфорта.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {dueSoonList.map((emp) => (
              <div
                key={emp.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/30 bg-white/60 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold">
                    {emp.name}
                  </p>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {emp.daysUntilRefresh} дн.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>{emp.professionLabel}</span>
                  <span className="text-xs uppercase tracking-wider text-indigo-400">
                    {emp.organization || "—"}
                  </span>
                  <span>
                    Тренинг: {formatDate(emp.trainingDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedEmployee && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedEmployee(null)}
        >
          <div
            className="mx-4 max-w-3xl rounded-3xl border border-white/30 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.65)] dark:border-slate-800/60 dark:bg-slate-900/80"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                {selectedEmployee.name}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-full bg-slate-200/70 px-3 py-1 text-sm font-semibold dark:bg-slate-800/70"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  Профессия
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {selectedEmployee.professionLabel}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  Организация
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {selectedEmployee.organization || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  Ответственный
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {selectedEmployee.responsibleLabel}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  Тренинг
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {formatDate(selectedEmployee.trainingDate)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">
              Последнее обучение прошло{" "}
              <span className="font-semibold text-indigo-500">
                {selectedEmployee.daysSinceTraining ?? "—"} дн.
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
