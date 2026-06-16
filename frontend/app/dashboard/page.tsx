'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { projectsAPI, settingsAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { CreateProjectButton } from '@/components/ui/CreateProjectButton';
import { ProjectCard } from '@/components/ProjectCard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { OrgSwitcher } from '@/components/OrgSwitcher';

interface Project {
  _id: string;
  name: string;
  organizationId?: {
    _id: string;
    name: string;
    slug: string;
    type: 'personal' | 'team';
  };
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panicButtonSettings, setPanicButtonSettings] = useState<any>(null);
  const [panicLoading, setPanicLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.list(currentOrg?._id);
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [currentOrg?._id]);

  useEffect(() => {
    loadProjects();
    loadPanicSettings();
  }, [loadProjects]);

  const loadPanicSettings = async () => {
    try {
      const settings = await settingsAPI.get();
      setPanicButtonSettings(settings.panicButton);
    } catch (err) {
      console.error('Failed to load panic button settings:', err);
    }
  };

  const handlePanicButton = async () => {
    if (!panicButtonSettings) {
      alert('Panic button not configured. Please configure it in Settings.');
      return;
    }

    const { flushEnvs, revokeCollaborators, downloadEnvs, askConfirmation } = panicButtonSettings;

    if (!flushEnvs && !revokeCollaborators && !downloadEnvs) {
      alert('No panic actions configured. Please configure panic button settings first.');
      return;
    }

    // Show confirmation if enabled
    if (askConfirmation) {
      const confirmMessage = `Are you sure you want to execute panic actions?\n\n` +
        `${downloadEnvs ? '• Download all environment files\n' : ''}` +
        `${flushEnvs ? '• Delete all environment files\n' : ''}` +
        `${revokeCollaborators ? '• Revoke all collaborator access\n' : ''}`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    setPanicLoading(true);
    try {
      const result = await settingsAPI.panic();

      // Handle download if enabled
      if (result.results?.downloadEnvs && result.results?.downloadContent) {
        const blob = new Blob([result.results.downloadContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', result.results.downloadFilename || 'hashenv-backup.txt');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      // Show success message
      const actions = [];
      if (result.results?.downloadEnvs) actions.push('downloaded');
      if (result.results?.flushEnvs) actions.push('flushed');
      if (result.results?.revokeCollaborators) actions.push('collaborators revoked');

      alert(`Panic actions executed successfully!\n\nActions: ${actions.join(', ')}`);
      
      // Reload projects to reflect changes
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to execute panic actions');
    } finally {
      setPanicLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          {/* Panic Button - Top of Dashboard */}
          <div className="mb-6 flex justify-end">
            <Button
              variant="danger"
              size="md"
              onClick={handlePanicButton}
              disabled={panicLoading || !panicButtonSettings}
              className="flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {panicLoading ? 'Processing...' : 'Panic Button'}
            </Button>
          </div>

          {/* Header Section */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <OrgSwitcher />
              <div>
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {currentOrg ? `Projects in ${currentOrg.name}` : 'Manage your environment files'}
                </p>
              </div>
            </div>
            <CreateProjectButton size="lg" />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Total Projects</p>
                  <p className="text-2xl font-bold text-[var(--foreground)] mt-1">{projects.length}</p>
                </div>
                <div className="rounded-lg bg-[var(--accent)]/20 p-3">
                  <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">My Projects</p>
                  <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
                    {projects.filter(p => p.createdBy._id === user?.id).length}
                  </p>
                </div>
                <div className="rounded-lg bg-green-500/20 p-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Member Of</p>
                  <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
                    {projects.filter(p => 
                      p.members.some(m => m.userId._id === user?.id) && 
                      p.createdBy._id !== user?.id
                    ).length}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-500/20 p-3">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}

          {/* Projects Grid */}
          {loading ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <Skeleton variant="rectangular" height={28} width={150} />
                <Skeleton variant="rectangular" height={20} width={100} />
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <svg className="mx-auto h-16 w-16 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-4 text-xl font-semibold text-[var(--foreground)]">No projects found</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)] max-w-md mx-auto">
                Get started by creating your first project. You can then upload environment files for dev, staging, and production.
              </p>
              <div className="mt-6">
                <CreateProjectButton size="lg" />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">All Projects</h2>
                <span className="text-sm text-[var(--text-muted)]">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard 
                    key={project._id} 
                    project={project}
                    onRefresh={loadProjects}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
