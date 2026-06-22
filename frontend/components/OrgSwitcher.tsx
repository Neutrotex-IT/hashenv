'use client';

import { useState, useRef, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Organization } from '@/lib/api';
import { CreateOrganizationModal } from './CreateOrganizationModal';

export function OrgSwitcher() {
  const { organizations, currentOrg, setCurrentOrg, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || !currentOrg) {
    return (
      <div className="h-9 w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--surface-hover)]" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 transition-colors hover:border-[var(--text-muted)]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-muted)] text-xs font-semibold text-[var(--accent)]">
          {currentOrg.type === 'personal' ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            currentOrg.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-[var(--foreground)]">
          {currentOrg.name}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu absolute top-full left-0 right-0 z-[var(--z-dropdown)] mt-2">
          <div className="dropdown-section">
            <p className="nav-section-label">Switch organization</p>
            <div className="mt-0.5 space-y-0.5">
              {organizations.map((org: Organization) => {
                const isActive = currentOrg._id === org._id;
                return (
                  <button
                    key={org._id}
                    type="button"
                    onClick={() => {
                      setCurrentOrg(org);
                      setIsOpen(false);
                    }}
                    className={`dropdown-item ${isActive ? 'dropdown-item--active' : ''}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium ${
                        isActive
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      {org.type === 'personal' ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        org.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {org.type === 'personal' ? 'Personal' : 'Team'} · {org.role}
                      </p>
                    </div>
                    {isActive && (
                      <svg className="h-4 w-4 shrink-0 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dropdown-divider dropdown-section">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setCreateModalOpen(true);
              }}
              className="dropdown-item text-[var(--accent)] hover:text-[var(--accent)]"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
              </svg>
              Create organization
            </button>
          </div>
        </div>
      )}

      <CreateOrganizationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
