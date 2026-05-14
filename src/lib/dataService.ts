import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { EarningsEntry, Bill, SavingsDeposit, DailyExpense, MonthArchive } from '../types';

export const getDataPath = (userEmail: string | null | undefined, uid: string, collectionName: string) => {
  if (userEmail === 'wesley2178@gmail.com') {
    return collectionName; // Root collections for Wesley
  }
  return `usuarios/${uid}/${collectionName}`; // Isolated path for team
};

export const getSettingsPath = (userEmail: string | null | undefined, uid: string) => {
  if (userEmail === 'wesley2178@gmail.com') {
    return `settings/${uid}`; // Or root settings
  }
  return `usuarios/${uid}/settings/config`;
};

// Error handling helper as per integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null, auth: any) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};
