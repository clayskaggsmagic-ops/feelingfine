import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Feeling Fine</h1>
        <p className={styles.subtitle}>
          Your daily wellness journey, one small step at a time.
        </p>
        <div className={styles.actions}>
          <a href="/signup" className={styles.btnPrimary}>Get Started</a>
          <a href="/login" className={styles.btnSecondary}>Sign In</a>
        </div>
      </div>
    </main>
  );
}
