'use client';

import { useEffect, useState } from 'react';
import { organizationsAPI, PanicButtonSettings } from '@/lib/api';
import { Button } from './Button';
import { shallowRecordEqual } from '@/lib/formUtils';
import { useToast } from '@/contexts/ToastContext';

const PANIC_ACTION_OPTIONS = [
  { key: 'flushEnvs' as const, label: 'Flush environment files immediately' },
  { key: 'flushSecrets' as const, label: 'Flush secrets and associated accounts' },
  { key: 'revokeApiTokens' as const, label: 'Revoke all API tokens' },
  { key: 'revokeCollaborators' as const, label: 'Revoke all collaborator access' },
  {
    key: 'downloadEnvs' as const,
    label: 'Download backup (envs, secrets, accounts) as JSON first',
  },
];

interface OrgPanicSettingsPanelProps {
  orgId: string;
  orgName: string;
  canConfigure: boolean;
}

function describeEnabledActions(panicButton: PanicButtonSettings): string[] {
  const enabled = PANIC_ACTION_OPTIONS.filter((option) => panicButton[option.key]).map(
    (option) => option.label
  );
  if (panicButton.askConfirmation) {
    enabled.push('Ask for confirmation before running');
  }
  return enabled;
}

export function OrgPanicSettingsPanel({
  orgId,
  orgName,
  canConfigure,
}: OrgPanicSettingsPanelProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [panicButton, setPanicButton] = useState<PanicButtonSettings>({
    flushEnvs: false,
    flushSecrets: false,
    revokeApiTokens: false,
    revokeCollaborators: false,
    downloadEnvs: false,
    askConfirmation: true,
  });
  const [savedPanicButton, setSavedPanicButton] = useState<PanicButtonSettings>(panicButton);
  const [canExecute, setCanExecute] = useState(false);
  const [eligibleProjectCount, setEligibleProjectCount] = useState(0);

  const panicDirty = !shallowRecordEqual(panicButton, savedPanicButton);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await organizationsAPI.getSettings(orgId);
        setPanicButton(data.panicButton);
        setSavedPanicButton(data.panicButton);
        setCanExecute(data.canExecute);
        setEligibleProjectCount(data.eligibleProjectCount);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        toastError(axiosErr.response?.data?.error || 'Failed to load panic settings');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orgId, toastError]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigure) return;

    setSaving(true);
    try {
      const updated = await organizationsAPI.updateSettings(orgId, { panicButton });
      setPanicButton(updated.panicButton);
      setSavedPanicButton(updated.panicButton);
      toastSuccess('Panic settings saved');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to save panic settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 animate-pulse py-6">
        <div className="h-6 w-40 rounded bg-[var(--surface-elevated)]" />
        <div className="mt-4 h-24 rounded bg-[var(--surface-elevated)]" />
      </div>
    );
  }

  if (!canConfigure && !canExecute) {
    return null;
  }

  const enabledActions = describeEnabledActions(panicButton);

  return (
    <section className="content-section border-t border-[var(--error)]/30">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">Panic button</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Configure what runs when someone triggers the panic button for {orgName}. Actions only
        apply to projects where the user has permission to run panic. Password is always required.
      </p>

      {canExecute && (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          You can run panic on {eligibleProjectCount}{' '}
          {eligibleProjectCount === 1 ? 'project' : 'projects'} in this organization.
        </p>
      )}

      {!canConfigure ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">Configured actions:</p>
          {enabledActions.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-sm text-[var(--foreground)]">
              {enabledActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No panic actions are currently enabled.</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="space-y-3">
            {PANIC_ACTION_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-center gap-3 cursor-pointer">
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
            <label className="flex items-center gap-3 cursor-pointer">
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
            <Button type="submit" variant="primary" size="md" disabled={saving || !panicDirty}>
              {saving ? 'Saving...' : 'Save panic settings'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
