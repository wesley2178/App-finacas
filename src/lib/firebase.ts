import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Initialize Firestore with the specific database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { collection, query, where, getDocs, limit, serverTimestamp };

export async function checkUserAccess(email: string): Promise<{ authorized: boolean; message?: string }> {
  try {
    const q = query(
      collection(db, 'authorized_users'),
      where('email', '==', email.toLowerCase().trim()),
      where('active', '==', true),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return { authorized: true };
    } else {
      return { authorized: false, message: 'Seu acesso ainda não foi liberado.' };
    }
  } catch (error) {
    console.error('Error checking user access:', error);
    return { authorized: false, message: 'Erro ao verificar acesso. Tente novamente.' };
  }
}
