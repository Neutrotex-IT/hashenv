'use client';

interface ProjectPageHeaderProps {
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Section header within a project page — project name lives in ProjectShell. */
export function ProjectPageHeader({
  title,
  description,
  actions,
}: ProjectPageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)] text-pretty">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
