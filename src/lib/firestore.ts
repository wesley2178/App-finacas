import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs,
  where,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { EarningsEntry, Bill, SavingsDeposit, DailyExpense, MonthArchive } from '../types';

export const getCollectionRef = (userId: string, collName: string) => 
  collection(db, 'users', userId, collName);

export const subscribeToCollection = (userId: string, collName: string, callback: (data: any[]) => void) => {
  const q = query(getCollectionRef(userId, collName), orderBy('date', 'desc'));
  // Note: some collections might use 'dueDate' or 'month' instead of 'date'
  // I'll adjust as needed in the component
  return onSnapshot(getCollectionRef(userId, collName), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

export const createDocument = async (userId: string, collName: string, data: any) => {
  return addDoc(getCollectionRef(userId, collName), {
    ...data,
    createdAt: serverTimestamp()
  });
};

export const updateDocument = async (userId: string, collName: string, docId: string, data: any) => {
  return updateDoc(doc(db, 'users', userId, collName, docId), data);
};

export const deleteDocument = async (userId: string, collName: string, docId: string) => {
  return deleteDoc(doc(db, 'users', userId, collName, docId));
};

export const saveUserMetadata = async (userId: string, metadata: any) => {
  return setDoc(doc(db, 'users', userId, 'config', 'categories'), metadata);
};

export const getUserMetadata = async (userId: string) => {
  const docSnap = await getDoc(doc(db, 'users', userId, 'config', 'categories'));
  if (docSnap.exists()) return docSnap.data();
  return null;
};
