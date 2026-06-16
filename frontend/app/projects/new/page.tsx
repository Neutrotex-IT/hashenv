'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { projectsAPI, Organization } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { CreateOrganizationModal } from '@/components/CreateOrganizationModal';

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { organizations, currentOrg } = useOrganization();
  const [name, setName] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrg?._id || '');
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentOrg?._id) {
      setSelectedOrgId(currentOrg._id);
    }
  }, [currentOrg?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const orgId = selectedOrgId || currentOrg?._id;
    if (!orgId) {
      setError('Please select an organization');
      return;
    }
    
    setLoading(true);

    try {
      const project = await projectsAPI.create({ name, organizationId: orgId });
      router.push(`/projects/${project._id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6">
              <Link
                href="/dashboard"
                className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Create New Project</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Create a new project to manage environment files</p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <div>
                <label htmlFor="org" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Organization
                </label>
                <select
                  id="org"
                  value={selectedOrgId || currentOrg?._id || ''}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  required
                >
                  {organizations.map((org: Organization) => (
                    <option key={org._id} value={org._id}>
                      {org.name} {org.type === 'personal' ? '(Personal)' : '(Team)'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCreateOrgModalOpen(true)}
                  className="mt-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  + Create new organization
                </button>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Project Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  required
                  placeholder="Enter project name"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  size="md"
                  asLink
                  href="/dashboard"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>

            <CreateOrganizationModal
              isOpen={createOrgModalOpen}
              onClose={() => setCreateOrgModalOpen(false)}
            />
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
