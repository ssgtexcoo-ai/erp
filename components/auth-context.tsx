'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getUserProfile } from '@/lib/userService';
import type { UserProfile } from '@/lib/types';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        const profileResponse = await getUserProfile(data.session.user.id);
        if (profileResponse.error) {
          setError(profileResponse.error.message);
          setUser(null);
        } else {
          setUser(profileResponse.user ?? null);
          setError(null);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    initialize();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setSession(null);
        setUser(null);
        return;
      }

      setSession(session);
      const profileResponse = await getUserProfile(session.user.id);
      if (profileResponse.error) {
        setError(profileResponse.error.message);
        setUser(null);
      } else {
        setError(null);
        setUser(profileResponse.user ?? null);
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    router.replace('/login');
  };

  const value = useMemo(
    () => ({ session, user, loading, error, signOut }),
    [session, user, loading, error, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
