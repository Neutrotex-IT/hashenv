'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { CodeEditor } from '@/components/CodeEditor';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const editorSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (editorSectionRef.current) {
        const rect = editorSectionRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.7 && rect.bottom > 0;
        setIsScrolled(isVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Navbar />
      
      {/* Hero Section — extends under transparent nav */}
      <section className="landing-hero relative isolate overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% -15%, var(--accent-muted), transparent 70%)',
            }}
          />
          <div className="absolute top-20 left-10 w-16 h-16 opacity-[0.08] sm:opacity-20 animate-pulse">
            <svg className="w-full h-full text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="absolute top-40 right-20 w-12 h-12 opacity-[0.06] sm:opacity-[0.15] animate-pulse delay-1000">
            <svg className="w-full h-full text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          {/* Shield Icons */}
          <div className="absolute bottom-20 left-20 w-20 h-20 opacity-[0.05] sm:opacity-10 animate-pulse delay-500">
            <svg className="w-full h-full text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="absolute top-60 right-40 w-14 h-14 opacity-[0.05] sm:opacity-[0.12] animate-pulse delay-700">
            <svg className="w-full h-full text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          
          {/* Encryption Symbols - Hex Patterns */}
          <div className="absolute top-32 right-10 w-24 h-24 opacity-[0.05] sm:opacity-10">
            <svg className="w-full h-full text-[var(--accent)]" viewBox="0 0 100 100">
              <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="2" />
              <polygon points="50,25 75,35 75,65 50,75 25,65 25,35" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            </svg>
          </div>
          <div className="absolute bottom-40 right-32 w-18 h-18 opacity-[0.04] sm:opacity-[0.08]">
            <svg className="w-full h-full text-[var(--accent)]" viewBox="0 0 100 100">
              <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          
          {/* Key Icons */}
          <div className="absolute top-80 left-1/4 w-10 h-10 opacity-[0.06] sm:opacity-[0.15] animate-pulse delay-300">
            <svg className="w-full h-full text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          
          {/* Geometric Encryption Pattern */}
          <div className="absolute bottom-10 left-1/3 w-32 h-32 opacity-[0.04] sm:opacity-[0.05]">
            <svg className="w-full h-full text-[var(--accent)]" viewBox="0 0 200 200">
              <circle cx="50" cy="50" r="8" fill="currentColor" />
              <circle cx="150" cy="50" r="8" fill="currentColor" />
              <circle cx="50" cy="150" r="8" fill="currentColor" />
              <circle cx="150" cy="150" r="8" fill="currentColor" />
              <circle cx="100" cy="100" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="50" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="150" y1="50" x2="100" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="50" y1="150" x2="100" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="150" y1="150" x2="100" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 landing-hero-inner">
          <div className="mx-auto max-w-4xl text-center relative z-10">
            <h1 className="landing-h1 text-[var(--foreground)] px-1 sm:px-0">
              Your{' '}
              <code className="text-[var(--accent)] font-mono text-[0.92em]">.env</code>{' '}
              files don&apos;t belong in Git.
              <span className="text-[var(--accent)] block mt-2">
                Lock them down. Ship with confidence.
              </span>
            </h1>
            <p className="mt-4 sm:mt-5 landing-prose mx-auto max-w-2xl px-1 sm:px-0">
              HashEnv encrypts every environment file with AES-256-GCM, gives your team
              granular access control, and logs every change, so secrets stay secret
              from commit to deploy.
            </p>
            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 px-2 sm:px-0">
              <Button variant="primary" size="lg" asLink href="/login" className="w-full sm:w-auto min-w-0 sm:min-w-[180px]">
                Start free
              </Button>
              <Button variant="outline" size="lg" asLink href="#features" className="w-full sm:w-auto min-w-0 sm:min-w-[180px]">
                See how it works
              </Button>
            </div>

            <div
              className={`mt-6 sm:mt-8 mx-auto max-w-2xl w-full text-left px-1 sm:px-0 transition-all duration-700 ${isScrolled ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            >
              <CodeEditor compact={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Code Editor Section - Full Size with Labels */}
      <section ref={editorSectionRef} className="py-16 sm:py-24 lg:py-32 landing-section-alt relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-5xl">
            {/* Code Editor */}
            <div className={`transition-all duration-700 ${isScrolled ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'}`}>
              <CodeEditor />
            </div>
            
            {/* Label Text - Appears around the editor */}
            <div className={`mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center transition-all duration-700 delay-300 ${isScrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-3 border border-[var(--accent)]/20">
                  <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1 landing-h3">
                  Automatic Encryption
                </h3>
                <p className="text-sm text-[var(--text-secondary)] ">
                  Every file is encrypted server-side with AES-256-GCM
                </p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-3 border border-[var(--accent)]/20">
                  <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1 landing-h3">
                  Secure Storage
                </h3>
                <p className="text-sm text-[var(--text-secondary)] ">
                  Keys never leave the server. Zero-knowledge architecture.
                </p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center mb-3 border border-[var(--accent)]/20">
                  <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1 landing-h3">
                  Version Control
                </h3>
                <p className="text-sm text-[var(--text-secondary)] ">
                  Track all changes with complete version history
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 lg:py-32 bg-[var(--background)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center mb-10 sm:mb-16">
            <p className="text-sm font-semibold text-[var(--accent)] mb-3">
              Features
            </p>
            <h2 className="landing-h2 text-[var(--foreground)]">
              Secrets management without the headache
            </h2>
            <p className="mt-4 landing-prose mx-auto">
              Built with security best practices from the ground up. Your secrets are encrypted server-side 
              and never exposed to clients. Manage multiple projects, environments, and versions with complete 
              access control and audit logging.
            </p>
          </div>
          
          {/* Three-Column Grid with Nested Cards */}
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 border-t border-[var(--border)] lg:divide-x lg:divide-[var(--border)]">
              {/* Column 1: Your secrets stay secret */}
              <div className="flex flex-col gap-5 sm:gap-6 pt-6 sm:pt-8 lg:px-8">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 landing-h3">
                    Your secrets stay secret.
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] mb-4 ">
                    Military-grade <code className="text-[var(--accent)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded text-sm font-mono">AES-256-GCM</code> encryption ensures your environment files are protected at rest.
                  </p>
                  <div className="flex items-center text-[var(--accent)] text-sm font-medium  hover:text-[var(--accent-hover)] transition-colors cursor-pointer">
                    Learn about encryption
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Nested Card: Encryption Progress */}
                <div className="p-5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                  <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4 ">
                    Encryption Progress
                  </h4>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-[var(--foreground)] font-medium ">97% (All files)</span>
                      <span className="text-[var(--text-muted)] text-xs ">3% remaining</span>
                    </div>
                    <div className="w-full bg-[var(--surface-elevated)] rounded-full h-2 overflow-hidden">
                      <div className="bg-[var(--accent)] h-full rounded-full" style={{ width: '97%' }}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]  mb-3">
                    <span>• All files encrypted</span>
                    <span>• Server-side only</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] ">
                    <div className="mb-1">Encryption active since deployment</div>
                    <div className="font-medium text-[var(--foreground)]">Status: Active</div>
                  </div>
                </div>
              </div>

              {/* Column 2: Dependencies you can depend on. */}
              <div className="flex flex-col gap-5 sm:gap-6 pt-6 sm:pt-8 lg:px-8">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 landing-h3">
                    Team collaboration, simplified.
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] mb-4 ">
                    Granular access control per project. Assign read or write permissions to team members. Invite collaborators, manage members, and control who can access what.
                  </p>
                  <div className="flex items-center text-[var(--accent)] text-sm font-medium  hover:text-[var(--accent-hover)] transition-colors cursor-pointer">
                    Learn about access control
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Nested Card: Projects List */}
                <div className="p-5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-[var(--foreground)] ">
                      Projects defined
                    </h4>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border)] ">
                      3
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {['Production API', 'Staging Environment', 'Development Stack'].map((project, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-md hover:bg-[var(--surface-elevated)] transition-colors group cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20 flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <span className="text-sm text-[var(--foreground)] ">{project}</span>
                        </div>
                        <svg className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 3: Environment secrets, encrypted and organized */}
              <div className="flex flex-col gap-5 sm:gap-6 pt-6 sm:pt-8 lg:px-8">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3 landing-h3">
                    Environment secrets, encrypted and organized.
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] mb-4 ">
                    Track every action with comprehensive audit logs. Monitor uploads, downloads, edits, and access across all versions and environments. Know who did what, when, and where.
                  </p>
                  <div className="flex items-center text-[var(--accent)] text-sm font-medium  hover:text-[var(--accent-hover)] transition-colors cursor-pointer">
                    Learn about versioning
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
                
                {/* Nested Card: Audit Log */}
                <div className="p-5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">
                      Activity Log
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-mono bg-[var(--surface-elevated)] p-2 rounded border border-[var(--border)] ">
                        <div className="text-[var(--accent)]">[2024-01-15 10:23:45]</div>
                        <div className="text-[var(--foreground)]">DOWNLOAD • prod • v3</div>
                        <div className="text-[var(--text-muted)]">user@example.com</div>
                      </div>
                      <div className="text-xs font-mono bg-[var(--surface-elevated)] p-2 rounded border border-[var(--border)]  opacity-75">
                        <div className="text-[var(--text-muted)]">[2024-01-15 09:15:12]</div>
                        <div className="text-[var(--foreground)]">UPLOAD • staging • v2</div>
                        <div className="text-[var(--text-muted)]">admin@example.com</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded bg-[var(--surface-elevated)] border border-[var(--border)]">
                    <div className="text-xs font-medium text-[var(--foreground)] mb-1 ">
                      All actions logged
                    </div>
                    <div className="text-xs text-[var(--text-muted)] ">
                      Upload, download, edit, delete, and access events tracked with full metadata
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Stats Grid */}
            <div className="mt-10 sm:mt-16 grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 border-t border-[var(--border)] lg:divide-x lg:divide-[var(--border)] pt-6 sm:pt-8">
              <div className="lg:px-8">
                <div className="landing-stat text-[var(--foreground)] mb-2">
                  256-bit
                </div>
                <div className="text-base text-[var(--text-secondary)] ">
                  AES-GCM encryption strength. Military-grade security for your environment variables.
                </div>
              </div>
              <div className="lg:px-8">
                <div className="landing-stat text-[var(--foreground)] mb-2">
                  3
                </div>
                <div className="text-base text-[var(--text-secondary)] ">
                  Environments per project. Use dev, staging, prod, or add custom names like qa and preview, each with independent versioning.
                </div>
              </div>
              <div className="lg:px-8">
                <div className="landing-stat text-[var(--foreground)] mb-2">
                  100%
                </div>
                <div className="text-base text-[var(--text-secondary)] ">
                  Server-side encryption. Your keys never leave our secure infrastructure.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-20 sm:py-32 lg:py-40 xl:py-48 landing-section-alt overflow-hidden">
        {/* Glitch Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Pixelated background elements with glitch effect */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--accent)] opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-[var(--accent)] opacity-15 animate-pulse delay-300"></div>
          <div className="absolute bottom-32 left-1/4 w-2 h-2 bg-[var(--accent)] opacity-[0.18] animate-pulse delay-500"></div>
          <div className="absolute top-60 right-1/3 w-1.5 h-1.5 bg-[var(--accent)] opacity-12 animate-pulse delay-700"></div>
          
          <div className="absolute top-1/3 left-1/5 w-1 h-1 bg-[var(--success)] opacity-15 animate-pulse delay-200"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-[var(--success)] opacity-12 animate-pulse delay-600"></div>
          
          {/* Cross patterns */}
          <div className="absolute top-32 left-1/3 w-3 h-3 opacity-10">
            <svg className="w-full h-full text-[var(--accent)]" viewBox="0 0 10 10">
              <line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-20">
          {/* Section Heading */}
          <div className="mb-10 sm:mb-16 md:mb-20">
            <h2 className="landing-h2 text-[var(--foreground)]">
              How it works
            </h2>
          </div>
          
          {/* Grid Container with Visible Gridlines */}
          <div className="relative max-w-6xl mx-auto">
            {/* Grid Layout with Visible Gridlines */}
            <div className="border border-[var(--border)]/40">
              {/* Top Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]/40">
                {/* Block 01 - Top Left */}
                <div className="p-6 sm:p-8 md:p-12">
                  <div className="text-xs text-[var(--text-muted)]  mb-3 tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    01/
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] mb-4 landing-h3 leading-tight">
                    Create a Project
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] ">
                    Start by creating a project. Invite team members and assign granular permissions: read-only for viewing or read-write for full access. Each project supports multiple environments and complete version history.
                  </p>
                </div>
                
                {/* Block 02 - Top Right */}
                <div className="p-6 sm:p-8 md:p-12">
                  <div className="text-xs text-[var(--text-muted)]  mb-3 tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    02/
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] mb-4 landing-h3 leading-tight">
                    Upload Environment Files
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] ">
                    Upload your .env files via file upload or paste content directly. Choose from default or custom environments. Files are automatically encrypted server-side with AES-256-GCM, versioned, and tracked with complete metadata.
                  </p>
                </div>
              </div>
              
              {/* Horizontal Gridline */}
              <div className="w-full h-px bg-[var(--border)]/40"></div>
              
              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]/40">
                {/* Block 03 - Bottom Left */}
                <div className="p-6 sm:p-8 md:p-12">
                  <div className="text-xs text-[var(--text-muted)]  mb-3 tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    03/
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] mb-4 landing-h3 leading-tight">
                    Automatic Encryption
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] ">
                    Files are encrypted server-side using AES-256-GCM before storage. All encryption and decryption happens on the server. Your keys never leave our secure infrastructure. Zero configuration required.
                  </p>
                </div>
                
                {/* Block 04 - Bottom Right */}
                <div className="p-6 sm:p-8 md:p-12">
                  <div className="text-xs text-[var(--text-muted)]  mb-3 tracking-wider" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    04/
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--foreground)] mb-4 landing-h3 leading-tight">
                    Secure Access & Audit
                  </h3>
                  <p className="text-base leading-7 text-[var(--text-secondary)] ">
                    Only authorized team members with proper permissions can access files. Every action (upload, download, edit, delete, or view) is logged with timestamps, user information, and metadata. Download complete audit logs anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-24 lg:py-32 bg-[var(--background)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 sm:mb-16">
            <h2 className="landing-h2 text-[var(--foreground)]">
              Frequently asked questions
            </h2>
          </div>
          
          <div className="space-y-0">
            {[
              {
                question: 'What encryption standard does HashEnv use?',
                answer: 'HashEnv uses AES-256-GCM encryption, one of the most secure encryption standards available. All files are encrypted server-side before storage, ensuring your sensitive environment variables remain protected at rest.',
                link: { text: 'Learn more about security', href: '/security' }
              },
              {
                question: 'How do I share projects with team members?',
                answer: 'Project owners can invite team members as collaborators on any project. Set granular permissions for each collaborator with read-only or read-write access. Use the member management interface to add or remove team members and update their permissions at any time.',
                link: { text: 'View documentation', href: '/docs' }
              },
              {
                question: 'Can I use HashEnv for multiple environments?',
                answer: 'Yes! Every project includes dev, staging, and prod by default, and you can add custom environment names (e.g. qa, preview, uat). Upload separate .env files for each environment, and all files are automatically versioned and tracked. You can download, compare, rollback, and manage versions independently for each environment.',
                link: { text: 'Explore features', href: '/features' }
              },
              {
                question: 'Is there an API available for integration?',
                answer: 'Yes, HashEnv provides a comprehensive RESTful API with endpoints for projects, environment files, user management, and authentication. Integrate with CI/CD pipelines, automate your workflow, or build custom tools. All API requests are authenticated using JWT tokens and rate-limited for security.',
                link: { text: 'Check API documentation', href: '/api-docs' }
              },
              {
                question: 'How does version control work?',
                answer: 'Every time you upload a new environment file, HashEnv automatically creates a new version. You can view all versions, download any specific version, and see who uploaded it and when. Each version is encrypted separately and tracked with complete metadata. Project owners can also edit existing versions without creating new ones.',
                link: { text: 'Learn about versioning', href: '/docs/versioning' }
              },
              {
                question: 'What happens to my data if I cancel my account?',
                answer: 'Your data remains encrypted and secure. You can export all your environment files at any time. If you cancel your account, your data will be permanently deleted after a 30-day grace period, during which you can reactivate your account.',
                link: { text: 'Contact support', href: '/support' }
              }
            ].map((faq, index) => {
              const isExpanded = expandedFaq === index;
              return (
                <div key={index} className="border-t border-[var(--border)] first:border-t-0 overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between py-5 sm:py-6 text-left hover:opacity-80 transition-opacity group"
                    aria-expanded={isExpanded}
                  >
                    <h3 className={`text-base sm:text-lg text-[var(--foreground)] pr-6 sm:pr-8 transition-all duration-300 ${
                      isExpanded ? 'font-bold' : 'font-normal'
                    }`}>
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0 transition-transform duration-300">
                      {isExpanded ? (
                        <svg 
                          className="w-5 h-5 text-[var(--accent)] transition-transform duration-300 rotate-180" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      ) : (
                        <svg 
                          className="w-5 h-5 text-[var(--accent)] transition-transform duration-300 group-hover:scale-110" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isExpanded 
                        ? 'max-h-[500px] opacity-100 translate-y-0' 
                        : 'max-h-0 opacity-0 -translate-y-2'
                    }`}
                  >
                    <div className="pb-6 pt-2">
                      <p className="text-base leading-7 text-[var(--text-secondary)]  mb-4">
                        {faq.answer}
                      </p>
                      {faq.link && (
                        <Link 
                          href={faq.link.href} 
                          className="inline-flex items-center text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium"
                        >
                          {faq.link.text}
                          <svg 
                            className="w-4 h-4 ml-1" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="relative py-16 sm:py-24 lg:py-32 landing-section-alt overflow-hidden">
        {/* Grid Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }}></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
          {/* Main CTA Container with Grid Border */}
          <div className="relative max-w-4xl mx-auto">
            <div className="border border-[var(--border)] rounded-xl bg-[var(--surface-elevated)] p-6 sm:p-8 lg:p-12 xl:p-16">
              {/* Inner Grid Pattern */}
              <div className="absolute inset-0 rounded-lg opacity-5" style={{
                backgroundImage: `
                  linear-gradient(to right, var(--accent) 1px, transparent 1px),
                  linear-gradient(to bottom, var(--accent) 1px, transparent 1px)
                `,
                backgroundSize: '32px 32px'
              }}></div>
              
              <div className="relative z-10 text-center">
                <h2 className="landing-h2 text-[var(--foreground)] mb-6">
              Stop committing secrets.<br />Start managing them securely.
            </h2>
                <p className="landing-prose text-lg sm:text-xl mb-10 max-w-2xl mx-auto">
              Encrypt. Organize. Collaborate. Get started in minutes. No credit card required.
            </p>
                
                {/* Button Container with Grid Layout */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 lg:gap-6">
                  <Button variant="primary" size="lg" asLink href="/login" className="w-full sm:w-auto min-w-0 sm:min-w-[200px]">
                Get started for free
              </Button>
                  <Button variant="outline" size="lg" asLink href="#features" className="w-full sm:w-auto min-w-0 sm:min-w-[200px]">
                    Learn more
                  </Button>
                </div>
              </div>
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--accent)]/30 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--accent)]/30 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--accent)]/30 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--accent)]/30 rounded-br-lg"></div>
            </div>
          </div>
          
          {/* Additional Grid Elements */}
          <div className="mt-10 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            <div className="border border-[var(--border)] rounded-xl p-5 sm:p-6 bg-[var(--surface-elevated)] text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
                <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]  mb-2">Enterprise Security</h3>
              <p className="text-xs text-[var(--text-muted)] ">AES-256-GCM encryption</p>
            </div>
            
            <div className="border border-[var(--border)] rounded-xl p-5 sm:p-6 bg-[var(--surface-elevated)] text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
                <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]  mb-2">Secrets management without the headache</h3>
              <p className="text-xs text-[var(--text-muted)] ">Get started in minutes</p>
            </div>
            
            <div className="border border-[var(--border)] rounded-xl p-5 sm:p-6 bg-[var(--surface-elevated)] text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center border border-[var(--accent)]/20">
                <svg className="w-6 h-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-[var(--foreground)]  mb-2">Team Collaboration</h3>
              <p className="text-xs text-[var(--text-muted)] ">Granular access control</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-14 sm:py-20 lg:py-24 bg-[var(--background)] overflow-hidden">
        {/* Background Watermark Effect */}
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none opacity-20" style={{ paddingBottom: '-10rem' }}>
          <div className="text-[8rem] sm:text-[15rem] lg:text-[20rem] font-bold text-[var(--accent)] opacity-[0.06] select-none transform translate-y-24 sm:translate-y-32 lg:translate-y-40">
            HashEnv
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Main Footer Container */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl p-6 sm:p-8 lg:p-12 xl:p-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-8 sm:mb-12">
              {/* Column 1: Company Branding & Description */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Image 
                    src="/hashenv-transparent.svg" 
                    alt="HashEnv Logo" 
                    width={40} 
                    height={40}
                    className="w-10 h-10"
                  />
                  <h3 className="text-2xl font-bold  text-[var(--foreground)]">
                    HashEnv
                  </h3>
                </div>
                <p className="text-sm leading-6 text-[var(--text-secondary)]  max-w-sm">
                  HashEnv empowers development teams to securely manage environment variables with enterprise-grade AES-256-GCM encryption, granular access control, multi-environment support, version tracking, and complete audit logging, making every deployment safe, traceable, and efficient.
                </p>
              </div>

              {/* Column 2: Links Section */}
              <div className="space-y-6">
                <h4 className="text-base font-semibold text-[var(--accent)] ">
                  Resources
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link href="/docs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors ">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link href="/features" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors ">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/security" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors ">
                      Security
                    </Link>
                  </li>
                  <li>
                    <Link href="/api-docs" className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors ">
                      API Reference
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Social Media */}
              <div className="space-y-6">
                <h4 className="text-base font-semibold text-[var(--accent)] ">
                  Follow Us
                </h4>
                <div className="flex items-center gap-4">
                  <a 
                    href="https://twitter.com/hashenv" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    aria-label="Twitter"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://instagram.com/hashenv" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    aria-label="Instagram"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://facebook.com/hashenv" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    aria-label="Facebook"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://linkedin.com/company/hashenv" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Horizontal Separator */}
            <div className="border-t border-[var(--border)] my-8"></div>

            {/* Bottom Section: Copyright & Legal Links */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-[var(--text-muted)] ">
                &copy; {new Date().getFullYear()} HashEnv. All rights reserved.
              </p>
              <div className="flex items-center gap-6">
                <Link href="/privacy" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors ">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
