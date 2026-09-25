import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.container}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Report civic issues. Auto-route by AI. Hold departments accountable to public SLAs.
        </h1>
        <p className={styles.subtitle}>
          No manual triage delays. Potholes, broken streetlights, water leaks, and waste hazards are automatically classified and assigned to responsible municipal departments with fixed, enforceable resolution deadlines visible to everyone.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/report" className={styles.primaryCta}>
            📸 Report an Issue
          </Link>
          <Link href="/dashboard" className={styles.secondaryCta}>
            📊 View Public Dashboard
          </Link>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>How the Accountability Loop Works</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>STEP 01</div>
            <h3 className={styles.stepTitle}>Report with Photo</h3>
            <p className={styles.stepDesc}>
              Citizens snap a photo with automatic GPS geolocation capture and submit the issue in seconds.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>STEP 02</div>
            <h3 className={styles.stepTitle}>AI Classification</h3>
            <p className={styles.stepDesc}>
              Google Gemini Vision analyzes severity, category, and assigns the correct municipal department without human triage.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>STEP 03</div>
            <h3 className={styles.stepTitle}>Immutable SLA Clock</h3>
            <p className={styles.stepDesc}>
              A fixed resolution deadline is locked at creation. Live countdowns display on public watchdog feeds.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>STEP 04</div>
            <h3 className={styles.stepTitle}>Verified Resolution</h3>
            <p className={styles.stepDesc}>
              Staff progress status through an immutable state machine and attach photographic proof of resolution.
            </p>
          </div>
        </div>

        <div className={styles.bannerPanel}>
          <div className={styles.bannerContent}>
            <h3>Radical Municipal Transparency</h3>
            <p>Anyone can audit department performance and active SLA breaches with zero login required.</p>
          </div>
          <Link href="/dashboard" className={styles.secondaryCta}>
            Explore Live Ledger →
          </Link>
        </div>
      </section>
    </div>
  );
}
