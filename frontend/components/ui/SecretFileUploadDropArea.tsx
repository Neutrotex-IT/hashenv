'use client';

import { useCallback, useRef, useState } from 'react';
import {
  UPLOAD_ACCEPT_ATTRIBUTE,
  UPLOAD_EXTENSION_HINT,
  inferSecretFileType,
  isAllowedFileUploadName,
} from '@/lib/secretFiles';

const MAX_BYTES = 50 * 1024;

export interface SecretFileSelection {
  file: File;
  fileName: string;
  fileType: string;
}

interface SecretFileUploadDropAreaProps {
  onFileSelect: (selection: SecretFileSelection) => void;
  onUnsupportedFile: (file: File, message: string) => void;
  disabled?: boolean;
}

export function SecretFileUploadDropArea({
  onFileSelect,
  onUnsupportedFile,
  disabled = false,
}: SecretFileUploadDropAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const processFile = useCallback(
    (file: File) => {
      if (file.size > MAX_BYTES) {
        onUnsupportedFile(file, 'Secrets file must be less than 50KB');
        return;
      }

      const fileName = file.name;
      if (!isAllowedFileUploadName(fileName)) {
        onUnsupportedFile(
          file,
          `Unsupported file type for upload. Use Paste Content for other formats. Supported: ${UPLOAD_EXTENSION_HINT}`
        );
        return;
      }

      onFileSelect({
        file,
        fileName,
        fileType: inferSecretFileType(fileName),
      });
    },
    [onFileSelect, onUnsupportedFile]
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth.current += 1;
      setDragActive(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragActive(false);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragDepth.current = 0;
      setDragActive(false);

      const file = event.dataTransfer.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled, processFile]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = '';
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => {
        if (!disabled) inputRef.current?.click();
      }}
      className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        disabled
          ? 'cursor-not-allowed border-[var(--border)] opacity-60'
          : dragActive
            ? 'cursor-copy border-[var(--accent)] bg-[var(--accent)]/5'
            : 'cursor-pointer border-[var(--border)] hover:border-[var(--accent)]/60 hover:bg-[var(--surface-hover)]'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT_ATTRIBUTE}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
      />
      <svg
        className="mx-auto h-10 w-10 text-[var(--text-muted)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
        {dragActive ? 'Drop file here' : 'Drag and drop a secrets file, or click to browse'}
      </p>
      <p className="mt-2 text-xs text-[var(--text-muted)]">{UPLOAD_EXTENSION_HINT}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Maximum size: 50 KB</p>
    </div>
  );
}
