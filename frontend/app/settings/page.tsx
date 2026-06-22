'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsNav } from '@/components/ui/SettingsNav';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  const [flushDuration, setFlushDuration] = useState<number | null>(null);
  const [savedProfile, setSavedProfile] = useState({ name: '', username: '' });
  const [savedFlushDuration, setSavedFlushDuration] = useState<number | null>(null);

  const profileDirty =
    name !== savedProfile.name || username !== savedProfile.username;
  const flushDirty = flushDuration !== savedFlushDuration;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profile, settings] = await Promise.all([
        settingsAPI.getProfile(),
        settingsAPI.get(),
      ]);

      setName(profile.name);
      setUsername(profile.username);
      setEmail(profile.email);
      setSavedProfile({ name: profile.name, username: profile.username });

      const nextFlushDuration = settings.flushDuration || null;
      setFlushDuration(nextFlushDuration);
      setSavedFlushDuration(nextFlushDuration);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updatedProfile = await settingsAPI.updateProfile({ name, username });
      setName(updatedProfile.name);
      setUsername(updatedProfile.username);
      setSavedProfile({ name: updatedProfile.name, username: updatedProfile.username });
      toastSuccess('Profile updated successfully');

      if (user) {
        user.name = updatedProfile.name;
        user.username = updatedProfile.username;
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } };
      };
      toastError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.errors?.[0]?.msg ||
          'Failed to update profile'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      flushDuration !== null &&
      flushDuration !== undefined &&
      (flushDuration < 1 || flushDuration > 1000)
    ) {
      toastError('Flush duration must be between 1 and 1000 hours, or empty to disable');
      return;
    }

    setSaving(true);

    try {
      const nextFlushDuration =
        flushDuration === null || flushDuration === undefined || flushDuration === 0
          ? null
          : flushDuration;

      await settingsAPI.update({
        flushDuration: nextFlushDuration,
      });
      setSavedFlushDuration(nextFlushDuration);
      toastSuccess('Settings saved successfully');
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: string; errors?: Array<{ msg?: string }> } };
      };
      toastError(
        axiosErr.response?.data?.error ||
          axiosErr.response?.data?.errors?.[0]?.msg ||
          'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
        <div className="w-full">
            <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
            <SkeletonCard className="mb-6" />
            <SkeletonCard />
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="w-full">
          <PageHeader
            title="Account settings"
            description="Profile and automation settings for your account."
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Settings' },
            ]}
          />

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <SettingsNav activeId={activeSection} onSelect={setActiveSection} />
            </aside>

            <div className="min-w-0 space-y-8">
              {activeSection === 'profile' && (
                <section>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Profile</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Your public name and username across HashEnv.
                  </p>
                  <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                        Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        required
                        maxLength={100}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                        Username
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                        }
                        className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-z0-9_]+"
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        3-30 characters, lowercase letters, numbers, and underscores only
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="block w-full max-w-md cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[var(--text-muted)]"
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="border-t border-[var(--border)] pt-4">
                      <Button type="submit" variant="primary" size="md" disabled={saving || !profileDirty}>
                        {saving ? 'Saving...' : 'Save profile'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {activeSection === 'auto-flush' && (
                <section>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    Auto-flush environment files
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Automatically delete environment files on projects where you can run panic
                    actions, across all organizations you belong to.
                  </p>
                  <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                        Flush interval (hours)
                      </label>
                      <input
                        type="number"
                        value={flushDuration || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || value === null || value === undefined) {
                            setFlushDuration(null);
                          } else {
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue)) {
                              setFlushDuration(Math.min(Math.max(numValue, 1), 1000));
                            }
                          }
                        }}
                        min="1"
                        max="1000"
                        placeholder="Leave empty to disable"
                        className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                      />
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Between 1 and 1000 hours, or leave empty to disable.
                      </p>
                    </div>
                    <div className="border-t border-[var(--border)] pt-4">
                      <Button type="submit" variant="primary" size="md" disabled={saving || !flushDirty}>
                        {saving ? 'Saving...' : 'Save auto-flush'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
