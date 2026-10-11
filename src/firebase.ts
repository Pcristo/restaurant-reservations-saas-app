import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentSingleTabManager,
  memoryLocalCache,
  getFirestore 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with single-tab ownership (safe for iframes) and memory fallback
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager({ forceOwnership: true })
    })
  }, databaseId);
} catch (err) {
  console.warn('[Firestore] Initializing memory cache fallback:', err);
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, databaseId);
  } catch {
    firestoreDb = getFirestore(app, databaseId);
  }
}

export const db = firestoreDb;
export const auth = getAuth(app);
export { firebaseConfig };

