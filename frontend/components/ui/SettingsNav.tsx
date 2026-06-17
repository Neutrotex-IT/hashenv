'use client';

import { getSettingsSections } from '@/lib/navigation';

interface SettingsNavProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export function SettingsNav({ activeId, onSelect }: SettingsNavProps) {
  const sections = getSettingsSections();

  return (
    <nav aria-label="Settings sections" className="space-y-1">
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]'
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </nav>
  );
}
