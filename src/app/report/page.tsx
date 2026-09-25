'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import StatusChip from '@/components/StatusChip';
import SeverityChip from '@/components/SeverityChip';
import SlaCountdown from '@/components/SlaCountdown';
import styles from './report.module.css';

export default function ReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'report' | 'my-complaints'>('report');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'pending' | 'captured' | 'unavailable'>('pending');

  const [submitting, setSubmitting] = useState(false);
  const [classificationResult, setClassificationResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // My Complaints list
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/report');
    }
  }, [status, router]);

  // Capture Geolocation automatically on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
          setGeoStatus('captured');
        },
        (err) => {
          console.warn('Geolocation capture failed:', err);
          setGeoStatus('unavailable');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGeoStatus('unavailable');
    }
  }, []);

  // Fetch citizen's own complaints when switching to "My Complaints" tab
  useEffect(() => {
    if (activeTab === 'my-complaints' && status === 'authenticated') {
      fetchMyComplaints();
    }
  }, [activeTab, status]);

  async function fetchMyComplaints() {
    try {
      setLoadingComplaints(true);
      const res = await fetch('/api/complaints/mine');
      if (res.ok) {
        const data = await res.json();
        setMyComplaints(data.complaints || []);
      }
    } catch (err) {
      console.error('Error fetching my complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please enter a description of the issue.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setClassificationResult(null);

      const formData = new FormData();
      formData.append('description', description);
      if (addressText.trim()) formData.append('addressText', addressText.trim());
      if (file) formData.append('photo', file);
      if (coords) {
        formData.append('latitude', coords.lat.toString());
        formData.append('longitude', coords.lng.toString());
      }

      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint');
      }

      setClassificationResult(data.complaint);
      setDescription('');
      setAddressText('');
      setFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing your complaint');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.panel}>Verifying citizen credentials...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabGroup}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'report' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('report')}
        >
          📸 Report an Issue
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'my-complaints' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('my-complaints')}
        >
          📂 My Complaints ({myComplaints.length})
        </button>
      </div>

      {activeTab === 'report' ? (
        <>
          {classificationResult && (
            <div className={styles.resultCard}>
              <div className={styles.resultTitle}>
                ✅ Auto-Classified & Routed to Department!
              </div>
              <p style={{ color: 'var(--forest)', fontSize: '0.9rem' }}>
                Your complaint was triaged using AI and an immutable SLA resolution deadline has been registered.
              </p>
              <div className={styles.resultGrid}>
                <div className={styles.resultItem}>
                  <div className={styles.resultLabel}>Category</div>
                  <div className={styles.resultValue}>{classificationResult.category}</div>
                </div>
                <div className={styles.resultItem}>
                  <div className={styles.resultLabel}>Department</div>
                  <div className={styles.resultValue}>{classificationResult.department?.name}</div>
                </div>
                <div className={styles.resultItem}>
                  <div className={styles.resultLabel}>Severity</div>
                  <div className={styles.resultValue}>
                    <SeverityChip severity={classificationResult.severity} />
                  </div>
                </div>
                <div className={styles.resultItem}>
                  <div className={styles.resultLabel}>SLA Deadline</div>
                  <div className={styles.resultValue}>
                    <SlaCountdown
                      deadline={classificationResult.slaDeadline}
                      status={classificationResult.status}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.panel}>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Photo of Civic Issue (Recommended)</label>
                <span className={styles.sublabel}>
                  Take or upload a clear photo for automated AI vision classification.
                </span>
                <div
                  className={styles.fileInputWrapper}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                  />
                  {previewUrl ? (
                    <div>
                      <Image
                        src={previewUrl}
                        alt="Issue Preview"
                        width={200}
                        height={160}
                        className={styles.previewImg}
                        unoptimized
                      />
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Click to change photo
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        📷 Click or tap to take photo / upload file
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Supports JPG, PNG, WEBP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description *</label>
                <textarea
                  className={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue (e.g., Deep pothole causing vehicular damage near the traffic junction)..."
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Landmark / Street Address (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="e.g., Opposite Central Hospital Gate 2"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>GPS Coordinates</label>
                {geoStatus === 'captured' && coords ? (
                  <div className={styles.geoBadge}>
                    📍 Coordinates Captured: {coords.lat}, {coords.lng}
                  </div>
                ) : (
                  <div className={`${styles.geoBadge} ${styles.geoUnavailable}`}>
                    ⚠️ Location unavailable (GPS permission required or off)
                  </div>
                )}
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--brick)', fontSize: '0.88rem', marginBottom: '1rem' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Classifying & Routing with AI...' : 'Submit & Start SLA Clock'}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className={styles.panel}>
          {loadingComplaints ? (
            <div className={styles.emptyState}>Loading your complaints...</div>
          ) : myComplaints.length === 0 ? (
            <div className={styles.emptyState}>
              <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                You haven't submitted any complaints yet.
              </p>
              <button
                onClick={() => setActiveTab('report')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-soft)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Report your first issue now →
              </button>
            </div>
          ) : (
            <div>
              {myComplaints.map((c) => (
                <div key={c.id} className={styles.complaintCard}>
                  {c.photoUrl && (
                    <Image
                      src={c.photoUrl}
                      alt={c.category}
                      width={100}
                      height={100}
                      className={styles.cardThumb}
                      unoptimized
                    />
                  )}
                  <div className={styles.cardContent}>
                    <div>
                      <div className={styles.cardHeader}>
                        <div>
                          <span className={styles.cardCategory}>{c.category.replace('_', ' ')}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            • {c.department?.name}
                          </span>
                        </div>
                        <StatusChip status={c.status} />
                      </div>
                      <p className={styles.cardDesc}>{c.description}</p>
                    </div>

                    <div className={styles.cardFooter}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <SeverityChip severity={c.severity} />
                        {c.addressText && <span>📍 {c.addressText}</span>}
                      </div>
                      <div>
                        SLA:{' '}
                        <SlaCountdown
                          deadline={c.slaDeadline}
                          status={c.status}
                          resolvedAt={c.resolvedAt}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
