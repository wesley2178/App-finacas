import * as React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  isWesley: boolean;
  whitelistChecked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [whitelistChecked, setWhitelistChecked] = useState(false);

  const isWesley = user?.email === 'wesley2178@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Wesley is always authorized or we check the whitelist
        if (user.email === 'wesley2178@gmail.com') {
          setIsAuthorized(true);
          setWhitelistChecked(true);
          setLoading(false);
        } else {
          try {
            const authDoc = await getDoc(doc(db, 'usuarios_autorizados', user.email || ''));
            setIsAuthorized(authDoc.exists());
            setWhitelistChecked(true);
          } catch (error) {
            console.error("Error checking authorization:", error);
            setIsAuthorized(false);
            setWhitelistChecked(true);
          } finally {
            setLoading(false);
          }
        }
      } else {
        setIsAuthorized(false);
        setWhitelistChecked(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthorized, isWesley, whitelistChecked }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
