'use client';

import { useState, useEffect, useRef } from 'react';
import { organizationsAPI, OrgMember } from '@/lib/api';

interface OrgMemberSelectProps {
  orgId: string;
  value: OrgMember | null;
  onChange: (member: OrgMember | null) => void;
  excludeUserIds?: string[];
  placeholder?: string;
  className?: string;
}

export function OrgMemberSelect({
  orgId,
  value,
  onChange,
  excludeUserIds = [],
  placeholder = 'Search organization members...',
  className = '',
}: OrgMemberSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        setLoading(true);
        const data = await organizationsAPI.getMembers(orgId);
        setMembers(data);
      } catch (error) {
        console.error('Failed to load organization members:', error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      loadMembers();
    }
  }, [orgId]);

  const availableMembers = members.filter((member) => {
    if (excludeUserIds.includes(member.user._id)) {
      return false;
    }

    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.toLowerCase();
    return (
      member.user.name.toLowerCase().includes(query) ||
      member.user.email.toLowerCase().includes(query) ||
      member.user.username.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMember = (member: OrgMember) => {
    onChange(member);
    setSearchQuery(member.user.name);
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || availableMembers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < availableMembers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectMember(availableMembers[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setShowDropdown(true);
    if (!newValue.trim()) {
      onChange(null);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    onChange(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (value) {
      setSearchQuery(value.user.name);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(true)}
          placeholder={loading ? 'Loading members...' : placeholder}
          disabled={loading}
          className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 pl-10 pr-10 text-[var(--foreground)] placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-60"
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        >
          {loading ? (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)]">Loading members...</div>
          ) : availableMembers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)]">
              {members.length === 0
                ? 'No organization members found. Invite users to the organization first.'
                : 'No matching members found.'}
            </div>
          ) : (
            <ul className="py-1">
              {availableMembers.map((member, index) => (
                <li
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className={`cursor-pointer px-4 py-2 text-sm transition-colors ${
                    index === selectedIndex
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-elevated)]'
                  }`}
                >
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{member.user.email}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
