'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/Button';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isHomePage = pathname === '/';
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!isHomePage) {
      setIsScrolled(false);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const handleDashboardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setCheckingAuth(true);
    
    // Use auth context state to determine authentication
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
    setCheckingAuth(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isNavSolid = !isHomePage || isScrolled || isMobileMenuOpen;

  return (
    <nav
      className={`top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        isHomePage ? 'fixed inset-x-0' : 'sticky'
      } ${
        isNavSolid
          ? 'bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center flex-1">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)] hover:opacity-80 transition-opacity">
              <Image 
                src="/hashenv-transparent.svg" 
                alt="HashEnv Logo" 
                width={32} 
                height={32}
                className="w-8 h-8"
              />
              <span className="hidden sm:inline">HashEnv</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="ml-6 lg:ml-10 hidden md:flex space-x-6 lg:space-x-8">
              <Link
                href="/"
                className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-sm font-medium"
              >
                Home
              </Link>
              <Link
                href="#features"
                className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-sm font-medium"
              >
                Features
              </Link>
              <Link
                href="#about"
                className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors text-sm font-medium"
              >
                About
              </Link>
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isHomePage && (
              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleDashboardClick}
                disabled={checkingAuth}
              >
                {checkingAuth ? 'Checking...' : 'Dashboard'}
              </Button>
            )}
            {!isHomePage && !isAuthenticated && (
              <>
                <Button variant="ghost" size="sm" asLink href="/login">
                  Sign in
                </Button>
                <Button variant="primary" size="sm" asLink href="/login">
                  Get started
                </Button>
              </>
            )}
            {!isHomePage && isAuthenticated && (
              <Button variant="primary" size="sm" asLink href="/dashboard">
                Dashboard
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
          >
            <div className="w-6 h-6 relative">
              <span
                className={`absolute top-0 left-0 w-6 h-0.5 bg-current transform transition-all duration-300 ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-2.5' : ''
                }`}
              />
              <span
                className={`absolute top-2.5 left-0 w-6 h-0.5 bg-current transform transition-all duration-300 ${
                  isMobileMenuOpen ? 'opacity-0' : ''
                }`}
              />
              <span
                className={`absolute top-5 left-0 w-6 h-0.5 bg-current transform transition-all duration-300 ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-2.5' : ''
                }`}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className={`py-4 space-y-3 border-t ${isNavSolid ? 'border-[var(--border)]' : 'border-[var(--border)]/40'}`}>
            <Link
              href="/"
              className="block px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="#features"
              className="block px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="#about"
              className="block px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-elevated)] rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <div className="pt-4 border-t border-[var(--border)] px-4 space-y-3">
              {isHomePage && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => {
                    handleDashboardClick(e);
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={checkingAuth}
                  className="w-full"
                >
                  {checkingAuth ? 'Checking...' : 'Dashboard'}
                </Button>
              )}
              {!isHomePage && !isAuthenticated && (
                <>
                  <Button variant="ghost" size="sm" asLink href="/login" className="w-full">
                    Sign in
                  </Button>
                  <Button variant="primary" size="sm" asLink href="/login" className="w-full">
                    Get started
                  </Button>
                </>
              )}
              {!isHomePage && isAuthenticated && (
                <Button variant="primary" size="sm" asLink href="/dashboard" className="w-full">
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
