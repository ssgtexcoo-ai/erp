'use client';

import { useState, type FormEvent } from 'react';

export default function DirectorSetupPage() {
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirm) { setMessage('Пароли не совпадают'); return; }
    if (password.length < 6) { setMessage('Минимум 6 символов'); return; }
    setLoading(true);
    setMessage('');

    const res = await fetch('/api/director-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setMessage(data.error ?? 'Ошибка'); return; }
    setDone(true);
    setTimeout(() => { window.location.href = '/login'; }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: '#0b1020' }}>
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <img src="/samruq-logo.png" alt="SAMRUQ" className="h-[80px] w-auto object-contain mx-auto mb-4"
            style={{ filter: 'drop-shadow(0 4px 16px rgba(216,176,106,0.22))' }} />
          <h1 className="text-[22px] font-bold" style={{ color: '#fff', letterSpacing: '-0.03em' }}>
            Установка пароля директора
          </h1>
          <p className="mt-2 text-[13px]" style={{ color: 'rgba(235,235,245,0.45)' }}>
            Одноразовая настройка аккаунта
          </p>
        </div>

        <div className="rounded-[24px] p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {done ? (
            <div className="text-center py-4">
              <p className="text-[18px] font-semibold" style={{ color: '#30d158' }}>✓ Пароль установлен!</p>
              <p className="mt-2 text-[13px]" style={{ color: 'rgba(235,235,245,0.45)' }}>Перенаправляем на страницу входа...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest"
                  style={{ color: 'rgba(235,235,245,0.35)' }}>Секретный код</label>
                <input type="text" value={secret} onChange={(e) => setSecret(e.target.value)}
                  required placeholder="Введите код"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }} />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest"
                  style={{ color: 'rgba(235,235,245,0.35)' }}>Новый пароль</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required placeholder="Минимум 6 символов"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }} />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-widest"
                  style={{ color: 'rgba(235,235,245,0.35)' }}>Повторите пароль</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#fff' }} />
              </div>
              {message && (
                <p className="text-[13px]" style={{ color: '#ff453a' }}>{message}</p>
              )}
              <button type="submit" disabled={loading || !secret || !password || !confirm}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[15px] font-semibold disabled:opacity-40"
                style={{ background: '#d8b06a', color: '#000' }}>
                {loading ? 'Сохранение...' : 'Установить пароль'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
