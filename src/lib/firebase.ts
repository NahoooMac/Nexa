import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getAuth(initializeApp(firebaseConfig)).app;
export const auth = getAuth(app);
export const db = getFirestore(app);

export function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || '';
  const msg = error?.message || '';
  
  if (code === 'auth/popup-blocked' || msg.includes('auth/popup-blocked')) {
    return 'Popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('auth/popup-closed-by-user')) {
    return 'The sign-in popup was closed before completing.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password' || msg.includes('invalid-credential') || msg.includes('user-not-found')) {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (code === 'auth/weak-password' || msg.includes('weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  if (code === 'auth/network-request-failed' || msg.includes('network-request-failed')) {
    return 'Network error. Please check your internet connection.';
  }
  if (msg.includes('invalid-api-key') || code === 'auth/invalid-api-key') {
    return 'Firebase setup incomplete. Missing environment variables.';
  }
  if (msg.includes('unauthorized-domain') || code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase. Please add it in the Firebase Console.';
  }
  
  return msg || 'An unexpected authentication error occurred.';
}
