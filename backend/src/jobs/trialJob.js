import { query, updateUser } from '../services/dataConnect.js';
import { sendEmail } from '../services/emailService.js';
import { getNow, getDateKey } from '../services/programService.js';

// Constants for Trial Configuration
const TRIAL_DAYS = 60;
const REQUIRED_ACTIVE_DAYS = 50;
const MAX_MISSED_DAYS = TRIAL_DAYS - REQUIRED_ACTIVE_DAYS; // 10 days
const WARNING_1_THRESHOLD = 5; // Missed 5 days
const WARNING_2_THRESHOLD = 8; // Missed 8 days

/**
 * Replace all template placeholders in a string.
 */
function fillTemplate(str, vars) {
    if (!str) return '';
    return str
        .replace(/\{\{userName\}\}/g, vars.userName)
        .replace(/\{\{missedDays\}\}/g, vars.missedDays)
        .replace(/\{\{maxMissed\}\}/g, vars.maxMissed)
        .replace(/\{\{appUrl\}\}/g, vars.appUrl);
}

const TEMPLATES = {
    warning1: {
        subject: "We noticed you've missed a few days...",
        text: `Hi {{userName}},\n\nWe noticed you've missed {{missedDays}} days of your Daily Dos. This program only works if you do the work! Please log in and complete your tasks. Remember, you can only miss ${MAX_MISSED_DAYS} days during your trial.`,
        html: `<p>Hi {{userName}},</p><p>We noticed you've missed {{missedDays}} days of your Daily Dos. This program only works if you do the work!</p><p>Please log in and complete your tasks. Remember, you can only miss ${MAX_MISSED_DAYS} days during your trial.</p>`,
    },
    warning2: {
        subject: "Action Required: Your trial is at risk",
        text: `Hi {{userName}},\n\nYou've now missed {{missedDays}} days. If you reach ${MAX_MISSED_DAYS + 1} missed days, your trial will be canceled. Let's get back on track today!`,
        html: `<p>Hi {{userName}},</p><p>You've now missed {{missedDays}} days. If you reach ${MAX_MISSED_DAYS + 1} missed days, your trial will be canceled.</p><p><strong>Let's get back on track today!</strong></p>`,
    },
    failed: {
        subject: "Your Feeling Younger trial has ended",
        text: `Hi {{userName}},\n\nBecause you've missed more than ${MAX_MISSED_DAYS} days of the program, we are pausing your trial. Maybe you're not ready. Let's stop now, and then you can apply again when you're ready to fully commit to the assignments.\n\nBest of luck.`,
        html: `<p>Hi {{userName}},</p><p>Because you've missed more than ${MAX_MISSED_DAYS} days of the program, we are pausing your trial.</p><p>Maybe you're not ready. Let's stop now, and then you can apply again when you're ready to fully commit to the assignments.</p><p>Best of luck.</p>`,
    },
    graduated: {
        subject: "Congratulations! You've completed your trial!",
        text: `Hi {{userName}},\n\nAmazing work! You've successfully completed the required 50 days of assignments during your trial. You've proven your commitment to feeling younger.\n\nYou are now officially invited to join the full, fee-based Feeling Fine program to continue your journey. Click here to upgrade: {{appUrl}}/upgrade`,
        html: `<p>Hi {{userName}},</p><p><strong>Amazing work!</strong> You've successfully completed the required 50 days of assignments during your trial. You've proven your commitment to feeling younger.</p><p>You are now officially invited to join the full, fee-based Feeling Fine program to continue your journey.</p><p><a href="{{appUrl}}/upgrade">Click here to upgrade</a></p>`,
    }
};

/**
 * Evaluates the trial status for all active trial users.
 * Should be run daily via cron.
 */
export async function evaluateTrials() {
    console.log('[trialEval] Starting trial evaluation job...');

    try {
        // 1. Get all active trial users
        const activeUsersRes = await query(`
            query {
                users(where: { trialStatus: { eq: "active" }, role: { eq: "user" } }) {
                    id
                    email
                    displayName
                    trialStartedAt
                    warningsSent
                }
            }
        `);

        const users = activeUsersRes.users || [];
        console.log(`[trialEval] Found ${users.length} active trial users.`);

        const now = getNow();
        const todayKey = getDateKey(now);

        for (const user of users) {
            try {
                if (!user.trialStartedAt) continue;

                const startDate = new Date(user.trialStartedAt);
                const startKey = getDateKey(startDate);

                // Calculate days elapsed (inclusive)
                const msElapsed = now.getTime() - startDate.getTime();
                const daysElapsed = Math.max(1, Math.floor(msElapsed / (1000 * 60 * 60 * 24)));

                // Fetch tracking history to count active days
                const historyRes = await query(`
                    query($uid: String!, $startKey: Date!) {
                        trackingDays(where: { userId: { eq: $uid }, dateKey: { ge: $startKey } }) {
                            dateKey
                        }
                        completedDos(where: { userId: { eq: $uid }, dateKey: { ge: $startKey } }) {
                            dateKey
                        }
                        customDos(where: { userId: { eq: $uid }, dateKey: { ge: $startKey } }) {
                            dateKey
                        }
                    }
                `, { uid: user.id, startKey });

                // An active day is any day where at least one DO was completed
                const activeDates = new Set();

                if (historyRes.completedDos) {
                    historyRes.completedDos.forEach(d => activeDates.add(d.dateKey));
                }
                if (historyRes.customDos) {
                    historyRes.customDos.forEach(d => activeDates.add(d.dateKey));
                }

                // Do not penalize if today is not over yet. So if today is not in activeDates,
                // we only count it as a missed day if we are looking at past days.
                // To be safe, we calculate elapsed full days. If they did something today, great.
                // If not, we don't count today against them yet.

                const fullDaysElapsed = daysElapsed - 1; // don't count today

                // Count active days in the past (not counting today)
                let pastActiveDays = 0;
                activeDates.forEach(date => {
                    if (date < todayKey) pastActiveDays++;
                });

                const missedDays = Math.max(0, fullDaysElapsed - pastActiveDays);
                const totalActiveDays = activeDates.size; // including today

                console.log(`[trialEval] User ${user.email} (Days Elapsed: ${fullDaysElapsed}, Past Active: ${pastActiveDays}, Missed: ${missedDays}, Total Active: ${totalActiveDays})`);

                const vars = {
                    userName: user.displayName || 'Friend',
                    missedDays,
                    maxMissed: MAX_MISSED_DAYS,
                    appUrl: process.env.APP_URL || 'https://app.feelingfine.org'
                };

                // Check Failure (Kicked Out)
                if (missedDays > MAX_MISSED_DAYS) {
                    console.log(`[trialEval] User ${user.email} failed trial.`);
                    await updateUser(user.id, { trialStatus: 'failed' });
                    await sendEmail({
                        to: user.email,
                        subject: fillTemplate(TEMPLATES.failed.subject, vars),
                        text: fillTemplate(TEMPLATES.failed.text, vars),
                        html: fillTemplate(TEMPLATES.failed.html, vars)
                    });
                    continue;
                }

                // Check Success (Graduated)
                if (totalActiveDays >= REQUIRED_ACTIVE_DAYS) {
                    console.log(`[trialEval] User ${user.email} graduated trial!`);
                    await updateUser(user.id, { trialStatus: 'graduated' });
                    await sendEmail({
                        to: user.email,
                        subject: fillTemplate(TEMPLATES.graduated.subject, vars),
                        text: fillTemplate(TEMPLATES.graduated.text, vars),
                        html: fillTemplate(TEMPLATES.graduated.html, vars)
                    });
                    continue;
                }

                // Check Warnings
                const warningsSent = user.warningsSent || 0;

                if (missedDays >= WARNING_2_THRESHOLD && warningsSent < 2) {
                    console.log(`[trialEval] Sending Warning 2 to ${user.email}.`);
                    await updateUser(user.id, { warningsSent: 2 });
                    await sendEmail({
                        to: user.email,
                        subject: fillTemplate(TEMPLATES.warning2.subject, vars),
                        text: fillTemplate(TEMPLATES.warning2.text, vars),
                        html: fillTemplate(TEMPLATES.warning2.html, vars)
                    });
                } else if (missedDays >= WARNING_1_THRESHOLD && warningsSent < 1) {
                    console.log(`[trialEval] Sending Warning 1 to ${user.email}.`);
                    await updateUser(user.id, { warningsSent: 1 });
                    await sendEmail({
                        to: user.email,
                        subject: fillTemplate(TEMPLATES.warning1.subject, vars),
                        text: fillTemplate(TEMPLATES.warning1.text, vars),
                        html: fillTemplate(TEMPLATES.warning1.html, vars)
                    });
                }

            } catch (userErr) {
                console.error(`[trialEval] Error processing user ${user.id}:`, userErr);
            }
        }
        console.log('[trialEval] Job complete.');
    } catch (err) {
        console.error('[trialEval] Critical Error:', err);
    }
}
