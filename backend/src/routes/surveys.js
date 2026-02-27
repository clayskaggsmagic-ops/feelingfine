import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { calculateProgramDay } from '../services/programService.js';
import {
    getSurvey,
    getPendingSurveys,
    insertSurveyResponse,
    updateUser,
} from '../services/dataConnect.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/surveys/pending — Surveys the user hasn't completed yet
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending', requireAuth, async (req, res, next) => {
    try {
        const user = req.userProfile;
        if (!user) return res.status(404).json({ error: 'User profile not found' });

        const programDay = calculateProgramDay(user);
        const pending = await getPendingSurveys(user.uid, programDay);

        // Sort: onboarding first, then daily_banner, then weekly
        const order = { onboarding: 0, daily_banner: 1, weekly: 2, monthly: 3 };
        pending.sort((a, b) => (order[a.type] ?? 99) - (order[b.type] ?? 99));

        console.log(`[surveys/pending] ${pending.length} pending for uid: ${user.uid}, programDay: ${programDay}`);
        res.json({ surveys: pending, programDay });
    } catch (err) {
        console.error('[surveys/pending] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/surveys/:surveyId — Get a specific survey
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:surveyId', requireAuth, async (req, res, next) => {
    try {
        const survey = await getSurvey(req.params.surveyId);
        if (!survey) return res.status(404).json({ error: 'Survey not found' });
        res.json({ survey });
    } catch (err) {
        console.error('[surveys/:id] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/surveys/:surveyId/submit — Submit survey answers
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:surveyId/submit', requireAuth, async (req, res, next) => {
    try {
        const { answers } = req.body;
        const uid = req.user.uid;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'answers array is required' });
        }

        const survey = await getSurvey(req.params.surveyId);
        if (!survey) return res.status(404).json({ error: 'Survey not found' });

        // Save the response
        const programDay = calculateProgramDay(req.userProfile || {});
        await insertSurveyResponse({
            userId: uid,
            surveyId: survey.id,
            programDay: programDay || 0,
            answers: JSON.stringify(answers),
        });

        // If onboarding survey, compute labels and mark complete
        const profileUpdates = {};
        if (survey.type === 'onboarding') {
            profileUpdates.programStartDate = new Date().toISOString();

            const labels = computeLabels(answers, survey.questions);
            if (labels.length > 0) {
                profileUpdates.labels = JSON.stringify(labels);
            }

            console.log(`[surveys/submit] Onboarding complete for uid: ${uid}, labels: [${labels.join(', ')}]`);
        }

        if (Object.keys(profileUpdates).length > 0) {
            await updateUser(uid, profileUpdates);
        }

        console.log(`[surveys/submit] Saved response for survey: ${survey.id}, uid: ${uid}`);
        res.json({
            success: true,
            labels: profileUpdates.labels ? JSON.parse(profileUpdates.labels) : [],
        });
    } catch (err) {
        console.error('[surveys/submit] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Label Computation (per read.md Section 11)
// ─────────────────────────────────────────────────────────────────────────────
function computeLabels(answers, questionsJson) {
    const labels = [];

    // Parse questions if it's a string
    let questions;
    try {
        questions = typeof questionsJson === 'string' ? JSON.parse(questionsJson) : questionsJson;
    } catch {
        console.warn('[computeLabels] Could not parse questions JSON');
        return labels;
    }

    // Build a map of questionIndex → answer for easy lookup
    const answerMap = {};
    for (const a of answers) {
        answerMap[a.questionIndex] = a.value;
    }

    // Each question has an index matching its position in the questions array
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const answer = answerMap[i];
        if (answer == null) continue;

        const id = q.id || q.label || '';

        // Q2: Overall health rating ≤ 4 → poor-health
        if (id.includes('overall_health') || id.includes('health_rating')) {
            if (Number(answer) <= 4) labels.push('poor-health');
        }

        // Q3: Exercise frequency 0 or 1-2 → needs-movement
        if (id.includes('exercise') || id.includes('movement')) {
            const val = String(answer).toLowerCase();
            if (val === '0' || val.includes('1-2') || val.includes('none')) {
                labels.push('needs-movement');
            }
        }

        // Q4: Sleep < 6 hours → needs-sleep
        if (id.includes('sleep')) {
            const val = String(answer).toLowerCase();
            if (val.includes('less than') || val.includes('5-6') || val.includes('< 6')) {
                labels.push('needs-sleep');
            }
        }

        // Q5: Stress ≥ 7 → high-stress
        if (id.includes('stress')) {
            if (Number(answer) >= 7) labels.push('high-stress');
        }

        // Q6: Socialization monthly or rarely → socially-isolated
        if (id.includes('social') || id.includes('friends')) {
            const val = String(answer).toLowerCase();
            if (val.includes('monthly') || val.includes('rarely') || val.includes('never')) {
                labels.push('socially-isolated');
            }
        }

        // Q8: Primary goal = weight management → weight-loss-goal
        if (id.includes('goal') || id.includes('primary_goal')) {
            const val = String(answer).toLowerCase();
            if (val.includes('weight')) labels.push('weight-loss-goal');
        }

        // Q9: Mobility = limited or wheelchair → low-mobility
        if (id.includes('mobility')) {
            const val = String(answer).toLowerCase();
            if (val.includes('limited') || val.includes('wheelchair') || val.includes('walker')) {
                labels.push('low-mobility');
            }
        }

        // Q16: Diet quality → poor-diet
        if (id.includes('diet') || id.includes('eating')) {
            const val = String(answer).toLowerCase();
            if (val.includes('processed') || val.includes('fast food') || val.includes('poor')) {
                labels.push('poor-diet');
            }
        }

        // Q17: Aging attitude → aging-pessimist or aging-optimist
        if (id.includes('aging') || id.includes('attitude')) {
            const val = String(answer).toUpperCase();
            if (val === 'D' || val === 'E' || val.includes('pessimist') || val.includes('dreading')) {
                labels.push('aging-pessimist');
            } else if (val === 'A' || val === 'B' || val.includes('optimist') || val.includes('excited')) {
                labels.push('aging-optimist');
            }
        }
    }

    return [...new Set(labels)]; // deduplicate
}

export default router;
