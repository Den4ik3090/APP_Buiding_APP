import React from 'react';
import type { Employee } from '@/entities/employee';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

interface DismissedEmployeesTableProps {
  employees: Employee[];
  onRestore: (id: string) => void;
}

export default function DismissedEmployeesTable({ employees, onRestore }: DismissedEmployeesTableProps) {
  if (employees.length === 0) {
    return (
      <div className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700">
        <div className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Уволенных сотрудников нет
        </div>
      </div>
    );
  }

  const thBase =
    'border-b border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';

  return (
    <div className="w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Уволенные сотрудники —{' '}
          <span className="text-amber-600 dark:text-amber-400">{employees.length}</span>
        </h3>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${thBase} w-[50px]`}>№</th>
              <th className={`${thBase} min-w-[220px]`}>ФИО</th>
              <th className={`${thBase} min-w-[180px]`}>Должность</th>
              <th className={`${thBase} min-w-[160px]`}>Организация</th>
              <th className={`${thBase} min-w-[160px]`}>Ответственный</th>
              <th className={`${thBase} w-[130px]`}>Уволен</th>
              <th className={`${thBase} w-[140px]`}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, index) => (
              <tr
                key={emp.id}
                className="border-b border-zinc-100 bg-white last:border-0 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <td className="px-3 py-2.5 text-xs text-zinc-400">{index + 1}</td>
                <td className="px-3 py-2.5 font-medium text-zinc-400 line-through dark:text-zinc-500">
                  {emp.name}
                </td>
                <td className="px-3 py-2.5 text-zinc-400 dark:text-zinc-500">{emp.profession}</td>
                <td className="px-3 py-2.5 text-zinc-400 dark:text-zinc-500">{emp.organization || '—'}</td>
                <td className="px-3 py-2.5 text-zinc-400 dark:text-zinc-500">{emp.responsible || '—'}</td>
                <td className="px-3 py-2.5 text-zinc-400 dark:text-zinc-500">{formatDate(emp.dismissedAt)}</td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onRestore(emp.id)}
                    className="rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                  >
                    Восстановить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="block divide-y divide-zinc-100 dark:divide-zinc-800 sm:hidden">
        {employees.map((emp) => (
          <div key={emp.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-zinc-400 line-through dark:text-zinc-500">{emp.name}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{emp.profession}</p>
              {emp.organization && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{emp.organization}</p>
              )}
              {emp.dismissedAt && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  Уволить : {formatDate(emp.dismissedAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRestore(emp.id)}
              className="shrink-0 rounded-md bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300"
            >
              Восстановить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
