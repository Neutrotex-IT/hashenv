'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  // Settings state
  const [flushDuration, setFlushDuration] = useState<number | null>(null);
  const [panicButton, setPanicButton] = useState({
    flushEnvs: false,
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
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to load settings');
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
      
      // Update auth context if needed
      if (user) {
        user.name = updatedProfile.name;
        user.username = updatedProfile.username;
      }
    } catch (err: any) {
      toastError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate flush duration (only if not null/empty)
    if (flushDuration !== null && flushDuration !== undefined && (flushDuration < 1 || flushDuration > 1000)) {
      toastError('Flush duration must be between 1 and 1000 hours, or empty to disable');
      return;
    }

    setSaving(true);

    try {
      await settingsAPI.update({
        flushDuration: flushDuration === null || flushDuration === undefined || flushDuration === 0 ? null : flushDuration,
        panicButton,
      });
      toastSuccess('Settings saved successfully');
    } catch (err: any) {
      toastError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="p-6 lg:p-8">
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
        <div className="p-6 lg:p-8">
          <div className="mb-6">
            <Link href="/dashboard" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Settings</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Manage your account settings and preferences</p>
          </div>

          {/* Profile Section */}
          <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-[var(--text-muted)] cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Email cannot be changed
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <Button type="submit" variant="primary" size="md" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </div>

          {/* Flush Duration Section */}
          <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">Auto-Flush Environment Files</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Automatically delete all environment files across all your projects at a specified interval.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Flush Duration (hours)
                </label>
                <input
                  type="number"
                  value={flushDuration || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === null || value === undefined) {
                      setFlushDuration(null);
                    } else {
                      const numValue = parseInt(value);
                      if (!isNaN(numValue)) {
                        setFlushDuration(Math.min(Math.max(numValue, 1), 1000));
                      }
                    }
                  }}
                  min="1"
                  max="1000"
                  placeholder="Enter hours (leave empty to disable)"
                  className="block w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Set the time interval (in hours) for automatic deletion. Must be between 1 and 1000 hours, or leave empty to disable auto-flush.
                </p>
              </div>
            </form>
          </div>

          {/* Panic Button Settings */}
          <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Panic Button Settings</h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Configure what happens when you press the panic button. Use this in emergency situations.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={panicButton.flushEnvs}
                    onChange={(e) => setPanicButton({ ...panicButton, flushEnvs: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Flush Envs Immediately</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={panicButton.revokeCollaborators}
                    onChange={(e) => setPanicButton({ ...panicButton, revokeCollaborators: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Revoke All Collaborator Access</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={panicButton.downloadEnvs}
                    onChange={(e) => setPanicButton({ ...panicButton, downloadEnvs: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Download All Envs</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={panicButton.askConfirmation}
                    onChange={(e) => setPanicButton({ ...panicButton, askConfirmation: e.target.checked })}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">Ask confirmation after panic button</span>
                </label>
                <p className="mt-1 text-xs text-[var(--text-muted)] ml-7">
                  If checked, a confirmation dialog will appear before executing panic actions.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border)]">
                <Button type="submit" variant="primary" size="md" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
