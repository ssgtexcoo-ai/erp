'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/dashboard');
      } else {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#0b1020' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'rgba(216,176,106,0.2)', borderTopColor: '#d8b06a' }} />
      </div>
    );
  }

  return <LoginForm />;
}
