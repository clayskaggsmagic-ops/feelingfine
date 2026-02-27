import { db } from './firebase.js';

/**
 * Cornerstone definitions: the 7 pillars of the Feeling Fine program.
 * Day mapping follows the spec: Day 1 = Nutrition ... Day 7 = Healthy Aging.
 * After Week 1, the day-of-week determines the focused cornerstone.
 */
export const CORNERSTONES = [
    { id: 'nutrition', name: 'Nutrition', dayNumber: 1, color: '#48bb78', description: 'Nourish your body with wholesome food choices.' },
    { id: 'movement', name: 'Movement', dayNumber: 2, color: '#ed8936', description: 'Keep your body active and strong through daily movement.' },
    { id: 'sleep', name: 'Sleep', dayNumber: 3, color: '#667eea', description: 'Rest and restore with quality sleep habits.' },
    { id: 'stress_management', name: 'Stress Management', dayNumber: 4, color: '#ecc94b', description: 'Build resilience and calm through mindful practices.' },
    { id: 'social_connection', name: 'Social Connection', dayNumber: 5, color: '#f56565', description: 'Strengthen bonds with the people who matter most.' },
    { id: 'cognitive_health', name: 'Brain Health', dayNumber: 6, color: '#38b2ac', description: 'Keep your mind sharp with stimulating activities.' },
    { id: 'healthy_aging', name: 'Healthy Aging', dayNumber: 7, color: '#9f7aea', description: 'Embrace aging with purpose, vitality, and joy.' },
];

/**
 * Get the focused cornerstone for a given programDay.
 * Days 1-7: maps directly (day 1 = nutrition, day 2 = movement, etc.)
 * Day 8+: cycles through cornerstones using modulo (1-indexed)
 */
export function getFocusedCornerstone(programDay) {
    if (programDay <= 0) return CORNERSTONES[0]; // Default to Nutrition
    const idx = ((programDay - 1) % 7);
    return CORNERSTONES[idx];
}

/**
 * Calculate programDay for a user based on their programStartDate.
 * Returns 0 if no programStartDate (onboarding not completed).
 */
export function calculateProgramDay(user) {
    if (!user.programStartDate) return 0;
    const start = new Date(user.programStartDate);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Get today's date key in YYYY-MM-DD format.
 */
export function getDateKey(date = new Date()) {
    return date.toISOString().split('T')[0];
}

/**
 * Fetch the Daily Dose for a user based on their programDay.
 * Days 1-7: exact match on dayNumber.
 * Days 8+: match by user labels or fall back to rotating doses.
 */
export async function getDailyDose(user) {
    const programDay = calculateProgramDay(user);
    console.log(`[programService] Getting dose for uid: ${user.uid}, programDay: ${programDay}`);

    if (programDay === 0) {
        console.log('[programService] User has not completed onboarding — no dose');
        return { dose: null, programDay, phase: 'onboarding' };
    }

    let phase;
    let dose = null;

    if (programDay <= 7) {
        // Phase 2: Fixed doses for Week 1
        phase = 'week1';
        const snapshot = await db.collection('dailyDoses')
            .where('dayNumber', '==', programDay)
            .where('isActive', '==', true)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            dose = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
        console.log(`[programService] Week 1 dose for day ${programDay}: ${dose ? dose.title : 'NOT FOUND'}`);

    } else if (programDay <= 56) {
        // Phase 3-4: Personalized by labels
        phase = 'personalized';
        const userLabels = user.labels || [];
        const focusedCornerstone = getFocusedCornerstone(programDay);

        // Try to find a dose matching the user's labels and focused cornerstone
        let snapshot = await db.collection('dailyDoses')
            .where('category', '==', focusedCornerstone.id)
            .where('isActive', '==', true)
            .get();

        if (!snapshot.empty) {
            // Prefer doses that match user labels, otherwise pick one based on programDay
            const allDoses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const labelMatches = allDoses.filter(d =>
                d.targetLabels && d.targetLabels.some(l => userLabels.includes(l))
            );
            dose = labelMatches.length > 0
                ? labelMatches[programDay % labelMatches.length]
                : allDoses[programDay % allDoses.length];
        }

        console.log(`[programService] Personalized dose for day ${programDay} (${focusedCornerstone.id}): ${dose ? dose.title : 'NOT FOUND'}`);

    } else {
        // Phase 5: Rotating post-program doses
        phase = 'maintenance';
        const snapshot = await db.collection('dailyDoses')
            .where('dayNumber', '==', 0) // Floating/rotating doses
            .where('isActive', '==', true)
            .get();

        if (!snapshot.empty) {
            const allDoses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            dose = allDoses[programDay % allDoses.length];
        }

        console.log(`[programService] Maintenance dose for day ${programDay}: ${dose ? dose.title : 'NOT FOUND'}`);
    }

    return { dose, programDay, phase };
}

/**
 * Fetch the Daily Dos for a user based on their programDay.
 * Returns focused cornerstone dos prominently, plus all others.
 */
export async function getDailyDos(user) {
    const programDay = calculateProgramDay(user);
    const focusedCornerstone = getFocusedCornerstone(programDay);
    console.log(`[programService] Getting dos for uid: ${user.uid}, programDay: ${programDay}, focus: ${focusedCornerstone.id}`);

    if (programDay === 0) {
        return { dos: [], focusedCornerstone, programDay, allCornerstones: CORNERSTONES };
    }

    let snapshot;

    if (programDay <= 7) {
        // Week 1: fixed dos by dayNumber
        snapshot = await db.collection('dailyDos')
            .where('dayNumber', '==', programDay)
            .where('isActive', '==', true)
            .get();
    } else {
        // Day 8+: dos for the focused cornerstone
        snapshot = await db.collection('dailyDos')
            .where('category', '==', focusedCornerstone.id)
            .where('isActive', '==', true)
            .get();
    }

    let dos = snapshot.empty
        ? []
        : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // For personalized phase, filter/sort by user labels
    if (programDay > 7) {
        const userLabels = user.labels || [];
        // Sort: label-matching dos first, then others. Limit to 5.
        dos.sort((a, b) => {
            const aMatch = a.targetLabels?.some(l => userLabels.includes(l)) ? 0 : 1;
            const bMatch = b.targetLabels?.some(l => userLabels.includes(l)) ? 0 : 1;
            return aMatch - bMatch;
        });
        dos = dos.slice(0, 5);
    }

    console.log(`[programService] Found ${dos.length} dos for ${focusedCornerstone.id}`);

    return {
        dos,
        focusedCornerstone,
        programDay,
        allCornerstones: CORNERSTONES,
    };
}
