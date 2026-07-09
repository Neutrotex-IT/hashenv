import React from 'react';
import Link from 'next/link';
import { Button } from './Button';

interface UploadSecretFileButtonProps {
  projectId: string;
  componentId: string;
  environment?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  label?: string;
}

export function UploadSecretFileButton({
  projectId,
  componentId,
  environment,
  size = 'md',
  variant = 'secondary',
  className = '',
  label,
}: UploadSecretFileButtonProps) {
  const params = new URLSearchParams();
  if (environment) params.set('environment', environment);
  const query = params.toString();
  const href = `/projects/${projectId}/components/${componentId}/secret-files/upload${query ? `?${query}` : ''}`;

  const iconSize = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

  return (
    <Button variant={variant} size={size} asLink href={href} className={className}>
      <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <span className={size === 'sm' ? 'ml-1.5' : 'ml-2'}>{label || 'Upload secrets file'}</span>
    </Button>
  );
}
