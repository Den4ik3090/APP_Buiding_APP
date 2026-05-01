import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Compressor from 'compressorjs';
import { useTaskResolution } from '../hooks/useTaskResolution';
import type { Task } from '../types';

interface TaskResolveModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
}

export function TaskResolveModal({ task, open, onClose }: TaskResolveModalProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [compressedPhoto, setCompressedPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resolve = useTaskResolution();

  // 🔥 СЖАТИЕ ИЗОБРАЖЕНИЯ
  function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: 0.6,        // 60% качество (12MB → 120KB)
        maxWidth: 1024,      // Максимум 1024px
        maxHeight: 1024,
        minWidth: 300,
        minHeight: 300,
        mimeType: 'image/jpeg', // Всегда JPEG для максимального сжатия
        success(result) {
          resolve(result as File);
        },
        error(err) {
          reject(err);
        },
      });
    });
  }

  function applyFile(file: File) {
    if (!file.type.startsWith('image/')) return;

    setCompressing(true);
    compressImage(file)
      .then((compressed) => {
        setPhoto(file);
        setCompressedPhoto(compressed);
        setPreview(URL.createObjectURL(compressed));
      })
      .catch((err) => {
        console.error('Ошибка сжатия:', err);
        // Fallback: используем оригинал
        setPhoto(file);
        setCompressedPhoto(file);
        setPreview(URL.createObjectURL(file));
      })
      .finally(() => setCompressing(false));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyFile(file);
  }, []);

  useEffect(() => {
    // Очистка preview при закрытии
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleClose() {
    setPhoto(null);
    setCompressedPhoto(null);
    setPreview(null);
    setComments('');
    setCompressing(false);
    onClose();
  }

  async function handleSubmit() {
    if (!compressedPhoto) return;

    await resolve.mutateAsync({
      taskId: task.id,
      photo: compressedPhoto,  // 🔥 Загружаем сжатое фото!
      comments: comments || undefined
    });
    handleClose();
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 8px 32px rgba(0,0,0,.2)'
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>
          Закрыть задачу
        </h3>
        <p style={{
          margin: '0 0 16px',
          fontSize: 13,
          color: '#71717a',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {task.title}
        </p>

        {/* 🔥 Зона загрузки с индикатором сжатия */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
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
            opacity: compressing ? 0.7 : 1,
          }}
        >
          {compressing ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 24,
                height: 24,
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 8px'
              }} />
              <p style={{ fontSize: 13, color: '#71717a' }}>Сжатие фото...</p>
            </div>
          ) : preview ? (
            <img
              src={preview}
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) applyFile(f);
            }}
          />
        </div>

        {/* 🔥 Информация о размере файла */}
        {compressedPhoto && (
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#71717a' }}>
            📸 {compressedPhoto.name} · {(compressedPhoto.size / 1024).toFixed(0)} КБ
            <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 8 }}>
              (сжато {((compressedPhoto.size / photo!.size) * 100).toFixed(0)}%)
            </span>
          </p>
        )}

        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Комментарий (необязательно)"
          rows={3}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '8px 10px',
            border: '1px solid #d4d4d8',
            borderRadius: 6,
            fontSize: 13,
            resize: 'none',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button
            onClick={handleClose}
            disabled={resolve.isPending || compressing}
            style={{
              padding: '6px 16px',
              border: '1px solid #d4d4d8',
              borderRadius: 6,
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!compressedPhoto || resolve.isPending || compressing}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: 6,
              background: compressedPhoto && !resolve.isPending && !compressing ? '#16a34a' : '#a1a1aa',
              color: '#fff',
              cursor: compressedPhoto && !resolve.isPending && !compressing ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            {resolve.isPending ? 'Сохранение…' : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}