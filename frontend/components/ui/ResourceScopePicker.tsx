'use client';

import Link from 'next/link';

export interface ResourceOption {
  id: string;
  label: string;
  description?: string;
}

interface ResourceScopePickerProps {
  grantableComponents: ResourceOption[];
  grantableAccounts: ResourceOption[];
  resourceAccess: 'full' | 'restricted';
  selectedComponentIds: string[];
  selectedAccountIds: string[];
  onResourceAccessChange: (mode: 'full' | 'restricted') => void;
  onComponentIdsChange: (ids: string[]) => void;
  onAccountIdsChange: (ids: string[]) => void;
  disabled?: boolean;
  radioName?: string;
  projectId?: string;
  loading?: boolean;
}

function ResourceChecklist({
  title,
  options,
  selected,
  onChange,
  disabled,
  emptyMessage,
}: {
  title: string;
  options: ResourceOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  emptyMessage: string;
}) {
  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((item) => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">{title}</p>
      {options.length === 0 ? (
        <p className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] p-3 text-sm text-[var(--text-muted)]">
          {emptyMessage}
        </p>
      ) : (
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] p-3">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 text-sm text-[var(--foreground)] ${
                disabled ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                disabled={disabled}
                onChange={() => toggle(option.id)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span className="block text-xs text-[var(--text-muted)]">{option.description}</span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function ResourceScopePicker({
  grantableComponents,
  grantableAccounts,
  resourceAccess,
  selectedComponentIds,
  selectedAccountIds,
  onResourceAccessChange,
  onComponentIdsChange,
  onAccountIdsChange,
  disabled = false,
  radioName = 'resourceAccess',
  projectId,
  loading = false,
}: ResourceScopePickerProps) {
  const hasAnyResources = grantableComponents.length > 0 || grantableAccounts.length > 0;
  const componentEmptyMessage = projectId
    ? 'No components in this project yet.'
    : 'No components available to assign.';
  const accountEmptyMessage = projectId
    ? 'No associated accounts in this project yet.'
    : 'No accounts available to assign.';

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Resource access</label>
        <div className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-hover)] p-3">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--foreground)]">
            <input
              type="radio"
              name={radioName}
              checked={resourceAccess === 'full'}
              disabled={disabled || loading}
              onChange={() => onResourceAccessChange('full')}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Full project</span>
              <span className="block text-xs text-[var(--text-muted)]">
                Access all current and future components and accounts.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--foreground)]">
            <input
              type="radio"
              name={radioName}
              checked={resourceAccess === 'restricted'}
              disabled={disabled || loading}
              onChange={() => onResourceAccessChange('restricted')}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Specific resources</span>
              <span className="block text-xs text-[var(--text-muted)]">
                Limit access to selected components and/or accounts.
              </span>
            </span>
          </label>
        </div>
      </div>

      {resourceAccess === 'restricted' && (
        <div className="space-y-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Select one or more components and/or accounts below. The member will only see what you check.
          </p>

          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading project resources...</p>
          ) : (
            <>
              {!hasAnyResources && projectId ? (
                <p className="text-sm text-[var(--text-muted)]">
                  This project has no components or accounts yet.{' '}
                  <Link href={`/projects/${projectId}`} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">
                    Add them on the project overview
                  </Link>{' '}
                  first, then return here to assign scoped access.
                </p>
              ) : null}

              <ResourceChecklist
                title="Components"
                options={grantableComponents}
                selected={selectedComponentIds}
                onChange={onComponentIdsChange}
                disabled={disabled}
                emptyMessage={componentEmptyMessage}
              />
              <ResourceChecklist
                title="Accounts"
                options={grantableAccounts}
                selected={selectedAccountIds}
                onChange={onAccountIdsChange}
                disabled={disabled}
                emptyMessage={accountEmptyMessage}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function formatMemberResourceScope(member: {
  resourceScope?: 'full' | 'restricted';
  componentIds?: string[];
  accountIds?: string[];
}): string {
  const scope =
    member.resourceScope ??
    (member.componentIds !== undefined || member.accountIds !== undefined ? 'restricted' : 'full');

  if (scope !== 'restricted') {
    return 'Full project';
  }

  const componentCount = member.componentIds?.length ?? 0;
  const accountCount = member.accountIds?.length ?? 0;
  return `${componentCount} component${componentCount === 1 ? '' : 's'} · ${accountCount} account${accountCount === 1 ? '' : 's'}`;
}
