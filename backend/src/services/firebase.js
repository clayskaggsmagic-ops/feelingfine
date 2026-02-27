import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/**
 * Initializes Firebase Admin SDK.
 * Uses GOOGLE_APPLICATION_CREDENTIALS env var for local dev (service account key file),
 * or Application Default Credentials in production (Cloud Run, App Hosting).
 */
function initFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'feelingfine-b4106';

  // If a base64-encoded service account key is provided (production), use it
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
    return initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }

  // Otherwise, use Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS
  return initializeApp({ projectId, storageBucket: `${projectId}.firebasestorage.app` });
}

const app = initFirebase();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log(`[firebase] Initialized for project: ${process.env.FIREBASE_PROJECT_ID || 'feelingfine-b4106'}`);

export { app, auth, db, storage };
