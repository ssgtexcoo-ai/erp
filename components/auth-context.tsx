'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Redirect immediately if this is a password recovery link (hash contains type=recovery)
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      window.location.href = '/reset-password' + window.location.hash;
      return;
    }

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

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
      const isRecovery =
        event === 'PASSWORD_RECOVERY' ||
        (typeof window !== 'undefined' && window.location.hash.includes('type=recovery'));

      if (isRecovery) {
        window.location.href = '/reset-password' + window.location.hash;
        return;
      }

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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    router.replace('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const profileResponse = await getUserProfile(data.session.user.id);
    if (!profileResponse.error) {
      setUser(profileResponse.user ?? null);
    }
  }, []);

  const value = useMemo(
    () => ({ session, user, loading, error, signOut, refreshUser }),
    [session, user, loading, error, signOut, refreshUser],
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
