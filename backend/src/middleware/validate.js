/**
 * Input Validation & Sanitization Middleware
 * Protects against XSS, injection, and malformed data.
 */

/**
 * Strip HTML tags from a string.
 */
function stripHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').replace(/\0/g, ''); // Remove HTML + null bytes
}

/**
 * Trim and sanitize a string.
 */
function sanitizeString(str, maxLength = 1000) {
    if (typeof str !== 'string') return str;
    return stripHtml(str).trim().slice(0, maxLength);
}

/**
 * Validate & sanitize feeling score: must be integer 1-10.
 */
export function validateFeelingScore(req, res, next) {
    const { feelingScore } = req.body;
    if (feelingScore !== undefined) {
        const score = parseInt(feelingScore, 10);
        if (isNaN(score) || score < 1 || score > 10) {
            return res.status(400).json({ error: 'Feeling score must be an integer between 1 and 10.' });
        }
        req.body.feelingScore = score;
    }
    next();
}

/**
 * Validate & sanitize chat messages: max 500 chars, strip HTML.
 */
export function validateChatMessage(req, res, next) {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Message text is required.' });
    }
    const cleaned = sanitizeString(text, 500);
    if (cleaned.length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    req.body.text = cleaned;
    next();
}

/**
 * Validate & sanitize custom do text: max 200 chars, strip HTML.
 */
export function validateCustomDo(req, res, next) {
    const { text } = req.body;
    if (text !== undefined) {
        if (typeof text !== 'string') {
            return res.status(400).json({ error: 'Task text must be a string.' });
        }
        req.body.text = sanitizeString(text, 200);
    }
    next();
}

/**
 * Validate survey answers: must be array, each answer has questionId + value.
 */
export function validateSurveyAnswers(req, res, next) {
    const { answers } = req.body;
    if (!Array.isArray(answers)) {
        return res.status(400).json({ error: 'Answers must be an array.' });
    }
    if (answers.length > 100) {
        return res.status(400).json({ error: 'Too many answers (max 100).' });
    }
    for (let i = 0; i < answers.length; i++) {
        const a = answers[i];
        if (!a.questionId || typeof a.questionId !== 'string') {
            return res.status(400).json({ error: `Answer ${i}: questionId is required and must be a string.` });
        }
        a.questionId = sanitizeString(a.questionId, 100);
        if (typeof a.value === 'string') {
            a.value = sanitizeString(a.value, 500);
        }
    }
    req.body.answers = answers;
    next();
}

/**
 * Generic body sanitizer — trims and strips HTML from all string fields.
 * Skips auth tokens which are long opaque strings that must not be modified.
 */
const SKIP_SANITIZE = new Set(['idToken', 'token', 'refreshToken', 'accessToken']);

export function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string' && !SKIP_SANITIZE.has(key)) {
                req.body[key] = sanitizeString(value);
            }
        }
    }
    next();
}
