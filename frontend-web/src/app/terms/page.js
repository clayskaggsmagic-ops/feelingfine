'use client';

import styles from './legal.module.css';

export default function TermsPage() {
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <h1>Terms of Service</h1>
                <p className={styles.updated}>Last updated: February 27, 2026</p>

                <section>
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing or using Feeling Fine, you agree to these Terms of Service.
                        If you do not agree, please do not use the application.</p>
                </section>

                <section>
                    <h2>2. Description of Service</h2>
                    <p>Feeling Fine is a daily wellness platform that provides health-related content,
                        tracking tools, and community features designed for aging adults.
                        The service includes daily wellness messages, habit tracking, feeling scores,
                        community chat, and AI-powered insights.</p>
                </section>

                <section>
                    <h2>3. Not Medical Advice</h2>
                    <div className={styles.disclaimer}>
                        <strong>⚠️ Important:</strong> Feeling Fine is a wellness tool, not a medical service.
                        The content, recommendations, and AI-generated insights provided through this app
                        are for general wellness purposes only and do not constitute medical advice,
                        diagnosis, or treatment. Always consult with a qualified healthcare professional
                        before making any health-related decisions.
                    </div>
                </section>

                <section>
                    <h2>4. User Accounts</h2>
                    <ul>
                        <li>You must provide accurate information when creating an account.</li>
                        <li>You are responsible for maintaining the security of your account.</li>
                        <li>You may delete your account at any time from Settings.</li>
                    </ul>
                </section>

                <section>
                    <h2>5. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Use the service for any unlawful purpose.</li>
                        <li>Harass, abuse, or harm other users in community features.</li>
                        <li>Attempt to bypass security measures or rate limits.</li>
                        <li>Upload malicious content or attempt to exploit the platform.</li>
                    </ul>
                </section>

                <section>
                    <h2>6. AI-Generated Content</h2>
                    <p>Certain features use Google Gemini AI to generate content. AI-generated content
                        may not always be accurate and should not be relied upon as professional advice.
                        We are not liable for any actions taken based on AI-generated recommendations.</p>
                </section>

                <section>
                    <h2>7. Limitation of Liability</h2>
                    <p>Feeling Fine is provided &ldquo;as is&rdquo; without warranties of any kind.
                        We are not liable for any damages arising from your use of the service,
                        including but not limited to health decisions made based on app content.</p>
                </section>

                <section>
                    <h2>8. Changes to Terms</h2>
                    <p>We may update these terms at any time. Continued use after changes constitutes acceptance.</p>
                </section>

                <section>
                    <h2>9. Contact</h2>
                    <p>Questions? Email us at <a href="mailto:art@feelingfine.org">art@feelingfine.org</a>.</p>
                </section>
            </div>
        </main>
    );
}
