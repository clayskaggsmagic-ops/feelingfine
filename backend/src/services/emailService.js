/**
 * Email Service — Sends emails via Resend API.
 *
 * Requires RESEND_API_KEY in environment variables.
 * Docs: https://resend.com/docs/api-reference
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Art <art@feelingfine.org>';

/**
 * Send a single email.
 */
export async function sendEmail({ to, subject, html, text }) {
    if (!RESEND_API_KEY) {
        console.warn('[email] RESEND_API_KEY not set — skipping send');
        return { id: 'dry-run', to };
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html, text }),
    });

    const data = await res.json();
    if (!res.ok) {
        console.error('[email] Resend error:', data);
        throw new Error(data.message || 'Failed to send email');
    }

    console.log(`[email] Sent to ${to}: ${data.id}`);
    return data;
}

/**
 * Send emails in batches to avoid rate limits.
 * @param {Array} recipients - Array of { to, subject, html, text }
 * @param {number} batchSize - Emails per batch (default 100)
 * @param {number} delayMs - Delay between batches in ms (default 1000)
 */
export async function sendBatch(recipients, batchSize = 100, delayMs = 1000) {
    const results = [];
    for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const promises = batch.map(r => sendEmail(r).catch(err => ({ error: err.message, to: r.to })));
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);

        if (i + batchSize < recipients.length) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    console.log(`[email] Batch complete: ${results.length} emails processed`);
    return results;
}
