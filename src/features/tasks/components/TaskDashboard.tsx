import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { BarChart2, CheckCircle, AlertTriangle, Clock, Plus } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import { useTaskStats } from '../hooks/useTaskStats';

const getDefaultDateRange = () => {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  return {
    from: thirtyDaysAgo.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0]
  };
};

export function TaskDashboard() {
  const [params] = useSearchParams();
  const [granularity, setGranularity] = useState<'day' | 'week'>('day');

  const siteId = params.get('siteId') || undefined;
  const dateRange = useMemo(() => getDefaultDateRange(), []);

  // Получаем данные
  const { data: stats } = useTaskStats(siteId, dateRange);
  const { data: tasks, isLoading } = useTasks({ siteId });

  // --- ЛОГИКА ПОДСЧЕТА СТАТУСОВ ---
  const totals = useMemo(() => {
    if (!tasks || tasks.length === 0) return { total: 0, resolved: 0, percent: 0 };

    const total = tasks.length;
    // Считаем все варианты успешных статусов (проверьте регистр в БД)
    const resolved = tasks.filter(t =>
      t.status === 'resolved' ||
      t.status === 'completed' ||
      t.status === 'done' ||
      t.status === 'Выполнено'
    ).length;

    return {
      total,
      resolved,
      percent: Math.round((resolved / total) * 100)
    };
  }, [tasks]);

  // Данные для графика
  const chartData = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const groups: Record<string, number> = {};
    const sorted = [...tasks].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    sorted.forEach(task => {
      const date = new Date(task.created_at);
      const label = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      groups[label] = (groups[label] || 0) + 1;
    });
    return Object.entries(groups).map(([label, created]) => ({ label, created }));
  }, [tasks]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Загрузка данных...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Шапка */}
      <div className="task-tabs-bar rounded-lg p-2">
        <div className="flex items-center gap-2 px-2">
          <BarChart2 size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">Аналитика</h2>
        </div>
        <button className="task-new-btn"><Plus size={16} /> Новая задача</button>
      </div>

      {/* KPI Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="task-card flex flex-col gap-2">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock size={14} /> <span className="text-[10px] font-bold uppercase">Всего</span>
          </div>
          <div className="text-2xl font-bold">{totals.total}</div>
        </div>

        <div className="task-card flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle size={14} /> <span className="text-[10px] font-bold uppercase">Решено</span>
          </div>
          <div className="text-2xl font-bold">{totals.percent}%</div>
          <div className="text-[10px] text-emerald-500 font-medium">
            {totals.resolved} из {totals.total}
          </div>
        </div>

        <div className="task-card task-card--overdue flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={14} /> <span className="text-[10px] font-bold uppercase">Индекс риска</span>
          </div>
          <div className="text-2xl font-bold">{stats ? 100 - stats.safetyScore : 0}%</div>
          <div className="task-time-badge task-time-badge--overdue w-fit">Требует внимания</div>
        </div>

        <div className="task-card flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-600">
            <BarChart2 size={14} /> <span className="text-[10px] font-bold uppercase">Safety Score</span>
          </div>
          <div className="text-2xl font-bold">{stats?.safetyScore || 0}</div>
        </div>
      </div>

      {/* График */}
      <div className="task-dashboard-container" style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.9)'
      }}>
        <h3 className="text-sm font-bold text-gray-800 mb-6">Динамика новых задач</h3>
        <div className="h-[280px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="created" stroke="#2563eb" strokeWidth={3} fill="url(#colorCreated)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 italic text-sm">
              Данные для графика отсутствуют
            </div>
          )}
        </div>
      </div>
    </div>
  );
}