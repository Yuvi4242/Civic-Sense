'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StatusChip from '@/components/StatusChip';
import SeverityChip from '@/components/SeverityChip';
import SlaCountdown from '@/components/SlaCountdown';
import styles from './department.module.css';

export default function DepartmentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [complaints, setComplaints] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Modal State for resolving complaint with optional proof
  const [resolvingComplaint, setResolvingComplaint] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/department');
      return;
    }
    if (status === 'authenticated') {
      if (session?.user?.role !== 'DEPARTMENT_STAFF' && session?.user?.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      fetchComplaints();
    }
  }, [status, session, router, filter]);

  async function fetchComplaints() {
    try {
      setLoading(true);
      const url = filter === 'ALL' ? '/api/complaints' : `/api/complaints?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusTransition(complaintId: string, nextStatus: string) {
    if (nextStatus === 'RESOLVED') {
      const target = complaints.find((c) => c.id === complaintId);
      setResolvingComplaint(target);
      return;
    }

    try {
      setActionInProgress(complaintId);
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          note: `Transitioned status to ${nextStatus}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Transition failed');
      }

      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionInProgress(null);
    }
  }

  async function submitResolution() {
    if (!resolvingComplaint) return;

    try {
      setActionInProgress(resolvingComplaint.id);

      const formData = new FormData();
      formData.append('status', 'RESOLVED');
      formData.append('note', resolutionNote || 'Work completed and issue resolved.');
      if (proofFile) {
        formData.append('proofPhoto', proofFile);
      }

      const res = await fetch(`/api/complaints/${resolvingComplaint.id}/status`, {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Resolution failed');
      }

      setResolvingComplaint(null);
      setResolutionNote('');
      setProofFile(null);
      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Failed to submit resolution');
    } finally {
      setActionInProgress(null);
    }
  }

  function getNextAction(currentStatus: string) {
    switch (currentStatus) {
      case 'SUBMITTED':
        return { label: 'Acknowledge Triage', next: 'ACKNOWLEDGED' };
      case 'ACKNOWLEDGED':
        return { label: 'Start Work (In Progress)', next: 'IN_PROGRESS' };
      case 'IN_PROGRESS':
        return { label: 'Mark Resolved ✓', next: 'RESOLVED' };
      default:
        return null;
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>Loading department triage queue...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Department Triage & Action Queue</h1>
          <p className={styles.subtitle}>
            Enforce SLA resolution deadlines. Status progression is strictly unidirectional and logged to the public ledger.
          </p>
        </div>
      </header>

      <div className={styles.filterBar}>
        {['ALL', 'SUBMITTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'].map((s) => (
          <button
            key={s}
            className={`${styles.filterBtn} ${filter === s ? styles.activeFilter : ''}`}
            onClick={() => setFilter(s)}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {complaints.length === 0 ? (
        <div className={styles.emptyState}>
          No complaints currently matching the filter "{filter}".
        </div>
      ) : (
        complaints.map((c) => {
          const action = getNextAction(c.status);
          return (
            <div key={c.id} className={styles.complaintRow}>
              {c.photoUrl && (
                <Image
                  src={c.photoUrl}
                  alt={c.category}
                  width={110}
                  height={110}
                  className={styles.cardThumb}
                  unoptimized
                />
              )}
              <div className={styles.cardBody}>
                <div>
                  <div className={styles.rowTop}>
                    <div>
                      <span className={styles.categoryName}>{c.category.replace('_', ' ')}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        • {c.department?.name}
                      </span>
                    </div>
                    <StatusChip status={c.status} />
                  </div>
                  <p className={styles.desc}>{c.description}</p>
                </div>

                <div className={styles.rowBottom}>
                  <div className={styles.metaGroup}>
                    <SeverityChip severity={c.severity} />
                    {c.addressText && <span>📍 {c.addressText}</span>}
                    <div>
                      SLA:{' '}
                      <SlaCountdown
                        deadline={c.slaDeadline}
                        status={c.status}
                        resolvedAt={c.resolvedAt}
                      />
                    </div>
                  </div>

                  {action ? (
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleStatusTransition(c.id, action.next)}
                      disabled={actionInProgress === c.id}
                    >
                      {actionInProgress === c.id ? 'Updating...' : action.label}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--forest)', fontWeight: 600 }}>
                      ✓ Lifecycle Complete
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Resolution Proof Modal */}
      {resolvingComplaint && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Mark Complaint as Resolved</h2>
            <p className={styles.modalSubtitle}>
              Confirm completion of repair works. You may optionally upload a photographic proof of resolution.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Resolution Note
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. Pothole filled and leveled with hot mix asphalt..."
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  minHeight: '80px',
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Proof Photo (Optional)
              </label>
              <input
                type="file"
                ref={proofInputRef}
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                accept="image/*"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setResolvingComplaint(null)}
                disabled={actionInProgress === resolvingComplaint.id}
              >
                Cancel
              </button>
              <button
                className={styles.actionBtn}
                onClick={submitResolution}
                disabled={actionInProgress === resolvingComplaint.id}
              >
                {actionInProgress === resolvingComplaint.id ? 'Submitting...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
