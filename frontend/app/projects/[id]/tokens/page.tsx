'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, apiTokensAPI, ApiToken, CreateApiTokenResponse } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';

interface Project {
  _id: string;
  name: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    userId: {
      _id: string;
    };
    permission: 'read' | 'write';
  }>;
}

export default function ProjectApiTokensPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenScopes, setTokenScopes] = useState<('read' | 'write')[]>(['read']);
  const [tokenExpiry, setTokenExpiry] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectData, tokensData] = await Promise.all([
        projectsAPI.get(projectId),
        apiTokensAPI.list(projectId),
      ]);
      setProject(projectData);
      setTokens(tokensData);
      setError('');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        setError('Access denied: You do not have permission to access this project.');
      } else if (status === 404) {
        setError('Project not found.');
      } else {
        setError(err.response?.data?.error || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) {
      alert('Token name is required');
      return;
    }

    setSubmitting(true);
    try {
      const data: CreateApiTokenResponse = await apiTokensAPI.create(projectId, {
        name: tokenName.trim(),
        scopes: tokenScopes,
        expiresIn: tokenExpiry ? parseInt(tokenExpiry, 10) : undefined,
      });
      
      setNewToken(data.token);
      setFormOpen(false);
      setTokenName('');
      setTokenScopes(['read']);
      setTokenExpiry('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create token');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteToken = async (tokenId: string, tokenName: string) => {
    if (!confirm(`Are you sure you want to revoke the token "${tokenName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiTokensAPI.delete(projectId, tokenId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to revoke token');
    }
  };

  const handleCopyToken = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isProjectOwner = project && project.createdBy._id === user?.id;
  const userPermission = project?.members.find(
    (m) => m.userId._id === user?.id
  )?.permission || null;
  const canWrite = isProjectOwner || userPermission === 'write';

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="p-6 lg:p-8">
            <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  if (!project || error) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="flex min-h-screen items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <svg className="mx-auto h-16 w-16 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Error</h2>
              <p className="text-[var(--text-secondary)] mb-6">{error}</p>
              <Button variant="primary" size="md" asLink href="/dashboard">
                Back to Dashboard
              </Button>
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
          <div className="mb-6">
            <Link href={`/projects/${projectId}`} className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] mb-4 inline-block">
              Back to Project
            </Link>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">API Tokens</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Manage API tokens for programmatic access to {project.name}
            </p>
          </div>

          {/* New Token Display */}
          {newToken && (
            <div className="mb-6 rounded-lg border border-[var(--success)]/50 bg-[var(--success)]/10 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    Token Created Successfully
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Copy this token now. You will not be able to see it again.
                  </p>
                </div>
                <button
                  onClick={() => setNewToken(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 block p-3 rounded-md bg-[var(--background)] border border-[var(--border)] font-mono text-sm text-[var(--foreground)] break-all">
                  {newToken}
                </code>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleCopyToken}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          )}

          {/* Create Token Form */}
          {formOpen && (
            <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Create New API Token
                </h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateToken} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Token Name
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g., CI/CD Pipeline, Production Server"
                    className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    required
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tokenScopes.includes('read')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTokenScopes([...tokenScopes, 'read']);
                          } else {
                            setTokenScopes(tokenScopes.filter(s => s !== 'read'));
                          }
                        }}
                        className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-sm text-[var(--foreground)]">
                        Read - Download environment files and secrets
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tokenScopes.includes('write')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTokenScopes([...tokenScopes, 'write']);
                          } else {
                            setTokenScopes(tokenScopes.filter(s => s !== 'write'));
                          }
                        }}
                        className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                      />
                      <span className="text-sm text-[var(--foreground)]">
                        Write - Upload and modify environment files
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Expiration (optional)
                  </label>
                  <select
                    value={tokenExpiry}
                    onChange={(e) => setTokenExpiry(e.target.value)}
                    className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  >
                    <option value="">Never expires</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="365">1 year</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setFormOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={submitting || !tokenName.trim() || tokenScopes.length === 0}
                  >
                    {submitting ? 'Creating...' : 'Create Token'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Actions */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
            </p>
            {canWrite && !formOpen && (
              <Button
                variant="primary"
                size="md"
                onClick={() => setFormOpen(true)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Token
              </Button>
            )}
          </div>

          {/* Tokens List */}
          {tokens.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Scopes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                  {tokens.map((token) => (
                    <tr key={token._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                        {token.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        <code className="font-mono">{token.tokenPrefix}...</code>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex gap-1">
                          {token.scopes.map((scope) => (
                            <span
                              key={scope}
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                scope === 'write'
                                  ? 'bg-[var(--warning)]/20 text-[var(--warning)]'
                                  : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                              }`}
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {token.lastUsedAt
                          ? new Date(token.lastUsedAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {token.expiresAt
                          ? new Date(token.expiresAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {canWrite && (
                          <button
                            onClick={() => handleDeleteToken(token._id, token.name)}
                            className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <p className="text-[var(--text-secondary)] mb-2">No API tokens created yet.</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                API tokens allow programmatic access to this project's environment files and secrets.
              </p>
              {canWrite && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setFormOpen(true)}
                >
                  Create your first token
                </Button>
              )}
            </div>
          )}

          {/* Usage Examples */}
          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
              Usage Examples
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                  Download environment file:
                </p>
                <pre className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm overflow-x-auto">
                  <code className="text-[var(--text-secondary)]">
{`curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/projects/${projectId}/env?environment=dev"`}
                  </code>
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                  Upload environment file:
                </p>
                <pre className="p-3 rounded-md bg-[var(--background)] border border-[var(--border)] text-sm overflow-x-auto">
                  <code className="text-[var(--text-secondary)]">
{`curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"environment": "dev", "content": "KEY=value"}' \\
  "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/projects/${projectId}/env"`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
