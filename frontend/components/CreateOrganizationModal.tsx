'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { organizationsAPI } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from './ui/Button';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrganizationModal({ isOpen, onClose }: CreateOrganizationModalProps) {
  const { setCurrentOrg, refreshOrganizations } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, submitting]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSlug('');
      setSlugEdited(false);
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName) {
      setError('Organization name is required');
      return;
    }

    if (!trimmedSlug || !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    setSubmitting(true);
    try {
      const org = await organizationsAPI.create({
        name: trimmedName,
        slug: trimmedSlug,
      });
      await refreshOrganizations();
      setCurrentOrg(org);
      onClose();
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      const validationError = err.response?.data?.errors?.[0]?.msg;
      setError(apiError || validationError || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-org-title"
        className="relative w-full max-w-md card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-org-title" className="text-lg font-semibold text-[var(--foreground)]">
            Create Team Organization
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Team organizations let you share projects and collaborate with others.
        </p>

        {error && (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Organization Name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="orange inc"
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="org-slug" className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Slug
            </label>
            <input
              id="org-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="orange-inc"
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] font-mono text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              required
              maxLength={100}
              pattern="[a-z0-9-]+"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Lowercase letters, numbers, and hyphens only. Must be unique.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || !name.trim() || !slug.trim()}
            >
              {submitting ? 'Creating...' : 'Create Organization'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
