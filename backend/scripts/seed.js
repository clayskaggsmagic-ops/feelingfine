/**
 * Firestore Seed Script — Populates ALL content from read.md Appendix F.
 *
 * Collections created:
 *   /cornerstones       — 7 cornerstone definitions
 *   /dailyDos           — 140 tasks (20 per cornerstone)
 *   /dailyDoses         — 7 Week 1 doses + 10 rotating post-program doses
 *   /surveys            — 1 onboarding survey (18 questions) + 7 daily check-in banners
 *   /appSettings        — Default app settings (including hashed admin passcode)
 *   /emailTemplates     — Default email template
 *
 * Usage: node scripts/seed.js
 */

import 'dotenv/config';
import { db } from '../src/services/firebase.js';
import bcrypt from 'bcrypt';

// ─── Helpers ────────────────────────────────────────────────────────────────

const now = new Date().toISOString();
let totalDocs = 0;

async function seedCollection(name, docs) {
    console.log(`\n  Seeding /${name} (${docs.length} docs)...`);
    const batch = db.batch();
    for (const doc of docs) {
        const id = doc._id || doc.id;
        delete doc._id;
        const ref = id ? db.collection(name).doc(id) : db.collection(name).doc();
        batch.set(ref, doc);
    }
    await batch.commit();
    totalDocs += docs.length;
    console.log(`  ✓ ${docs.length} docs written to /${name}`);
}

// ─── 1. Cornerstones ────────────────────────────────────────────────────────

const cornerstones = [
    { _id: 'nutrition', name: 'Nutrition', dayNumber: 1, icon: 'apple', color: '#48bb78', description: 'Nourish your body with healthy choices.', dayOfWeek: 'Monday', sortOrder: 1, isActive: true, createdAt: now },
    { _id: 'movement', name: 'Movement', dayNumber: 2, icon: 'runner', color: '#ed8936', description: 'Keep your body active and strong.', dayOfWeek: 'Tuesday', sortOrder: 2, isActive: true, createdAt: now },
    { _id: 'sleep', name: 'Sleep', dayNumber: 3, icon: 'moon', color: '#667eea', description: 'Rest and recharge for the day ahead.', dayOfWeek: 'Wednesday', sortOrder: 3, isActive: true, createdAt: now },
    { _id: 'stress_management', name: 'Stress Management', dayNumber: 4, icon: 'meditation', color: '#ecc94b', description: 'Find your inner calm.', dayOfWeek: 'Thursday', sortOrder: 4, isActive: true, createdAt: now },
    { _id: 'social_connection', name: 'Social Connection', dayNumber: 5, icon: 'handshake', color: '#f56565', description: 'Connect with the people who matter.', dayOfWeek: 'Friday', sortOrder: 5, isActive: true, createdAt: now },
    { _id: 'cognitive_health', name: 'Brain Health', dayNumber: 6, icon: 'brain', color: '#38b2ac', description: 'Keep your mind sharp and curious.', dayOfWeek: 'Saturday', sortOrder: 6, isActive: true, createdAt: now },
    { _id: 'healthy_aging', name: 'Healthy Aging', dayNumber: 7, icon: 'leaf', color: '#9f7aea', description: 'Embrace the journey of life.', dayOfWeek: 'Sunday', sortOrder: 7, isActive: true, createdAt: now },
];

// ─── 2. Daily Dos (140 tasks, 20 per cornerstone) ───────────────────────────

function buildDos(category, texts) {
    return texts.map((text, i) => ({
        text,
        category,
        sortOrder: i + 1,
        dayNumber: i < 5 ? cornerstones.find(c => c._id === category).dayNumber : 0,
        isActive: true,
        targetLabels: [],
        createdAt: now,
        updatedAt: now,
    }));
}

const dailyDos = [
    ...buildDos('nutrition', [
        'Drink a glass of water immediately upon waking.',
        'Eat a serving of leafy green vegetables.',
        'Replace a sugary drink with water or herbal tea.',
        'Eat a piece of whole fruit instead of juice.',
        'Include a source of protein with breakfast.',
        'Eat a handful of raw nuts or seeds.',
        'Avoid processed foods for one entire meal.',
        'Cook a meal at home using fresh ingredients.',
        'Eat slowly and chew your food thoroughly.',
        'Stop eating when you feel 80% full.',
        'Have a meat-free meal today.',
        'Drink 8 glasses of water throughout the day.',
        'Avoid added sugar for the entire day.',
        'Eat a serving of fermented food (yogurt, kimchi, etc.).',
        'Snack on raw vegetables (carrots, celery, etc.).',
        'Use olive oil instead of butter or margarine.',
        'Eat a serving of fatty fish or plant-based omega-3s.',
        'Read the nutrition label before buying a food item.',
        'Portion your meal on a smaller plate.',
        'Eat a rainbow: include 3 different colored veggies in a meal.',
    ]),
    ...buildDos('movement', [
        'Take a brisk 10-minute walk.',
        'Stand up and stretch every hour.',
        'Take the stairs instead of the elevator.',
        'Park further away from the store entrance.',
        'Do 10 push-ups (or wall push-ups).',
        'Do 10 squats while waiting for the kettle to boil.',
        'Go for a walk after dinner.',
        'Dance to your favorite song.',
        'Do a 5-minute yoga flow.',
        'Walk while talking on the phone.',
        'Do some gardening or yard work.',
        'Clean the house vigorously for 15 minutes.',
        'Go for a bike ride.',
        'Try a new physical activity or sport.',
        'Balance on one leg while brushing your teeth.',
        'Walk a dog (yours or a friend\'s).',
        'Do a plank for 30 seconds.',
        'Stretch your hamstrings and back.',
        'Walk 5,000 steps today.',
        'Walk 10,000 steps today.',
    ]),
    ...buildDos('sleep', [
        'Go to bed 30 minutes earlier than usual.',
        'Avoid screens (phone, TV) 1 hour before bed.',
        'Keep your bedroom cool and dark.',
        'Read a physical book before sleep.',
        'Avoid caffeine after 2:00 PM.',
        'Wake up at the same time as yesterday.',
        'Get 15 minutes of sunlight in the morning.',
        'Do a calming meditation before bed.',
        'Take a warm bath or shower before sleep.',
        'Write down your to-do list for tomorrow to clear your mind.',
        'Use blackout curtains or an eye mask.',
        'Avoid heavy meals 2 hours before bed.',
        'Listen to white noise or calming music.',
        'Change your bed sheets for fresh ones.',
        'Practice deep breathing exercises in bed.',
        'Keep your phone out of the bedroom.',
        'Limit alcohol consumption in the evening.',
        'Get at least 7 hours of sleep.',
        'Get at least 8 hours of sleep.',
        'Establish a consistent bedtime routine.',
    ]),
    ...buildDos('stress_management', [
        'Take 5 deep, slow breaths.',
        'Spend 10 minutes in nature.',
        'Write down 3 things you are grateful for.',
        'Meditate for 5 minutes.',
        'Laugh out loud (watch a funny video).',
        'Listen to your favorite relaxing music.',
        'Say \'no\' to a non-essential request.',
        'Unplug from social media for 2 hours.',
        'Do a \'body scan\' to release tension.',
        'Pet a dog or cat.',
        'Practice mindfulness while washing dishes.',
        'Write in a journal for 10 minutes.',
        'Forgive someone (or yourself) for a mistake.',
        'Visualize a peaceful place.',
        'Take a break and do absolutely nothing for 5 minutes.',
        'Hug a loved one for 20 seconds.',
        'Smile at yourself in the mirror.',
        'Perform a random act of kindness.',
        'Read an inspiring quote.',
        'Focus on the present moment.',
    ]),
    ...buildDos('social_connection', [
        'Call a friend or family member just to say hi.',
        'Send a text of appreciation to someone.',
        'Eat a meal with someone without phones.',
        'Listen actively to someone without interrupting.',
        'Smile at a stranger.',
        'Compliment someone genuinely.',
        'Ask a colleague how their day is going.',
        'Plan a get-together with friends.',
        'Volunteer for a local cause.',
        'Write a thank-you note.',
        'Introduce yourself to a neighbor.',
        'Join a club or group activity.',
        'Share a funny story with someone.',
        'Offer help to someone in need.',
        'Reconnect with an old friend.',
        'Make eye contact when speaking to people.',
        'Ask someone for their advice.',
        'Share a meal with a neighbor.',
        'Participate in a community event.',
        'Express love to your partner or family.',
    ]),
    ...buildDos('cognitive_health', [
        'Read a chapter of a book.',
        'Solve a crossword or Sudoku puzzle.',
        'Learn a new word and use it in a sentence.',
        'Brush your teeth with your non-dominant hand.',
        'Take a different route to work or the store.',
        'Listen to an educational podcast.',
        'Learn 5 words in a new language.',
        'Play a memory game.',
        'Try a new recipe.',
        'Play a musical instrument (or learn to).',
        'Draw, paint, or doodle.',
        'Write a short poem or story.',
        'Do a jigsaw puzzle.',
        'Learn a new skill (e.g., juggling, knitting).',
        'Engage in a debate or intellectual discussion.',
        'Recall what you ate for dinner 3 days ago.',
        'Memorize a phone number.',
        'Teach someone something you know.',
        'Avoid multitasking for 30 minutes.',
        'Drink water to hydrate your brain.',
    ]),
    ...buildDos('healthy_aging', [
        'Wear sunscreen on your face.',
        'Practice balancing on one foot.',
        'Stand up straight and check your posture.',
        'Moisturize your skin.',
        'Get your hearing or vision checked (if due).',
        'Floss your teeth.',
        'Lift a light weight to maintain muscle mass.',
        'Learn something new about your family history.',
        'Spend time with someone of a different generation.',
        'Check your blood pressure.',
        'Review your medications with a doctor.',
        'Clear clutter from a walkway to prevent falls.',
        'Eat antioxidant-rich foods (berries, dark chocolate).',
        'Stay socially active.',
        'Keep your mind active with puzzles.',
        'Stretch your hips and back.',
        'Limit alcohol intake.',
        'Quit smoking (or don\'t start).',
        'Laugh often.',
        'Reflect on your life\'s purpose.',
    ]),
];

// ─── 3. Week 1 Daily Doses ─────────────────────────────────────────────────

const week1Doses = [
    {
        dayNumber: 1, category: 'nutrition', title: 'Your First Step',
        message: 'The journey of a thousand miles begins with a single step — and today, that step is on your plate. One small change to what you eat can change how you feel for the rest of the day.',
        bannerText: "Welcome to your first day! Here's something most people don't know: you don't have to overhaul your entire diet to feel better. Research shows that swapping just one processed food for a fresh, plant-based alternative can measurably improve your energy within days. We're not taking anything away — we're adding something good.",
        bannerQuestion: 'How would you describe what you ate yesterday?',
        bannerQuestionType: 'single_choice',
        bannerOptions: ['Very healthy', 'Mostly healthy', 'Mixed', 'Mostly processed', "I'd rather not say"],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
    {
        dayNumber: 2, category: 'movement', title: 'Just Ten Minutes',
        message: 'Your body was designed to move. Not to run marathons — just to move. Ten minutes of walking does more for your health than most people realize.',
        bannerText: "Here's a fact that surprises most people: just 10 minutes of brisk walking per day has been shown to add years to your life. Not hours at the gym. Not fancy equipment. Just 10 minutes of moving your body in whatever way feels good. That's today's challenge.",
        bannerQuestion: 'Did you move for at least 10 minutes yesterday?',
        bannerQuestionType: 'yes_no',
        bannerOptions: ['Yes', 'No'],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
    {
        dayNumber: 3, category: 'sleep', title: 'The Gift of Rest',
        message: "Sleep isn't a luxury — it's when your body repairs itself, your brain consolidates memories, and your immune system recharges. Tonight, give yourself the gift of rest.",
        bannerText: "Did you know that your sleep changes as you age? It's true — but that doesn't mean poor sleep is inevitable. The biggest sleep disruptors for adults over 60 are screens before bed, caffeine after 2 PM, and inconsistent bedtimes. Tonight, try just one change: set a 'screens off' alarm for one hour before bed.",
        bannerQuestion: 'How did you sleep last night?',
        bannerQuestionType: 'scale',
        bannerOptions: ['1 = Terribly', '10 = Like a dream'],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
    {
        dayNumber: 4, category: 'stress_management', title: 'Five Deep Breaths',
        message: "Stress isn't just in your head — it's in your shoulders, your stomach, your sleep. Five deep breaths can begin to undo what hours of worry have done.",
        bannerText: "Here's something fascinating about stress: your body can't tell the difference between real danger and imagined worry. When you stress about finances or health, your body releases the same cortisol as if a bear were chasing you. The good news? Deep breathing literally tells your nervous system to stand down. Five slow breaths — that's all it takes to start.",
        bannerQuestion: 'What is your stress level right now?',
        bannerQuestionType: 'scale',
        bannerOptions: ['1 = Very calm', '10 = Very stressed'],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
    {
        dayNumber: 5, category: 'social_connection', title: 'Connection Is Medicine',
        message: "Loneliness is as harmful to your health as smoking 15 cigarettes a day. Today, reach out to someone — not because you need something, but because connection is medicine.",
        bannerText: "This might be the most important thing you learn this week: loneliness is now recognized as a major health risk — as dangerous as obesity or smoking. But here's the hopeful part: even brief, meaningful social contact — a real conversation, a shared laugh, a heartfelt phone call — can measurably reduce that risk. Today's goal is simple: connect with one person.",
        bannerQuestion: 'When did you last have a meaningful conversation with someone?',
        bannerQuestionType: 'single_choice',
        bannerOptions: ['Today', 'Yesterday', 'This week', 'More than a week ago', "I can't remember"],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
    {
        dayNumber: 6, category: 'cognitive_health', title: 'Never Stop Growing',
        message: "Your brain never stops growing — at any age. Every time you learn something new, you're literally building new connections between brain cells. What will you learn today?",
        bannerText: "Neuroplasticity — your brain's ability to form new connections — never stops. Not at 50, not at 70, not at 90. Every crossword puzzle, every new recipe, every conversation where you learn something new is physically changing the structure of your brain for the better. Today, do one thing that makes your brain work a little harder than usual.",
        bannerQuestion: 'Did you learn something new this week?',
        bannerQuestionType: 'yes_no',
        bannerOptions: ['Yes', 'No'],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
    {
        dayNumber: 7, category: 'healthy_aging', title: 'A Reason to Rise',
        message: "The people who live the longest, healthiest lives share one trait: they have a reason to get up in the morning. What's yours?",
        bannerText: "Researchers have studied 'Blue Zones' — places around the world where people regularly live past 100 in good health. They found that the longest-lived people share common habits: they move naturally, eat mostly plants, have strong social circles, and — most importantly — they have a sense of purpose. As you finish your first week, take a moment to think about what gives your life meaning.",
        bannerQuestion: 'What made you smile today?',
        bannerQuestionType: 'free_text',
        bannerOptions: [],
        isActive: true, targetLabels: [], adminMessage: '', createdAt: now, updatedAt: now,
    },
];

// ─── 4. Rotating Post-Program Doses ────────────────────────────────────────

const rotatingDoses = [
    'The journey of a thousand miles begins with a single step.',
    'Health is not just about what you\'re eating. It\'s also about what you\'re thinking and saying.',
    'Take care of your body. It\'s the only place you have to live.',
    'A healthy outside starts from the inside.',
    'Believe you can and you\'re halfway there.',
    'Consistency is the key to breakthrough.',
    'Small daily improvements are the key to staggering long-term results.',
    'Your health is an investment, not an expense.',
    "Don't wait for the perfect moment — take the moment and make it perfect.",
    'Wellness is the complete integration of body, mind, and spirit.',
].map((message, i) => ({
    dayNumber: 0, // Floating / rotating
    category: 'general',
    title: `Wellness Wisdom ${i + 1}`,
    message,
    bannerText: '',
    bannerQuestion: '',
    bannerQuestionType: '',
    bannerOptions: [],
    isActive: true,
    targetLabels: [],
    adminMessage: '',
    createdAt: now,
    updatedAt: now,
}));

// ─── 5. Onboarding Survey (18 questions) ────────────────────────────────────

const onboardingSurvey = {
    _id: 'onboarding',
    title: 'Welcome to Feeling Fine',
    description: 'Help us personalize your wellness journey. This takes about 5 minutes.',
    type: 'onboarding',
    triggerDay: 0,
    isDismissable: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    questions: [
        { id: 'q1', text: 'What is your date of birth?', type: 'date_picker', options: [], required: true },
        { id: 'q2', text: 'How would you rate your overall health?', type: 'scale', options: ['1 (Poor)', '10 (Excellent)'], required: true },
        { id: 'q3', text: 'How many days per week do you exercise?', type: 'single_choice', options: ['0', '1-2', '3-4', '5+'], required: true },
        { id: 'q4', text: 'On average, how many hours of sleep do you get per night?', type: 'single_choice', options: ['Less than 5', '5-6', '7-8', 'More than 8'], required: true },
        { id: 'q5', text: 'How often do you feel stressed?', type: 'scale', options: ['1 (Never)', '10 (Constantly)'], required: true },
        { id: 'q6', text: 'How often do you socialize with friends or family?', type: 'single_choice', options: ['Daily', 'Several times a week', 'Weekly', 'Monthly', 'Rarely'], required: true },
        { id: 'q7', text: 'Do you have any dietary restrictions?', type: 'multiple_choice', options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Low-sodium', 'None'], required: true },
        { id: 'q8', text: 'What is your primary health goal?', type: 'single_choice', options: ['More energy', 'Better sleep', 'Weight management', 'Stress reduction', 'Sharper mind', 'Social connection', 'General wellness'], required: true },
        { id: 'q9', text: 'How would you describe your mobility?', type: 'single_choice', options: ['Very active', 'Somewhat active', 'Limited mobility', 'Wheelchair/walker'], required: true },
        { id: 'q10', text: 'Do you take any daily medications?', type: 'single_choice', options: ['None', '1-3', '4-6', '7+'], required: true },
        { id: 'q11', text: 'How old do you FEEL right now? (Your "subjective age" — whatever number pops into your head)', type: 'free_text', options: [], required: true },
        { id: 'q12', text: 'What is the biggest barrier to your wellness?', type: 'free_text', options: [], required: false },
        { id: 'q13', text: 'Do you live alone or with others?', type: 'single_choice', options: ['Alone', 'With spouse/partner', 'With family', 'In a care facility'], required: true },
        { id: 'q14', text: 'How comfortable are you with technology?', type: 'scale', options: ['1 (Not at all)', '10 (Very comfortable)'], required: true },
        { id: 'q15', text: 'What time do you usually wake up?', type: 'single_choice', options: ['Before 6 AM', '6-7 AM', '7-8 AM', '8-9 AM', 'After 9 AM'], required: true },
        { id: 'q16', text: 'How would you describe your current diet?', type: 'single_choice', options: ['Very healthy', 'Mostly healthy', 'Mixed', 'Mostly processed/fast food', 'Poor'], required: true },
        {
            id: 'q17', text: 'Which best describes your attitude about aging?', type: 'single_choice', options: [
                'A — I am extremely optimistic about aging. I\'d love to live to be 100, and I hope to be in surprisingly good health when I reach that age.',
                'B — I look forward to my older years as long as I stay in good health. I don\'t expect to be as productive, but I\'m pleased I\'ll have more time to relax and be with family and friends.',
                'C — I\'m ambivalent. I look forward to grandchildren and time to travel and learn. But I\'m also concerned about losing friends, being alone, and the likelihood of illness.',
                'D — I\'m not excited about getting older, but I guess it beats the alternative. My mind fills up with negative thoughts, but then I remember my grandmother was active until 98.',
                'E — I\'m really dreading getting old. I worry about wrinkles, dementia, falling, loneliness, and not being useful to anyone.',
            ], required: true
        },
        { id: 'q18', text: 'What activities bring you the most joy?', type: 'multiple_choice', options: ['Reading', 'Gardening', 'Walking', 'Cooking', 'Puzzles/Games', 'Socializing', 'Music', 'Art', 'Travel', 'Other'], required: false },
    ],
};

// ─── 6. Daily Check-In Banners (Days 1-7) ───────────────────────────────────

const dailyBanners = [
    {
        _id: 'banner-day1', title: 'Day 1: Physical Age vs. Felt Age', type: 'daily_checkin', triggerDay: 1, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b1', text: 'How old do you feel today?', type: 'free_text', options: [], required: false }]
    },
    {
        _id: 'banner-day2', title: 'Day 2: The 10-Minute Rule of Movement', type: 'daily_checkin', triggerDay: 2, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b2', text: 'Did you move for at least 10 minutes yesterday?', type: 'yes_no', options: ['Yes', 'No'], required: false }]
    },
    {
        _id: 'banner-day3', title: 'Day 3: Sleep Architecture & Aging', type: 'daily_checkin', triggerDay: 3, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b3', text: 'How did you sleep last night?', type: 'scale', options: ['1 (Terribly)', '10 (Like a dream)'], required: false }]
    },
    {
        _id: 'banner-day4', title: 'Day 4: The Physiology of Stress', type: 'daily_checkin', triggerDay: 4, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b4', text: 'What is your stress level right now?', type: 'scale', options: ['1 (Very calm)', '10 (Very stressed)'], required: false }]
    },
    {
        _id: 'banner-day5', title: 'Day 5: Loneliness as a Health Risk', type: 'daily_checkin', triggerDay: 5, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b5', text: 'When did you last have a meaningful conversation?', type: 'single_choice', options: ['Today', 'Yesterday', 'This week', 'More than a week ago', "I can't remember"], required: false }]
    },
    {
        _id: 'banner-day6', title: 'Day 6: Neuroplasticity Never Stops', type: 'daily_checkin', triggerDay: 6, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b6', text: 'Did you learn something new this week?', type: 'yes_no', options: ['Yes', 'No'], required: false }]
    },
    {
        _id: 'banner-day7', title: 'Day 7: The Blue Zones of Longevity', type: 'daily_checkin', triggerDay: 7, isDismissable: true, isActive: true, createdAt: now, updatedAt: now,
        questions: [{ id: 'b7', text: 'What made you smile today?', type: 'free_text', options: [], required: false }]
    },
];

// ─── 7. Default App Settings ────────────────────────────────────────────────

async function buildAppSettings() {
    const ADMIN_PASSCODE = 'RAniMe8CXQJw5ayd';
    const hash = await bcrypt.hash(ADMIN_PASSCODE, 12);
    console.log(`  Admin passcode hashed (12 rounds)`);

    return {
        _id: 'default',
        emailSendTime: '08:00',
        emailSendTimezone: 'America/New_York',
        programLengthWeeks: 8,
        adminPasscode: hash,
        welcomeMessage: 'Welcome to Feeling Fine — your daily wellness journey starts here.',
        maintenanceMode: false,
        createdAt: now,
        updatedAt: now,
    };
}

// ─── 8. Default Email Template ──────────────────────────────────────────────

const emailTemplate = {
    _id: 'daily',
    name: 'Daily Wellness Email',
    subject: 'Your Daily Dose — Day {{programDay}}',
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fdfbf7;font-family:'Inter',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:32px;">
    <tr><td style="text-align:center;padding-bottom:24px;">
      <h1 style="color:#2c7a7b;font-size:28px;margin:0;">Feeling Fine</h1>
    </td></tr>
    <tr><td style="padding-bottom:16px;">
      <p style="font-size:18px;color:#2d3748;">Good morning, {{userName}}!</p>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:12px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <p style="font-size:14px;color:#718096;margin:0 0 8px;">Day {{programDay}} — Today's Daily Dose</p>
      <p style="font-size:20px;color:#2d3748;font-family:'Merriweather',Georgia,serif;line-height:1.6;margin:0;">{{doseMessage}}</p>
    </td></tr>
    <tr><td style="padding:24px 0;">
      <p style="font-size:16px;color:#2d3748;">{{adminMessage}}</p>
    </td></tr>
    <tr><td style="text-align:center;padding:16px 0;">
      <a href="{{appUrl}}" style="display:inline-block;background:linear-gradient(135deg,#2c7a7b,#38b2ac);color:#fff;font-size:16px;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;">Open Your Daily Dose</a>
    </td></tr>
    <tr><td style="text-align:center;padding-top:32px;border-top:1px solid #e2e8f0;">
      <p style="font-size:12px;color:#a0aec0;">
        <a href="{{unsubscribeUrl}}" style="color:#a0aec0;">Unsubscribe from daily emails</a>
      </p>
    </td></tr>
  </table>
</body>
</html>`,
    textBody: `Good morning, {{userName}}!\n\nDay {{programDay}} — Today's Daily Dose:\n\n{{doseMessage}}\n\n{{adminMessage}}\n\nOpen your Daily Dose: {{appUrl}}\n\nUnsubscribe: {{unsubscribeUrl}}`,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    updatedBy: 'system',
};

// ─── Run ────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('\n═══════════════════════════════════════════');
    console.log('  Feeling Fine — Firestore Seed Script');
    console.log('═══════════════════════════════════════════');

    await seedCollection('cornerstones', cornerstones);
    await seedCollection('dailyDos', dailyDos);
    await seedCollection('dailyDoses', [...week1Doses, ...rotatingDoses]);
    await seedCollection('surveys', [onboardingSurvey, ...dailyBanners]);

    const appSettings = await buildAppSettings();
    await seedCollection('appSettings', [appSettings]);
    await seedCollection('emailTemplates', [emailTemplate]);

    console.log('\n═══════════════════════════════════════════');
    console.log(`  DONE! ${totalDocs} documents written.`);
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
}

seed().catch(err => {
    console.error('\n  SEED FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
});
