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
    const cleanEmail = email.toLowerCase().trim();
    console.log('Checking access for:', cleanEmail);
    
    // Query only by email first to be more resilient
    const q = query(
      collection(db, 'authorized_users'),
      where('email', '==', cleanEmail),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Query completed. Empty:', querySnapshot.empty);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      console.log('User data found:', userData);
      
      if (userData.active === true) {
        console.log('User is active');
        return { authorized: true };
      } else {
        console.log('User found but not active');
        return { authorized: false, message: 'Seu acesso ainda não foi liberado (conta inativa).' };
      }
    } else {
      console.log('No such user found in authorized_users with email:', cleanEmail);
      return { authorized: false, message: 'Seu acesso ainda não foi liberado.' };
    }
  } catch (error: any) {
    console.error('Error checking user access:', error);
    return { authorized: false, message: `Erro de conexão: ${error.message || 'Verifique sua internet'}` };
  }
}
