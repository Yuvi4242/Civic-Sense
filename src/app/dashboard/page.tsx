'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import StatusChip from '@/components/StatusChip';
import SeverityChip from '@/components/SeverityChip';
import SlaCountdown from '@/components/SlaCountdown';
import styles from './dashboard.module.css';

export default function PublicDashboardPage() {
  const [stats, setStats] = useState<{
    total: number;
    open: number;
    resolved: number;
    activeBreaches: number;
  }>({ total: 0, open: 0, resolved: 0, activeBreaches: 0 });

  const [departmentsPerf, setDepartmentsPerf] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Filter state
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [breachedOnly, setBreachedOnly] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsRes, perfRes, deptRes] = await Promise.all([
          fetch('/api/public/stats'),
          fetch('/api/public/departments-performance'),
          fetch('/api/departments'),
        ]);

        if (statsRes.ok) setStats(await statsRes.json());
        if (perfRes.ok) {
          const p = await perfRes.json();
          setDepartmentsPerf(p.performance || []);
        }
        if (deptRes.ok) {
          const d = await deptRes.json();
          setDepartments(d.departments || []);
        }
      } catch (err) {
        console.error('Failed loading public dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    async function loadComplaintsFeed() {
      try {
        const query = new URLSearchParams();
        if (selectedDept) query.append('departmentId', selectedDept);
        if (selectedCategory) query.append('category', selectedCategory);
        if (selectedStatus) query.append('status', selectedStatus);
        if (breachedOnly) query.append('breached', 'true');

        const res = await fetch(`/api/public/complaints?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setComplaints(data.complaints || []);
        }
      } catch (err) {
        console.error('Failed loading public complaints feed:', err);
      }
    }

    loadComplaintsFeed();
  }, [selectedDept, selectedCategory, selectedStatus, breachedOnly]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Public SLA Accountability Ledger</h1>
        <p className={styles.subtitle}>
          Real-time municipal performance metrics. Every complaint has a legally bounded SLA deadline visible to the public.
        </p>
      </header>

      {/* 1. City-Wide Stat Cards */}
      <section className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.total}</div>
          <div className={styles.statLabel}>Total Complaints Logged</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.open}</div>
          <div className={styles.statLabel}>Active / In Progress</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statNumber}>{stats.resolved}</div>
          <div className={styles.statLabel}>Successfully Resolved</div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statNumber} ${styles.breachNumber}`}>
            {stats.activeBreaches}
          </div>
          <div className={styles.statLabel}>Active SLA Breaches (Overdue)</div>
        </div>
      </section>

      {/* 2. Department Performance Table */}
      <section>
        <h2 className={styles.sectionTitle}>Municipal Department Scorecard</h2>
        <div className={styles.tableCard}>
          <table className={styles.perfTable}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Total Issues</th>
                <th>Open</th>
                <th>Resolved</th>
                <th>Avg Resolution</th>
                <th>Active Breaches</th>
                <th>Resolved Late</th>
                <th>SLA Compliance</th>
              </tr>
            </thead>
            <tbody>
              {departmentsPerf.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading department performance data...
                  </td>
                </tr>
              ) : (
                departmentsPerf.map((d) => (
                  <tr key={d.departmentId}>
                    <td className={styles.deptName}>{d.departmentName}</td>
                    <td className={styles.mono}>{d.total}</td>
                    <td className={styles.mono}>{d.open}</td>
                    <td className={styles.mono}>{d.resolved}</td>
                    <td className={styles.mono}>
                      {d.avgResolutionHours > 0 ? `${d.avgResolutionHours} hrs` : '—'}
                    </td>
                    <td>
                      <span
                        className={`${styles.breachChip} ${
                          d.activeBreaches === 0 ? styles.zeroBreach : ''
                        }`}
                      >
                        {d.activeBreaches === 0 ? '0 on-track' : `${d.activeBreaches} OVERDUE`}
                      </span>
                    </td>
                    <td className={styles.mono}>{d.resolvedLate}</td>
                    <td>
                      <strong
                        style={{
                          color:
                            d.complianceRate >= 90
                              ? 'var(--forest)'
                              : d.complianceRate >= 70
                              ? 'var(--amber)'
                              : 'var(--brick)',
                        }}
                      >
                        {d.complianceRate}%
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Filterable Public Complaint Feed */}
      <section>
        <div className={styles.feedHeader}>
          <h2 className={styles.sectionTitle}>Live Anonymized Complaints Feed</h2>
          <div className={styles.filters}>
            <select
              className={styles.select}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={breachedOnly}
                onChange={(e) => setBreachedOnly(e.target.checked)}
              />
              Show Breaches Only
            </label>
          </div>
        </div>

        <div>
          {complaints.length === 0 ? (
            <div className={styles.tableCard} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No public complaints match the current filter selection.
            </div>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                className={`${styles.complaintFeedItem} ${c.isBreached ? styles.breachedItem : ''}`}
              >
                {c.photoUrl && (
                  <Image
                    src={c.photoUrl}
                    alt={c.category}
                    width={100}
                    height={100}
                    className={styles.feedThumb}
                    unoptimized
                  />
                )}
                <div className={styles.feedBody}>
                  <div>
                    <div className={styles.feedTop}>
                      <div>
                        <span className={styles.feedCategory}>{c.category.replace('_', ' ')}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          • {c.department?.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <StatusChip status={c.status} />
                      </div>
                    </div>
                    <p className={styles.feedDesc}>{c.description}</p>
                  </div>

                  <div className={styles.feedBottom}>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <SeverityChip severity={c.severity} />
                      {c.addressText && <span>📍 {c.addressText}</span>}
                      {c.needsHumanReview && (
                        <span style={{ color: 'var(--amber)', fontSize: '0.78rem' }}>
                          ⚠️ Low confidence triage
                        </span>
                      )}
                    </div>
                    <div>
                      SLA Status:{' '}
                      <SlaCountdown
                        deadline={c.slaDeadline}
                        status={c.status}
                        resolvedAt={c.resolvedAt}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
