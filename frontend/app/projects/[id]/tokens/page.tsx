'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { projectsAPI, apiTokensAPI, environmentsAPI, ApiToken, CreateApiTokenResponse, ProjectPermissionsResponse } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { EditApiTokenModal } from '@/components/ui/EditApiTokenModal';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { canManageProjectTokens, canReadProject, canWriteProject } from '@/lib/permissions';

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
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [permissionInfo, setPermissionInfo] = useState<ProjectPermissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [tokenScopes, setTokenScopes] = useState<('read' | 'write')[]>(['read']);
  const [tokenExpiry, setTokenExpiry] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingToken, setEditingToken] = useState<ApiToken | null>(null);
  const [expandedExample, setExpandedExample] = useState<string | null>('get-env');
  const [copiedExample, setCopiedExample] = useState<string | null>(null);
  const [exampleEnv, setExampleEnv] = useState('dev');
  const [envOptions, setEnvOptions] = useState<string[]>(['dev', 'staging', 'prod']);
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectData, tokensData, envs, permissionsData] = await Promise.all([
        projectsAPI.get(projectId),
        apiTokensAPI.list(projectId),
        environmentsAPI.list(projectId),
        projectsAPI.getPermissions(projectId),
      ]);
      setProject(projectData);
      setTokens(tokensData);
      setPermissionInfo(permissionsData);
      if (envs.length > 0) {
        setEnvOptions(envs.map((e) => e.slug));
        setExampleEnv(envs[0].slug);
      }
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
    if (!canManageTokens) return;
    if (!tokenName.trim()) {
      toastError('Token name is required');
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
      toastError(err.response?.data?.error || 'Failed to create token');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteToken = async (tokenId: string, tokenName: string) => {
    const ok = await confirm({
      title: 'Revoke API token?',
      message: `Revoke "${tokenName}"? This action cannot be undone.`,
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await apiTokensAPI.delete(projectId, tokenId);
      toastSuccess('Token revoked');
      loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to revoke token');
    }
  };

  const handleUpdateToken = async (
    tokenId: string,
    data: { name: string; scopes: ('read' | 'write')[] }
  ) => {
    await apiTokensAPI.update(projectId, tokenId, data);
    await loadData();
  };

  const handleCopyToken = async () => {
    if (newToken) {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canManageTokens = permissionInfo
    ? canManageProjectTokens(permissionInfo.effective)
    : false;
  const canRead = permissionInfo ? canReadProject(permissionInfo.effective) : false;
  const canWrite = permissionInfo ? canWriteProject(permissionInfo.effective) : false;

  const apiBase =
    typeof window !== 'undefined' ? window.location.origin : 'https://your-hashenv-instance.com';

  const apiExamples = [
    {
      id: 'get-env',
      title: 'GET /env — Download environment file',
      scope: 'read',
      description: 'Returns the latest decrypted .env content for an environment.',
      curl: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiBase}/api/v1/projects/${projectId}/env?environment=${exampleEnv}"`,
    },
    {
      id: 'list-env',
      title: 'GET /env/list — List environments',
      scope: 'read',
      description: 'Lists each environment with its latest version number.',
      curl: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiBase}/api/v1/projects/${projectId}/env/list"`,
    },
    {
      id: 'put-env',
      title: 'PUT /env — Upload environment file',
      scope: 'write',
      description: 'Creates a new version from raw key=value content.',
      curl: `curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"environment": "${exampleEnv}", "content": "KEY=value\\nOTHER=value"}' \\
  "${apiBase}/api/v1/projects/${projectId}/env"`,
    },
    {
      id: 'list-secrets',
      title: 'GET /secrets — List secrets',
      scope: 'read',
      description: 'Returns secret names and metadata (not values).',
      curl: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiBase}/api/v1/projects/${projectId}/secrets"`,
    },
    {
      id: 'get-secret',
      title: 'GET /secrets/:name — Get secret value',
      scope: 'read',
      description: 'Returns the decrypted content for a secret by name.',
      curl: `curl -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiBase}/api/v1/projects/${projectId}/secrets/MY_SECRET"`,
    },
    {
      id: 'post-secret',
      title: 'POST /secrets — Create secret',
      scope: 'write',
      description: 'Creates a new secret with the given name and content.',
      curl: `curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "MY_SECRET", "content": "secret-value"}' \\
  "${apiBase}/api/v1/projects/${projectId}/secrets"`,
    },
    {
      id: 'put-secret',
      title: 'PUT /secrets/:name — Update secret',
      scope: 'write',
      description: 'Updates the content of an existing secret.',
      curl: `curl -X PUT -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "new-secret-value"}' \\
  "${apiBase}/api/v1/projects/${projectId}/secrets/MY_SECRET"`,
    },
    {
      id: 'delete-secret',
      title: 'DELETE /secrets/:name — Delete secret',
      scope: 'write',
      description: 'Permanently deletes a secret by name.',
      curl: `curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \\
  "${apiBase}/api/v1/projects/${projectId}/secrets/MY_SECRET"`,
    },
  ];

  const visibleApiExamples = apiExamples.filter((example) =>
    example.scope === 'read' ? canRead : canWrite
  );

  const handleCopyExample = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedExample(id);
    setTimeout(() => setCopiedExample(null), 2000);
  };

  if (loading) {
    return (
      <>
        <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </>
    );
  }

  if (!project || error) {
    return (
      <div className="flex items-center justify-center py-16">
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
    );
  }

  return (
    <>
      {project && (
        <ProjectPageHeader
          projectId={projectId}
          projectName={project.name}
          title="API tokens"
          description={`Manage tokens for programmatic access to ${project.name}.`}
        />
      )}

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
          {canManageTokens && formOpen && (
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
            {canManageTokens && !formOpen && (
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
                    {canManageTokens && (
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Actions
                      </th>
                    )}
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
                      {canManageTokens && (
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => setEditingToken(token)}
                              className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteToken(token._id, token.name)}
                              className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      )}
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
              {canManageTokens && (
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
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">
              API Reference
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Authenticate with <code className="font-mono text-xs">Authorization: Bearer YOUR_TOKEN</code>.
              Rate limit: 100 requests per minute per token.
            </p>
            <div className="mb-4 flex items-center gap-3">
              <label htmlFor="example-env" className="text-sm text-[var(--text-secondary)]">
                Example environment slug:
              </label>
              <select
                id="example-env"
                value={exampleEnv}
                onChange={(e) => setExampleEnv(e.target.value)}
                className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-mono"
              >
                {envOptions.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              {visibleApiExamples.map((example) => {
                const isOpen = expandedExample === example.id;
                return (
                  <div
                    key={example.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--background)] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedExample(isOpen ? null : example.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      aria-expanded={isOpen}
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{example.title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Requires <span className="font-mono">{example.scope}</span> scope
                        </p>
                      </div>
                      <svg
                        className={`h-5 w-5 shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-[var(--border)] px-4 py-3">
                        <p className="text-sm text-[var(--text-secondary)] mb-3">{example.description}</p>
                        <div className="relative">
                          <pre className="p-3 pr-20 rounded-md bg-[var(--surface)] border border-[var(--border)] text-sm overflow-x-auto">
                            <code className="text-[var(--text-secondary)] whitespace-pre-wrap break-all">
                              {example.curl}
                            </code>
                          </pre>
                          <button
                            type="button"
                            onClick={() => handleCopyExample(example.id, example.curl)}
                            className="absolute top-2 right-2 rounded px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                          >
                            {copiedExample === example.id ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        {canManageTokens && editingToken && (
          <EditApiTokenModal
            token={editingToken}
            onSave={(data) => handleUpdateToken(editingToken._id, data)}
            onClose={() => setEditingToken(null)}
          />
        )}
    </>
  );
}
