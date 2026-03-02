import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import admin from 'firebase-admin'; // Ensure firebase initialized

const router = Router();

// GET a signed URL for uploading a profile photo
router.get('/upload-url', requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const bucket = admin.storage().bucket();
        const fileExtension = req.query.ext || 'jpg';
        const fileName = `profiles/${uid}/avatar-${Date.now()}.${fileExtension}`;
        const file = bucket.file(fileName);

        // Generate a signed URL for uploading
        const [url] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
            contentType: `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
        });

        // The public URL where the file will be accessible after upload
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        res.json({ uploadUrl: url, publicUrl });
    } catch (err) {
        console.error('[storage/upload-url] Error:', err.message);
        next(err);
    }
});

export default router;
