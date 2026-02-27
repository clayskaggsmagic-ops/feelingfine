import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.landing}>
      {/* Decorative background */}
      <div className={styles.bgGradient} />
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={styles.hero}>
        <div className={styles.logoMark}>FF</div>
        <h1 className={styles.title}>Feeling Fine</h1>
        <p className={styles.subtitle}>
          Your daily wellness journey, one small step at a time.
        </p>
        <p className={styles.tagline}>
          A structured program built around 7 Cornerstones of Health
          — designed for people who believe the best years are still ahead.
        </p>

        <div className={styles.actions}>
          <Link href="/signup" className={`btn-primary ${styles.btnLarge}`}>
            Get Started
          </Link>
          <Link href="/login" className={`btn-secondary ${styles.btnLarge}`}>
            Sign In
          </Link>
        </div>

        <div className={styles.pillars}>
          {['Nutrition', 'Movement', 'Sleep', 'Stress', 'Social', 'Brain', 'Aging'].map(
            (name) => (
              <span key={name} className={styles.pillar}>{name}</span>
            )
          )}
        </div>
      </div>
    </main>
  );
}
