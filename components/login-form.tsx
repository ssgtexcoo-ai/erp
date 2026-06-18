'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BrandLogo } from '@/components/brand-logo';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage(`Ошибка входа: ${error.message}`);
    } else {
      setMessage('Проверьте почту — отправлено письмо для входа.');
    }

    setLoading(false);
  };

  return (
    <div className="rounded-3xl border border-[rgba(241,205,127,0.10)] bg-[rgba(17,24,39,0.9)] p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
      <BrandLogo compact />
      <h1 className="mt-6 text-3xl font-semibold text-[var(--samruq-gold-strong)]">Вход в SAMRUQ ERP</h1>
      <p className="mt-3 text-[#cbd5e1]">Введите email, чтобы получить ссылку для входа через Supabase Auth.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-[#cbd5e1]">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="ivan@example.com"
            className="mt-2 w-full rounded-2xl border border-[rgba(241,205,127,0.10)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-[var(--samruq-text)] outline-none transition placeholder:text-slate-500 focus:border-[rgba(241,205,127,0.45)]"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full justify-center rounded-2xl bg-[var(--samruq-gold)] px-5 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-[var(--samruq-gold-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Отправка...' : 'Войти'}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-[#cbd5e1]">{message}</p> : null}
    </div>
  );
}
