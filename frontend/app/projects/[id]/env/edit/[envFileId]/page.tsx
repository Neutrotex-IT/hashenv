'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { envAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import { Button } from '@/components/ui/Button';

export default function EditEnvPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const envFileId = params.envFileId as string;
  const environment = searchParams.get('environment') || 'dev';
  const versionParam = searchParams.get('version');
  
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMode, setSaveMode] = useState<'update' | 'newVersion'>('update');
  const [error, setError] = useState('');

  useEffect(() => {
    loadFileContent();
  }, [envFileId, projectId]);

  const loadFileContent = async () => {
    try {
      setLoading(true);
      const data = await envAPI.getFileContent(projectId, envFileId);
      setContent(data.content);
      setOriginalContent(data.content);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load file content');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (saveAsNewVersion: boolean) => {
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    if (content.length > 50 * 1024) {
      setError('Content size must be less than 50KB');
      return;
    }

    setSaving(true);
    setSaveMode(saveAsNewVersion ? 'newVersion' : 'update');
    setError('');

    try {
      await envAPI.edit(projectId, envFileId, content, { saveAsNewVersion });
      router.push(`/projects/${projectId}?environment=${encodeURIComponent(environment)}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update file');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSave(false);
  };

  const hasChanges = content !== originalContent;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--surface-elevated)] rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-[var(--surface-elevated)] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Edit Environment File</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Editing {formatEnvLabel(environment)} ({environment})
                {versionParam ? ` — version ${versionParam}` : ''}
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
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  <strong>Save changes</strong> updates this version in place.{' '}
                  <strong>Save as new version</strong> keeps the current version unchanged and creates the next version with your edits.
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
                  variant="secondary"
                  size="md"
                  type="button"
                  disabled={saving || !content.trim() || !hasChanges}
                  onClick={() => handleSave(true)}
                >
                  {saving && saveMode === 'newVersion' ? 'Saving...' : 'Save as New Version'}
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={saving || !content.trim() || !hasChanges}
                >
                  {saving && saveMode === 'update' ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
    </div>
  );
}
