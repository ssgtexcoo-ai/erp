'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-context';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Дашборд',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Объекты',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/kanban',
    label: 'Канбан',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="3" width="5" height="18" rx="1.5" />
        <rect x="9.5" y="3" width="5" height="12" rx="1.5" />
        <rect x="16" y="3" width="5" height="15" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/gantt',
    label: 'Гант',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="7" y1="15" x2="14" y2="15" />
        <line x1="7" y1="19" x2="18" y2="19" />
      </svg>
    ),
  },
  {
    href: '/documents',
    label: 'Документы',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Уведомления',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/employee',
    label: 'Сотрудник',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[rgba(241,205,127,0.07)] bg-[#090e1a]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-[rgba(241,205,127,0.07)] px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgba(241,205,127,0.15)] bg-[#111827]">
          <img src="/samruq-mark.svg" alt="S" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-[#f1cd7f]">SAMRUQ</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">ERP система</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[rgba(241,205,127,0.10)] text-[#f1cd7f] shadow-sm'
                    : 'text-[#6b7280] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#9ca3af]'
                }`}
              >
                <span className={`shrink-0 transition-colors ${isActive ? 'text-[#f1cd7f]' : 'text-[#4b5563] group-hover:text-[#6b7280]'}`}>
                  {item.icon}
                </span>
                {item.label}
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f1cd7f]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t border-[rgba(241,205,127,0.07)] p-3">
          <div className="rounded-xl bg-[rgba(241,205,127,0.05)] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(241,205,127,0.15)] text-xs font-bold text-[#f1cd7f]">
                {getInitials(user.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#e5e7eb]">{user.fullName}</p>
                <p className="text-[10px] uppercase tracking-widest text-[#d8b06a]">{user.roleName}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Выйти"
                className="shrink-0 rounded-lg p-1.5 text-[#4b5563] transition hover:bg-[rgba(239,68,68,0.1)] hover:text-rose-400"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
