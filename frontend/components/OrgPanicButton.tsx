'use client';

import { useEffect } from 'react';
import { useOrgPanic } from '@/contexts/OrgPanicContext';

interface OrgPanicButtonProps {
  variant?: 'fab' | 'sidebar' | 'header';
  collapsed?: boolean;
}

export function OrgPanicButton({ variant = 'fab', collapsed = false }: OrgPanicButtonProps) {
  const { visible, loading, execute, eligibleProjectCount, orgName, requestProbe } = useOrgPanic();

  useEffect(() => {
    requestProbe();
  }, [requestProbe]);

  if (!visible) {
    return null;
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={() => void execute()}
        disabled={loading}
        title={`Panic button (${eligibleProjectCount} eligible projects)`}
        aria-label="Execute panic actions"
        className="rounded-[var(--radius-md)] bg-[var(--error)] p-2 text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="mb-3 hidden lg:block">
        <button
          type="button"
          onClick={() => void execute()}
          disabled={loading}
          title={collapsed ? 'Panic button' : `Panic button — ${eligibleProjectCount} eligible projects`}
          className={`flex w-full items-center justify-center gap-2 rounded-full bg-[var(--error)] text-sm font-medium text-white transition-colors hover:bg-[#F85149] disabled:cursor-not-allowed disabled:opacity-50 ${
            collapsed ? 'p-2' : 'px-4 py-2'
          }`}
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {!collapsed && <span>{loading ? 'Processing...' : 'Panic button'}</span>}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void execute()}
      disabled={loading}
      title={`Panic button for ${orgName ?? 'organization'} (${eligibleProjectCount} eligible projects)`}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--error)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--error)]/30 transition-colors hover:bg-[#F85149] disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      {loading ? 'Processing...' : 'Panic'}
    </button>
  );
}
