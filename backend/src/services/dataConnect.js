/**
 * Firebase Data Connect — Central data-access service.
 *
 * ALL database operations go through this module.
 * Uses the Firebase Admin SDK's Data Connect API to execute
 * GraphQL queries/mutations on Cloud SQL PostgreSQL.
 *
 * NEVER import Firestore 'db' for data operations — use this instead.
 */

import { getDataConnect } from 'firebase-admin/data-connect';
import { app } from './firebase.js';

const DATA_CONNECT_SERVICE_ID = 'feelingfine';
const DATA_CONNECT_LOCATION = 'us-east4';

const dataConnect = getDataConnect({
    serviceId: DATA_CONNECT_SERVICE_ID,
    location: DATA_CONNECT_LOCATION,
}, app);

console.log(`[dataConnect] Initialized — service: ${DATA_CONNECT_SERVICE_ID}, location: ${DATA_CONNECT_LOCATION}`);

// ─── Core Helpers ───────────────────────────────────────────────────────────

/**
 * Execute a read-only GraphQL query.
 * @param {string} gql - GraphQL query string
 * @param {object} variables - Query variables
 * @returns {Promise<object>} - Query result data
 */
export async function query(gql, variables = {}) {
    const result = await dataConnect.executeGraphqlRead(gql, { variables });
    return result.data;
}

/**
 * Execute a GraphQL mutation (read/write).
 * @param {string} gql - GraphQL mutation string
 * @param {object} variables - Mutation variables
 * @returns {Promise<object>} - Mutation result data
 */
export async function mutate(gql, variables = {}) {
    const result = await dataConnect.executeGraphql(gql, { variables });
    return result.data;
}

/**
 * Bulk insert rows into a table.
 * @param {string} table - Table name (e.g., 'cornerstone')
 * @param {object[]} rows - Array of row objects
 * @returns {Promise<object[]>} - Insert results
 */
export async function insertMany(table, rows) {
    return dataConnect.insertMany(table, rows);
}

/**
 * Upsert a single row.
 * @param {string} table - Table name
 * @param {object} row - Row data
 * @returns {Promise<object>}
 */
export async function upsert(table, row) {
    return dataConnect.upsert(table, row);
}

/**
 * Insert a single row.
 * @param {string} table - Table name
 * @param {object} row - Row data
 * @returns {Promise<object>}
 */
export async function insert(table, row) {
    return dataConnect.insert(table, row);
}

// ─── Convenience Query Functions ────────────────────────────────────────────

// User
export async function getUserByUid(uid) {
    const data = await query(`query($uid: String!) { user(id: $uid) { id email displayName firstName lastName role programStartDate labels fontSizeMultiplier emailOptIn dailyReminder weeklyReport challengeAlerts provider timezone photoURL walkthroughCompleted createdAt updatedAt } }`, { uid });
    return data.user;
}

export async function upsertUser(userData) {
    return upsert('user', userData);
}

export async function deleteUser(uid) {
    return mutate(`mutation($id: String!) { user_delete(id: $id) }`, { id: uid });
}

export async function updateUser(uid, updates) {
    // Build mutation dynamically to only include fields being updated.
    // This prevents null-overwriting other fields when doing partial updates.
    const FIELD_TYPES = {
        displayName: 'String',
        firstName: 'String',
        lastName: 'String',
        fontSizeMultiplier: 'Float',
        emailOptIn: 'Boolean',
        dailyReminder: 'Boolean',
        weeklyReport: 'Boolean',
        challengeAlerts: 'Boolean',
        labels: '[String!]',
        programStartDate: 'Date',
        timezone: 'String',
        walkthroughCompleted: 'Boolean',
        photoURL: 'String',
    };

    const fields = Object.keys(updates).filter(k => k in FIELD_TYPES);
    if (fields.length === 0) return;

    const varDefs = fields.map(f => `$${f}: ${FIELD_TYPES[f]}`).join(', ');
    const dataFields = fields.map(f => `${f}: $${f}`).join('\n        ');

    const gql = `mutation($id: String!, ${varDefs}) {
      user_update(id: $id, data: {
        ${dataFields}
        updatedAt_expr: "request.time"
      })
    }`;

    return mutate(gql, { id: uid, ...updates });
}

// Cornerstones
export async function listCornerstones() {
    const data = await query(`query { cornerstones(orderBy: [{ sortOrder: ASC }]) { id name dayNumber icon color description dayOfWeek sortOrder isActive } }`);
    return data.cornerstones;
}

// Daily Doses
export async function getDoseByDayNumber(dayNumber) {
    const data = await query(`query($day: Int!) { dailyDoses(where: { dayNumber: { eq: $day }, isActive: { eq: true } }, limit: 1) { id dayNumber category title message bannerText bannerQuestion bannerQuestionType bannerOptions targetLabels adminMessage } }`, { day: dayNumber });
    return data.dailyDoses?.[0] || null;
}

export async function getDosesByCategory(category) {
    const data = await query(`query($cat: String!) { dailyDoses(where: { category: { eq: $cat }, isActive: { eq: true } }) { id dayNumber category title message targetLabels } }`, { cat: category });
    return data.dailyDoses || [];
}

export async function getRotatingDoses() {
    const data = await query(`query { dailyDoses(where: { dayNumber: { eq: 0 }, isActive: { eq: true } }) { id dayNumber category title message } }`);
    return data.dailyDoses || [];
}

// Daily Dos
export async function getDosByDayNumber(dayNumber) {
    const data = await query(`query($day: Int!) { dailyDos(where: { dayNumber: { eq: $day }, isActive: { eq: true } }, orderBy: [{ sortOrder: ASC }]) { id text category dayNumber sortOrder targetLabels } }`, { day: dayNumber });
    return data.dailyDos || [];
}

export async function getDosByCategory(category) {
    const data = await query(`query($cat: String!) { dailyDos(where: { category: { eq: $cat }, isActive: { eq: true } }, orderBy: [{ sortOrder: ASC }]) { id text category dayNumber sortOrder targetLabels } }`, { cat: category });
    return data.dailyDos || [];
}

// Tracking
export async function getTrackingDay(uid, dateKey) {
    const [trackingData, completedData, customData] = await Promise.all([
        query(`query($uid: String!, $dateKey: Date!) {
      trackingDays(where: { userId: { eq: $uid }, dateKey: { eq: $dateKey } }, limit: 1) {
        id userId dateKey feelingScore dailyDoseViewed dailyDoseViewedAt surveyCompleted createdAt
      }
    }`, { uid, dateKey }),
        query(`query($uid: String!, $dateKey: Date!) {
      completedDos(where: { userId: { eq: $uid }, dateKey: { eq: $dateKey } }) {
        id doId category completedAt
      }
    }`, { uid, dateKey }),
        query(`query($uid: String!, $dateKey: Date!) {
      customDos(where: { userId: { eq: $uid }, dateKey: { eq: $dateKey } }) {
        id text category completedAt
      }
    }`, { uid, dateKey }),
    ]);

    const tracking = trackingData.trackingDays?.[0];
    if (!tracking) return null;

    tracking.completedDos = completedData.completedDos || [];
    tracking.customDos = customData.customDos || [];
    return tracking;
}

export async function upsertTrackingDay(uid, dateKey, fields = {}) {
    const id = `${uid}_${dateKey}`;
    return upsert('trackingDay', { id, userId: uid, dateKey, ...fields });
}

export async function getTrackingHistory(uid, startDate) {
    const data = await query(`query($uid: String!, $startDate: Date!) {
    trackingDays(
      where: { userId: { eq: $uid }, dateKey: { ge: $startDate } }
      orderBy: [{ dateKey: DESC }]
    ) {
      id userId dateKey feelingScore dailyDoseViewed surveyCompleted createdAt
    }
  }`, { uid, startDate });

    const days = data.trackingDays || [];

    // Fetch completed/custom dos for each day in parallel
    if (days.length > 0) {
        const [allCompleted, allCustom] = await Promise.all([
            query(`query($uid: String!, $startDate: Date!) {
        completedDos(where: { userId: { eq: $uid }, dateKey: { ge: $startDate } }) {
          id doId category completedAt dateKey
        }
      }`, { uid, startDate }),
            query(`query($uid: String!, $startDate: Date!) {
        customDos(where: { userId: { eq: $uid }, dateKey: { ge: $startDate } }) {
          id text category completedAt dateKey
        }
      }`, { uid, startDate }),
        ]);

        const completedByDate = {};
        for (const d of (allCompleted.completedDos || [])) {
            (completedByDate[d.dateKey] ||= []).push(d);
        }
        const customByDate = {};
        for (const d of (allCustom.customDos || [])) {
            (customByDate[d.dateKey] ||= []).push(d);
        }

        for (const day of days) {
            day.completedDos = completedByDate[day.dateKey] || [];
            day.customDos = customByDate[day.dateKey] || [];
        }
    }

    return days;
}

export async function insertCompletedDo(uid, dateKey, doId, category) {
    return insert('completedDo', { userId: uid, dateKey, doId, category });
}

export async function deleteCompletedDo(id) {
    return mutate(`mutation($id: UUID!) { completedDo_delete(id: $id) }`, { id });
}

export async function insertCustomDo(uid, dateKey, text, category) {
    return insert('customDo', { userId: uid, dateKey, text, category });
}

// Surveys
export async function getSurvey(surveyId) {
    const data = await query(`query($id: String!) { survey(id: $id) { id title description type triggerDay isDismissable isActive questions } }`, { id: surveyId });
    return data.survey;
}

export async function listSurveysByType(type) {
    const data = await query(`query($type: String!) { surveys(where: { type: { eq: $type }, isActive: { eq: true } }) { id title type triggerDay isDismissable questions } }`, { type });
    return data.surveys || [];
}

export async function listAllActiveSurveys() {
    const data = await query(`query { surveys(where: { isActive: { eq: true } }) { id title type triggerDay isDismissable questions } }`);
    return data.surveys || [];
}

// Survey Responses
export async function insertSurveyResponse(responseData) {
    return insert('surveyResponse', responseData);
}

export async function getUserSurveyResponses(uid) {
    const data = await query(
        `query($uid: String!) { surveyResponses(where: { userId: { eq: $uid } }) { id surveyId submittedAt answers } }`,
        { uid }
    );
    return data.surveyResponses || [];
}

export async function getPendingSurveys(uid, programDay) {
    const allSurveys = await listAllActiveSurveys();
    const responses = await getUserSurveyResponses(uid);
    const completedIds = new Set(responses.map(r => r.surveyId));

    return allSurveys.filter(s => {
        if (completedIds.has(s.id)) return false;
        if (s.type === 'onboarding') return true;
        if (s.type === 'daily_banner' && s.triggerDay && s.triggerDay <= programDay) return true;
        if (s.type === 'weekly' && programDay >= 8) return true;
        return false;
    });
}

// App Settings
export async function getAppSettings() {
    const data = await query(`query { appSetting(id: "default") { id emailSendTime emailSendTimezone programLengthWeeks adminPasscode welcomeMessage maintenanceMode } }`);
    return data.appSetting;
}

// Email Templates
export async function getEmailTemplate(templateId) {
    const data = await query(`query($id: String!) { emailTemplate(id: $id) { id name subject htmlBody textBody isActive } }`, { id: templateId });
    return data.emailTemplate;
}

// Email-eligible users (emailOptIn not set to false)
export async function getEmailEligibleUsers() {
    const data = await query(`query { users(where: { emailOptIn: { ne: false } }) { id email displayName programStartDate timezone } }`);
    return data.users || [];
}

// ─── Export raw dataConnect instance for advanced use ────────────────────────
export { dataConnect };
