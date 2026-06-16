export const DEFAULT_ENVIRONMENTS = ['dev', 'staging', 'prod'] as const;

/** Display label for an environment slug (e.g. qa → Qa, staging → Staging). */
export function formatEnvLabel(slug: string): string {
  if (!slug) return slug;
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function isDefaultEnvSlug(slug: string): boolean {
  return (DEFAULT_ENVIRONMENTS as readonly string[]).includes(slug);
}
