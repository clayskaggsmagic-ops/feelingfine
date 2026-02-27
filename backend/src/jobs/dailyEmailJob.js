/**
 * Daily Email Job — Sends the daily wellness email to all active users.
 *
 * Uses node-cron to schedule. Default: 7:00 AM EST daily.
 * Can be overridden via APP_SETTINGS.emailSendTime.
 *
 * Start with: import './jobs/dailyEmailJob.js' in index.js
 * Requires: RESEND_API_KEY environment variable.
 */

import { query } from '../services/dataConnect.js';
import { sendBatch } from '../services/emailService.js';

// Default schedule: 7:00 AM EST (12:00 UTC)
const DEFAULT_CRON = '0 12 * * *';

/**
 * Run the daily email job.
 */
export async function runDailyEmail() {
    console.log('[dailyEmail] Starting daily email job...');

    try {
        // 1. Get all active users with email opt-in
        const userData = await query(`query { users { uid email displayName programStartDate programLength emailOptIn }}`);
        const users = (userData.users || []).filter(u => u.email && u.emailOptIn !== false);

        if (users.length === 0) {
            console.log('[dailyEmail] No eligible users — skipping');
            return;
        }

        // 2. Get the daily email template
        const templateData = await query(`query { emailTemplates(where: { templateId: { eq: "daily" } }) { subject htmlContent plainTextContent }}`);
        const template = templateData.emailTemplates?.[0];

        if (!template) {
            console.warn('[dailyEmail] No "daily" email template found — skipping');
            return;
        }

        // 3. Build personalized emails
        const recipients = users.map(user => {
            const daysSinceStart = user.programStartDate
                ? Math.floor((Date.now() - new Date(user.programStartDate).getTime()) / 86400000)
                : 0;
            const programDay = Math.min(daysSinceStart, user.programLength || 42);

            return {
                to: user.email,
                subject: (template.subject || 'Your Daily Dose')
                    .replace('{{name}}', user.displayName || 'Friend')
                    .replace('{{day}}', programDay),
                html: (template.htmlContent || '')
                    .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                    .replace(/\{\{day\}\}/g, programDay),
                text: (template.plainTextContent || '')
                    .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                    .replace(/\{\{day\}\}/g, programDay),
            };
        });

        // 4. Send in batches
        const results = await sendBatch(recipients);
        const sent = results.filter(r => !r.error).length;
        const failed = results.filter(r => r.error).length;
        console.log(`[dailyEmail] Complete: ${sent} sent, ${failed} failed out of ${recipients.length}`);

    } catch (err) {
        console.error('[dailyEmail] Job failed:', err);
    }
}

/**
 * Initialize the cron job (only if node-cron is available).
 */
export async function initDailyEmailJob() {
    try {
        const { default: cron } = await import('node-cron');
        cron.schedule(DEFAULT_CRON, () => {
            runDailyEmail();
        });
        console.log(`[dailyEmail] Cron scheduled: ${DEFAULT_CRON}`);
    } catch {
        console.warn('[dailyEmail] node-cron not installed — daily email job disabled. Install with: npm i node-cron');
    }
}
