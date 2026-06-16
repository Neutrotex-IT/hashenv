'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authAPI } from '@/lib/api';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing');
        return;
      }

      try {
        const result = await authAPI.verifyEmail(token);
        setStatus('success');
        if (result.acceptedInvites?.length) {
          setMessage('Email verified and organization invitation accepted. You can now log in.');
        } else if (inviteToken) {
          setMessage('Email verified successfully. You can now log in and accept your organization invitation.');
        } else {
          setMessage('Email verified successfully! You can now log in.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Email verification failed. The link may be invalid or expired.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden flex items-center justify-center px-4">
      {/* Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, var(--border) 1px, transparent 1px),
            linear-gradient(to bottom, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}></div>
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm p-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image 
              src="/hashenv-transparent.svg" 
              alt="HashEnv Logo" 
              width={40} 
              height={40}
              className="w-10 h-10"
            />
            <h1 className="text-2xl font-bold text-[var(--accent)] font-[var(--font-outfit)]">HashEnv</h1>
          </Link>

          {status === 'loading' && (
            <div>
              <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Verifying your email...</h2>
              <p className="text-[var(--text-muted)]">Please wait while we verify your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Email Verified!</h2>
              <p className="text-[var(--text-muted)] mb-6">{message}</p>
              <Link
                href={inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : '/login'}
                className="inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-all font-[var(--font-inter)]"
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Verification Failed</h2>
              <p className="text-[var(--text-muted)] mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-all font-[var(--font-inter)]"
                >
                  Go to Login
                </Link>
                <Link
                  href="/login"
                  className="block text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-[var(--font-inter)]"
                >
                  Request a new verification email
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)] font-[var(--font-inter)]">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
