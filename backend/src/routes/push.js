import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { mutate, query, upsert } from '../services/dataConnect.js';
import admin from 'firebase-admin'; // Requires firebase.js to be initialized

const router = Router();

// Register a device token for the user
router.post('/register', requireAuth, async (req, res, next) => {
    try {
        const { token, deviceType } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const uid = req.user.uid;

        // Check if token exists, update lastUsedAt or insert new
        const existingTokenRes = await query(
            `query($uid: String!, $token: String!) {
                deviceTokens(where: { userId: { eq: $uid }, token: { eq: $token } }) {
                    id
                }
            }`,
            { uid, token }
        );

        const existingTokenId = existingTokenRes.deviceTokens?.[0]?.id;

        if (existingTokenId) {
            await mutate(
                `mutation($id: UUID!) {
                    deviceToken_update(id: $id, data: { lastUsedAt_expr: "request.time" }) {
                        id
                    }
                }`,
                { id: existingTokenId }
            );
        } else {
             await mutate(
                 `mutation($data: DeviceToken_Data!) {
                     deviceToken_insert(data: $data) {
                         id
                     }
                 }`,
                 { data: { userId: uid, token, deviceType: deviceType || 'web' } }
             );
        }

        res.json({ success: true, message: 'Device token registered' });
    } catch (err) {
        console.error('[push/register] Error:', err.message);
        next(err);
    }
});

// Remove a device token
router.post('/unregister', requireAuth, async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const uid = req.user.uid;

        const existingTokenRes = await query(
            `query($uid: String!, $token: String!) {
                deviceTokens(where: { userId: { eq: $uid }, token: { eq: $token } }) {
                    id
                }
            }`,
            { uid, token }
        );

        const existingTokenId = existingTokenRes.deviceTokens?.[0]?.id;

        if (existingTokenId) {
            await mutate(
                `mutation($id: UUID!) {
                    deviceToken_delete(id: $id)
                }`,
                { id: existingTokenId }
            );
        }

        res.json({ success: true, message: 'Device token unregistered' });
    } catch (err) {
        console.error('[push/unregister] Error:', err.message);
        next(err);
    }
});

export async function sendPushNotification(userId, title, body, data = {}) {
    try {
        // Fetch user tokens
        const tokensRes = await query(
            `query($uid: String!) {
                deviceTokens(where: { userId: { eq: $uid } }) {
                    token
                }
            }`,
            { uid: userId }
        );

        const tokens = tokensRes.deviceTokens?.map(t => t.token) || [];

        if (tokens.length === 0) {
            console.log(`[push] No tokens found for user ${userId}`);
            return false;
        }

        const message = {
            notification: {
                title,
                body,
            },
            data,
            tokens,
        };

        const response = await admin.messaging().sendMulticast(message);
        console.log(`[push] Sent ${response.successCount} messages, failed ${response.failureCount}`);

        // Handle failed tokens (e.g., unregistered)
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    if (resp.error.code === 'messaging/invalid-registration-token' ||
                        resp.error.code === 'messaging/registration-token-not-registered') {
                        failedTokens.push(tokens[idx]);
                    }
                }
            });

            // Remove failed tokens from db
            for(const token of failedTokens) {
                 const existingTokenRes = await query(
                    `query($uid: String!, $token: String!) {
                        deviceTokens(where: { userId: { eq: $uid }, token: { eq: $token } }) {
                            id
                        }
                    }`,
                    { uid: userId, token }
                );
                const existingTokenId = existingTokenRes.deviceTokens?.[0]?.id;
                if(existingTokenId) {
                     await mutate(
                        `mutation($id: UUID!) {
                            deviceToken_delete(id: $id)
                        }`,
                        { id: existingTokenId }
                    );
                }
            }
        }
        return true;
    } catch (err) {
        console.error('[push] Error sending push notification:', err.message);
        return false;
    }
}

export default router;
