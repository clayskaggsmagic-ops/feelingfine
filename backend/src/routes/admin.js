import { Router } from 'express';
import bcrypt from 'bcrypt';
import { requireAuth } from '../middleware/auth.js';
import { query, mutate } from '../services/dataConnect.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/admin/verify-passcode — Verify admin passcode (before Google auth)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-passcode', async (req, res, next) => {
    try {
        const { passcode } = req.body;
        if (!passcode) {
            return res.status(400).json({ error: 'passcode is required' });
        }

        // Get stored passcode hash from app settings
        const data = await query(
            `query { appSetting(id: "main") { adminPasscode } }`
        );

        const stored = data.appSetting?.adminPasscode;
        if (!stored) {
            // No passcode set — allow any passcode for initial setup
            console.warn('[admin/passcode] No admin passcode set in DB. Allowing access.');
            return res.json({ verified: true });
        }

        // Compare submitted passcode with stored bcrypt hash
        const match = await bcrypt.compare(passcode, stored);
        if (!match) {
            console.warn('[admin/passcode] Invalid passcode attempt');
            return res.status(401).json({ error: 'Invalid passcode' });
        }

        console.log('[admin/passcode] Passcode verified');
        res.json({ verified: true });
    } catch (err) {
        console.error('[admin/passcode] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: require admin role for all subsequent routes
// ─────────────────────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
    if (!req.userProfile || req.userProfile.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/admin/analytics — Dashboard analytics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analytics', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const usersData = await query(`query { users { id } }`);
        const totalUsers = usersData.users?.length || 0;
        const today = new Date().toISOString().slice(0, 10);
        const trackingData = await query(
            `query($date: Date!) { trackingDays(where: { dateKey: { eq: $date } }) { userId } }`,
            { date: today }
        );
        const activeToday = trackingData.trackingDays?.length || 0;
        console.log(`[admin/analytics] totalUsers: ${totalUsers}, activeToday: ${activeToday}`);
        res.json({ totalUsers, activeToday, todayDate: today });
    } catch (err) {
        console.error('[admin/analytics] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DAILY DOSES CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/doses', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { dailyDoses(orderBy: [{ dayNumber: ASC }]) {
            id dayNumber title category message educationalParagraph bannerQuestion
            emailSubject emailMessage isActive
        }}`);
        res.json({ doses: data.dailyDoses || [] });
    } catch (err) { next(err); }
});

router.post('/doses', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($data: DailyDose_Data!) { dailyDose_insert(data: $data) { id } }`,
            { data: req.body }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

router.patch('/doses/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($id: UUID!, $data: DailyDose_Data!) { dailyDose_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: req.body }
        );
        res.json(result);
    } catch (err) { next(err); }
});

router.delete('/doses/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        await mutate(
            `mutation($id: UUID!) { dailyDose_delete(id: $id) }`,
            { id: req.params.id }
        );
        res.status(204).end();
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// DAILY DOS CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/dos', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { dailyDos(orderBy: [{ dayNumber: ASC }]) {
            id dayNumber category taskText difficulty isActive
        }}`);
        res.json({ dos: data.dailyDos || [] });
    } catch (err) { next(err); }
});

router.post('/dos', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($data: DailyDo_Data!) { dailyDo_insert(data: $data) { id } }`,
            { data: req.body }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

router.post('/dos/bulk', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { items } = req.body; // Array of do objects
        if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
        const results = [];
        for (const item of items) {
            const r = await mutate(
                `mutation($data: DailyDo_Data!) { dailyDo_insert(data: $data) { id } }`,
                { data: item }
            );
            results.push(r);
        }
        res.status(201).json({ inserted: results.length });
    } catch (err) { next(err); }
});

router.patch('/dos/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($id: UUID!, $data: DailyDo_Data!) { dailyDo_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: req.body }
        );
        res.json(result);
    } catch (err) { next(err); }
});

router.delete('/dos/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        await mutate(
            `mutation($id: UUID!) { dailyDo_delete(id: $id) }`,
            { id: req.params.id }
        );
        res.status(204).end();
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SURVEYS CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/surveys', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { surveys { id surveyId title triggerType triggerDay isActive questions }}`);
        res.json({ surveys: data.surveys || [] });
    } catch (err) { next(err); }
});

router.post('/surveys', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($data: Survey_Data!) { survey_insert(data: $data) { id } }`,
            { data: req.body }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

router.patch('/surveys/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($id: UUID!, $data: Survey_Data!) { survey_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: req.body }
        );
        res.json(result);
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 25;
        const data = await query(`query { users {
            id uid displayName email role programStartDate programLength
            onboardingSurveyCompleted createdAt
        }}`);
        let users = data.users || [];
        if (search) {
            const s = search.toLowerCase();
            users = users.filter(u => (u.displayName || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
        }
        const total = users.length;
        const paginated = users.slice((page - 1) * limit, page * limit);
        res.json({ users: paginated, total, page, pages: Math.ceil(total / limit) });
    } catch (err) { next(err); }
});

router.get('/users/:uid', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const userData = await query(
            `query($uid: String!) { user(id: $uid) {
                id uid displayName email role programStartDate programLength
                onboardingSurveyCompleted createdAt userLabels
            }}`,
            { uid: req.params.uid }
        );
        // Get tracking + survey responses
        const tracking = await query(
            `query($uid: String!) { trackingDays(where: { userId: { eq: $uid } }, orderBy: [{ dateKey: DESC }]) {
                id dateKey feelingScore
            }}`,
            { uid: req.params.uid }
        );
        const responses = await query(
            `query($uid: String!) { surveyResponses(where: { userId: { eq: $uid } }) {
                id surveyId programDay submittedAt
            }}`,
            { uid: req.params.uid }
        );
        res.json({
            user: userData.user,
            tracking: tracking.trackingDays || [],
            surveyResponses: responses.surveyResponses || [],
        });
    } catch (err) { next(err); }
});

router.patch('/users/:uid', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { action } = req.body;
        if (action === 'reset-program') {
            await mutate(
                `mutation($uid: String!) { user_update(id: $uid, data: { programStartDate: "${new Date().toISOString()}" }) { id } }`,
                { uid: req.params.uid }
            );
        } else if (action === 'deactivate') {
            await mutate(
                `mutation($uid: String!) { user_update(id: $uid, data: { role: "deactivated" }) { id } }`,
                { uid: req.params.uid }
            );
        }
        res.json({ success: true });
    } catch (err) { next(err); }
});

router.get('/users-export', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { users {
            uid displayName email role programStartDate programLength
            onboardingSurveyCompleted createdAt
        }}`);
        const users = data.users || [];
        const headers = ['uid', 'displayName', 'email', 'role', 'programStartDate', 'programLength', 'onboardingSurveyCompleted', 'createdAt'];
        const csv = [headers.join(','), ...users.map(u => headers.map(h => `"${(u[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
        res.send(csv);
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/settings', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { appSetting(id: "main") {
            id emailSendTime timezone programLength welcomeMessage
            maintenanceMode weeklyChallenge weeklyChallengeCornerstoneId
        }}`);
        res.json({ settings: data.appSetting || {} });
    } catch (err) { next(err); }
});

router.patch('/settings', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const updates = { ...req.body };
        // Handle passcode change separately
        if (updates.newPasscode) {
            updates.adminPasscode = await bcrypt.hash(updates.newPasscode, 12);
            delete updates.newPasscode;
        }
        const result = await mutate(
            `mutation($data: AppSetting_Data!) { appSetting_upsert(data: $data) { id } }`,
            { data: { id: 'main', ...updates } }
        );
        res.json(result);
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
router.get('/email-templates', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { emailTemplates { id templateId subject htmlContent plainTextContent }}`);
        res.json({ templates: data.emailTemplates || [] });
    } catch (err) { next(err); }
});

router.patch('/email-templates/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($id: UUID!, $data: EmailTemplate_Data!) { emailTemplate_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: req.body }
        );
        res.json(result);
    } catch (err) { next(err); }
});

router.post('/email/send-test', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        // Placeholder — will integrate with emailService in production
        const { templateId, testEmail } = req.body;
        console.log(`[admin/email] Test email requested: template=${templateId}, to=${testEmail}`);
        res.json({ message: `Test email queued to ${testEmail}` });
    } catch (err) { next(err); }
});

router.post('/email/send-now', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const { templateId } = req.body;
        console.log(`[admin/email] Send-now requested: template=${templateId}`);
        res.json({ message: 'Email send queued for all active users' });
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// PODCASTS CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/podcasts', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { podcasts { id title description category audioUrl duration isActive publishedAt }}`);
        res.json({ podcasts: data.podcasts || [] });
    } catch (err) { next(err); }
});

router.post('/podcasts', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($data: Podcast_Data!) { podcast_insert(data: $data) { id } }`,
            { data: req.body }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

router.patch('/podcasts/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($id: UUID!, $data: Podcast_Data!) { podcast_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: req.body }
        );
        res.json(result);
    } catch (err) { next(err); }
});

router.delete('/podcasts/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        await mutate(`mutation($id: UUID!) { podcast_delete(id: $id) }`, { id: req.params.id });
        res.status(204).end();
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBINARS CRUD
// ─────────────────────────────────────────────────────────────────────────────
router.get('/webinars', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const data = await query(`query { webinars { id title description date registrationUrl recordingUrl hostName status }}`);
        res.json({ webinars: data.webinars || [] });
    } catch (err) { next(err); }
});

router.post('/webinars', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($data: Webinar_Data!) { webinar_insert(data: $data) { id } }`,
            { data: req.body }
        );
        res.status(201).json(result);
    } catch (err) { next(err); }
});

router.patch('/webinars/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        const result = await mutate(
            `mutation($id: UUID!, $data: Webinar_Data!) { webinar_update(id: $id, data: $data) { id } }`,
            { id: req.params.id, data: req.body }
        );
        res.json(result);
    } catch (err) { next(err); }
});

router.delete('/webinars/:id', requireAuth, requireAdmin, async (req, res, next) => {
    try {
        await mutate(`mutation($id: UUID!) { webinar_delete(id: $id) }`, { id: req.params.id });
        res.status(204).end();
    } catch (err) { next(err); }
});

export default router;

