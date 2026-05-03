import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import Compressor from 'compressorjs';
import { useTaskResolution } from '../hooks/useTaskResolution';
import type { Task } from '../types';

interface TaskResolveModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

// ── Module-level constants — no re-allocation on render ────────────────────

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const PANEL_STYLE: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  width: '100%',
  maxWidth: 440,
  boxShadow: '0 8px 32px rgba(0,0,0,.2)',
};

const TITLE_STYLE: React.CSSProperties = {
  margin: '0 0 4px',
  fontSize: 16,
  fontWeight: 700,
};

const SUBTITLE_STYLE: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 13,
  color: '#71717a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const SPINNER_STYLE: React.CSSProperties = {
  width: 24,
  height: 24,
  border: '2px solid #e5e7eb',
  borderTop: '2px solid #3b82f6',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: '0 auto 8px',
};

const TEXTAREA_STYLE: React.CSSProperties = {
  width: '100%',
  marginTop: 12,
  padding: '8px 10px',
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  fontSize: 13,
  resize: 'none',
  boxSizing: 'border-box',
};

const ACTIONS_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 16,
};

const BTN_CANCEL_STYLE: React.CSSProperties = {
  padding: '6px 16px',
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};

// Pure utility functions — defined outside component, never recreated

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6,
      maxWidth: 1024,
      maxHeight: 1024,
      minWidth: 300,
      minHeight: 300,
      mimeType: 'image/jpeg',
      success(result) { resolve(result as File); },
      error(err) { reject(err); },
    });
  });
}

async function validateMagicBytes(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const b = new Uint8Array(buffer);
  const isJpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
  const isPng  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
  const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46;
  return isJpeg || isPng || isWebp;
}

// ── Upload state — consolidated from 4 separate useState calls ─────────────

interface UploadState {
  photo: File | null;
  compressed: File | null;
  preview: string | null;
  compressing: boolean;
}

const UPLOAD_EMPTY: UploadState = {
  photo: null,
  compressed: null,
  preview: null,
  compressing: false,
};

// ── Component ──────────────────────────────────────────────────────────────

export function TaskResolveModal({ task, open, onClose }: TaskResolveModalProps) {
  const [upload, setUpload] = useState<UploadState>(UPLOAD_EMPTY);
  const [comments, setComments] = useState('');
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resolve = useTaskResolution();

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const applyFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_FILE_BYTES) {
      alert('Файл слишком большой. Максимум 20 МБ.');
      return;
    }

    setUpload((prev) => ({ ...prev, compressing: true }));

    validateMagicBytes(file)
      .then((valid) => {
        if (!valid) {
          setUpload((prev) => ({ ...prev, compressing: false }));
          alert('Неверный формат файла. Разрешены JPEG, PNG, WEBP.');
          return Promise.reject(new Error('invalid_magic_bytes'));
        }
        return compressImage(file);
      })
      .then((compressed) => {
        setUpload({
          photo: file,
          compressed,
          preview: URL.createObjectURL(compressed),
          compressing: false,
        });
      })
      .catch((err: Error) => {
        if (err.message === 'invalid_magic_bytes') return;
        console.error('Ошибка сжатия:', err);
        setUpload({
          photo: file,
          compressed: file,
          preview: URL.createObjectURL(file),
          compressing: false,
        });
      });
  }, []);

  const handleClose = useCallback(() => {
    setUpload(UPLOAD_EMPTY);
    setComments('');
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!upload.compressed) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    await resolve.mutateAsync({
      taskId: task.id,
      photo: upload.compressed,
      comments: comments || undefined,
    });

    if (!signal.aborted) handleClose();
  }, [comments, handleClose, resolve, task.id, upload.compressed]);

  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }, [applyFile]);

  const handleUploadZoneClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
  }, [applyFile]);

  const handleCommentsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value),
    []
  );

  // ── Derived styles (memoized — avoid new objects when deps unchanged) ──────

  const dropZoneStyle = useMemo<React.CSSProperties>(() => ({
    border: `2px dashed ${dragging ? '#3b82f6' : '#d4d4d8'}`,
    borderRadius: 8,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    background: dragging ? '#eff6ff' : '#fafafa',
    minHeight: 120,
    opacity: upload.compressing ? 0.7 : 1,
  }), [dragging, upload.compressing]);

  const submitBtnStyle = useMemo<React.CSSProperties>(() => {
    const active = Boolean(upload.compressed) && !resolve.isPending && !upload.compressing;
    return {
      padding: '6px 16px',
      border: 'none',
      borderRadius: 6,
      background: active ? '#16a34a' : '#a1a1aa',
      color: '#fff',
      cursor: active ? 'pointer' : 'not-allowed',
      fontSize: 13,
      fontWeight: 600,
    };
  }, [upload.compressed, resolve.isPending, upload.compressing]);

  // ── Effects ───────────────────────────────────────────────────────────────

  // Revoke previous object URL when preview changes
  useEffect(() => {
    return () => {
      if (upload.preview) URL.revokeObjectURL(upload.preview);
    };
  }, [upload.preview]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.cssText = `position: fixed; top: -${scrollY}px; width: 100%; overflow-y: scroll;`;
    return () => {
      document.body.style.cssText = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // Escape to close; Tab trap inside modal
  useEffect(() => {
    if (!open) return;

    const modal = modalRef.current;

    const getFocusable = () =>
      modal
        ? Array.from(
            modal.querySelectorAll<HTMLElement>(
              'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          )
        : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
        return;
      }
      if (event.key === 'Tab') {
        const els = getFocusable();
        const first = els[0];
        const last = els[els.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    getFocusable()[0]?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  // Abort any in-flight mutation on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Early return ──────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div style={OVERLAY_STYLE} onClick={handleOverlayClick}>
      <div
        ref={modalRef}
        style={PANEL_STYLE}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-resolve-title"
      >
        <h3 id="task-resolve-title" style={TITLE_STYLE}>
          Закрыть задачу
        </h3>
        <p style={SUBTITLE_STYLE}>{task.title}</p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadZoneClick}
          style={dropZoneStyle}
        >
          {upload.compressing ? (
            <div style={{ textAlign: 'center' }}>
              <div style={SPINNER_STYLE} />
              <p style={{ fontSize: 13, color: '#71717a' }}>Сжатие фото...</p>
            </div>
          ) : upload.preview ? (
            <img
              src={upload.preview}
              alt="preview"
              style={{ maxHeight: 160, borderRadius: 6, objectFit: 'contain' }}
            />
          ) : (
            <>
              <Upload size={28} color="#a1a1aa" />
              <p style={{ margin: '8px 0 2px', fontSize: 13, color: '#71717a' }}>
                Перетащите фото или нажмите для выбора
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#a1a1aa' }}>
                JPG, PNG, WEBP (авто-сжатие)
              </p>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {upload.compressed && (
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#71717a' }}>
            📸 {upload.compressed.name} · {(upload.compressed.size / 1024).toFixed(0)} КБ
            <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 8 }}>
              (сжато {((upload.compressed.size / upload.photo!.size) * 100).toFixed(0)}%)
            </span>
          </p>
        )}

        <textarea
          value={comments}
          onChange={handleCommentsChange}
          placeholder="Комментарий (необязательно)"
          rows={3}
          style={TEXTAREA_STYLE}
        />

        <div style={ACTIONS_STYLE}>
          <button
            onClick={handleClose}
            disabled={resolve.isPending || upload.compressing}
            style={BTN_CANCEL_STYLE}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!upload.compressed || resolve.isPending || upload.compressing}
            style={submitBtnStyle}
          >
            {resolve.isPending ? 'Сохранение…' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}
