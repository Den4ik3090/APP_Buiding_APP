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

/**
 * Компонент кнопок действий для наряда
 */
export default function PermitActions({ 
  permit, 
  onEdit, 
  onDelete, 
  onRefresh,
  addNotification,
  statusSamples = [],
}) {
  const [extending, setExtending] = useState(false);
  const [closing, setClosing] = useState(false);
  const canClosePermit = (currentPermit) =>
    Boolean(currentPermit && !isClosedStatus(currentPermit.status));
  const normalizeStatusText = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е");

  const buildStatusCandidates = (kind) => {
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

    if (!window.confirm('Продлить наряд на 15 дней?')) {
      return;
    }

    setExtending(true);
    try {
      const extendedDate = calculateExtendedDate(permit.expiry_date);

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

      // Audit-log не должен блокировать основное действие.
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
        error?.message || NOTIFICATION_MESSAGES.ERROR_EXTENDING,
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

    if (!window.confirm('Закрыть наряд?')) {
      return;
    }

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

      // Audit-log не должен блокировать основное действие.
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
        error?.message || NOTIFICATION_MESSAGES.ERROR_CLOSING,
        TOAST_TYPES.ERROR,
        TOAST_DURATION.NORMAL
      );
    } finally {
      setClosing(false);
    }
  };
//Рендер кнопок действия по нарядам 
  return (
    <div className="permit-actions" style={styles.container}>
      {/* Продлить */}
      {canExtend(permit) && (
        <button
          type="button"
          className="btn-action btn-extend"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleExtend();
          }}
          disabled={extending}
          style={styles.btnExtend}
          title="Продлить на 15 дней"
        >
          {extending ? (
            <span>⏳</span>
          ) : (
            <>
              <Clock size={16} />
              <span>Продлить</span>
            </>
          )}
        </button>
      )}

      {/* Закрыть */}
      {canClosePermit(permit) && (
        <button
          type="button"
          className="btn-action btn-close-permit"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
          }}
          disabled={closing}
          style={styles.btnClose}
          title="Закрыть наряд"
        >
          {closing ? (
            <span>⏳</span>
          ) : (
            <>
              <CheckCircle size={16} />
              <span>Закрыть</span>
            </>
          )}
        </button>
      )}

      {/* Редактировать */}
      <button
        type="button"
        className="btn-action btn-edit"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit(permit);
        }}
        style={styles.btnEdit}
        title="Редактировать"
      >
        <Edit2 size={16} />
      </button>

      {/* Удалить */}
      <button
        type="button"
      className="btn-action btn-close-permit"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(permit.id);
        }}
         style={styles.btnDelete}
        title="Удалить"
      >
        <>
        <Trash2 size={16} />
        <span>Удалить</span>
        </>
      </button>
    </div>
  );
}
// Константы стилей кнопок 
const styles = {
  container: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
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
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
  },
  btnEdit: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
   width:'70px',
    padding:' 0px 10px 0px 10px',
    color: '#3b82f6',
    background: '#dbeafe',
    border: '1px solid #93c5fd',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  btnDelete: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
     width:'70px',
    padding:' 0px 10px 0px 10px',
    fontSize: '13px',
    color: '#ef4444',
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
