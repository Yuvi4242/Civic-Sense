'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

interface Department {
  id: string;
  name: string;
}

interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  role: 'CITIZEN' | 'DEPARTMENT_STAFF' | 'ADMIN';
  departmentId: string | null;
  department?: Department | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state tracking per user
  const [edits, setEdits] = useState<Record<string, { role: string; departmentId: string }>>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated') {
      if (session?.user?.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      fetchData();
    }
  }, [status, session, router]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        throw new Error('Failed to load users');
      }
      const data = await res.json();
      setUsers(data.users || []);
      setDepartments(data.departments || []);

      const initialEdits: Record<string, { role: string; departmentId: string }> = {};
      (data.users || []).forEach((u: UserRecord) => {
        initialEdits[u.id] = {
          role: u.role,
          departmentId: u.departmentId || (data.departments?.[0]?.id || ''),
        };
      });
      setEdits(initialEdits);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error loading data' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(userId: string) {
    const edit = edits[userId];
    if (!edit) return;

    try {
      setUpdatingId(userId);
      setMessage(null);

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: edit.role,
          departmentId: edit.role === 'DEPARTMENT_STAFF' ? edit.departmentId : null,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      setMessage({ type: 'success', text: `Role updated for ${result.user.email}` });
      await fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setUpdatingId(null);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.panel}>Loading Admin Management...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin: Role & Department Assignment</h1>
        <p className={styles.description}>
          Staff and Admin privileges cannot be self-assigned. Promote users and assign departmental jurisdictions below.
        </p>
      </header>

      {message && (
        <div className={`${styles.msg} ${message.type === 'success' ? styles.successMsg : styles.errorMsg}`}>
          {message.text}
        </div>
      )}

      <div className={styles.panel}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Assigned Department</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const currentEdit = edits[u.id] || { role: u.role, departmentId: u.departmentId || '' };
              return (
                <tr key={u.id}>
                  <td>{u.name || 'Anonymous Citizen'}</td>
                  <td className={styles.mono}>{u.email}</td>
                  <td>
                    <select
                      className={styles.select}
                      value={currentEdit.role}
                      onChange={(e) =>
                        setEdits({
                          ...edits,
                          [u.id]: { ...currentEdit, role: e.target.value },
                        })
                      }
                    >
                      <option value="CITIZEN">CITIZEN</option>
                      <option value="DEPARTMENT_STAFF">DEPARTMENT_STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>
                    {currentEdit.role === 'DEPARTMENT_STAFF' ? (
                      <select
                        className={styles.select}
                        value={currentEdit.departmentId}
                        onChange={(e) =>
                          setEdits({
                            ...edits,
                            [u.id]: { ...currentEdit, departmentId: e.target.value },
                          })
                        }
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.mono} style={{ color: 'var(--text-muted)' }}>
                        N/A
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className={styles.saveBtn}
                      onClick={() => handleSave(u.id)}
                      disabled={updatingId === u.id}
                    >
                      {updatingId === u.id ? 'Saving...' : 'Update'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
