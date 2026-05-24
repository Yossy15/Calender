import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit
} from "firebase/firestore";

import firebaseConfig from "../firebase-applet-config.json";

// Safe, non-crashing initialization
let app;
let auth: any = null;
let db: any = null;
let isFirebaseEnabled = false;
let cachedAccessToken: string | null = null;

export function getCachedAccessToken() {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

const hasConfigKeys = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

if (hasConfigKeys) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseEnabled = true;
    console.log("Firebase initialized successfully using firebase-applet-config.json.");
  } catch (error) {
    console.warn("Failed to initialize Firebase with config file:", error);
  }
} else {
  console.log("No Firebase config keys found; running in high-fidelity local sandbox mode.");
}

export { auth, db, isFirebaseEnabled };

// Standard Google Authentication Popup helper
export async function loginWithGoogle(promptSelectAccount = false) {
  if (!isFirebaseEnabled || !auth) {
    throw new Error("Firebase is not initialized or configured with credentials.");
  }
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  if (promptSelectAccount) {
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return result.user;
  } catch (err: any) {
    console.error("Google login failed:", err);
    throw err;
  }
}

// Sign out helper
export async function logoutUser() {
  if (isFirebaseEnabled && auth) {
    await signOut(auth);
    cachedAccessToken = null;
  }
}
