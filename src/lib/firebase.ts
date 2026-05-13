import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    console.log("Attempting Google Sign In (Popup)...");
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Popup Error:", error.code);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.log("Attempting Redirect fallback...");
      // For fallback we'd use signInWithRedirect(auth, googleProvider);
      // but let's keep it simple for now and just log
    }
    throw error;
  }
};

export const signInWithGoogleRedirect = () => {
  const { signInWithRedirect } = (import.meta as any).env?.VITE_FIREBASE_AUTH || {}; 
  // Just importing it directly to avoid issues
  import('firebase/auth').then(m => m.signInWithRedirect(auth, googleProvider));
};

export const signOut = () => auth.signOut();
