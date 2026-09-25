'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.brandGroup}>
          <Link href="/" className={styles.brand}>
            🏛️ Civic-Sense
          </Link>
          <span className={styles.badge}>Gov-Tech SLA</span>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/dashboard"
            className={`${styles.navLink} ${pathname === '/dashboard' ? styles.activeNavLink : ''}`}
          >
            Public Dashboard
          </Link>

          <Link
            href="/report"
            className={`${styles.navLink} ${pathname === '/report' ? styles.activeNavLink : ''}`}
          >
            Report Issue
          </Link>

          {user && (user.role === 'DEPARTMENT_STAFF' || user.role === 'ADMIN') && (
            <Link
              href="/department"
              className={`${styles.navLink} ${pathname === '/department' ? styles.activeNavLink : ''}`}
            >
              Department Queue
            </Link>
          )}

          {user && user.role === 'ADMIN' && (
            <Link
              href="/admin"
              className={`${styles.navLink} ${pathname === '/admin' ? styles.activeNavLink : ''}`}
            >
              Admin Roles
            </Link>
          )}

          <div className={styles.authGroup}>
            {status === 'loading' ? (
              <span className={styles.userEmail}>Loading...</span>
            ) : user ? (
              <>
                <span className={styles.userEmail}>{user.email}</span>
                <span className={styles.userRole}>{user.role}</span>
                <button onClick={() => signOut({ callbackUrl: '/' })} className={styles.signOutBtn}>
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className={styles.loginBtn}>
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
