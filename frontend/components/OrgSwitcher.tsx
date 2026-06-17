'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
      <div className="h-10 w-40 bg-[var(--surface)] rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-[var(--accent)]/20 flex items-center justify-center text-xs font-medium text-[var(--accent)]">
          {currentOrg.type === 'personal' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            currentOrg.name.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-sm font-medium text-[var(--foreground)] max-w-[120px] truncate">
          {currentOrg.name}
        </span>
        <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg z-50">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-[var(--text-muted)] uppercase">Switch Organization</p>
            <div className="mt-1 space-y-1">
              {organizations.map((org: Organization) => (
                <button
                  key={org._id}
                  onClick={() => {
                    setCurrentOrg(org);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                    currentOrg._id === org._id
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'hover:bg-[var(--surface-hover)] text-[var(--foreground)]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium ${
                    currentOrg._id === org._id
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'bg-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {org.type === 'personal' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      org.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{org.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {org.type === 'personal' ? 'Personal' : 'Team'} · {org.role}
                    </p>
                  </div>
                  {currentOrg._id === org._id && (
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-[var(--border)] p-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setCreateModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
