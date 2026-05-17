import React, { useState } from 'react';
import { Edit2, Trash2, Clock, CheckCircle } from 'lucide-react';
import { updatePermitWithStatus, logPermitAudit, getCurrentUserId } from '../services/permitsService';
import {
  calculateExtendedDate,
  canExtend,
  isClosedStatus,
} from "@/entities/permit";
import {
  NOTIFICATION_MESSAGES,
  PERMIT_STATUSES,
} from '@/entities/permit';
import { TOAST_TYPES, TOAST_DURATION } from '@/shared/constants/toast';
import type { NotificationType } from '@/shared/constants/toast';
import type { Permit } from '@/entities/permit';

type AddNotificationFn = (message: string, type?: NotificationType, duration?: number) => void;

interface PermitActionsProps {
  permit: Permit;
  onEdit: (permit: Permit) => void;
  onDelete: (id: string) => void;
  onRefresh: () => Promise<void>;
  addNotification: AddNotificationFn;
  statusSamples?: string[];
}

export default function PermitActions({
  permit,
  onEdit,
  onDelete,
  onRefresh,
  addNotification,
  statusSamples = [],
}: PermitActionsProps) {
  const [extending, setExtending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<'extend' | 'close' | null>(null);

  const canClosePermit = (currentPermit: Permit) =>
    Boolean(currentPermit && !isClosedStatus(currentPermit.status));

  const normalizeStatusText = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е");

  const buildStatusCandidates = (kind: 'close' | 'extend'): string[] => {
    const statusFromTable = (Array.isArray(statusSamples) ? statusSamples : [])
      .filter((s) => typeof s === "string" && s.trim() !== "");
    const byKind =
      kind === "close"
        ? statusFromTable.filter((s) => isClosedStatus(s))
        : statusFromTable.filter((s) =>
            normalizeStatusText(s).includes("продл")
          );

    const defaults =
      kind === "close"
        ? [PERMIT_STATUSES.CLOSED, "Закрыт", "Закрыт "]
        : [PERMIT_STATUSES.EXTENDED, "Продлён", "Продлен", "Продлен "];

    return Array.from(new Set([...defaults, ...byKind]));
  };

  const handleExtend = async () => {
    if (!canExtend(permit)) {
      addNotification(
        NOTIFICATION_MESSAGES.CANNOT_EXTEND,
        TOAST_TYPES.WARNING,
        TOAST_DURATION.NORMAL
      );
      return;
    }

    setConfirmingAction('extend');
  };

  const handleExtendConfirmed = async () => {
    setConfirmingAction(null);
    setExtending(true);
    try {
      const extendedDate = calculateExtendedDate(permit.expiry_date!);

      const statusUsed = await updatePermitWithStatus(
        permit.id,
        {
          extended_date: extendedDate.toISOString().split("T")[0],
          is_extended: true,
          extension_count: 1,
          updated_at: new Date().toISOString(),
        },
        buildStatusCandidates("extend")
      );

      try {
        const performedBy = await getCurrentUserId();
        await logPermitAudit(
          permit.id,
          'extended',
          performedBy,
          `Продлен до ${extendedDate.toLocaleDateString('ru-RU')}`,
          { extended_date: extendedDate.toISOString(), status: statusUsed }
        );
      } catch (auditError) {
        console.warn('Не удалось записать в permit_audit_log:', auditError);
      }

      addNotification(
        NOTIFICATION_MESSAGES.PERMIT_EXTENDED,
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );

      await onRefresh();
    } catch (error) {
      console.error('Ошибка продления наряда:', error);
      addNotification(
        (error as Error)?.message || NOTIFICATION_MESSAGES.ERROR_EXTENDING,
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    } finally {
      setExtending(false);
    }
  };

  const handleClose = async () => {
    if (!canClosePermit(permit)) {
      addNotification(
        NOTIFICATION_MESSAGES.CANNOT_CLOSE,
        TOAST_TYPES.WARNING,
        TOAST_DURATION.NORMAL
      );
      return;
    }

    setConfirmingAction('close');
  };

  const handleCloseConfirmed = async () => {
    setConfirmingAction(null);
    setClosing(true);
    try {
      const statusUsed = await updatePermitWithStatus(
        permit.id,
        {
          closed_date: new Date().toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        },
        buildStatusCandidates("close")
      );

      try {
        const performedBy = await getCurrentUserId();
        await logPermitAudit(
          permit.id,
          'closed',
          performedBy,
          `Наряд закрыт (${statusUsed})`
        );
      } catch (auditError) {
        console.warn('Не удалось записать в permit_audit_log:', auditError);
      }

      addNotification(
        NOTIFICATION_MESSAGES.PERMIT_CLOSED,
        TOAST_TYPES.SUCCESS,
        TOAST_DURATION.NORMAL
      );

      await onRefresh();
    } catch (error) {
      console.error('Ошибка закрытия наряда:', error);
      addNotification(
        (error as Error)?.message || NOTIFICATION_MESSAGES.ERROR_CLOSING,
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="permit-actions" style={styles.container}>
      {canExtend(permit) && (
        confirmingAction === 'extend' ? (
          <div style={styles.confirmRow}>
            <button type="button" style={styles.btnConfirmYes}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExtendConfirmed(); }}>
              ✓ Продлить
            </button>
            <button type="button" style={styles.btnConfirmCancel}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingAction(null); }}>
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-action btn-extend"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExtend(); }}
            disabled={extending}
            style={styles.btnExtend}
            title="Продлить на 15 дней"
          >
            {extending ? <span>⏳</span> : <><Clock size={16} /><span>Продлить</span></>}
          </button>
        )
      )}

      {canClosePermit(permit) && (
        confirmingAction === 'close' ? (
          <div style={styles.confirmRow}>
            <button type="button" style={styles.btnConfirmYes}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCloseConfirmed(); }}>
              ✓ Закрыть
            </button>
            <button type="button" style={styles.btnConfirmCancel}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingAction(null); }}>
              Отмена
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-action btn-close-permit"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
            disabled={closing}
            style={styles.btnClose}
            title="Закрыть наряд"
          >
            {closing ? <span>⏳</span> : <><CheckCircle size={16} /><span>Закрыть</span></>}
          </button>
        )
      )}

      <button
        type="button"
        className="btn-action btn-edit"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(permit); }}
        style={styles.btnEdit}
        title="Редактировать"
      >
        <Edit2 size={16} />
      </button>

      {confirmingDelete ? (
        <div style={styles.confirmRow}>
          <button type="button" style={styles.btnConfirmDeleteYes}
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              onDelete(permit.id);
              setConfirmingDelete(false);
            }}>
            ✓ Удалить
          </button>
          <button type="button" style={styles.btnConfirmCancel}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(false); }}>
            Отмена
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-action btn-delete"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(true); }}
          style={styles.btnDelete}
          title="Удалить"
        >
          <Trash2 size={16} />
          <span>Удалить</span>
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  confirmRow: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  btnConfirmYes: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '0 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    background: '#0f766e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnConfirmDeleteYes: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '0 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    background: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnConfirmCancel: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '0 14px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnExtend: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnClose: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnEdit: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '70px',
    padding: '0px 10px 0px 10px',
    color: '#3b82f6',
    background: '#dbeafe',
    border: '1px solid #93c5fd',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnDelete: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    width: '70px',
    padding: '0px 10px',
    fontSize: '13px',
    color: '#ef4444',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
