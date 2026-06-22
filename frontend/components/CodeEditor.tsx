'use client';

interface CodeEditorProps {
  compact?: boolean;
}

export function CodeEditor({ compact = false }: CodeEditorProps) {
  if (compact) {
    // Compact version for hero section
    return (
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] shadow-xl">
        {/* Editor Header */}
        <div className="flex items-center justify-between bg-[var(--surface-elevated)] border-b border-[var(--border)] px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--error)]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]"></div>
            </div>
            <div className="ml-3 px-2.5 py-1 rounded-t-md bg-[var(--surface)] border-b-2 border-[var(--accent)] border-t border-l border-r border-[var(--border)]">
              <span className="text-xs text-[var(--foreground)] font-medium font-[var(--font-inter)] flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                .env
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-[var(--font-inter)]">
            <svg className="w-3.5 h-3.5 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Encrypted</span>
          </div>
        </div>
        
        {/* Compact Editor Content */}
        <div className="flex bg-[var(--background)]">
          <div className="flex-shrink-0 w-8 py-3 px-2 bg-[var(--surface-elevated)] border-r border-[var(--border)] text-right">
            <div className="text-xs text-[var(--text-muted)] font-mono font-[var(--font-geist-mono)] leading-5 space-y-0">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={i === 4 ? 'text-[var(--accent)]' : ''}>
                  {i + 5}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 py-3 px-4 font-mono text-xs leading-5 font-[var(--font-geist-mono)]">
            <div className="space-y-0">
              <div className="text-[var(--text-muted)]">
                <span># API Configuration</span>
              </div>
              <div className="h-0.5"></div>
              <div>
                <span className="text-[var(--accent)]">API_KEY</span>
                <span className="text-[var(--foreground)]">=</span>
                <span className="text-[var(--text-secondary)]"> sk_live_51H...</span>
              </div>
              <div>
                <span className="text-[var(--accent)]">STRIPE_SECRET</span>
                <span className="text-[var(--foreground)]">=</span>
                <span className="text-[var(--text-secondary)]"> sk_live_...</span>
              </div>
              <div className="h-0.5"></div>
              <div className="relative bg-[var(--accent)]/5 border-l-2 border-[var(--accent)] pl-2 -ml-4 pr-4">
                <span className="text-[var(--accent)]">ENCRYPTION_KEY</span>
                <span className="text-[var(--foreground)]">=</span>
                <span className="text-[var(--text-secondary)]"> aJGa51Kee...</span>
                <span className="inline-block w-0.5 h-3 bg-[var(--accent)] ml-0.5 animate-pulse"></span>
              </div>
              <div className="h-0.5"></div>
              <div>
                <span className="text-[var(--accent)]">JWT_SECRET</span>
                <span className="text-[var(--foreground)]">=</span>
                <span className="text-[var(--text-secondary)]"> your-secret...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] shadow-xl">
      {/* Editor Header/Tabs */}
      <div className="flex items-center justify-between bg-[var(--surface-elevated)] border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[var(--error)]"></div>
            <div className="w-3 h-3 rounded-full bg-[var(--warning)]"></div>
            <div className="w-3 h-3 rounded-full bg-[var(--success)]"></div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <div className="px-3 py-1 rounded-t-md bg-[var(--surface)] border-b-2 border-[var(--accent)] border-t border-l border-r border-[var(--border)]">
              <span className="text-sm text-[var(--foreground)] font-medium font-[var(--font-inter)] flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                .env
              </span>
            </div>
            <div className="px-3 py-1 text-sm text-[var(--text-muted)] font-[var(--font-inter)]">
              production.env
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-[var(--font-inter)]">
            <svg className="w-4 h-4 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Encrypted</span>
          </div>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="flex bg-[var(--background)]">
        {/* Line Numbers */}
        <div className="flex-shrink-0 w-12 py-4 px-3 bg-[var(--surface-elevated)] border-r border-[var(--border)] text-right">
          <div className="text-xs text-[var(--text-muted)] font-mono font-[var(--font-geist-mono)] leading-6 space-y-0">
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} className={i === 11 ? 'text-[var(--accent)]' : ''}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        
        {/* Code Content */}
        <div className="flex-1 py-4 px-6 font-mono text-sm leading-6 font-[var(--font-geist-mono)]">
          <div className="space-y-0">
            {/* Comment */}
            <div className="text-[var(--text-muted)]">
              <span className="text-[var(--text-muted)]"># Production environment variables</span>
            </div>
            <div className="h-1"></div>
            
            {/* Database */}
            <div>
              <span className="text-[var(--accent)]">DATABASE_URL</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> postgresql://user:pass@localhost:5432/db</span>
            </div>
            
            {/* API Keys */}
            <div>
              <span className="text-[var(--accent)]">API_KEY</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> sk_live_51H...</span>
            </div>
            
            <div>
              <span className="text-[var(--accent)]">STRIPE_SECRET</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> sk_live_...</span>
            </div>
            
            <div className="h-1"></div>
            
            {/* AWS */}
            <div>
              <span className="text-[var(--accent)]">AWS_ACCESS_KEY_ID</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> AKIAIOSFODNN7EXAMPLE</span>
            </div>
            
            <div>
              <span className="text-[var(--accent)]">AWS_SECRET_ACCESS_KEY</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</span>
            </div>
            
            <div className="h-1"></div>
            
            {/* JWT */}
            <div>
              <span className="text-[var(--accent)]">JWT_SECRET</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> your-secret-key-here</span>
            </div>
            
            <div className="h-1"></div>
            
            {/* Active line with cursor */}
            <div className="relative bg-[var(--accent)]/5 border-l-2 border-[var(--accent)] pl-3 -ml-6 pr-6">
              <span className="text-[var(--accent)]">ENCRYPTION_KEY</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> aJGa51KeeHZZzWG1sAFpRL1NUOPY</span>
              <span className="inline-block w-0.5 h-4 bg-[var(--accent)] ml-1 animate-pulse"></span>
            </div>
            
            <div className="h-1"></div>
            
            {/* More variables */}
            <div>
              <span className="text-[var(--accent)]">REDIS_URL</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> redis://localhost:6379</span>
            </div>
            
            <div>
              <span className="text-[var(--accent)]">SMTP_HOST</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> smtp.sendgrid.net</span>
            </div>
            
            <div>
              <span className="text-[var(--accent)]">SMTP_API_KEY</span>
              <span className="text-[var(--foreground)]">=</span>
              <span className="text-[var(--text-secondary)]"> SG.abc123...</span>
            </div>
            
            <div className="h-1"></div>
            
            {/* Comment */}
            <div className="text-[var(--text-muted)]">
              <span className="text-[var(--text-muted)]"># Automatically encrypted on save</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Editor Footer/Status Bar */}
      <div className="flex items-center justify-between bg-[var(--surface-elevated)] border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] font-[var(--font-inter)]">
        <div className="flex items-center gap-4">
          <span>Ln 12, Col 45</span>
          <span>Spaces: 2</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            AES-256-GCM
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[var(--success)]"></div>
            Saved
          </span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}
