'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './login.module.css';

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/report';
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      await signIn('google', { callbackUrl });
    } catch (err) {
      console.error('Sign in error:', err);
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.panel}>
        <h1 className={styles.title}>Official Citizen Sign In</h1>
        <p className={styles.subtitle}>
          Sign in with your Google account to submit civic complaints and track live SLA resolution timers.
        </p>

        <button
          className={styles.googleBtn}
          onClick={handleGoogleSignIn}
          disabled={loading || status === 'loading'}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          {loading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className={styles.footerNote}>
          Department staff and administrators sign in here as well. Administrative roles are provisioned by municipal system controllers.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.panel}>Loading sign in...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
