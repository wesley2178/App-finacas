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
    console.log('Firebase: Verificando acesso para:', cleanEmail);
    
    // 1. Verificar se a coleção existe e é acessível
    const usersCollection = collection(db, 'authorized_users');
    
    // 2. Query por e-mail
    const q = query(
      usersCollection,
      where('email', '==', cleanEmail),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      console.log('Firebase: Usuário encontrado:', userData);
      
      if (userData.active === true) {
        return { authorized: true };
      } else {
        return { authorized: false, message: 'Seu acesso está inativo (active: false).' };
      }
    } else {
      console.log('Firebase: Nenhum documento encontrado para este e-mail.');
      return { authorized: false, message: 'E-mail não cadastrado ou acesso pendente.' };
    }
  } catch (error: any) {
    console.error('Firebase Error:', error);
    let errorMsg = 'Erro de conexão com o banco de dados.';
    
    if (error.code === 'permission-denied') {
      errorMsg = 'Erro de permissão no Firebase (verifique as Rules).';
    } else if (error.message && error.message.includes('offline')) {
      errorMsg = 'Você parece estar offline.';
    } else if (error.code === 'not-found') {
       errorMsg = 'Coleção authorized_users não encontrada.';
    }
    
    return { authorized: false, message: `${errorMsg} (Detalhe: ${error.code || error.message})` };
  }
}
