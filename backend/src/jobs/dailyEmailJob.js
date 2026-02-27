/**
 * Daily Email Job — Sends the daily wellness email to users at 10 AM their local time.
 *
 * Strategy: Cron runs EVERY HOUR. Each run checks which IANA timezones
 * currently have 10:00 AM, then sends emails only to those users.
 * This handles DST automatically since we use IANA timezone names.
 *
 * Start with: import { initDailyEmailJob } from './jobs/dailyEmailJob.js' in index.js
 * Requires: RESEND_API_KEY environment variable.
 */

import { getEmailEligibleUsers, getEmailTemplate } from '../services/dataConnect.js';
import { sendBatch } from '../services/emailService.js';
import { getNow } from '../services/programService.js';

// Run every hour at :00
const HOURLY_CRON = '0 * * * *';

// Target hour in user's local time
const TARGET_HOUR = 10; // 10:00 AM

// Default timezone for users who don't have one set
const DEFAULT_TIMEZONE = 'America/New_York';

/**
 * Check if a given IANA timezone is currently at the target hour.
 */
function isTargetHour(timezone, targetHour = TARGET_HOUR) {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            hour12: false,
        });
        const localHour = parseInt(formatter.format(now), 10);
        return localHour === targetHour;
    } catch {
        // Invalid timezone — skip
        return false;
    }
}

/**
 * Run the daily email job.
 * @param {Object} [options]
 * @param {boolean} [options.skipTimeCheck] - If true, skip the 10 AM timezone
 *        filter and send to ALL eligible users. Used by the dev day-advance tool.
 */
export async function runDailyEmail({ skipTimeCheck = false } = {}) {
    console.log(`[dailyEmail] Starting email check... (skipTimeCheck: ${skipTimeCheck})`);

    try {
        // 1. Get all active users with email opt-in
        const allUsers = await getEmailEligibleUsers();

        if (allUsers.length === 0) {
            console.log('[dailyEmail] No eligible users — skipping');
            return { sent: 0, failed: 0, total: 0 };
        }

        // 2. Filter to users whose local time is currently 10 AM (skip in dev mode)
        const users = skipTimeCheck
            ? allUsers
            : allUsers.filter(user => {
                const tz = user.timezone || DEFAULT_TIMEZONE;
                return isTargetHour(tz);
            });

        if (users.length === 0) {
            console.log(`[dailyEmail] No users at ${TARGET_HOUR}:00 AM right now — skipping`);
            return { sent: 0, failed: 0, total: 0, skipped: 'no users at target hour' };
        }

        console.log(`[dailyEmail] ${users.length} users to email${skipTimeCheck ? ' (dev: all users)' : ` at ${TARGET_HOUR}:00 AM`}`);

        // 3. Get the daily email template
        const template = await getEmailTemplate('daily');

        if (!template || !template.isActive) {
            console.warn('[dailyEmail] No active "daily" email template found — skipping');
            return { sent: 0, failed: 0, total: users.length, error: 'No active template' };
        }

        // 4. Build personalized emails
        const recipients = users.map(user => {
            const daysSinceStart = user.programStartDate
                ? Math.floor((getNow().getTime() - new Date(user.programStartDate).getTime()) / 86400000)
                : 1;
            const programDay = Math.max(1, daysSinceStart);

            return {
                to: user.email,
                subject: (template.subject || 'Your Daily Dose')
                    .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                    .replace(/\{\{day\}\}/g, programDay),
                html: (template.htmlBody || '')
                    .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                    .replace(/\{\{day\}\}/g, programDay),
                text: (template.textBody || '')
                    .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                    .replace(/\{\{day\}\}/g, programDay),
            };
        });

        // 5. Send in batches
        const results = await sendBatch(recipients);
        const sent = results.filter(r => !r.error).length;
        const failed = results.filter(r => r.error).length;
        console.log(`[dailyEmail] Complete: ${sent} sent, ${failed} failed out of ${recipients.length}`);

        return { sent, failed, total: recipients.length };
    } catch (err) {
        console.error('[dailyEmail] Job failed:', err);
        return { sent: 0, failed: 0, total: 0, error: err.message };
    }
}

/**
 * Send the daily dose email to a SINGLE user (used by signup for Day 1 immediate email).
 * @param {object} user - User object with { email, displayName, programStartDate }
 */
export async function sendDoseEmailToUser(user) {
    try {
        const template = await getEmailTemplate('daily');
        if (!template || !template.isActive) {
            console.warn('[dailyEmail] No active "daily" template — skipping welcome dose email');
            return { sent: false, reason: 'No active template' };
        }

        const programDay = 1; // Always Day 1 on signup

        const email = {
            to: user.email,
            subject: (template.subject || 'Your Daily Dose')
                .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                .replace(/\{\{day\}\}/g, programDay),
            html: (template.htmlBody || '')
                .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                .replace(/\{\{day\}\}/g, programDay),
            text: (template.textBody || '')
                .replace(/\{\{name\}\}/g, user.displayName || 'Friend')
                .replace(/\{\{day\}\}/g, programDay),
        };

        const { sendEmail } = await import('../services/emailService.js');
        await sendEmail(email);
        console.log(`[dailyEmail] Welcome dose email sent to ${user.email} (Day 1)`);
        return { sent: true };
    } catch (err) {
        console.error(`[dailyEmail] Failed to send welcome dose to ${user.email}:`, err.message);
        return { sent: false, error: err.message };
    }
}

/**
 * Initialize the cron job (runs every hour).
 */
export async function initDailyEmailJob() {
    try {
        const { default: cron } = await import('node-cron');
        cron.schedule(HOURLY_CRON, () => {
            runDailyEmail();
        });
        console.log(`[dailyEmail] Cron scheduled: ${HOURLY_CRON} (checks every hour for users at ${TARGET_HOUR}:00 AM local)`);
    } catch {
        console.warn('[dailyEmail] node-cron not installed — daily email cron disabled. Use trigger endpoint instead.');
    }
}
