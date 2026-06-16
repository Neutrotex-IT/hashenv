'use client';

import { useState } from 'react';
import { formatOrgPermission, formatProjectPermission, OrgPermission, ProjectPermission } from '@/lib/permissions';

const PROJECT_ACCESS_LABELS: Record<string, string> = {
  'project:read': 'View env files, secrets, and accounts',
  'project:write': 'Upload and edit env files, secrets, and accounts',
};

const MISSING_HINTS: Record<string, string> = {
  'project:read': 'You cannot view project resources',
  'project:write': 'You have read-only access — you cannot upload or edit',
  'project:invite': 'You cannot invite members to this project',
  'project:manage_members': 'You cannot edit or remove project members',
  'project:manage_tokens': 'You cannot create or revoke API tokens',
  'org:invite': 'You cannot invite people to this organization',
  'org:manage_members': 'You cannot edit or remove organization members',
  'org:revoke_invites': 'You cannot revoke pending organization invites',
  'org:update': 'You cannot change organization settings',
  'org:audit': 'You cannot view organization audit logs',
  'org:create_project': 'You cannot create new projects in this organization',
};

interface EffectivePermissionsPanelProps {
  scope: 'org' | 'project';
  catalog: Record<string, string>;
  effective: string[];
  className?: string;
}

function formatPermissionLabel(scope: 'org' | 'project', permission: string, catalog: Record<string, string>): string {
  if (permission in catalog) {
    return catalog[permission];
  }
  if (scope === 'project' && permission in PROJECT_ACCESS_LABELS) {
    return PROJECT_ACCESS_LABELS[permission];
  }
  if (scope === 'org' && permission.startsWith('org:')) {
    return formatOrgPermission(permission as OrgPermission);
  }
  if (scope === 'project' && permission.startsWith('project:')) {
    return formatProjectPermission(permission as ProjectPermission);
  }
  return permission;
}

export function EffectivePermissionsPanel({
  scope,
  catalog,
  effective,
  className = '',
}: EffectivePermissionsPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const effectiveSet = new Set(effective);
  const accessPermissions = scope === 'project' ? ['project:read', 'project:write'] : [];
  const capabilityPermissions = Object.keys(catalog);
  const allPermissions = [...accessPermissions, ...capabilityPermissions];

  const granted = allPermissions.filter((p) => effectiveSet.has(p));
  const missing = allPermissions.filter((p) => !effectiveSet.has(p));

  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">Your permissions</p>
          <p className="text-xs text-[var(--text-muted)]">
            {granted.length} granted · {missing.length} not available
          </p>
        </div>
        <svg
          className={`h-5 w-5 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] px-4 py-3 space-y-4">
          {granted.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">Granted</p>
              <ul className="space-y-1.5">
                {granted.map((permission) => (
                  <li key={permission} className="flex items-start gap-2 text-sm text-[var(--foreground)]">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{formatPermissionLabel(scope, permission, catalog)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {missing.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-2">Not available</p>
              <ul className="space-y-1.5">
                {missing.map((permission) => (
                  <li key={permission} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>
                      {formatPermissionLabel(scope, permission, catalog)}
                      {MISSING_HINTS[permission] && (
                        <span className="block text-xs text-[var(--text-muted)]">{MISSING_HINTS[permission]}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
