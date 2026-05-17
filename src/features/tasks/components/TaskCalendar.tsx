import React, { useMemo, useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../model';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface DayStats { resolved: number; problem: number }

const navBtn: React.CSSProperties = {
  padding: '2px 10px',
  border: '1px solid #e4e4e7',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1.4,
};

export function TaskCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const { data: tasks } = useTasks();

  const dayStats = useMemo<Record<string, DayStats>>(() => {
    const map: Record<string, DayStats> = {};
    (tasks ?? []).forEach((task: Task) => {
      const key = task.created_at.slice(0, 10);
      if (!map[key]) map[key] = { resolved: 0, problem: 0 };
      if (task.status === 'resolved') map[key].resolved++;
      else if (task.status === 'pending' || task.status === 'overdue') map[key].problem++;
    });
    return map;
  }, [tasks]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  return (
    <div style={{ border: '1px solid #e4e4e7', borderRadius: 10, padding: 16, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{monthLabel}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={navBtn} onClick={prevMonth}>‹</button>
          <button style={navBtn} onClick={nextMonth}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, textAlign: 'center', fontSize: 11, color: '#71717a', marginBottom: 4 }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d) => <div key={d}>{d}</div>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} style={{ minHeight: 48 }} />;
          const key = toDateKey(new Date(year, month, day));
          const stats = dayStats[key];
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minHeight: 48,
                padding: 2,
                borderRadius: 4,
                outline: isToday ? '2px solid #3b82f6' : undefined,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#2563eb' : '#3f3f46' }}>
                {day}
              </span>
              {stats?.resolved > 0 && (
                <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                  +{stats.resolved}
                </span>
              )}
              {stats?.problem > 0 && (
                <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700 }}>
                  {stats.problem}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, color: '#71717a' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> решено
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> открыто / просрочено
        </span>
      </div>
    </div>
  );
}
