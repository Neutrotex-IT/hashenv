'use client';

import { useState } from 'react';
import { Sidebar, sidebarOffsetClass } from './Sidebar';
import { TopBar } from './TopBar';
import { OrgPanicButton } from './OrgPanicButton';
import { useAuth } from '@/contexts/AuthContext';
import { OrgPanicProvider } from '@/contexts/OrgPanicContext';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <OrgPanicProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <Sidebar
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div
          className={`flex min-h-screen flex-col transition-[margin] duration-[250ms] ease-out ${sidebarOffsetClass(collapsed)}`}
        >
          <TopBar onLogout={logout} onMenuOpen={() => setMobileOpen(true)} />

          <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10">
            <div className="mx-auto w-full max-w-[75rem]">{children}</div>
          </main>

          <OrgPanicButton variant="fab" />
        </div>
      </div>
    </OrgPanicProvider>
  );
}
