'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  projectsAPI,
  componentsAPI,
  secretFilesAPI,
  secretsAPI,
  ProjectPermissionsResponse,
  ProjectComponent,
  SecretFileVersion,
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { UploadSecretFileButton } from '@/components/ui/UploadSecretFileButton';
import { SecretFileCompareModal } from '@/components/ui/SecretFileCompareModal';
import { canReadProject, canWriteProject } from '@/lib/permissions';
import { Skeleton, SkeletonCard, SkeletonDataTable } from '@/components/ui/Skeleton';
import { SensitiveValueModal, SensitiveField } from '@/components/ui/SensitiveValueModal';
import { EffectivePermissionsPanel } from '@/components/ui/EffectivePermissionsPanel';
import { formatEnvLabel } from '@/lib/environments';
import { getLastEnvironment, setLastEnvironment } from '@/lib/lastEnvironment';
import { formatSecretFileType } from '@/lib/secretFiles';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { useProjectEnvironments } from '@/hooks/queries/useProjectEnvironments';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

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

export default function ComponentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const componentId = params.componentId as string;

  const [project, setProject] = useState<{ _id: string; name: string } | null>(null);
  const [component, setComponent] = useState<ProjectComponent | null>(null);
  const [permissionInfo, setPermissionInfo] = useState<ProjectPermissionsResponse | null>(null);
  const [secretFileVersions, setSecretFileVersions] = useState<SecretFileVersion[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [selectedTab, setSelectedTab] = useState<'secretFiles' | 'secrets'>('secretFiles');
  const [selectedEnv, setSelectedEnv] = useState('dev');
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [error, setError] = useState('');

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFileName, setCompareFileName] = useState('');
  const [compareInitialFrom, setCompareInitialFrom] = useState<number | undefined>();
  const [compareInitialTo, setCompareInitialTo] = useState<number | undefined>();

  const [secretFormOpen, setSecretFormOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [secretName, setSecretName] = useState('');
  const [secretContent, setSecretContent] = useState('');
  const [secretSnapshot, setSecretSnapshot] = useState<{ name: string; content: string } | null>(null);
  const [submittingSecret, setSubmittingSecret] = useState(false);

  const [editComponentOpen, setEditComponentOpen] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [componentDescription, setComponentDescription] = useState('');
  const [submittingComponent, setSubmittingComponent] = useState(false);

  const [sensitiveModal, setSensitiveModal] = useState<{
    title: string;
    fields: SensitiveField[];
    loading?: boolean;
    error?: string;
  } | null>(null);

  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const { data: projectEnvironments = [] } = useProjectEnvironments(projectId);

  const envSlugs = useMemo(
    () => (projectEnvironments.length > 0 ? projectEnvironments.map((e) => e.slug) : ['dev', 'staging', 'prod']),
    [projectEnvironments]
  );

  const rememberEnvironment = useCallback(
    (environment: string) => {
      if (envSlugs.includes(environment)) {
        setLastEnvironment(projectId, componentId, environment);
      }
    },
    [projectId, componentId, envSlugs]
  );

  const selectEnvironment = useCallback(
    (slug: string) => {
      if (slug !== selectedEnv) {
        setVersionsLoading(true);
      }
      setSelectedEnv(slug);
      rememberEnvironment(slug);
    },
    [selectedEnv, rememberEnvironment]
  );

  const effectivePermissions = permissionInfo?.effective ?? [];
  const canRead = canReadProject(effectivePermissions);
  const canWrite = canWriteProject(effectivePermissions);

  const secretFormDirty = Boolean(
    editingSecret &&
      secretSnapshot &&
      (secretName !== secretSnapshot.name || secretContent !== secretSnapshot.content)
  );

  const filteredVersions = useMemo(
    () =>
      secretFileVersions
        .filter((v) => v.environment === selectedEnv)
        .sort((a, b) => {
          const nameCmp = a.fileName.localeCompare(b.fileName);
          if (nameCmp !== 0) return nameCmp;
          return b.version - a.version;
        }),
    [secretFileVersions, selectedEnv]
  );

  const versionsByFile = useMemo(() => {
    const map = new Map<string, SecretFileVersion[]>();
    for (const version of filteredVersions) {
      const list = map.get(version.fileName) ?? [];
      list.push(version);
      map.set(version.fileName, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => b.version - a.version);
    }
    return map;
  }, [filteredVersions]);

  const loadCore = useCallback(async () => {
    try {
      const [projectData, componentData, permissionsData] = await Promise.all([
        queryClient.getQueryData(queryKeys.project(projectId)) ?? projectsAPI.get(projectId),
        componentsAPI.get(projectId, componentId),
        queryClient.getQueryData(queryKeys.projectPermissions(projectId)) ??
          projectsAPI.getPermissions(projectId),
      ]);
      setProject(projectData as { _id: string; name: string });
      setComponent(componentData);
      setPermissionInfo(permissionsData as ProjectPermissionsResponse);
      setComponentName(componentData.name);
      setComponentDescription(componentData.description ?? '');
      setError('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
      const status = axiosErr.response?.status;
      if (status === 403) {
        setError('Access denied: You do not have permission to access this component.');
      } else if (status === 404) {
        setError('Component not found.');
      } else {
        setError(axiosErr.response?.data?.error || 'Failed to load component');
      }
      setComponent(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, componentId, queryClient]);

  const loadVersions = useCallback(async () => {
    if (!component) return;
    setVersionsLoading(true);
    try {
      const data = await secretFilesAPI.listVersions(projectId, componentId, selectedEnv);
      setSecretFileVersions(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status !== 403) {
        console.error('Failed to load secret file versions:', err);
      }
      setSecretFileVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [component, projectId, componentId, selectedEnv]);

  const loadSecrets = useCallback(async () => {
    if (!component) return;
    try {
      const data = await secretsAPI.list(projectId, componentId);
      setSecrets(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status !== 403) {
        console.error('Failed to load secrets:', err);
      }
      setSecrets([]);
    }
  }, [component, projectId, componentId]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    const envParam = searchParams.get('environment');
    if (envParam && envSlugs.includes(envParam)) {
      setSelectedEnv(envParam);
      rememberEnvironment(envParam);
      router.replace(`/projects/${projectId}/components/${componentId}`, { scroll: false });
      return;
    }

    const saved = getLastEnvironment(projectId, componentId);
    if (saved && envSlugs.includes(saved)) {
      setSelectedEnv(saved);
      return;
    }

    setSelectedEnv(envSlugs[0] ?? 'dev');
  }, [searchParams, envSlugs, projectId, componentId, router, rememberEnvironment]);

  useEffect(() => {
    if (!component) return;
    if (selectedTab === 'secretFiles') {
      void loadVersions();
    } else {
      void loadSecrets();
    }
  }, [component, selectedTab, loadVersions, loadSecrets]);

  const handleDownload = async (version: SecretFileVersion) => {
    rememberEnvironment(version.environment);
    try {
      await secretFilesAPI.download(
        projectId,
        componentId,
        version.environment,
        version.fileName,
        version.version
      );
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to download secrets file');
    }
  };

  const handleViewFile = async (version: SecretFileVersion) => {
    rememberEnvironment(version.environment);
    const displayName = version.label?.trim() || version.fileName;
    const title = `${displayName} v${version.version}`;
    setSensitiveModal({ title, fields: [], loading: true });
    try {
      const data = await secretFilesAPI.getFileContent(projectId, componentId, version._id);
      setSensitiveModal({
        title,
        fields: [{ label: 'Content', value: data.content, sensitive: true, multiline: true }],
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSensitiveModal({
        title,
        fields: [],
        error: axiosErr.response?.data?.error || 'Failed to load secrets file',
      });
    }
  };

  const handleRollback = async (version: SecretFileVersion) => {
    const displayName = version.label?.trim() || version.fileName;
    const ok = await confirm({
      title: `Rollback ${displayName} to version ${version.version}?`,
      message: `This creates a new version with the content from v${version.version}. Current history is preserved.`,
      confirmLabel: 'Rollback',
      variant: 'danger',
    });
    if (!ok) return;
    rememberEnvironment(version.environment);
    try {
      await secretFilesAPI.rollback(
        projectId,
        componentId,
        version.environment,
        version.fileName,
        version.version
      );
      toastSuccess(`Rolled back to version ${version.version}`);
      void loadVersions();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to rollback');
    }
  };

  const handleDeleteVersion = async (version: SecretFileVersion) => {
    const displayName = version.label?.trim() || version.fileName;
    const ok = await confirm({
      title: `Delete ${displayName} v${version.version}?`,
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    rememberEnvironment(version.environment);
    try {
      await secretFilesAPI.delete(projectId, componentId, version._id);
      toastSuccess('Version deleted');
      void loadVersions();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to delete file');
    }
  };

  const openCompare = (fileName: string, fromVersion?: number, toVersion?: number) => {
    rememberEnvironment(selectedEnv);
    setCompareFileName(fileName);
    setCompareInitialFrom(fromVersion);
    setCompareInitialTo(toVersion);
    setCompareOpen(true);
  };

  const closeCompare = () => {
    setCompareOpen(false);
    setCompareFileName('');
    setCompareInitialFrom(undefined);
    setCompareInitialTo(undefined);
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretName.trim() || !secretContent.trim()) {
      toastError('Secret name and content are required');
      return;
    }
    setSubmittingSecret(true);
    try {
      if (editingSecret) {
        await secretsAPI.update(projectId, componentId, editingSecret._id, {
          name: secretName.trim(),
          content: secretContent.trim(),
        });
      } else {
        await secretsAPI.create(projectId, componentId, {
          name: secretName.trim(),
          content: secretContent.trim(),
        });
      }
      setSecretFormOpen(false);
      setEditingSecret(null);
      setSecretName('');
      setSecretContent('');
      setSecretSnapshot(null);
      void loadSecrets();
      toastSuccess(editingSecret ? 'Secret updated' : 'Secret created');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; errors?: Array<{ msg: string }> } } };
      toastError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.errors?.[0]?.msg ||
          'Failed to save secret'
      );
    } finally {
      setSubmittingSecret(false);
    }
  };

  const handleEditSecret = async (secret: Secret) => {
    try {
      const secretData = await secretsAPI.get(projectId, componentId, secret._id);
      setEditingSecret(secret);
      setSecretName(secretData.name);
      setSecretContent(secretData.content);
      setSecretSnapshot({ name: secretData.name, content: secretData.content });
      setSecretFormOpen(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to load secret');
    }
  };

  const handleDeleteSecret = async (secretId: string) => {
    const ok = await confirm({
      title: 'Delete secret?',
      message: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await secretsAPI.delete(projectId, componentId, secretId);
      toastSuccess('Secret deleted');
      void loadSecrets();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to delete secret');
    }
  };

  const handleViewSecret = async (secret: Secret) => {
    setSensitiveModal({ title: secret.name, fields: [], loading: true });
    try {
      const secretData = await secretsAPI.get(projectId, componentId, secret._id);
      setSensitiveModal({
        title: secretData.name,
        fields: [{ label: 'Content', value: secretData.content, sensitive: true }],
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setSensitiveModal({
        title: secret.name,
        fields: [],
        error: axiosErr.response?.data?.error || 'Failed to load secret',
      });
    }
  };

  const handleDownloadSecret = async (secret: Secret) => {
    try {
      const secretData = await secretsAPI.get(projectId, componentId, secret._id);
      const fileContent = `${secretData.name}=${secretData.content}`;
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'secret.txt');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to download secret');
    }
  };

  const handleUpdateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!componentName.trim()) {
      toastError('Component name is required');
      return;
    }
    setSubmittingComponent(true);
    try {
      const updated = await componentsAPI.update(projectId, componentId, {
        name: componentName.trim(),
        description: componentDescription.trim() || undefined,
      });
      setComponent(updated);
      setEditComponentOpen(false);
      toastSuccess('Component updated');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to update component');
    } finally {
      setSubmittingComponent(false);
    }
  };

  const handleDeleteComponent = async () => {
    const ok = await confirm({
      title: 'Delete component?',
      message: 'All secrets files and secrets in this component will be deleted. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await componentsAPI.delete(projectId, componentId);
      toastSuccess('Component deleted');
      router.push(`/projects/${projectId}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to delete component');
    }
  };

  if (loading) {
    return (
      <>
        <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
        <SkeletonCard />
      </>
    );
  }

  if (!component || !project) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Component Not Found</h2>
          <p className="text-[var(--text-secondary)] mb-6">{error || 'This component does not exist or you do not have access.'}</p>
          <Button variant="primary" size="md" asLink href={`/projects/${projectId}`}>
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

  const compareVersions = compareFileName ? versionsByFile.get(compareFileName) ?? [] : [];

  return (
    <>
      <PageHeader
        title={component.name}
        description={component.description || 'Secrets files and key-value secrets for this component.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: project.name, href: `/projects/${projectId}` },
          { label: component.name },
        ]}
        actions={
          canWrite ? (
            <>
              <Button variant="outline" size="md" onClick={() => setEditComponentOpen(true)}>
                Edit
              </Button>
              <Button variant="outline" size="md" onClick={() => void handleDeleteComponent()}>
                Delete
              </Button>
            </>
          ) : undefined
        }
      />

      {permissionInfo && (
        <EffectivePermissionsPanel
          scope="project"
          catalog={permissionInfo.catalog.project}
          effective={permissionInfo.effective}
          className="mb-6"
        />
      )}

      <div className="mb-6">
        <div role="tablist" aria-label="Component data" className="segmented-control">
          {(
            [
              { id: 'secretFiles' as const, label: 'Secret files' },
              { id: 'secrets' as const, label: 'Other secrets' },
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

      {selectedTab === 'secretFiles' && (
        <>
          <div className="mb-6 border-b border-[var(--border)]">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {envSlugs.map((slug) => (
                <button
                  key={slug}
                  onClick={() => selectEnvironment(slug)}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium motion-colors ${
                    selectedEnv === slug
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {formatEnvLabel(slug)}
                </button>
              ))}
            </nav>
            {canWrite && (
              <Link
                href={`/projects/${projectId}/environments`}
                className="text-xs text-[var(--accent)] hover:underline mt-2 inline-block"
              >
                Manage environments
              </Link>
            )}
          </div>

          <div className="mb-6 flex min-h-10 items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-[var(--text-muted)]">
              {versionsLoading ? (
                <Skeleton variant="text" width={200} height={14} />
              ) : (
                <>
                  {filteredVersions.length} {filteredVersions.length === 1 ? 'version' : 'versions'} in{' '}
                  {formatEnvLabel(selectedEnv)}
                  <span className="mt-1 block text-xs">
                    Only the last 20 versions per file are kept; older versions are removed automatically.
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canWrite && (
                <UploadSecretFileButton
                  projectId={projectId}
                  componentId={componentId}
                  environment={selectedEnv}
                  variant="secondary"
                  size="lg"
                  label="Upload secrets file"
                />
              )}
              {canRead && (
                <Button variant="outline" size="md" asLink href={`/projects/${projectId}/activity`}>
                  Activity
                </Button>
              )}
            </div>
          </div>

          <div
            className={`data-table-wrap${
              versionsLoading ? ' is-loading' : filteredVersions.length === 0 ? ' is-settled-empty' : ''
            }`}
            aria-busy={versionsLoading}
          >
            <div className="data-panel-swap">
              {versionsLoading ? (
                <SkeletonDataTable
                  columns={[
                    { key: 'fileName', width: 160 },
                    { key: 'type', width: 80 },
                    { key: 'version', width: 56 },
                    { key: 'uploadedBy', width: 112 },
                    { key: 'date', width: 144 },
                    { key: 'actions', width: 72, align: 'right' },
                  ]}
                />
              ) : filteredVersions.length > 0 ? (
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--surface-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        File
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Uploaded by
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
                    {filteredVersions.map((version) => {
                      const fileVersions = versionsByFile.get(version.fileName) ?? [];
                      const latestForFile = fileVersions[0];
                      return (
                        <tr key={version._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                          <td className="max-w-xs px-6 py-4 text-sm text-[var(--foreground)]">
                            <div className="font-medium">
                              {version.label?.trim() || version.fileName}
                            </div>
                            {version.label?.trim() ? (
                              <div className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
                                {version.fileName}
                              </div>
                            ) : null}
                            {version.description?.trim() ? (
                              <div className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                                {version.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {formatSecretFileType(version.fileType)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--foreground)]">
                            {version.version}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {typeof version.uploadedBy === 'object' ? version.uploadedBy.name : 'Unknown'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                            {new Date(version.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                              {canRead && (
                                <>
                                  <button
                                    onClick={() => void handleViewFile(version)}
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => void handleDownload(version)}
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    Download
                                  </button>
                                </>
                              )}
                              {canRead && fileVersions.length >= 2 && (
                                <button
                                  onClick={() =>
                                    openCompare(
                                      version.fileName,
                                      version.version !== latestForFile?.version ? version.version : undefined,
                                      latestForFile?.version
                                    )
                                  }
                                  className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                >
                                  {version.version !== latestForFile?.version ? 'Compare with latest' : 'Compare'}
                                </button>
                              )}
                              {canWrite &&
                                latestForFile &&
                                version.version !== latestForFile.version && (
                                  <button
                                    onClick={() => void handleRollback(version)}
                                    className="text-[var(--warning)] hover:opacity-80 transition-colors"
                                  >
                                    Rollback
                                  </button>
                                )}
                              {canWrite && (
                                <>
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/projects/${projectId}/components/${componentId}/secret-files/edit/${version._id}?environment=${encodeURIComponent(selectedEnv)}&fileName=${encodeURIComponent(version.fileName)}&version=${version.version}`
                                      )
                                    }
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteVersion(version)}
                                    className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[var(--text-secondary)]">
                    No secrets files uploaded for {formatEnvLabel(selectedEnv)} yet.
                  </p>
                  {canWrite && (
                    <UploadSecretFileButton
                      projectId={projectId}
                      componentId={componentId}
                      environment={selectedEnv}
                      variant="primary"
                      size="lg"
                      label="Upload the first secrets file"
                      className="mt-4"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {selectedTab === 'secrets' && (
        <>
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'}
            </p>
            {canWrite && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setEditingSecret(null);
                  setSecretName('');
                  setSecretContent('');
                  setSecretSnapshot(null);
                  setSecretFormOpen(true);
                }}
              >
                Add Secret
              </Button>
            )}
          </div>

          {secretFormOpen && (
            <div className="content-section mb-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  {editingSecret ? 'Edit Secret' : 'Create New Secret'}
                </h3>
                <button
                  onClick={() => {
                    setSecretFormOpen(false);
                    setEditingSecret(null);
                    setSecretName('');
                    setSecretContent('');
                    setSecretSnapshot(null);
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateSecret} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Secret Name</label>
                  <input
                    type="text"
                    value={secretName}
                    onChange={(e) => setSecretName(e.target.value)}
                    placeholder="e.g., API_KEY, DATABASE_URL"
                    className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Secret Content</label>
                  <textarea
                    value={secretContent}
                    onChange={(e) => setSecretContent(e.target.value)}
                    placeholder="Enter secret value..."
                    rows={6}
                    className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] font-mono text-sm"
                    required
                    maxLength={50 * 1024}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setSecretFormOpen(false);
                      setEditingSecret(null);
                      setSecretName('');
                      setSecretContent('');
                      setSecretSnapshot(null);
                    }}
                    disabled={submittingSecret}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={
                      submittingSecret ||
                      !secretName.trim() ||
                      !secretContent.trim() ||
                      (editingSecret ? !secretFormDirty : false)
                    }
                  >
                    {submittingSecret ? 'Saving...' : editingSecret ? 'Update Secret' : 'Create Secret'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {secrets.length > 0 ? (
            <div className="data-table-wrap">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Updated</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                  {secrets.map((secret) => (
                    <tr key={secret._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[var(--foreground)]">{secret.name}</td>
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
                              <button onClick={() => void handleDownloadSecret(secret)} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                                Download
                              </button>
                              <button onClick={() => void handleViewSecret(secret)} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                                View
                              </button>
                            </>
                          )}
                          {canWrite && (
                            <>
                              <button onClick={() => void handleEditSecret(secret)} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
                                Edit
                              </button>
                              <button onClick={() => void handleDeleteSecret(secret._id)} className="text-[var(--error)] hover:text-[#F85149] transition-colors">
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

      {editComponentOpen && (
        <div className="content-section mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit Component</h3>
            <button onClick={() => setEditComponentOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleUpdateComponent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Name</label>
              <input
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                required
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Description (optional)</label>
              <textarea
                value={componentDescription}
                onChange={(e) => setComponentDescription(e.target.value)}
                rows={3}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <Button type="button" variant="outline" size="md" onClick={() => setEditComponentOpen(false)} disabled={submittingComponent}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={submittingComponent || !componentName.trim()}>
                {submittingComponent ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {compareOpen && compareVersions.length >= 2 && (
        <SecretFileCompareModal
          projectId={projectId}
          componentId={componentId}
          environment={selectedEnv}
          fileName={compareFileName}
          versions={compareVersions}
          initialFromVersion={compareInitialFrom}
          initialToVersion={compareInitialTo}
          onClose={closeCompare}
        />
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
