import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
  email: string;
  isAuthorized: boolean;
  isAdmin: boolean;
  createdAt: Timestamp | string; // Handle both initially
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAIL = 'wesley2178@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Listen to profile changes real-time
        unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            // Fallback forced check for admin
            if (firebaseUser.email === ADMIN_EMAIL && (!data.isAdmin || !data.isAuthorized)) {
              setProfile({ ...data, isAdmin: true, isAuthorized: true });
            } else {
              setProfile(data);
            }
          } else {
            // First time sign in, create profile
            try {
              const isAdmin = firebaseUser.email === ADMIN_EMAIL;
              const newProfile = {
                email: firebaseUser.email || '',
                isAuthorized: isAdmin, // Admin is authorized by default
                isAdmin: isAdmin,
                createdAt: serverTimestamp()
              };
              await setDoc(userDocRef, newProfile);
              // Profile state will be updated by the next snapshot
            } catch (err: any) {
              console.error("Error creating profile:", err);
              // If it's a permission error, we should show something or sign out
              if (err.code === 'permission-denied') {
                alert("Erro de permissão ao criar perfil. Verifique se seu e-mail está verificado.");
              }
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listener error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
