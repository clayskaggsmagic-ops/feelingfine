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

const SYSTEM_PROMPT = `You are a warm, supportive wellness companion for the Feeling Fine program — a wellness platform for adults 50 and older. Your name is "Wellness Guide" but you never introduce yourself robotically.

Your personality:
- You speak like a kind, knowledgeable friend who genuinely cares
- You're encouraging but never patronizing
- You use simple, clear language (no jargon)
- You never say "I'm an AI" or "As an AI" or anything robotic
- You keep responses concise (2-4 sentences usually, up to a short paragraph for deeper topics)
- You celebrate small wins enthusiastically
- You gently redirect if someone seems down, focusing on what they CAN do

You know about the 7 Wellness Cornerstones: Nutrition, Movement, Sleep, Stress Management, Social Connection, Cognitive Health, and Healthy Aging.

When given user context (feeling scores, completed tasks, labels), weave it naturally into your response without listing it back. For example, if their feeling score has been trending up, mention it warmly.

NEVER give medical advice. If someone describes a medical concern, warmly suggest they speak with their healthcare provider.`;

/**
 * Send a wellness chat message with user context.
 */
export async function wellnessChat(message, context = {}) {
    const genai = getAI();

    // Build context string from user data
    let contextStr = '';
    if (context.recentScores?.length) {
        const avg = (context.recentScores.reduce((a, b) => a + b, 0) / context.recentScores.length).toFixed(1);
        contextStr += `\nUser's recent feeling scores (1-10): ${context.recentScores.join(', ')} (avg: ${avg})`;
    }
    if (context.totalDosCompleted) {
        contextStr += `\nTasks completed recently: ${context.totalDosCompleted}`;
    }
    if (context.labels?.length) {
        contextStr += `\nUser focus areas: ${context.labels.join(', ')}`;
    }
    if (context.trend) {
        contextStr += `\nWellness trend: ${context.trend}`;
    }
    if (context.displayName) {
        contextStr += `\nUser's name: ${context.displayName}`;
    }

    const fullSystemPrompt = SYSTEM_PROMPT + (contextStr ? `\n\n--- User Context ---${contextStr}` : '');

    const response = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: message,
        config: {
            systemInstruction: fullSystemPrompt,
            maxOutputTokens: 300,
            temperature: 0.8,
        },
    });

    return response.text || '';
}

/**
 * Generate an AI analysis/summary of tracking data.
 */
export async function reportAnalysis(reportData, userContext = {}) {
    const genai = getAI();

    const analysisPrompt = `Analyze this wellness tracking data and provide a warm, encouraging 3-4 sentence summary. Highlight what they're doing well, note their trend, and suggest one small thing to try next.

Tracking Data:
- Days tracked: ${reportData.totalDaysTracked || 0}
- Total tasks completed: ${reportData.totalDosCompleted || 0}
- Average feeling score: ${reportData.avgFeelingScore || 'not enough data'}
- Trend: ${reportData.trend || 'stable'}
- Top cornerstones: ${Object.entries(reportData.cornerstoneTotals || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none yet'}
${userContext.displayName ? `- Name: ${userContext.displayName}` : ''}
${userContext.labels?.length ? `- Focus areas: ${userContext.labels.join(', ')}` : ''}`;

    const response = await genai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: analysisPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 250,
            temperature: 0.7,
        },
    });

    return response.text || '';
}
