import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  active?: boolean;
}

interface AutoIconProps {
  size?: number;
  color?: string;
  className?: string;
  duration?: number;
}

function usePulse(interval: number) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), interval);
    return () => clearInterval(id);
  }, [interval]);
  return on;
}

/* ── Spinner → Checkmark (Сотрудники — статус OK) ── */
export function SuccessIcon({ size = 18, color = 'currentColor', className, duration = 2200 }: AutoIconProps) {
  const done = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth={2}
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0.7, opacity: 0.4 }}
        transition={{ duration: 0.5 }} />
      {!done && (
        <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeDasharray="25 75"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '20px 20px' }} />
      )}
      <motion.path d="M12 20l6 6 10-12" stroke={color} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.4, delay: done ? 0.2 : 0 }} />
    </svg>
  );
}

/* ── Hamburger → X (Организации — список/структура) ── */
export function MenuCloseIcon({ size = 18, color = 'currentColor', className, duration = 2400 }: AutoIconProps) {
  const open = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <motion.line x1="10" x2="30" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={open ? { y1: 20, y2: 20, rotate: 45 } : { y1: 12, y2: 12, rotate: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: '20px 20px' }} />
      <motion.line x1="10" y1="20" x2="30" y2="20" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
        style={{ transformOrigin: '20px 20px' }} />
      <motion.line x1="10" x2="30" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={open ? { y1: 20, y2: 20, rotate: -45 } : { y1: 28, y2: 28, rotate: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: '20px 20px' }} />
    </svg>
  );
}

/* ── Play → Pause (Аналитика — данные в движении) ── */
export function PlayPauseIcon({ size = 18, color = 'currentColor', className, duration = 2600 }: AutoIconProps) {
  const playing = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <AnimatePresence mode="wait">
        {playing ? (
          <motion.g key="pause"
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25 }} style={{ transformOrigin: '20px 20px' }}>
            <rect x="12" y="10" width="5" height="20" rx="1.5" fill={color} />
            <rect x="23" y="10" width="5" height="20" rx="1.5" fill={color} />
          </motion.g>
        ) : (
          <motion.g key="play"
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25 }} style={{ transformOrigin: '20px 20px' }}>
            <polygon points="14,10 30,20 14,30" fill={color} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ── Lock → Unlock (Наряды-допуски — контроль доступа) ── */
export function LockUnlockIcon({ size = 18, color = 'currentColor', className, duration = 2800 }: AutoIconProps) {
  const unlocked = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <rect x="9" y="18" width="22" height="16" rx="3" stroke={color} strokeWidth={2} />
      <motion.path stroke={color} strokeWidth={2} strokeLinecap="round"
        animate={unlocked ? { d: 'M14 18V13a6 6 0 0112 0v2' } : { d: 'M14 18V13a6 6 0 0112 0v5' }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} />
      <motion.circle cx="20" cy="26" r="2" fill={color}
        animate={unlocked ? { scale: 0.6, opacity: 0.4 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }} />
    </svg>
  );
}

/* ── Clipboard → Checkmark (Дополнительные обучения — журнал) ── */
export function CopiedIcon({ size = 18, color = 'currentColor', className, duration = 2200 }: AutoIconProps) {
  const copied = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <rect x="12" y="10" width="18" height="22" rx="2" stroke={color} strokeWidth={2} />
      <path d="M10 14h-0a2 2 0 00-2 2v18a2 2 0 002 2h14" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.path key="check" d="M16 21l4 4 6-8" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0 }}
            transition={{ duration: 0.3 }} />
        ) : (
          <motion.g key="lines" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <line x1="17" y1="18" x2="25" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="23" x2="25" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
            <line x1="17" y1="28" x2="22" y2="28" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ── Bell rings (О проекте — справка/информация) ── */
export function NotificationIcon({ size = 18, color = 'currentColor', className, duration = 3000 }: AutoIconProps) {
  const notif = usePulse(duration);
  return (
    <motion.svg viewBox="0 0 40 40" fill="none" className={className}
      animate={notif ? { rotate: [0, 8, -8, 6, -6, 3, 0] } : { rotate: 0 }}
      transition={{ duration: 0.6 }}
      style={{ width: size, height: size, transformOrigin: '20px 6px' }}>
      <path d="M28 16a8 8 0 00-16 0c0 8-4 10-4 10h24s-4-2-4-10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 30a3 3 0 005 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <motion.circle cx="28" cy="10" r="4" fill="#EF4444"
        animate={notif ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} />
    </motion.svg>
  );
}

/* ── Download → Done (Приказы — документ к выдаче) ── */
export function DownloadDoneIcon({ size = 18, color = 'currentColor', className, duration = 2400 }: AutoIconProps) {
  const done = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <path d="M8 28v4a2 2 0 002 2h20a2 2 0 002-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <AnimatePresence mode="wait">
        {done ? (
          <motion.path key="check" d="M14 22l6 6 8-10" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.35 }} />
        ) : (
          <motion.g key="arrow"
            initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}>
            <line x1="20" y1="6" x2="20" y2="24" stroke={color} strokeWidth={2} strokeLinecap="round" />
            <polyline points="14,18 20,24 26,18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

/* ── Paper plane flies (Предписания — отправка) ── */
export function SendIcon({ size = 18, color = 'currentColor', className, duration = 2600 }: AutoIconProps) {
  const sent = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <motion.g
        animate={sent ? { x: 30, y: -30, opacity: 0, scale: 0.5 } : { x: 0, y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}>
        <path d="M34 6L16 20l-6-2L34 6z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <path d="M34 6L22 34l-6-14" stroke={color} strokeWidth={2} strokeLinejoin="round" />
        <line x1="16" y1="20" x2="22" y2="34" stroke={color} strokeWidth={2} />
      </motion.g>
    </svg>
  );
}

/* ── Toggle switch (Задачи — выполнено / не выполнено) ── */
export function ToggleIcon({ size = 18, color = 'currentColor', className, duration = 1800 }: AutoIconProps) {
  const on = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <motion.rect x="5" y="13" width="30" height="14" rx="7"
        animate={on ? { fill: color, opacity: 0.2 } : { fill: color, opacity: 0.08 }}
        transition={{ duration: 0.3 }} />
      <rect x="5" y="13" width="30" height="14" rx="7" stroke={color} strokeWidth={2} opacity={on ? 1 : 0.4} />
      <motion.circle cy="20" r="5" fill={color}
        animate={on ? { cx: 28 } : { cx: 12 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }} />
    </svg>
  );
}

/* ── Eye opens/closes (Тестовый компонент — просмотр) ── */
export function EyeToggleIcon({ size = 18, color = 'currentColor', className, duration = 2200 }: AutoIconProps) {
  const hidden = usePulse(duration);
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <motion.path d="M4 20s6-10 16-10 16 10 16 10-6 10-16 10S4 20 4 20z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        animate={hidden ? { opacity: 0.3 } : { opacity: 1 }}
        transition={{ duration: 0.3 }} />
      <motion.circle cx="20" cy="20" r="5" stroke={color} strokeWidth={2}
        animate={hidden ? { scale: 0.6, opacity: 0.2 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }} />
      <motion.line x1="6" y1="34" x2="34" y2="6" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        animate={hidden ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.25 }} />
    </svg>
  );
}

/* ─── Sub-tab icons (EmployeesPage tabs) ─── */

/* Spinner → Checkmark для вкладки «Сотрудники» (активная = всегда чекмарк) */
export function EmployeesTabIcon({ size = 18, color = 'currentColor', className, active = false }: IconProps) {
  const done = usePulse(2400);
  const show = active ? true : done;
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth={2}
        animate={show ? { pathLength: 1, opacity: 1 } : { pathLength: 0.7, opacity: 0.4 }}
        transition={{ duration: 0.5 }} />
      {!show && (
        <motion.circle cx="20" cy="20" r="16" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeDasharray="25 75"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '20px 20px' }} />
      )}
      <motion.path d="M12 20l6 6 10-12" stroke={color} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round"
        animate={show ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: 0.4, delay: show ? 0.2 : 0 }} />
    </svg>
  );
}

/* Замок для вкладки «Уволенные» (активная = закрытый замок) */
export function DismissedTabIcon({ size = 18, color = 'currentColor', className, active = false }: IconProps) {
  const unlocked = usePulse(2800);
  const show = active ? false : unlocked;
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} style={{ width: size, height: size }}>
      <rect x="9" y="18" width="22" height="16" rx="3" stroke={color} strokeWidth={2} />
      <motion.path stroke={color} strokeWidth={2} strokeLinecap="round"
        animate={show ? { d: 'M14 18V13a6 6 0 0112 0v2' } : { d: 'M14 18V13a6 6 0 0112 0v5' }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} />
      <motion.circle cx="20" cy="26" r="2" fill={color}
        animate={show ? { scale: 0.6, opacity: 0.4 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }} />
    </svg>
  );
}
