'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { useAuth } from '@/components/auth-context';
import { getCompanySettings, saveCompanySettings, type CompanySettings } from '@/lib/settingsService';
import { getNotifPrefs, saveNotifPrefs, type NotifPrefs } from '@/lib/notifPrefs';

// ── Theme picker ──────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'dark',  label: 'Obsidian', bg: '#111113', dot: '#ffffff' },
  { id: 'light', label: 'Arctic',   bg: '#dde2f0', dot: '#1c1c2e' },
  { id: 'ocean', label: 'Ocean',    bg: '#07111f', dot: '#deeaff' },
  { id: 'sand',  label: 'Sand',     bg: '#e8d5b0', dot: '#2a1a06' },
];

function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="text-[16px] font-semibold mb-4" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        Оформление
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {THEMES.map((t) => {
          const active = mounted && theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className="group relative flex flex-col items-center gap-2.5 rounded-[16px] p-4 transition-all duration-200"
              style={{
                background: active ? 'rgba(216,176,106,0.12)' : 'var(--bg-hover)',
                border: active ? '1.5px solid rgba(216,176,106,0.55)' : '1px solid var(--border)',
              }}
            >
              {/* Preview swatch */}
              <div className="h-12 w-full rounded-[10px] relative overflow-hidden flex items-end p-1.5" style={{ background: t.bg }}>
                <div className="h-1.5 w-8 rounded-full opacity-60" style={{ background: '#d8b06a' }} />
                <div className="h-1 w-5 rounded-full opacity-30 ml-1.5" style={{ background: t.dot }} />
                <div className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full" style={{ background: '#d8b06a', opacity: 0.8 }} />
              </div>
              <span className="text-[12px] font-medium" style={{ color: active ? '#d8b06a' : 'var(--text-secondary)' }}>
                {t.label}
              </span>
              {active && (
                <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: '#d8b06a' }}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Company profile ────────────────────────────────────────────────────────────
function CompanySection() {
  const { user } = useAuth();
  const isDirector = user?.roleId === 1 || user?.roleName === 'director';

  const [form, setForm]       = useState<CompanySettings>({ companyName: '', companyPhone: '', companyAddress: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [err, setErr]         = useState('');

  useEffect(() => {
    getCompanySettings().then((s) => { setForm(s); setLoading(false); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    const { error } = await saveCompanySettings(form);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h2 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        Профиль компании
      </h2>
      <p className="text-[12px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
        {isDirector ? 'Отображается на документах и в системе' : 'Только директор может редактировать'}
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-10 rounded-[10px] animate-pulse" style={{ background: 'var(--bg-input)' }} />)}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          {[
            { key: 'companyName',    label: 'Название', placeholder: 'SAMRUQ Qurylys' },
            { key: 'companyPhone',   label: 'Телефон',  placeholder: '+7 777 000 00 00' },
            { key: 'companyAddress', label: 'Адрес',    placeholder: 'г. Алматы, ул. ...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</label>
              <input
                type="text"
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                disabled={!isDirector}
                className="w-full rounded-[10px] px-3 py-2.5 text-[13px] outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  opacity: isDirector ? 1 : 0.5,
                }}
              />
            </div>
          ))}

          {err && <p className="text-[12px] text-[#ff453a]">{err}</p>}

          {isDirector && (
            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded-[10px] px-5 py-2.5 text-[13px] font-semibold transition-all"
              style={{
                background: saved ? '#30d158' : '#d8b06a',
                color: '#000',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Сохранение...' : saved ? '✓ Сохранено' : 'Сохранить'}
            </button>
          )}
        </form>
      )}
    </section>
  );
}

// ── Telegram toggles ──────────────────────────────────────────────────────────
const NOTIF_ITEMS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  { key: 'newLead',     label: 'Новый лид',            desc: 'При создании нового лида в системе' },
  { key: 'newDeal',     label: 'Новая сделка',          desc: 'При создании новой сделки' },
  { key: 'stageChange', label: 'Смена стадии сделки',  desc: 'Когда сделка переходит на следующий этап' },
  { key: 'taskDone',    label: 'Задача выполнена',      desc: 'Когда задача отмечается как выполненная' },
  { key: 'taskOverdue', label: 'Просроченные задачи',   desc: 'При обнаружении просроченных задач' },
];

function TelegramSection() {
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  useEffect(() => { setPrefs(getNotifPrefs()); }, []);

  function toggle(key: keyof NotifPrefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    saveNotifPrefs(next);
  }

  return (
    <section className="rounded-[20px] p-5 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Telegram уведомления
        </h2>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>
          Per-device
        </span>
      </div>
      <p className="text-[12px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
        Настройте `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в переменных окружения.
        Переключатели ниже сохраняются в браузере.
      </p>

      <div className="space-y-2">
        {NOTIF_ITEMS.map(({ key, label, desc }) => {
          const on = prefs ? prefs[key] : false;
          return (
            <div key={key}
              className="flex items-center justify-between gap-4 rounded-[12px] px-4 py-3"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                className="shrink-0 relative h-6 w-11 rounded-full transition-all duration-200"
                style={{ background: on ? '#30d158' : 'var(--bg-input)', border: '1px solid var(--border)' }}
                aria-label={on ? 'Выключить' : 'Включить'}
              >
                <span
                  className="absolute top-0.5 h-5 w-5 rounded-full shadow transition-all duration-200"
                  style={{ background: '#fff', left: on ? 'calc(100% - 22px)' : '2px' }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.settings}>
      <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-10" style={{ color: 'var(--text-primary)' }}>
        <div className="mx-auto max-w-[720px] space-y-5">

          {/* Header */}
          <section className="rounded-[20px] p-4 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-medium uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Система
            </p>
            <h1 className="text-[28px] font-bold" style={{ letterSpacing: '-0.04em' }}>Настройки</h1>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Тема, профиль компании и уведомления
            </p>
          </section>

          <ThemeSection />
          <CompanySection />
          <TelegramSection />
        </div>
      </main>
    </ProtectedPage>
  );
}
