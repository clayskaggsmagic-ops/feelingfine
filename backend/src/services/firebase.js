import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';

/**
 * Initializes Firebase Admin SDK.
 * Credential resolution order:
 * 1. FIREBASE_SERVICE_ACCOUNT_KEY env var (base64-encoded JSON — for production)
 * 2. GOOGLE_APPLICATION_CREDENTIALS env var pointing to a JSON key file
 * 3. ./service-account-key.json in the backend directory (local dev convenience)
 * 4. Application Default Credentials (Cloud Run, App Hosting, etc.)
 */
function initFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'feelingfine-b4106';
  const bucket = `${projectId}.firebasestorage.app`;

  // Option 1: Base64-encoded service account (production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
    );
    console.log('[firebase] Using base64-encoded service account key');
    return initializeApp({ credential: cert(serviceAccount), projectId, storageBucket: bucket });
  }

  // Option 2: GOOGLE_APPLICATION_CREDENTIALS env var (file path)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    const serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));
    console.log(`[firebase] Using service account key from: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    return initializeApp({ credential: cert(serviceAccount), projectId, storageBucket: bucket });
  }

  // Option 3: Local dev convenience — check for key file in backend root
  const localKeyPath = new URL('../../service-account-key.json', import.meta.url).pathname;
  if (existsSync(localKeyPath)) {
    const serviceAccount = JSON.parse(readFileSync(localKeyPath, 'utf-8'));
    console.log('[firebase] Using local service-account-key.json');
    return initializeApp({ credential: cert(serviceAccount), projectId, storageBucket: bucket });
  }

  // Option 4: Application Default Credentials (Cloud Run, App Hosting, etc.)
  console.log('[firebase] Using Application Default Credentials');
  return initializeApp({ projectId, storageBucket: bucket });
}

const app = initFirebase();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

console.log(`[firebase] Initialized for project: ${process.env.FIREBASE_PROJECT_ID || 'feelingfine-b4106'}`);

export { app, auth, db, storage };

