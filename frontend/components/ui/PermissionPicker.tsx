'use client';

import {
  formatOrgPermission,
  formatProjectPermission,
  OrgPermission,
  ProjectPermission,
  ORG_PERMISSIONS,
  PROJECT_PERMISSIONS,
} from '@/lib/permissions';

interface PermissionPickerProps<T extends string> {
  catalog: Record<T, string>;
  grantable: T[];
  selected: T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  formatLabel?: (permission: T) => string;
}

function PermissionPicker<T extends string>({
  catalog,
  grantable,
  selected,
  onChange,
  disabled = false,
  formatLabel,
}: PermissionPickerProps<T>) {
  const labelFor = formatLabel ?? ((permission: T) => catalog[permission]);

  const toggle = (permission: T) => {
    if (disabled || !grantable.includes(permission)) {
      return;
    }
    if (selected.includes(permission)) {
      onChange(selected.filter((item) => item !== permission));
    } else {
      onChange([...selected, permission]);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
      {(Object.keys(catalog) as T[]).map((permission) => {
        const canGrant = grantable.includes(permission);
        const checked = selected.includes(permission);

        return (
          <label
            key={permission}
            className={`flex items-start gap-3 text-sm ${canGrant ? 'text-[var(--foreground)]' : 'text-[var(--text-muted)]'}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled || !canGrant}
              onChange={() => toggle(permission)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">{labelFor(permission)}</span>
              {!canGrant && (
                <span className="block text-xs text-[var(--text-muted)]">You cannot grant this permission</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

interface OrgPermissionPickerProps {
  grantable: OrgPermission[];
  selected: OrgPermission[];
  onChange: (next: OrgPermission[]) => void;
  disabled?: boolean;
}

export function OrgPermissionPicker({ grantable, selected, onChange, disabled }: OrgPermissionPickerProps) {
  return (
    <PermissionPicker
      catalog={ORG_PERMISSIONS as Record<OrgPermission, string>}
      grantable={grantable}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
      formatLabel={formatOrgPermission}
    />
  );
}

interface ProjectPermissionPickerProps {
  grantable: ProjectPermission[];
  selected: ProjectPermission[];
  onChange: (next: ProjectPermission[]) => void;
  disabled?: boolean;
}

export function ProjectPermissionPicker({
  grantable,
  selected,
  onChange,
  disabled,
}: ProjectPermissionPickerProps) {
  return (
    <PermissionPicker
      catalog={PROJECT_PERMISSIONS as Record<ProjectPermission, string>}
      grantable={grantable}
      selected={selected}
      onChange={onChange}
      disabled={disabled}
      formatLabel={formatProjectPermission}
    />
  );
}
