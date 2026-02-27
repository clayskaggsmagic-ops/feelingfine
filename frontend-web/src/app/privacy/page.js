'use client';

import styles from './legal.module.css';

export default function PrivacyPage() {
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <h1>Privacy Policy</h1>
                <p className={styles.updated}>Last updated: February 27, 2026</p>

                <section>
                    <h2>1. Information We Collect</h2>
                    <p>When you create an account, we collect:</p>
                    <ul>
                        <li><strong>Account information:</strong> email address, display name, and optional profile photo.</li>
                        <li><strong>Wellness data:</strong> daily feeling scores, completed tasks, survey responses, and program progress.</li>
                        <li><strong>Usage data:</strong> pages visited, features used, and session duration (anonymized).</li>
                        <li><strong>Community data:</strong> chat messages, friend connections, and group memberships.</li>
                    </ul>
                </section>

                <section>
                    <h2>2. How We Use Your Data</h2>
                    <ul>
                        <li>Deliver personalized daily wellness content and track your progress.</li>
                        <li>Send daily wellness emails (if opted in).</li>
                        <li>Generate AI-powered insights using Google Gemini (see Section 6).</li>
                        <li>Improve the app experience through anonymized analytics.</li>
                    </ul>
                </section>

                <section>
                    <h2>3. Third-Party Services</h2>
                    <p>We use the following services to operate Feeling Fine:</p>
                    <ul>
                        <li><strong>Firebase (Google):</strong> Authentication, database (Firestore & Data Connect), and hosting.</li>
                        <li><strong>Google Gemini:</strong> AI-powered wellness insights and content recommendations.</li>
                        <li><strong>Resend:</strong> Email delivery service for daily wellness emails.</li>
                    </ul>
                    <p>Each service has its own privacy policy. We encourage you to review them.</p>
                </section>

                <section>
                    <h2>4. Data Storage & Security</h2>
                    <p>Your data is stored in Google Cloud infrastructure (Firebase) with encryption at rest and in transit.
                        We follow OWASP security guidelines including rate limiting, input validation, and secure authentication.</p>
                </section>

                <section>
                    <h2>5. Your Rights</h2>
                    <ul>
                        <li><strong>Export:</strong> Download all your data at any time from Settings.</li>
                        <li><strong>Delete:</strong> Permanently delete your account and all data from Settings.</li>
                        <li><strong>Opt out:</strong> Disable email notifications from Settings.</li>
                    </ul>
                </section>

                <section>
                    <h2>6. AI Disclosure</h2>
                    <p>Feeling Fine uses Google Gemini AI to generate wellness insights, content summaries, and
                        personalized recommendations. Your wellness data may be processed by Gemini to provide
                        these features. AI-generated content is not medical advice.</p>
                </section>

                <section>
                    <h2>7. Contact</h2>
                    <p>Questions about this policy? Email us at <a href="mailto:art@feelingfine.org">art@feelingfine.org</a>.</p>
                </section>
            </div>
        </main>
    );
}
