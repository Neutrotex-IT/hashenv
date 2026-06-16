'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { authAPI } from '@/lib/api';
import { PasswordInput } from '@/components/ui/PasswordInput';

function LoginForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const initialRegister = searchParams.get('register') === '1';
  const invitedEmail = searchParams.get('email');

  const [isLogin, setIsLogin] = useState(!initialRegister);
  const [email, setEmail] = useState(invitedEmail || '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push(inviteToken ? `/accept-invite?token=${encodeURIComponent(inviteToken)}` : '/dashboard');
    }
  }, [isAuthenticated, authLoading, router, inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowResendVerification(false);
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        router.push(inviteToken ? `/accept-invite?token=${encodeURIComponent(inviteToken)}` : '/dashboard');
      } else {
        await register(name, username, email, password, inviteToken || undefined);
        setSuccess(
          inviteToken
            ? 'Registration successful! Please verify your email, then return to the invite link to join the organization.'
            : 'Registration successful! Please check your email to verify your account before logging in.'
        );
        setIsLogin(true);
        setEmail(email);
        setName('');
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An error occurred';
      setError(errorMessage);
      
      // Show resend verification option if email not verified
      if (err.response?.data?.emailVerified === false || errorMessage.includes('Email not verified')) {
        setShowResendVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await authAPI.resendVerification(email);
      setSuccess('Verification email sent! Please check your inbox.');
      setShowResendVerification(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  // Show skeleton loader while checking authentication
  if (authLoading) {
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
          <div className="w-full max-w-md">
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // Don't render form if already authenticated (redirect will happen via useEffect)
  if (isAuthenticated) {
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
          <div className="text-center">
            <Skeleton variant="rectangular" width={120} height={32} className="mx-auto mb-4" />
            <Skeleton variant="text" width={200} className="mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden">
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
      
      {/* Diagonal Grid Lines */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, var(--border) 2px, var(--border) 4px)'
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
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)] font-[var(--font-inter)]">
              {inviteToken
                ? isLogin
                  ? 'Sign in to accept your organization invitation.'
                  : 'Register with the invited email address to join the organization.'
                : 'Secure Environment File Management'}
            </p>
          </div>

          {/* Form Container with Grid Border */}
          <div className="relative">
            {/* Inner Grid Pattern */}
            <div className="absolute inset-0 rounded-lg opacity-5" style={{
              backgroundImage: `
                linear-gradient(to right, var(--accent) 1px, transparent 1px),
                linear-gradient(to bottom, var(--accent) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px'
            }}></div>
            
            <form 
              className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm p-8 sm:p-10 space-y-6 z-10"
              onSubmit={handleSubmit}
            >
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-[var(--accent)]/30 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-[var(--accent)]/30 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-[var(--accent)]/30 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-[var(--accent)]/30 rounded-br-lg"></div>

              {error && (
                <div className="rounded-md border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
                  <p className="text-sm text-[var(--error)] font-[var(--font-inter)]">{error}</p>
                  {showResendVerification && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="mt-2 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] underline font-[var(--font-inter)]"
                    >
                      Resend verification email
                    </button>
                  )}
                </div>
              )}

              {success && (
                <div className="rounded-md border border-green-500/50 bg-green-500/10 p-4">
                  <p className="text-sm text-green-600 dark:text-green-400 font-[var(--font-inter)]">{success}</p>
                </div>
              )}
              
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[var(--foreground)] font-[var(--font-inter)] mb-2">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required={!isLogin}
                      className="block w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all font-[var(--font-inter)]"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-[var(--foreground)] font-[var(--font-inter)] mb-2">
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required={!isLogin}
                      minLength={3}
                      maxLength={30}
                      pattern="[a-z0-9_]+"
                      className="block w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all font-[var(--font-inter)]"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="username (lowercase, numbers, underscores only)"
                    />
                    <p className="mt-1 text-xs text-[var(--text-muted)] font-[var(--font-inter)]">
                      3-30 characters, lowercase letters, numbers, and underscores only
                    </p>
                  </div>
                </>
              )}

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
                  className="block w-full rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-[var(--foreground)] placeholder:text-[var(--text-muted)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 transition-all font-[var(--font-inter)] disabled:opacity-70"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  readOnly={!!inviteToken && !!invitedEmail}
                  disabled={!!inviteToken && !!invitedEmail}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] font-[var(--font-inter)]">
                    Password
                  </label>
                  {isLogin && (
                    <Link
                      href="/forgot-password"
                      className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-[var(--font-inter)]"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  minLength={8}
                  placeholder={isLogin ? 'Enter your password' : 'Create a password (min 8 characters)'}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[var(--accent)]/25 font-[var(--font-inter)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </span>
                  ) : (
                    isLogin ? 'Sign in' : 'Sign up'
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccess('');
                    setShowResendVerification(false);
                    setPassword('');
                  }}
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-[var(--font-inter)]"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
