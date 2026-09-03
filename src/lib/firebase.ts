import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
  Firestore,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let dbInstance: Firestore;
if (typeof window !== "undefined") {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch {
    dbInstance = getFirestore(app);
  }
} else {
  dbInstance = getFirestore(app);
}

export const db = dbInstance;
export const auth = getAuth(app);
export default app;
