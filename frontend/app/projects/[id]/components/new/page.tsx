'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { componentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { useProject } from '@/hooks/queries/useProject';

export default function NewComponentPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { data: project } = useProject(projectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { error: toastError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Component name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const component = await componentsAPI.create(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.push(`/projects/${projectId}/components/${component._id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const message = axiosErr.response?.data?.error || 'Failed to create component';
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
        >
          ← Back to {project?.name ?? 'Project'}
        </Link>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Add Component</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Components group secrets files and key-value secrets for a deployable unit (e.g. API, web app).
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Component Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Backend API, Web App"
            className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this component..."
            rows={4}
            className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
            maxLength={500}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button variant="outline" size="md" asLink href={`/projects/${projectId}`}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Component'}
          </Button>
        </div>
      </form>
    </div>
  );
}
