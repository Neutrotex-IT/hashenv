type TagVariant = 'dev' | 'staging' | 'prod' | 'neutral';

interface TagProps {
  label: string;
  variant?: TagVariant;
  className?: string;
}

const variantStyles: Record<TagVariant, { bg: string; text: string }> = {
  dev: { bg: 'var(--tag-dev-bg)', text: 'var(--tag-dev-text)' },
  staging: { bg: 'var(--tag-staging-bg)', text: 'var(--tag-staging-text)' },
  prod: { bg: 'var(--tag-prod-bg)', text: 'var(--tag-prod-text)' },
  neutral: { bg: 'var(--tag-neutral-bg)', text: 'var(--tag-neutral-text)' },
};

export function envTagVariant(slug: string): TagVariant {
  const lower = slug.toLowerCase();
  if (lower.includes('prod')) return 'prod';
  if (lower.includes('stag')) return 'staging';
  if (lower.includes('dev')) return 'dev';
  return 'neutral';
}

export function Tag({ label, variant = 'neutral', className = '' }: TagProps) {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-sm)] px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}
