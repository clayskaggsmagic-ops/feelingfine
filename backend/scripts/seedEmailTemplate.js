/**
 * Seed the "daily" email template into PostgreSQL via Data Connect.
 *
 * Run with: node --experimental-modules scripts/seedEmailTemplate.js
 * (after backend is running locally)
 */

import 'dotenv/config';
import '../src/services/firebase.js';
import { mutate } from '../src/services/dataConnect.js';

const TEMPLATE = {
    id: 'daily',
    name: 'Daily Wellness Email',
    subject: '💊 Your Daily Dose — Day {{day}}, {{name}}!',
    htmlBody: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;margin-top:20px;">
  <tr><td style="background:linear-gradient(135deg,#38b2ac,#2c7a7b);padding:30px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;">Your Daily Dose</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;">Day {{day}} of your journey</p>
  </td></tr>
  <tr><td style="padding:30px;">
    <p style="font-size:18px;color:#1a1a1a;margin:0 0 16px;">Hi {{name}} 👋</p>
    <p style="font-size:16px;color:#555;line-height:1.6;margin:0 0 20px;">
      Your wellness journey continues! Log in to see today's Daily Dose insight, check off your Daily Dos, and track your feeling score.
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://feelingfine.org/dashboard" style="display:inline-block;background:linear-gradient(135deg,#38b2ac,#2c7a7b);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;">
        Open Feeling Fine →
      </a>
    </div>
    <p style="font-size:14px;color:#999;margin:24px 0 0;text-align:center;">
      Consistency beats perfection. Even one task today is a win! 🌟
    </p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #eee;">
    <p style="font-size:12px;color:#aaa;margin:0;">
      You're receiving this because you signed up for Feeling Fine.
      <a href="https://feelingfine.org/settings" style="color:#38b2ac;">Manage preferences</a>
    </p>
  </td></tr>
</table>
</body>
</html>`,
    textBody: `Hi {{name}}! 👋

Your Daily Dose — Day {{day}}

Your wellness journey continues! Log in to see today's Daily Dose insight, check off your Daily Dos, and track your feeling score.

Open Feeling Fine: https://feelingfine.org/dashboard

Consistency beats perfection. Even one task today is a win! 🌟

— Feeling Fine`,
    isActive: true,
};

async function seed() {
    try {
        console.log('[seed] Inserting daily email template...');
        await mutate(
            `mutation($id: String!, $name: String!, $subject: String!, $htmlBody: String!, $textBody: String!, $isActive: Boolean!) {
                emailTemplate_upsert(data: {
                    id: $id,
                    name: $name,
                    subject: $subject,
                    htmlBody: $htmlBody,
                    textBody: $textBody,
                    isActive: $isActive
                })
            }`,
            TEMPLATE
        );
        console.log('[seed] ✅ Email template "daily" seeded successfully');
    } catch (err) {
        console.error('[seed] ❌ Failed:', err.message);
        process.exit(1);
    }
    process.exit(0);
}

seed();
