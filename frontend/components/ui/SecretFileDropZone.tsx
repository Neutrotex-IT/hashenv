'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { inferSecretFileType, isAllowedSecretFileName } from '@/lib/secretFiles';

interface SecretFileDropZoneProps {
  enabled: boolean;
  onFileDrop: (file: File, fileName: string, fileType: string) => void;
  children: React.ReactNode;
}

export function SecretFileDropZone({ enabled, onFileDrop, children }: SecretFileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);
  const { error: toastError } = useToast();

  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    },
    [enabled]
  );

  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      event.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragActive(false);
      }
    },
    [enabled]
  );

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      event.preventDefault();
    },
    [enabled]
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);

      const file = event.dataTransfer?.files?.[0];
      if (!file) return;

      const fileName = file.name;
      if (!isAllowedSecretFileName(fileName)) {
        toastError('Unsupported secrets file type. Allowed: .env, .json, .yaml, .yml, .properties, .secrets, .pem, .txt');
        return;
      }

      if (file.size > 50 * 1024) {
        toastError('Secrets file must be less than 50KB');
        return;
      }

      onFileDrop(file, fileName, inferSecretFileType(fileName));
    },
    [enabled, onFileDrop, toastError]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [enabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className="relative min-h-[40vh]">
      {children}
      {enabled && dragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-[var(--accent)] px-10 py-12 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">Drop secrets file to upload</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Supported formats: .env, .json, .yaml, .secrets, and more</p>
          </div>
        </div>
      )}
    </div>
  );
}
