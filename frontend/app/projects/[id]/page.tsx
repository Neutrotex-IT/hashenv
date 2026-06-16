'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, envAPI, secretsAPI, accountsAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { UploadEnvButton } from '@/components/ui/UploadEnvButton';
import { formatPermission } from '@/lib/permissions';
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
      name: string;
      email: string;
    };
    permission: 'read' | 'write';
  }>;
  createdAt: string;
}

interface EnvVersion {
  _id: string;
  environment: 'dev' | 'staging' | 'prod';
  version: number;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface Secret {
  _id: string;
  name: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AssociatedAccount {
  _id: string;
  label: string;
  provider: string;
  providerOther?: string;
  email: string;
  loginUrl?: string;
  usesSSO: boolean;
  ssoProvider?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const ACCOUNT_PROVIDERS = [
  { value: 'google', label: 'Google' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'github', label: 'GitHub' },
  { value: 'aws', label: 'AWS' },
  { value: 'slack', label: 'Slack' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'other', label: 'Other' },
] as const;

function formatProvider(provider: string, providerOther?: string) {
  if (provider === 'other' && providerOther) return providerOther;
  return ACCOUNT_PROVIDERS.find((p) => p.value === provider)?.label || provider;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [envVersions, setEnvVersions] = useState<EnvVersion[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [accounts, setAccounts] = useState<AssociatedAccount[]>([]);
  const [selectedTab, setSelectedTab] = useState<'environments' | 'secrets' | 'accounts'>('environments');
  const [selectedEnv, setSelectedEnv] = useState<'dev' | 'staging' | 'prod'>('dev');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [secretFormOpen, setSecretFormOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [secretName, setSecretName] = useState('');
  const [secretContent, setSecretContent] = useState('');
  const [submittingSecret, setSubmittingSecret] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AssociatedAccount | null>(null);
  const [accountLabel, setAccountLabel] = useState('');
  const [accountProvider, setAccountProvider] = useState('google');
  const [accountProviderOther, setAccountProviderOther] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountLoginUrl, setAccountLoginUrl] = useState('');
  const [accountUsesSSO, setAccountUsesSSO] = useState(false);
  const [accountSsoProvider, setAccountSsoProvider] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountNotes, setAccountNotes] = useState('');
  const [submittingAccount, setSubmittingAccount] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (project && projectId) {
      if (selectedTab === 'environments') {
        loadEnvVersions();
      } else if (selectedTab === 'secrets') {
        loadSecrets();
      } else if (selectedTab === 'accounts') {
        loadAccounts();
      }
    }
  }, [project, projectId, selectedEnv, selectedTab]);

  const loadProject = async () => {
    try {
      const data = await projectsAPI.get(projectId);
      setProject(data);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      const status = err.response?.status;
      const errorMessage = err.response?.data?.error || 'Failed to load project';
      
      // Handle access denied (403)
      if (status === 403) {
        setError('Access denied: You do not have permission to access this project. Projects are admin-specific and can only be accessed by their creator or assigned members.');
        setProject(null);
      } else if (status === 404) {
        setError('Project not found. It may have been deleted or you do not have access to it.');
        setProject(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEnvVersions = async () => {
    // Don't load env versions if project failed to load (likely access denied)
    if (!project) {
      return;
    }
    
    try {
      const data = await envAPI.listVersions(projectId, selectedEnv);
      setEnvVersions(data);
    } catch (err: any) {
      const status = err.response?.status;
      // Only log non-403 errors (403 is expected if no access)
      if (status !== 403) {
        console.error('Failed to load env versions:', err);
      }
      // Don't set error for env versions as it's secondary data
      setEnvVersions([]);
    }
  };

  const loadSecrets = async () => {
    if (!project) {
      return;
    }
    
    try {
      const data = await secretsAPI.list(projectId);
      setSecrets(data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status !== 403) {
        console.error('Failed to load secrets:', err);
      }
      setSecrets([]);
    }
  };

  const loadAccounts = async () => {
    if (!project) {
      return;
    }

    try {
      const data = await accountsAPI.list(projectId);
      setAccounts(data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status !== 403) {
        console.error('Failed to load associated accounts:', err);
      }
      setAccounts([]);
    }
  };

  const handleDownload = async (environment: string, version?: number) => {
    try {
      await envAPI.download(projectId, environment, version);
      // Refresh versions list after download
      loadEnvVersions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to download file');
    }
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretName.trim() || !secretContent.trim()) {
      alert('Secret name and content are required');
      return;
    }

    setSubmittingSecret(true);
    try {
      if (editingSecret) {
        await secretsAPI.update(projectId, editingSecret._id, {
          name: secretName.trim(),
          content: secretContent.trim(),
        });
      } else {
        await secretsAPI.create(projectId, {
          name: secretName.trim(),
          content: secretContent.trim(),
        });
      }
      setSecretFormOpen(false);
      setEditingSecret(null);
      setSecretName('');
      setSecretContent('');
      loadSecrets();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save secret');
    } finally {
      setSubmittingSecret(false);
    }
  };

  const handleEditSecret = async (secret: Secret) => {
    try {
      const secretData = await secretsAPI.get(projectId, secret._id);
      setEditingSecret(secret);
      setSecretName(secretData.name);
      setSecretContent(secretData.content);
      setSecretFormOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load secret');
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    if (!confirm('Are you sure you want to delete this secret? This action cannot be undone.')) {
      return;
    }

    try {
      await secretsAPI.delete(projectId, secretId);
      loadSecrets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete secret');
    }
  };

  const handleViewSecret = async (secret: Secret) => {
    try {
      const secretData = await secretsAPI.get(projectId, secret._id);
      alert(`Secret: ${secretData.name}\n\nContent:\n${secretData.content}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load secret');
    }
  };

  const handleDownloadSecretAsEnv = async (secret: Secret) => {
    try {
      const secretData = await secretsAPI.get(projectId, secret._id);
      
      // Format as .env file: SECRET_NAME=secret_content
      const envContent = `${secretData.name}=${secretData.content}`;
      
      // Create download link
      const blob = new Blob([envContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `.env`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to download secret');
    }
  };

  const closeSecretForm = () => {
    setSecretFormOpen(false);
    setEditingSecret(null);
    setSecretName('');
    setSecretContent('');
  };

  const resetAccountForm = () => {
    setAccountLabel('');
    setAccountProvider('google');
    setAccountProviderOther('');
    setAccountEmail('');
    setAccountLoginUrl('');
    setAccountUsesSSO(false);
    setAccountSsoProvider('');
    setAccountPassword('');
    setAccountNotes('');
  };

  const closeAccountForm = () => {
    setAccountFormOpen(false);
    setEditingAccount(null);
    resetAccountForm();
  };

  const openCreateAccountForm = () => {
    setEditingAccount(null);
    resetAccountForm();
    setAccountFormOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountLabel.trim() || !accountEmail.trim()) {
      alert('Label and email/username are required');
      return;
    }

    if (accountProvider === 'other' && !accountProviderOther.trim()) {
      alert('Please specify the provider name');
      return;
    }

    if (accountUsesSSO && !accountSsoProvider.trim()) {
      alert('Please specify the SSO provider');
      return;
    }

    if (!accountUsesSSO && !editingAccount && !accountPassword.trim()) {
      alert('Password is required when SSO is not used');
      return;
    }

    setSubmittingAccount(true);
    try {
      const payload = {
        label: accountLabel.trim(),
        provider: accountProvider,
        providerOther: accountProvider === 'other' ? accountProviderOther.trim() : undefined,
        email: accountEmail.trim(),
        loginUrl: accountLoginUrl.trim() || undefined,
        usesSSO: accountUsesSSO,
        ssoProvider: accountUsesSSO ? accountSsoProvider.trim() : undefined,
        password: accountUsesSSO ? '' : accountPassword || undefined,
        notes: accountNotes.trim() || undefined,
      };

      if (editingAccount) {
        await accountsAPI.update(projectId, editingAccount._id, payload);
      } else {
        await accountsAPI.create(projectId, payload);
      }

      closeAccountForm();
      loadAccounts();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save account');
    } finally {
      setSubmittingAccount(false);
    }
  };

  const handleEditAccount = async (account: AssociatedAccount) => {
    try {
      const data = await accountsAPI.getCredentials(projectId, account._id);
      setEditingAccount(account);
      setAccountLabel(data.label);
      setAccountProvider(data.provider);
      setAccountProviderOther(data.providerOther || '');
      setAccountEmail(data.email);
      setAccountLoginUrl(data.loginUrl || '');
      setAccountUsesSSO(data.usesSSO);
      setAccountSsoProvider(data.ssoProvider || '');
      setAccountPassword(data.password || '');
      setAccountNotes(data.notes || '');
      setAccountFormOpen(true);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load account credentials');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this associated account? This action cannot be undone.')) {
      return;
    }

    try {
      await accountsAPI.delete(projectId, accountId);
      loadAccounts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const handleViewAccount = async (account: AssociatedAccount) => {
    try {
      const data = await accountsAPI.getCredentials(projectId, account._id);
      const lines = [
        `Label: ${data.label}`,
        `Provider: ${formatProvider(data.provider, data.providerOther)}`,
        `Email/Username: ${data.email}`,
      ];
      if (data.loginUrl) lines.push(`Login URL: ${data.loginUrl}`);
      if (data.usesSSO) {
        lines.push(`SSO: Yes (${data.ssoProvider})`);
      } else {
        lines.push(`Password: ${data.password || '(not set)'}`);
      }
      if (data.notes) lines.push(`Notes: ${data.notes}`);
      alert(lines.join('\n'));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load account credentials');
    }
  };

  // Check if user is the project owner (created it) or check their membership permission
  const isProjectOwner = project && project.createdBy._id === user?.id;
  const userPermission = project?.members.find(
    (m) => m.userId._id === user?.id
  )?.permission || null;

  // Only project owner (admin who created it) or users with write permission can write
  const canWrite = isProjectOwner || userPermission === 'write';
  // Project owner, or members with read/write can read
  const canRead = isProjectOwner || userPermission === 'read' || userPermission === 'write';

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="p-6 lg:p-8">
            <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <SkeletonCard />
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  if (!project) {
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
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                {error && error.includes('Access denied') ? 'Access Denied' : 'Project Not Found'}
              </h2>
              <p className="text-[var(--text-secondary)] mb-6">
                {error || 'The project you are looking for does not exist or you do not have access to it.'}
              </p>
              {error && error.includes('Access denied') && (
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  You can only access projects you created or projects where you are a collaborator.
                </p>
              )}
              <Button variant="primary" size="md" asLink href="/dashboard">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  const filteredVersions = envVersions.filter((v) => v.environment === selectedEnv);
  const latestVersion = filteredVersions.length > 0 ? filteredVersions[0] : null;

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mb-6">
            <Link href="/dashboard" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">{project.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">Manage environment files for this project</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}

          {/* Main Tabs: Environments vs Secrets */}
          <div className="mb-6">
            <div className="border-b border-[var(--border)]">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setSelectedTab('environments')}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'environments'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Environments
                </button>
                <button
                  onClick={() => setSelectedTab('secrets')}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'secrets'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Other Secrets
                </button>
                <button
                  onClick={() => setSelectedTab('accounts')}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    selectedTab === 'accounts'
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Associated Accounts
                </button>
              </nav>
            </div>
          </div>

          {/* Environment Tabs (only shown when environments tab is selected) */}
          {selectedTab === 'environments' && (
            <div className="mb-6">
              <div className="border-b border-[var(--border)]">
                <nav className="-mb-px flex space-x-8">
                  {(['dev', 'staging', 'prod'] as const).map((env) => (
                    <button
                      key={env}
                      onClick={() => setSelectedEnv(env)}
                      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                        selectedEnv === env
                          ? 'border-[var(--accent)] text-[var(--accent)]'
                          : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {env.charAt(0).toUpperCase() + env.slice(1)}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {selectedTab === 'environments' && (
            <>
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  {latestVersion && (
                    <p className="text-sm text-[var(--text-muted)]">
                      Latest version: <span className="font-medium text-[var(--foreground)]">{latestVersion.version}</span> (uploaded{' '}
                      {new Date(latestVersion.createdAt).toLocaleDateString()})
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {latestVersion && canRead && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleDownload(selectedEnv)}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Latest
                    </Button>
                  )}
                  {canWrite && (
                    <UploadEnvButton
                      projectId={projectId}
                      environment={selectedEnv}
                      variant="secondary"
                      size="lg"
                      label="Upload New Version"
                    />
                  )}
                  {isProjectOwner && (
                    <Button
                      variant="outline"
                      size="md"
                      asLink
                      href={`/projects/${projectId}/logs`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Logs
                    </Button>
                  )}
                </div>
              </div>

              {/* Versions List */}
              {filteredVersions.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Uploaded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                  {filteredVersions.map((version) => (
                    <tr key={version._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                        {version.version}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {typeof version.uploadedBy === 'object' ? version.uploadedBy.name : 'Unknown'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {new Date(version.createdAt).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          {canRead && (
                            <button
                              onClick={() => handleDownload(selectedEnv, version.version)}
                              className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                            >
                              Download
                            </button>
                          )}
                          {isProjectOwner && (
                            <>
                              <button
                                onClick={() => router.push(`/projects/${projectId}/env/edit/${version._id}?environment=${selectedEnv}&version=${version.version}`)}
                                className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
                                    try {
                                      await envAPI.delete(projectId, version._id);
                                      loadEnvVersions();
                                    } catch (err: any) {
                                      alert(err.response?.data?.error || 'Failed to delete file');
                                    }
                                  }
                                }}
                                className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[var(--text-secondary)]">No environment files uploaded for {selectedEnv} yet.</p>
              {canWrite && (
                <UploadEnvButton
                  projectId={projectId}
                  environment={selectedEnv}
                  variant="primary"
                  size="lg"
                  label="Upload the first version"
                  className="mt-4"
                />
              )}
            </div>
          )}
            </>
          )}

          {selectedTab === 'secrets' && (
            <>
              {/* Secrets Section */}
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setEditingSecret(null);
                      setSecretName('');
                      setSecretContent('');
                      setSecretFormOpen(true);
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Secret
                  </Button>
                )}
              </div>

              {/* Secret Form Modal */}
              {secretFormOpen && (
                <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {editingSecret ? 'Edit Secret' : 'Create New Secret'}
                    </h3>
                    <button
                      onClick={closeSecretForm}
                      className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={handleCreateSecret} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Secret Name
                      </label>
                      <input
                        type="text"
                        value={secretName}
                        onChange={(e) => setSecretName(e.target.value)}
                        placeholder="e.g., API_KEY, DATABASE_URL"
                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        required
                        maxLength={100}
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Secret name can only contain letters, numbers, spaces, hyphens, and underscores
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Secret Content
                      </label>
                      <textarea
                        value={secretContent}
                        onChange={(e) => setSecretContent(e.target.value)}
                        placeholder="Enter secret value..."
                        rows={6}
                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono text-sm"
                        required
                        maxLength={50 * 1024}
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Maximum 50KB
                      </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={closeSecretForm}
                        disabled={submittingSecret}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={submittingSecret || !secretName.trim() || !secretContent.trim()}
                      >
                        {submittingSecret ? 'Saving...' : editingSecret ? 'Update Secret' : 'Create Secret'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Secrets List */}
              {secrets.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-[var(--surface-elevated)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Created By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Updated
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {secrets.map((secret) => (
                        <tr key={secret._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                            {secret.name}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {typeof secret.createdBy === 'object' ? secret.createdBy.name : 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {new Date(secret.updatedAt).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-3">
                              {canRead && (
                                <>
                                  <button
                                    onClick={() => handleDownloadSecretAsEnv(secret)}
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    Download as .env
                                  </button>
                                  <button
                                    onClick={() => handleViewSecret(secret)}
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    View
                                  </button>
                                </>
                              )}
                              {canWrite && (
                                <>
                                  <button
                                    onClick={() => handleEditSecret(secret)}
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSecret(secret._id)}
                                    className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-[var(--text-secondary)]">No secrets created yet.</p>
                  {canWrite && (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        setEditingSecret(null);
                        setSecretName('');
                        setSecretContent('');
                        setSecretFormOpen(true);
                      }}
                      className="mt-4"
                    >
                      Create the first secret
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {selectedTab === 'accounts' && (
            <>
              <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Store credentials for services linked to this project (e.g. Google, AWS, GitHub).
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                  </p>
                </div>
                {canWrite && (
                  <Button variant="primary" size="md" onClick={openCreateAccountForm}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Account
                  </Button>
                )}
              </div>

              {accountFormOpen && (
                <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {editingAccount ? 'Edit Associated Account' : 'Add Associated Account'}
                    </h3>
                    <button
                      onClick={closeAccountForm}
                      className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          Label
                        </label>
                        <input
                          type="text"
                          value={accountLabel}
                          onChange={(e) => setAccountLabel(e.target.value)}
                          placeholder="e.g., Google Workspace Admin"
                          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          required
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          Provider
                        </label>
                        <select
                          value={accountProvider}
                          onChange={(e) => setAccountProvider(e.target.value)}
                          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        >
                          {ACCOUNT_PROVIDERS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {accountProvider === 'other' && (
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          Provider Name
                        </label>
                        <input
                          type="text"
                          value={accountProviderOther}
                          onChange={(e) => setAccountProviderOther(e.target.value)}
                          placeholder="e.g., DigitalOcean"
                          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          required
                          maxLength={50}
                        />
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          Email / Username
                        </label>
                        <input
                          type="text"
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                          placeholder="account@company.com"
                          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          required
                          maxLength={200}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          Login URL (optional)
                        </label>
                        <input
                          type="url"
                          value={accountLoginUrl}
                          onChange={(e) => setAccountLoginUrl(e.target.value)}
                          placeholder="https://accounts.google.com"
                          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          maxLength={500}
                        />
                      </div>
                    </div>

                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={accountUsesSSO}
                          onChange={(e) => setAccountUsesSSO(e.target.checked)}
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          This account uses SSO (Single Sign-On)
                        </span>
                      </label>
                      {accountUsesSSO && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                            SSO Provider
                          </label>
                          <input
                            type="text"
                            value={accountSsoProvider}
                            onChange={(e) => setAccountSsoProvider(e.target.value)}
                            placeholder="e.g., Okta, Azure AD, Google Workspace SSO"
                            className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            required={accountUsesSSO}
                            maxLength={100}
                          />
                        </div>
                      )}
                    </div>

                    {!accountUsesSSO && (
                      <div>
                        <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          placeholder={editingAccount ? 'Leave blank to keep current password' : 'Enter password'}
                          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                          required={!editingAccount}
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={accountNotes}
                        onChange={(e) => setAccountNotes(e.target.value)}
                        placeholder="Recovery codes, 2FA details, or other notes..."
                        rows={3}
                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={closeAccountForm}
                        disabled={submittingAccount}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={submittingAccount || !accountLabel.trim() || !accountEmail.trim()}
                      >
                        {submittingAccount ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {accounts.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-[var(--surface-elevated)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Label
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Email / Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Auth
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {accounts.map((account) => (
                        <tr key={account._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground)]">
                            {account.label}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {formatProvider(account.provider, account.providerOther)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {account.email}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            {account.usesSSO ? (
                              <span className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-medium text-[var(--accent)]">
                                SSO: {account.ssoProvider}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">Password</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-3">
                              {canRead && (
                                <button
                                  onClick={() => handleViewAccount(account)}
                                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                >
                                  View
                                </button>
                              )}
                              {canWrite && (
                                <>
                                  <button
                                    onClick={() => handleEditAccount(account)}
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(account._id)}
                                    className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-[var(--text-secondary)]">No associated accounts added yet.</p>
                  {canWrite && (
                    <Button variant="primary" size="lg" onClick={openCreateAccountForm} className="mt-4">
                      Add the first account
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Settings Section (Project Owner only) */}
          {isProjectOwner && (
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {/* Members Card */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Project Members</h2>
                  <Button variant="outline" size="sm" asLink href={`/projects/${projectId}/members`}>
                    Manage Members
                  </Button>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  {project.members.length === 0 ? (
                    <p className="text-[var(--text-muted)] text-center py-4">No members added yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {project.members.slice(0, 3).map((member, idx) => (
                        <li key={idx} className="flex items-center justify-between p-3 rounded-md bg-[var(--surface-elevated)]">
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {typeof member.userId === 'object' ? member.userId.name : 'Unknown'}
                          </p>
                          <span className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-medium text-[var(--accent)]">
                            {formatPermission(member.permission)}
                          </span>
                        </li>
                      ))}
                      {project.members.length > 3 && (
                        <p className="text-sm text-[var(--text-muted)] text-center">
                          +{project.members.length - 3} more members
                        </p>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {/* API Tokens Card */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[var(--foreground)]">API Tokens</h2>
                  <Button variant="outline" size="sm" asLink href={`/projects/${projectId}/tokens`}>
                    Manage Tokens
                  </Button>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  <p className="text-[var(--text-muted)] text-sm mb-4">
                    Create API tokens for programmatic access to this project's environment files and secrets.
                  </p>
                  <Button variant="primary" size="sm" asLink href={`/projects/${projectId}/tokens`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Manage API Tokens
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
