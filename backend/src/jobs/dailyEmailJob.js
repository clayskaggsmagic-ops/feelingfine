import { getEmailEligibleUsers, getEmailTemplate, getDoseByDayNumber } from '../services/dataConnect.js';
import { sendBatch, sendEmail } from '../services/emailService.js';
import { getNow } from '../services/programService.js';

// Run every hour at :00
const HOURLY_CRON = '0 * * * *';

// Target hour in user's local time
const TARGET_HOUR = 10; // 10:00 AM

// Default timezone for users who don't have one set
const DEFAULT_TIMEZONE = 'America/New_York';

const APP_URL = 'https://feelingfine.org/dashboard';

/**
 * Replace all template placeholders in a string.
 */
function fillTemplate(str, vars) {
    if (!str) return '';
    return str
        .replace(/\{\{userName\}\}/g, vars.userName)
        .replace(/\{\{name\}\}/g, vars.userName)
        .replace(/\{\{programDay\}\}/g, vars.programDay)
        .replace(/\{\{day\}\}/g, vars.programDay)
        .replace(/\{\{doseMessage\}\}/g, vars.doseMessage)
        .replace(/\{\{adminMessage\}\}/g, vars.adminMessage)
        .replace(/\{\{appUrl\}\}/g, vars.appUrl)
        .replace(/\{\{unsubscribeUrl\}\}/g, vars.unsubscribeUrl);
}

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
        return false;
    }
}

/**
 * Run the daily email job.
 */
export async function runDailyEmail({ skipTimeCheck = false } = {}) {
    console.log(`[dailyEmail] Starting email check... (skipTimeCheck: ${skipTimeCheck})`);

    try {
        const allUsers = await getEmailEligibleUsers();
        if (allUsers.length === 0) {
            console.log('[dailyEmail] No eligible users — skipping');
            return { sent: 0, failed: 0, total: 0 };
        }

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

        console.log(`[dailyEmail] ${users.length} users to email`);

        const template = await getEmailTemplate('daily');
        if (!template || !template.isActive) {
            console.warn('[dailyEmail] No active "daily" email template found — skipping');
            return { sent: 0, failed: 0, total: users.length, error: 'No active template' };
        }

        // Build personalized emails with actual dose content
        const recipients = [];
        for (const user of users) {
            const daysSinceStart = user.programStartDate
                ? Math.floor((getNow().getTime() - new Date(user.programStartDate).getTime()) / 86400000)
                : 1;
            const programDay = Math.max(1, daysSinceStart);

            // Fetch the actual daily dose for this user's program day
            const dose = await getDoseByDayNumber(programDay);

            const vars = {
                userName: user.displayName || 'Friend',
                programDay: String(programDay),
                doseMessage: dose?.message || 'Check in with your wellness journey today.',
                adminMessage: dose?.adminMessage || '',
                appUrl: APP_URL,
                unsubscribeUrl: `${APP_URL.replace('/dashboard', '/settings')}`,
            };

            recipients.push({
                to: user.email,
                subject: fillTemplate(template.subject || 'Your Daily Dose — Day {{programDay}}', vars),
                html: fillTemplate(template.htmlBody || '', vars),
                text: fillTemplate(template.textBody || '', vars),
            });
        }

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
 */
export async function sendDoseEmailToUser(user) {
    try {
        const template = await getEmailTemplate('daily');
        if (!template || !template.isActive) {
            console.warn('[dailyEmail] No active "daily" template — skipping welcome dose email');
            return { sent: false, reason: 'No active template' };
        }

        const programDay = 1;
        const dose = await getDoseByDayNumber(1);

        const vars = {
            userName: user.displayName || 'Friend',
            programDay: '1',
            doseMessage: dose?.message || 'Welcome to your wellness journey!',
            adminMessage: dose?.adminMessage || '',
            appUrl: APP_URL,
            unsubscribeUrl: `${APP_URL.replace('/dashboard', '/settings')}`,
        };

        const email = {
            to: user.email,
            subject: fillTemplate(template.subject || 'Your Daily Dose — Day 1', vars),
            html: fillTemplate(template.htmlBody || '', vars),
            text: fillTemplate(template.textBody || '', vars),
        };

        await sendEmail(email);
        console.log(`[dailyEmail] Welcome dose email sent to ${user.email} (Day 1, dose: "${dose?.title || 'none'}")`);
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
