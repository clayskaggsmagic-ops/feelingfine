/**
 * Program Service — Core content delivery logic.
 *
 * Determines which Daily Dose and Daily Dos to show each user based on
 * their programDay, focused cornerstone, and personalization labels.
 *
 * ALL data access goes through dataConnect.js (PostgreSQL via Data Connect).
 */

import {
    listCornerstones,
    getDoseByDayNumber,
    getDosesByCategory,
    getRotatingDoses,
    getDosByDayNumber,
    getDosByCategory,
} from './dataConnect.js';

// ─── Cornerstone Helpers ────────────────────────────────────────────────────

// Cached in-memory after first load from DB
let _cornerstones = null;

async function getCornerstones() {
    if (!_cornerstones) {
        _cornerstones = await listCornerstones();
        console.log(`[programService] Loaded ${_cornerstones.length} cornerstones from DB`);
    }
    return _cornerstones;
}

export function calculateProgramDay(user) {
    if (!user.programStartDate) return 0;
    const start = new Date(user.programStartDate);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
}

export async function getFocusedCornerstone(programDay) {
    const cornerstones = await getCornerstones();
    if (programDay <= 0) return cornerstones[0];
    const idx = ((programDay - 1) % 7);
    return cornerstones[idx];
}

export function getDateKey(date = new Date()) {
    return date.toISOString().split('T')[0];
}

// ─── Daily Dose ─────────────────────────────────────────────────────────────

export async function getDailyDose(user) {
    const programDay = calculateProgramDay(user);
    const cornerstones = await getCornerstones();
    const focused = await getFocusedCornerstone(programDay);
    let dose, phase;

    if (programDay <= 0) {
        console.log('[programService/dose] User has not started program yet');
        return { dose: null, programDay: 0, phase: 'onboarding' };
    }

    if (programDay <= 7) {
        // Week 1: Fixed doses by dayNumber
        phase = 'week1';
        dose = await getDoseByDayNumber(programDay);
        console.log(`[programService/dose] Week 1, day ${programDay}: ${dose?.title || 'NOT FOUND'}`);
    } else if (programDay <= 56) {
        // Weeks 2-8: Personalized by user labels + focused cornerstone
        phase = 'personalized';
        const userLabels = user.labels || [];
        const categoryDoses = await getDosesByCategory(focused.id);

        if (categoryDoses.length > 0) {
            // Sort by label relevance
            dose = categoryDoses.sort((a, b) => {
                const aMatch = a.targetLabels?.some(l => userLabels.includes(l)) ? 0 : 1;
                const bMatch = b.targetLabels?.some(l => userLabels.includes(l)) ? 0 : 1;
                return aMatch - bMatch;
            })[0];
        }

        if (!dose) {
            // Fallback: rotating dose
            const rotating = await getRotatingDoses();
            const idx = (programDay - 8) % Math.max(rotating.length, 1);
            dose = rotating[idx] || null;
        }
        console.log(`[programService/dose] Personalized, day ${programDay}, focus: ${focused.id}: ${dose?.title || 'fallback'}`);
    } else {
        // Day 57+: Rotating maintenance doses
        phase = 'maintenance';
        const rotating = await getRotatingDoses();
        const idx = (programDay - 57) % Math.max(rotating.length, 1);
        dose = rotating[idx] || null;
        console.log(`[programService/dose] Maintenance, day ${programDay}: ${dose?.title || 'NOT FOUND'}`);
    }

    return { dose, programDay, phase, focusedCornerstone: focused, allCornerstones: cornerstones };
}

// ─── Daily Dos ──────────────────────────────────────────────────────────────

export async function getDailyDos(user) {
    const programDay = calculateProgramDay(user);
    const cornerstones = await getCornerstones();
    const focused = await getFocusedCornerstone(programDay);
    let dos;

    if (programDay <= 0) {
        return { dos: [], focusedCornerstone: focused, programDay: 0, allCornerstones: cornerstones };
    }

    if (programDay <= 7) {
        // Week 1: Fixed dos by dayNumber (first 5 of focused cornerstone)
        dos = await getDosByDayNumber(focused.dayNumber);
        console.log(`[programService/dos] Week 1, day ${programDay}, focus: ${focused.id}: ${dos.length} dos`);
    } else {
        // Day 8+: Personalized by focused cornerstone + label relevance
        const userLabels = user.labels || [];
        dos = await getDosByCategory(focused.id);

        // Sort by label relevance, then limit to 5
        dos.sort((a, b) => {
            const aMatch = a.targetLabels?.some(l => userLabels.includes(l)) ? 0 : 1;
            const bMatch = b.targetLabels?.some(l => userLabels.includes(l)) ? 0 : 1;
            return aMatch - bMatch;
        });
        dos = dos.slice(0, 5);
        console.log(`[programService/dos] Personalized, day ${programDay}, focus: ${focused.id}: ${dos.length} dos`);
    }

    return { dos, focusedCornerstone: focused, programDay, allCornerstones: cornerstones };
}
