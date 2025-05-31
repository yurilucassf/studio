'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/hooks/use-auth-store';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'employees', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              ...firebaseUser,
              uid: firebaseUser.uid, // ensure uid is explicitly passed
              email: firebaseUser.email || '',
              name: userData.name || firebaseUser.displayName,
              role: userData.role,
            } as User);
          } else {
            // User exists in Auth but not in Firestore employees collection
            // This might be an error case or a new user not fully set up.
            // For now, treat as partially authenticated without role.
             setUser({
              ...firebaseUser,
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName,
              role: undefined, // No role found
            } as User);
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
          setUser(firebaseUser as User); // Fallback to FirebaseUser if Firestore fetch fails
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  useEffect(() => {
    if (!isLoading) {
      const isAuthPage = pathname === '/login';
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not loaded and not on auth page, AuthProvider will redirect.
  // If user is loaded, or on auth page, render children.
  // This prevents rendering protected routes before auth state is resolved.
  if (!user && pathname !== '/login') {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Redirecionando para login...</p>
      </div>
    );
  }


  return <>{children}</>;
}
