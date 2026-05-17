import React, { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import type { TaskStatus } from '../model';

const STATUS_OPTIONS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Все статусы' },
  { value: 'pending', label: 'Открытые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'resolved', label: 'Решённые' },
  { value: 'overdue', label: 'Просроченные' },
];

export function TaskFilters() {
  const [params, setParams] = useSearchParams();
  const [dateOpen, setDateOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const status = params.get('status') ?? 'all';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  function setParam(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  }

  function clearFilters() {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      ['status', 'from', 'to'].forEach((k) => next.delete(k));
      return next;
    });
  }

  const hasFilters = status !== 'all' || from || to;
  const dateLabel = from && to ? `${from} — ${to}` : 'Период';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <select
        value={status}
        onChange={(e) => setParam('status', e.target.value === 'all' ? '' : e.target.value)}
        className="status-filter"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div style={{ position: 'relative' }}>
        <button
          className="tab-btn"
          onClick={() => setDateOpen((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Calendar size={14} />
          {dateLabel}
        </button>

        {dateOpen && (
          <div
            ref={popoverRef}
            style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              zIndex: 100,
              background: '#fff',
              border: '1px solid #e4e4e7',
              borderRadius: 8,
              padding: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,.1)',
              minWidth: 220,
            }}
          >
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
              С
              <input
                type="date"
                value={from}
                onChange={(e) => setParam('from', e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '4px 8px', border: '1px solid #d4d4d8', borderRadius: 4 }}
              />
            </label>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
              По
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => setParam('to', e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '4px 8px', border: '1px solid #d4d4d8', borderRadius: 4 }}
              />
            </label>
            <button
              className="tab-btn tab-btn--active"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setDateOpen(false)}
            >
              Применить
            </button>
          </div>
        )}
      </div>

      {hasFilters && (
        <button className="tab-btn" onClick={clearFilters} style={{ color: '#71717a' }}>
          Сбросить
        </button>
      )}
    </div>
  );
}
