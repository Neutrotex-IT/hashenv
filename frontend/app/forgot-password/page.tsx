'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      toastSuccess('If an account exists with this email, a password reset link has been sent. Please check your inbox.');
      setEmail('');
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send password reset email');
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
              Enter your email address and we'll send you a link to reset your password
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
                <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] font-[var(--font-inter)] mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 motion-colors font-[var(--font-inter)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed motion-press font-[var(--font-inter)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-[var(--font-inter)]"
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
