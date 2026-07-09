'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  projectsAPI,
  accountsAPI,
  componentsAPI,
  ProjectPermissionsResponse,
  ProjectComponent,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { canReadProject, canWriteProject } from '@/lib/permissions';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { SensitiveValueModal, SensitiveField } from '@/components/ui/SensitiveValueModal';
import { EffectivePermissionsPanel } from '@/components/ui/EffectivePermissionsPanel';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { shallowRecordEqual } from '@/lib/formUtils';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface AccountFormSnapshot {
  label: string;
  provider: string;
  providerOther: string;
  email: string;
  loginUrl: string;
  usesSSO: boolean;
  ssoProvider: string;
  password: string;
  notes: string;
}

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
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [permissionInfo, setPermissionInfo] = useState<ProjectPermissionsResponse | null>(null);
  const [components, setComponents] = useState<ProjectComponent[]>([]);
  const [accounts, setAccounts] = useState<AssociatedAccount[]>([]);
  const [selectedTab, setSelectedTab] = useState<'components' | 'accounts'>('components');
  const [loading, setLoading] = useState(true);
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [error, setError] = useState('');
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
  const [accountSnapshot, setAccountSnapshot] = useState<AccountFormSnapshot | null>(null);
  const [sensitiveModal, setSensitiveModal] = useState<{
    title: string;
    fields: SensitiveField[];
    loading?: boolean;
    error?: string;
  } | null>(null);

  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const getAccountFormSnapshot = (): AccountFormSnapshot => ({
    label: accountLabel,
    provider: accountProvider,
    providerOther: accountProviderOther,
    email: accountEmail,
    loginUrl: accountLoginUrl,
    usesSSO: accountUsesSSO,
    ssoProvider: accountSsoProvider,
    password: accountPassword,
    notes: accountNotes,
  });

  const accountFormDirty = Boolean(
    editingAccount && accountSnapshot && !shallowRecordEqual(getAccountFormSnapshot(), accountSnapshot)
  );

  useEffect(() => {
    if (projectId) void loadProject();
  }, [projectId]);

  useEffect(() => {
    if (project && projectId) {
      if (selectedTab === 'components') {
        void loadComponents();
      } else {
        void loadAccounts();
      }
    }
  }, [project, projectId, selectedTab]);

  const loadProject = async () => {
    try {
      const cachedProject = queryClient.getQueryData<Project>(queryKeys.project(projectId));
      const cachedPermissions = queryClient.getQueryData<ProjectPermissionsResponse>(
        queryKeys.projectPermissions(projectId)
      );

      const [data, permissionsData] = await Promise.all([
        cachedProject ? Promise.resolve(cachedProject) : projectsAPI.get(projectId),
        cachedPermissions ? Promise.resolve(cachedPermissions) : projectsAPI.getPermissions(projectId),
      ]);
      setProject(data);
      setPermissionInfo(permissionsData);
      setError('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      const status = axiosErr.response?.status;
      const errorMessage = axiosErr.response?.data?.error || 'Failed to load project';

      if (status === 403) {
        setError('Access denied: You do not have permission to access this project.');
        setProject(null);
      } else if (status === 404) {
        setError('Project not found.');
        setProject(null);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadComponents = async () => {
    if (!project) return;
    setComponentsLoading(true);
    try {
      const data = await componentsAPI.list(projectId);
      setComponents(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status !== 403) {
        console.error('Failed to load components:', err);
      }
      setComponents([]);
    } finally {
      setComponentsLoading(false);
    }
  };

  const loadAccounts = async () => {
    if (!project) return;
    try {
      const data = await accountsAPI.list(projectId);
      setAccounts(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status !== 403) {
        console.error('Failed to load associated accounts:', err);
      }
      setAccounts([]);
    }
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
    setAccountSnapshot(null);
    resetAccountForm();
  };

  const openCreateAccountForm = () => {
    setEditingAccount(null);
    setAccountSnapshot(null);
    resetAccountForm();
    setAccountFormOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accountLabel.trim() || !accountEmail.trim()) {
      toastError('Label and email/username are required');
      return;
    }
    if (accountProvider === 'other' && !accountProviderOther.trim()) {
      toastError('Please specify the provider name');
      return;
    }
    if (accountUsesSSO && !accountSsoProvider.trim()) {
      toastError('Please specify the SSO provider');
      return;
    }
    if (!accountUsesSSO && !editingAccount && !accountPassword.trim()) {
      toastError('Password is required when SSO is not used');
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
      void loadAccounts();
      toastSuccess(editingAccount ? 'Account updated' : 'Account created');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; errors?: Array<{ msg: string }> } } };
      toastError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.errors?.[0]?.msg ||
          'Failed to save account'
      );
    } finally {
      setSubmittingAccount(false);
    }
  };

  const handleEditAccount = async (account: AssociatedAccount) => {
    try {
      const data = await accountsAPI.getCredentials(projectId, account._id);
      const snapshot: AccountFormSnapshot = {
        label: data.label,
        provider: data.provider,
        providerOther: data.providerOther || '',
        email: data.email,
        loginUrl: data.loginUrl || '',
        usesSSO: data.usesSSO,
        ssoProvider: data.ssoProvider || '',
        password: data.password || '',
        notes: data.notes || '',
      };
      setEditingAccount(account);
      setAccountLabel(snapshot.label);
      setAccountProvider(snapshot.provider);
      setAccountProviderOther(snapshot.providerOther);
      setAccountEmail(snapshot.email);
      setAccountLoginUrl(snapshot.loginUrl);
      setAccountUsesSSO(snapshot.usesSSO);
      setAccountSsoProvider(snapshot.ssoProvider);
      setAccountPassword(snapshot.password);
      setAccountNotes(snapshot.notes);
      setAccountSnapshot(snapshot);
      setAccountFormOpen(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to load account credentials');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const ok = await confirm({
      title: 'Delete associated account?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await accountsAPI.delete(projectId, accountId);
      toastSuccess('Account deleted');
      void loadAccounts();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to delete account');
    }
  };

  const handleViewAccount = async (account: AssociatedAccount) => {
    setSensitiveModal({ title: account.label, fields: [], loading: true });
    try {
      const data = await accountsAPI.getCredentials(projectId, account._id);
      const fields: SensitiveField[] = [
        { label: 'Provider', value: formatProvider(data.provider, data.providerOther), sensitive: false },
        { label: 'Email / Username', value: data.email, sensitive: false },
      ];
      if (data.loginUrl) fields.push({ label: 'Login URL', value: data.loginUrl, sensitive: false });
      if (data.usesSSO) {
        fields.push({ label: 'SSO Provider', value: data.ssoProvider || '', sensitive: false });
      } else {
        fields.push({ label: 'Password', value: data.password || '', sensitive: true });
      }
      if (data.notes) fields.push({ label: 'Notes', value: data.notes, sensitive: false });
      setSensitiveModal({ title: data.label, fields });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSensitiveModal({
        title: account.label,
        fields: [],
        error: axiosErr.response?.data?.error || 'Failed to load account credentials',
      });
    }
  };

  const effectivePermissions = permissionInfo?.effective ?? [];
  const canRead = canReadProject(effectivePermissions);
  const canWrite = canWriteProject(effectivePermissions);

  if (loading) {
    return (
      <>
        <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
            {error && error.includes('Access denied') ? 'Access Denied' : 'Project Not Found'}
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">{error || 'The project you are looking for does not exist.'}</p>
          <Button variant="primary" size="md" asLink href="/dashboard">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={project.name}
        description="Components hold secrets files and key-value secrets. Associated accounts are shared at the project level."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: project.name },
        ]}
        actions={
          canWrite && selectedTab === 'components' ? (
            <Button variant="primary" size="md" asLink href={`/projects/${projectId}/components/new`}>
              Add Component
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      {permissionInfo && (
        <EffectivePermissionsPanel
          scope="project"
          catalog={permissionInfo.catalog.project}
          effective={permissionInfo.effective}
          className="mb-6"
        />
      )}

      <div className="mb-6">
        <div role="tablist" aria-label="Project data" className="segmented-control">
          {(
            [
              { id: 'components' as const, label: 'Components' },
              { id: 'accounts' as const, label: 'Accounts' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selectedTab === tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium motion-colors ${
                selectedTab === tab.id
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {selectedTab === 'components' && (
        <>
          {componentsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : components.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {components.map((component) => (
                <Link
                  key={component._id}
                  href={`/projects/${projectId}/components/${component._id}`}
                  className="panel block p-5 transition-colors hover:border-[var(--accent)]/40"
                >
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{component.name}</h3>
                  {component.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{component.description}</p>
                  )}
                  <p className="mt-4 text-xs text-[var(--text-muted)]">
                    Updated {new Date(component.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-[var(--text-secondary)]">No components yet. Add one to start managing secrets files and secrets.</p>
              {canWrite && (
                <Button variant="primary" size="lg" asLink href={`/projects/${projectId}/components/new`} className="mt-4">
                  Add the first component
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
                Add Account
              </Button>
            )}
          </div>

          {accountFormOpen && (
            <div className="content-section mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {editingAccount ? 'Edit Associated Account' : 'Add Associated Account'}
                </h3>
                <button onClick={closeAccountForm} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Label</label>
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
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Provider</label>
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
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Provider Name</label>
                    <input
                      type="text"
                      value={accountProviderOther}
                      onChange={(e) => setAccountProviderOther(e.target.value)}
                      className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      required
                      maxLength={50}
                    />
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Email / Username</label>
                    <input
                      type="text"
                      value={accountEmail}
                      onChange={(e) => setAccountEmail(e.target.value)}
                      className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      required
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Login URL (optional)</label>
                    <input
                      type="url"
                      value={accountLoginUrl}
                      onChange={(e) => setAccountLoginUrl(e.target.value)}
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
                    <span className="text-sm font-medium text-[var(--foreground)]">This account uses SSO</span>
                  </label>
                  {accountUsesSSO && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">SSO Provider</label>
                      <input
                        type="text"
                        value={accountSsoProvider}
                        onChange={(e) => setAccountSsoProvider(e.target.value)}
                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        required={accountUsesSSO}
                        maxLength={100}
                      />
                    </div>
                  )}
                </div>

                {!accountUsesSSO && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Password</label>
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
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Notes (optional)</label>
                  <textarea
                    value={accountNotes}
                    onChange={(e) => setAccountNotes(e.target.value)}
                    rows={3}
                    className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <Button type="button" variant="outline" size="md" onClick={closeAccountForm} disabled={submittingAccount}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={
                      submittingAccount ||
                      !accountLabel.trim() ||
                      !accountEmail.trim() ||
                      (editingAccount ? !accountFormDirty : false)
                    }
                  >
                    {submittingAccount ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {accounts.length > 0 ? (
            <div className="data-table-wrap">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Label</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Provider</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Email / Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Auth</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                  {accounts.map((account) => (
                    <tr key={account._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground)]">{account.label}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {formatProvider(account.provider, account.providerOther)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">{account.email}</td>
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
                            <button onClick={() => void handleViewAccount(account)} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                              View
                            </button>
                          )}
                          {canWrite && (
                            <>
                              <button onClick={() => void handleEditAccount(account)} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                                Edit
                              </button>
                              <button onClick={() => void handleDeleteAccount(account._id)} className="text-[var(--error)] hover:text-[#F85149] transition-colors">
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
            <div className="empty-state">
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

      {sensitiveModal && (
        <SensitiveValueModal
          title={sensitiveModal.title}
          fields={sensitiveModal.fields}
          loading={sensitiveModal.loading}
          error={sensitiveModal.error}
          onClose={() => setSensitiveModal(null)}
        />
      )}
    </>
  );
}
