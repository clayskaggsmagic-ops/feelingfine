/**
 * Gemini 2.0 Flash integration for Feeling Fine wellness chat.
 * Provides warm, human wellness-guide persona responses.
 */
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let ai = null;

function getAI() {
    if (!ai) {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
    return ai;
}

const SYSTEM_PROMPT = `You are a warm, supportive wellness companion for the Feeling Fine program — a 30-day wellness platform for adults 50 and older. Your name is "Wellness Guide" but you never introduce yourself robotically.

Your personality:
- You speak like a kind, knowledgeable friend who genuinely cares
- You're encouraging but never patronizing
- You use simple, clear language (no jargon)
- You never say "I'm an AI" or "As an AI" or anything robotic
- You keep responses concise (2-4 sentences usually, up to a short paragraph for deeper topics)
- You celebrate small wins enthusiastically
- You gently redirect if someone seems down, focusing on what they CAN do

You know about the 7 Wellness Cornerstones: Nutrition, Movement, Sleep, Stress Management, Social Connection, Cognitive Health, and Healthy Aging.

When given user context, weave it naturally into your response. Reference their specific tasks, daily dose, and survey answers by name when relevant — don't just say "your tasks" generically. For example, if they completed "Drink a glass of water upon waking," mention that specific task.

NEVER give medical advice. If someone describes a medical concern, warmly suggest they speak with their healthcare provider.`;

/**
 * Format the full context object into a human-readable prompt section.
 */
function formatContextForPrompt(context) {
    const lines = [];

    if (context.displayName) lines.push(`User's name: ${context.displayName}`);
    if (context.programDay) lines.push(`Program day: ${context.programDay} of 30`);
    if (context.labels?.length) lines.push(`Focus areas: ${context.labels.join(', ')}`);

    // Today's focus cornerstone
    if (context.todaysFocus) {
        lines.push(`Today's wellness focus: ${context.todaysFocus.name} — ${context.todaysFocus.description || ''}`);
    }

    // Daily dose
    if (context.todaysDose) {
        lines.push(`\nToday's Daily Dose: "${context.todaysDose.title}" (${context.todaysDose.category})`);
        if (context.todaysDose.message) {
            const msg = context.todaysDose.message.length > 200
                ? context.todaysDose.message.slice(0, 200) + '...'
                : context.todaysDose.message;
            lines.push(`  Content: ${msg}`);
        }
        lines.push(`  User viewed it: ${context.dailyDoseViewed ? 'yes' : 'not yet'}`);
    }
    if (context.yesterdaysDose) {
        lines.push(`Yesterday's Daily Dose: "${context.yesterdaysDose.title}" (${context.yesterdaysDose.category})`);
    }

    // Today's tasks
    if (context.todaysTasks?.length) {
        lines.push(`\nToday's offered tasks (${context.todaysTasks.length}):`);
        context.todaysTasks.forEach((t, i) => {
            lines.push(`  ${i + 1}. ${t.text} [${t.category}]`);
        });
    }

    // Completed today
    if (context.completedToday?.length) {
        // Map completed doIds to task names
        const completedTexts = context.completedToday.map(c => {
            const match = context.todaysTasks?.find(t => t.text && c.doId);
            return match ? match.text : c.category;
        });
        lines.push(`Completed today: ${context.completedToday.length}/${context.todaysTasks?.length || '?'} — ${completedTexts.join(', ')}`);
    }
    if (context.customDosToday?.length) {
        lines.push(`Custom tasks today: ${context.customDosToday.map(d => d.text).join(', ')}`);
    }

    // Today's feeling score
    if (context.todayFeelingScore != null) {
        lines.push(`Today's feeling score: ${context.todayFeelingScore}/10`);
    }

    // Trend
    if (context.trend) {
        lines.push(`Overall trend: ${context.trend}`);
    }

    // 14-day history summary
    if (context.recentHistory?.length) {
        const scored = context.recentHistory.filter(d => d.feelingScore != null);
        if (scored.length) {
            const avg = (scored.reduce((s, d) => s + d.feelingScore, 0) / scored.length).toFixed(1);
            lines.push(`\n14-day summary: ${context.recentHistory.length} days tracked, avg feeling score ${avg}/10`);
        }
        const totalTasks = context.recentHistory.reduce((s, d) => s + d.tasksCompleted, 0);
        lines.push(`Total tasks completed in period: ${totalTasks}`);

        // Daily breakdown (compact)
        const dayStrings = context.recentHistory.slice(0, 7).map(d =>
            `${d.date}: ${d.feelingScore ?? '-'}/10, ${d.tasksCompleted} tasks`
        );
        lines.push(`Recent days: ${dayStrings.join(' | ')}`);
    }

    // Survey responses
    if (context.surveyResponses?.length) {
        lines.push(`\nSurvey responses (${context.surveyResponses.length}):`);
        context.surveyResponses.forEach(sr => {
            const answers = Array.isArray(sr.answers) ? sr.answers : [];
            const summary = answers.map(a => {
                const q = a.questionText || a.question || `Q${a.questionIndex ?? ''}`;
                const v = a.answer ?? a.value ?? a.selectedOption ?? '';
                return `${q}: ${v}`;
            }).join('; ');
            lines.push(`  ${sr.surveyId}: ${summary || JSON.stringify(sr.answers).slice(0, 200)}`);
        });
    }

    return lines.join('\n');
}

/**
 * Send a wellness chat message with full user context.
 */
export async function wellnessChat(message, context = {}) {
    const genai = getAI();

    const contextStr = formatContextForPrompt(context);
    const fullSystemPrompt = SYSTEM_PROMPT + (contextStr ? `\n\n--- User Context ---\n${contextStr}` : '');

    const response = await genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
            systemInstruction: fullSystemPrompt,
            maxOutputTokens: 1024,
            temperature: 0.8,
        },
    });

    return response.text || '';
}

/**
 * Generate an AI analysis/summary of tracking data with full context.
 */
export async function reportAnalysis(context = {}) {
    const genai = getAI();

    const contextStr = formatContextForPrompt(context);

    const analysisPrompt = `Analyze this user's wellness journey and provide a warm, encouraging 3-4 sentence summary. Highlight specific tasks they've been doing well, note their feeling score trend, reference their survey answers if relevant, and suggest one small, specific thing to try next based on their data.

${contextStr}`;

    const response = await genai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: analysisPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 800,
            temperature: 0.7,
        },
    });

    return response.text || '';
}
