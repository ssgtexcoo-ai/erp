'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) setReady(true);
    })();
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) { setMessage('Пароли не совпадают'); return; }
    if (password.length < 6) { setMessage('Минимум 6 символов'); return; }
    setLoading(true);
    setMessage('');
    const { error } = await (supabase.auth as any).updateUser({ password });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setMessage('✓ Пароль изменён! Перенаправляем...');
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#0b1020' }}>
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <img src="/samruq-logo.png" alt="SAMRUQ" className="h-[80px] w-auto object-contain mx-auto mb-4"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(216,176,106,0.22))' }} />
          <h1 className="text-[22px] font-bold" style={{ color: '#fff', letterSpacing: '-0.03em' }}>
            Новый пароль
          </h1>
        </div>
        <div className="rounded-[24px] p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {!ready ? (
            <p className="text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>Проверка сессии...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  Новый пароль
                </label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required placeholder="Минимум 6 символов"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                  Повторите пароль
                </label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              {message && (
                <p className="text-[13px]" style={{ color: message.startsWith('✓') ? '#30d158' : '#ff453a' }}>{message}</p>
              )}
              <button type="submit" disabled={loading || !password || !confirm}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[15px] font-semibold disabled:opacity-40"
                style={{ background: '#d8b06a', color: '#000' }}>
                {loading ? 'Сохранение...' : 'Сохранить пароль'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
