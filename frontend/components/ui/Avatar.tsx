interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] font-medium text-[var(--accent)] ${sizeClasses[size]} ${className}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: 'sm' | 'md';
}

export function AvatarGroup({ names, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const overflow = names.length - max;

  return (
    <div className="flex items-center">
      {visible.map((name, i) => (
        <Avatar
          key={`${name}-${i}`}
          name={name}
          size={size}
          className={i > 0 ? '-ml-2 ring-2 ring-[var(--surface-elevated)]' : ''}
        />
      ))}
      {overflow > 0 && (
        <span
          className={`-ml-2 inline-flex items-center justify-center rounded-full bg-[var(--surface-hover)] font-medium text-[var(--text-muted)] ring-2 ring-[var(--surface-elevated)] ${
            size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
          }`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
