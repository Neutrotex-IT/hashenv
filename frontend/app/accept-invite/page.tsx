'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { invitesAPI, InvitePreview } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshOrganizations } = useOrganization();
  const { error: toastError } = useToast();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadPreview = async () => {
      if (!token) {
        setError('Invite token is missing');
        setLoading(false);
        return;
      }

      try {
        const data = await invitesAPI.preview(token);
        setPreview(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Invite not found');
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [token]);

  useEffect(() => {
    const acceptIfReady = async () => {
      if (!token || !preview?.canAccept || !isAuthenticated || authLoading || success) {
        return;
      }

      setAccepting(true);
      setError('');

      try {
        const result = await invitesAPI.accept(token);
        setSuccess(result.message || 'Invite accepted successfully');
        await refreshOrganizations();
      } catch (err: any) {
        const message = err.response?.data?.error || 'Failed to accept invite';
        if (
          preview?.type === 'project' &&
          message.toLowerCase().includes('organization')
        ) {
          setError(
            `You must join ${preview.organization?.name || 'the organization'} before you can access this project. Ask your admin for an organization invite, or sign in with an account that is already a member.`
          );
        } else {
          setError(message);
        }
        toastError(message);
      } finally {
        setAccepting(false);
      }
    };

    acceptIfReady();
  }, [token, preview, isAuthenticated, authLoading, success, refreshOrganizations]);

  const loginHref = token ? `/login?invite=${encodeURIComponent(token)}` : '/login';
  const registerHref = token
    ? `/login?invite=${encodeURIComponent(token)}&register=1${preview?.email ? `&email=${encodeURIComponent(preview.email)}` : ''}`
    : '/login';

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, var(--border) 1px, transparent 1px),
              linear-gradient(to bottom, var(--border) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md z-10">
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-[var(--radius-lg)] p-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image src="/hashenv-transparent.svg" alt="HashEnv Logo" width={40} height={40} className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-[var(--accent)]">HashEnv</h1>
          </Link>

          {loading || authLoading ? (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">Loading invitation...</p>
            </div>
          ) : error && !preview ? (
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Invalid Invitation</h2>
              <p className="text-[var(--text-muted)] mb-6">{error}</p>
              <Button variant="primary" size="md" asLink href="/login">
                Go to Login
              </Button>
            </div>
          ) : success ? (
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Welcome aboard</h2>
              <p className="text-[var(--text-muted)] mb-6">{success}</p>
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  router.push(
                    preview?.type === 'organization' && preview.organization?._id
                      ? `/organizations/${preview.organization._id}/members`
                      : preview?.type === 'project' && preview.project?._id
                        ? `/projects/${preview.project._id}`
                        : '/dashboard'
                  )
                }
              >
                {preview?.type === 'organization'
                  ? 'Go to Organization'
                  : preview?.type === 'project'
                    ? 'Go to Project'
                    : 'Go to Dashboard'}
              </Button>
            </div>
          ) : preview ? (
            <div>
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
                {preview.type === 'project'
                  ? `Join ${preview.project?.name || 'project'}`
                  : `Join ${preview.organization?.name || 'organization'}`}
              </h2>
            {preview.type === 'project' && preview.canAccept && (
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  You must already be a member of <strong>{preview.organization?.name}</strong> to join this
                  project. If you are not, ask your admin for an organization invite first.
                </p>
              )}
              <p className="text-[var(--text-muted)] mb-4">
                {preview.type === 'project' ? (
                  <>
                    You have been invited to collaborate on <strong>{preview.project?.name}</strong> in{' '}
                    <strong>{preview.organization?.name}</strong> with <strong>{preview.permission}</strong> access.
                  </>
                ) : (
                  <>
                    You have been invited to join <strong>{preview.organization?.name}</strong> as a{' '}
                    <strong>{preview.role}</strong>.
                  </>
                )}
              </p>
              <p className="text-sm text-[var(--text-muted)] mb-6">
                Invitation sent to <strong>{preview.email}</strong>
              </p>

              {preview.status === 'accepted' && (
                <p className="text-sm text-[var(--text-muted)] mb-6">This invitation has already been accepted.</p>
              )}
              {preview.expired && (
                <p className="text-sm text-[var(--error)] mb-6">This invitation has expired.</p>
              )}
              {error && <p className="text-sm text-[var(--error)] mb-4">{error}</p>}

              {preview.canAccept && !isAuthenticated && (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    {preview.requiresRegistration
                      ? 'Create an account with the invited email address to join this organization.'
                      : 'Sign in with the invited email address to join this organization.'}
                  </p>
                  {preview.requiresRegistration ? (
                    <Button variant="primary" size="md" className="w-full" asLink href={registerHref}>
                      Create Account
                    </Button>
                  ) : (
                    <Button variant="primary" size="md" className="w-full" asLink href={loginHref}>
                      Sign In to Accept
                    </Button>
                  )}
                  <Button variant="secondary" size="md" className="w-full" asLink href={loginHref}>
                    Already have an account? Sign in
                  </Button>
                </div>
              )}

              {preview.canAccept && isAuthenticated && accepting && (
                <p className="text-sm text-[var(--text-muted)]">Accepting invitation...</p>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
