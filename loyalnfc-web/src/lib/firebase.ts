import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Environment Variable driven Firebase Configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "loyalnfc-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "loyalnfc-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "loyalnfc-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

// Singleton App Instance Initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Optional App Check Initialization (enforces legitimate client calls in production)
if (typeof window !== "undefined" && import.meta.env.VITE_FIREBASE_APPCHECK_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APPCHECK_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("App Check initialization skipped or already initialized:", err);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
