'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { BrandLogo } from '@/components/brand-logo';

const links = [
  { href: '/', label: 'Главная' },
  { href: '/dashboard', label: 'Дашборд' },
  { href: '/leads', label: 'Лиды' },
  { href: '/deals', label: 'Сделки' },
  { href: '/projects', label: 'Объекты' },
  { href: '/kanban', label: 'Канбан' },
  { href: '/gantt', label: 'Гант' },
  { href: '/documents', label: 'Документы' },
  { href: '/notifications', label: 'Уведомления' },
  { href: '/employee', label: 'Сотрудник' },
];

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(241,205,127,0.10)] bg-[#0f172a]/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="transition hover:opacity-90">
          <BrandLogo compact />
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-[rgba(241,205,127,0.10)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-[var(--samruq-text)] transition hover:border-[rgba(241,205,127,0.22)] hover:bg-[rgba(241,205,127,0.08)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {!loading && user ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(241,205,127,0.10)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-[var(--samruq-text)]">
              <span>{user.fullName}</span>
              <span className="rounded-full bg-[rgba(241,205,127,0.10)] px-2 py-1 text-xs uppercase tracking-[0.16em] text-[var(--samruq-gold-strong)]">
                {user.roleName}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-full bg-[var(--samruq-gold)] px-3 py-2 text-xs font-semibold text-[#0f172a] transition hover:bg-[var(--samruq-gold-strong)]"
              >
                Выйти
              </button>
            </div>
          ) : null}
          {!loading && !user ? (
            <Link
              href="/login"
              className="rounded-full border border-[rgba(241,205,127,0.10)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-[var(--samruq-text)] transition hover:border-[rgba(241,205,127,0.22)] hover:bg-[rgba(241,205,127,0.08)]"
            >
              Вход
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
