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
  const [panicButton, setPanicButton] = useState({
    flushEnvs: false,
    flushSecrets: false,
    revokeApiTokens: false,
    revokeCollaborators: false,
    downloadEnvs: false,
    askConfirmation: true,
  });

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
      setFlushDuration(settings.flushDuration || null);
      if (settings.panicButton) {
        setPanicButton(settings.panicButton);
      }
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
      await settingsAPI.update({
        flushDuration:
          flushDuration === null || flushDuration === undefined || flushDuration === 0
            ? null
            : flushDuration,
        panicButton,
      });
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
          <div className="mx-auto max-w-6xl p-6 lg:p-8">
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
        <div className="mx-auto max-w-6xl p-6 lg:p-8">
          <PageHeader
            title="Account settings"
            description="Profile, automation, and emergency actions for your account."
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
                <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
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
                      <Button type="submit" variant="primary" size="md" disabled={saving}>
                        {saving ? 'Saving...' : 'Save profile'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {activeSection === 'auto-flush' && (
                <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    Auto-flush environment files
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Automatically delete all environment files across your projects at a set
                    interval.
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
                      <Button type="submit" variant="primary" size="md" disabled={saving}>
                        {saving ? 'Saving...' : 'Save auto-flush'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {activeSection === 'panic' && (
                <section className="rounded-lg border border-[var(--error)]/30 bg-[var(--surface)] p-6">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">
                    Panic button
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Configure what runs when you trigger the panic button from the dashboard.
                    Your password is always required server-side.
                  </p>
                  <form onSubmit={handleSaveSettings} className="mt-6 space-y-4">
                    <div className="space-y-3">
                      {[
                        { key: 'flushEnvs' as const, label: 'Flush environment files immediately' },
                        {
                          key: 'flushSecrets' as const,
                          label: 'Flush secrets and associated accounts',
                        },
                        { key: 'revokeApiTokens' as const, label: 'Revoke all API tokens' },
                        {
                          key: 'revokeCollaborators' as const,
                          label: 'Revoke all collaborator access',
                        },
                        { key: 'downloadEnvs' as const, label: 'Download all env files first' },
                      ].map((option) => (
                        <label
                          key={option.key}
                          className="flex cursor-pointer items-center gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={panicButton[option.key]}
                            onChange={(e) =>
                              setPanicButton({ ...panicButton, [option.key]: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                          <span className="text-sm text-[var(--foreground)]">{option.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="border-t border-[var(--border)] pt-4">
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={panicButton.askConfirmation}
                          onChange={(e) =>
                            setPanicButton({
                              ...panicButton,
                              askConfirmation: e.target.checked,
                            })
                          }
                          className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--foreground)]">
                          Ask for confirmation before running
                        </span>
                      </label>
                    </div>

                    <div className="border-t border-[var(--border)] pt-4">
                      <Button type="submit" variant="primary" size="md" disabled={saving}>
                        {saving ? 'Saving...' : 'Save panic settings'}
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
