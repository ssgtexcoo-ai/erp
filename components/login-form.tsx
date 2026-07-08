'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      if (session) {
        window.location.href = '/dashboard';
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSlow(false);
    setMessage('');

    const slowTimer = setTimeout(() => setSlow(true), 6000);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    clearTimeout(slowTimer);

    if (error) {
      setMessage(error.message === 'Invalid login credentials'
        ? 'Неверный email или пароль'
        : error.message);
      setLoading(false);
      setSlow(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#0b1020' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/3 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
          style={{ background: 'rgba(216,176,106,0.05)' }}
        />
      </div>

      <div className="relative w-full max-w-[360px]">
        <div className="mb-10 flex flex-col items-center gap-3">
          <img
            src="/samruq-logo.png"
            alt="SAMRUQ Qurylys"
            className="h-[130px] w-auto object-contain"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(216,176,106,0.22))' }}
          />
          <p className="text-[13px]" style={{ color: 'var(--text-tertiary)', letterSpacing: '-0.005em' }}>
            Система управления Samruq Qurylys
          </p>
        </div>

        <div
          className="rounded-[24px] p-8 shadow-2xl"
          style={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid var(--border)',
          }}
        >
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Вход в систему
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
            Введите email и пароль
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ivan@samruq.kz"
                className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none transition-all duration-200"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(216,176,106,0.40)'; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none transition-all duration-200"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(216,176,106,0.40)'; e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                onBlur={(e) => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.background = 'var(--bg-input)'; }}
              />
            </div>

            {message && (
              <p className="text-[13px]" style={{ color: '#ff453a' }}>{message}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[15px] font-semibold transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: '#d8b06a', color: '#000000', letterSpacing: '-0.01em' }}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'rgba(0,0,0,0.25)', borderTopColor: '#000000' }} />
                  Вход...
                </>
              ) : 'Войти'}
            </button>

            {slow && (
              <p className="text-center text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                Сервер просыпается, подождите ещё немного...
              </p>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-[11px]" style={{ color: 'rgba(235,235,245,0.20)' }}>
          SAMRUQ Qurylys · ERP v1.0
        </p>
      </div>
    </div>
  );
}
