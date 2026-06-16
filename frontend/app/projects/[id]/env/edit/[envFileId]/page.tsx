'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { envAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';

export default function EditEnvPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const projectId = params.id as string;
  const envFileId = params.envFileId as string;
  const environment = searchParams.get('environment') || 'dev';
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFileContent();
  }, [envFileId, projectId]);

  const loadFileContent = async () => {
    try {
      setLoading(true);
      const data = await envAPI.getFileContent(projectId, envFileId);
      setContent(data.content);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    if (content.length > 50 * 1024) {
      setError('Content size must be less than 50KB');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await envAPI.edit(projectId, envFileId, content);
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update file');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="p-6 lg:p-8">
            <div className="mx-auto max-w-4xl">
              <div className="animate-pulse">
                <div className="h-8 bg-[var(--surface-elevated)] rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-[var(--surface-elevated)] rounded"></div>
              </div>
            </div>
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <Link
                href={`/projects/${projectId}`}
                className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
              >
                ← Back to Project
              </Link>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Edit Environment File</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Editing {formatEnvLabel(environment)} ({environment})
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Environment File Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    if (newContent.length > 50 * 1024) {
                      setError('Content size must be less than 50KB');
                      return;
                    }
                    setContent(newContent);
                    setError('');
                  }}
                  rows={20}
                  className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] font-mono text-sm placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-y"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {(content.length / 1024).toFixed(2)} KB / 50 KB maximum
                </p>
              </div>

              <div className="rounded-md border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-4">
                <p className="text-sm text-[var(--warning)]">
                  <strong>Security Notice:</strong> Changes will be saved with encryption. This action will be logged.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  size="md"
                  asLink
                  href={`/projects/${projectId}`}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={saving || !content.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
