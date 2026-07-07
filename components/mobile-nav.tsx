'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth-context';

const PRIMARY_NAV = [
  {
    href: '/dashboard',
    label: 'Главная',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'Лиды',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/deals',
    label: 'Сделки',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/kanban',
    label: 'Задачи',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="3" width="5" height="18" rx="1.5" />
        <rect x="9.5" y="3" width="5" height="12" rx="1.5" />
        <rect x="16" y="3" width="5" height="15" rx="1.5" />
      </svg>
    ),
  },
];

const MORE_NAV = [
  { href: '/projects',      label: 'Объекты' },
  { href: '/clients',       label: 'Клиенты' },
  { href: '/gantt',         label: 'Гант' },
  { href: '/calendar',      label: 'Календарь' },
  { href: '/analytics',     label: 'Аналитика' },
  { href: '/documents',     label: 'Документы' },
  { href: '/activity',      label: 'Активность' },
  { href: '/notifications', label: 'Уведомления' },
  { href: '/employee',      label: 'Сотрудники' },
  { href: '/settings',      label: 'Настройки' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const isMoreActive = MORE_NAV.some((n) => pathname.startsWith(n.href));

  return (
    <>
      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex items-stretch md:hidden"
        style={{
          background: 'var(--bg-sidebar)',
          borderTop: '1px solid var(--border-2)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setShowMore(false)}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-opacity"
              style={{ color: active ? '#d8b06a' : 'var(--text-tertiary)' }}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-opacity"
          style={{ color: isMoreActive || showMore ? '#d8b06a' : 'var(--text-tertiary)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-5 w-5">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-[10px] font-medium">Ещё</span>
        </button>
      </nav>

      {/* More drawer */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-[56px] inset-x-0 rounded-t-[24px] p-4 shadow-2xl"
            style={{ background: 'var(--bg-sidebar)', borderTop: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 mx-auto h-1 w-10 rounded-full" style={{ background: 'var(--border)' }} />
            <div className="grid grid-cols-3 gap-2">
              {MORE_NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className="flex flex-col items-center gap-1.5 rounded-[14px] py-3 px-2 text-center transition-all"
                    style={{
                      background: active ? 'rgba(216,176,106,0.12)' : 'var(--bg-card)',
                      color: active ? '#d8b06a' : 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { setShowMore(false); signOut(); }}
              className="mt-3 w-full rounded-[14px] py-3 text-[14px] font-medium"
              style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a' }}
            >
              Выйти
            </button>
          </div>
        </div>
      )}
    </>
  );
}
