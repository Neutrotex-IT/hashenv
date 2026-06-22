'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authAPI } from '@/lib/api';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useToast } from '@/contexts/ToastContext';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success: toastSuccess, error: toastError } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toastError('Reset token is missing. Please request a new password reset link.');
    }
  }, [token, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toastError('Reset token is missing');
      return;
    }

    if (password.length < 8) {
      toastError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toastError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, password);
      toastSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Password reset failed. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden">
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

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
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
            <h2 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-[var(--foreground)] font-[var(--font-outfit)]">
              Reset Password
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)] font-[var(--font-inter)]">
              Enter your new password below
            </p>
          </div>

          {/* Form Container */}
          <div className="relative">
            <div className="absolute inset-0 rounded-lg opacity-5" style={{
              backgroundImage: `
                linear-gradient(to right, var(--accent) 1px, transparent 1px),
                linear-gradient(to bottom, var(--accent) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px'
            }}></div>
            
            <form 
              className="relative border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-lg)] p-8 sm:p-10 space-y-6 z-10"
              onSubmit={handleSubmit}
            >
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[var(--accent)]/30 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[var(--accent)]/30 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[var(--accent)]/30 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[var(--accent)]/30 rounded-br-lg"></div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] font-[var(--font-inter)] mb-2">
                  New Password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Enter new password (min 8 characters)"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--foreground)] font-[var(--font-inter)] mb-2">
                  Confirm Password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Confirm new password"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="group relative flex w-full justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[var(--accent)]/25 font-[var(--font-inter)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>

              <div className="text-center pt-2 space-y-2">
                <Link
                  href="/forgot-password"
                  className="block text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-[var(--font-inter)]"
                >
                  Request a new reset link
                </Link>
                <Link
                  href="/login"
                  className="block text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-[var(--font-inter)]"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)] font-[var(--font-inter)]">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
