'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import type { RoleName } from '@/lib/types';

interface ProtectedPageProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
}

export function ProtectedPage({ children, allowedRoles }: ProtectedPageProps) {
  const { loading, session, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!session) {
      router.replace('/login');
      return;
    }

    if (!user) {
      router.replace('/unauthorized');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.roleName)) {
      router.replace('/unauthorized');
    }
  }, [allowedRoles, loading, router, session, user]);

  if (loading || !session || !user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/90 p-10 text-center text-slate-300 shadow-2xl shadow-slate-950/30">
          Проверка доступа...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
