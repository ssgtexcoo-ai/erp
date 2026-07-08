'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

const SITE_URL = 'https://erp-samruq.vercel.app';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: unknown) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password';
      } else if (session) {
        window.location.href = '/dashboard';
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const handleForgotPassword = async () => {
    if (!email) { setMessage('Введите email выше'); return; }
    setForgotLoading(true);
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    setForgotLoading(false);
    if (error) { setMessage(error.message); return; }
    setForgotSent(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    let error: Error | null = null;
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      error = result.error ?? null;
    } catch (e: unknown) {
      error = e instanceof Error ? e : new Error(String(e));
    }

    if (error) {
      setMessage(error.message === 'Invalid login credentials'
        ? 'Неверный email или пароль'
        : error.message);
      setLoading(false);
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
                disabled={loading}
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
                disabled={loading}
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

            {forgotSent ? (
              <div className="rounded-[12px] px-4 py-3 text-center" style={{ background: 'rgba(48,209,88,0.10)', border: '1px solid rgba(48,209,88,0.25)' }}>
                <p className="text-[13px] font-medium" style={{ color: '#30d158' }}>
                  ✓ Письмо отправлено — проверьте почту
                </p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Ссылка ведёт на страницу смены пароля
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="w-full text-center text-[13px] disabled:opacity-40"
                style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {forgotLoading ? 'Отправка...' : 'Забыли пароль?'}
              </button>
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
                  Вход... {elapsed > 0 ? `${elapsed}с` : ''}
                </>
              ) : 'Войти'}
            </button>

            {loading && elapsed >= 5 && (
              <div className="rounded-[12px] px-4 py-3 text-center" style={{ background: 'rgba(216,176,106,0.10)', border: '1px solid rgba(216,176,106,0.25)' }}>
                <p className="text-[12px] font-medium" style={{ color: '#d8b06a' }}>
                  Сервер просыпается — не обновляйте страницу!
                </p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Первый вход занимает до 30 секунд
                </p>
              </div>
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
