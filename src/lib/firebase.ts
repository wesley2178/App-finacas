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
    console.log("Attempting Google Sign In...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google Sign In Success:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("Google Sign In Error:", error.code, error.message);
    throw error;
  }
};

export const signOut = () => auth.signOut();
