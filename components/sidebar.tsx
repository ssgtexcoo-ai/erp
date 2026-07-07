'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth-context';
import { uploadAvatar } from '@/lib/userService';

function openSearch() {
  document.dispatchEvent(new CustomEvent('samruq:search:open'));
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Дашборд',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/clients',
    label: 'Клиенты',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
        <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/deals',
    label: 'Сделки',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Объекты',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/kanban',
    label: 'Канбан',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
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
    href: '/calendar',
    label: 'Календарь',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
        <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/documents',
    label: 'Документы',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Аналитика',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
        <line x1="2"  y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  {
    href: '/activity',
    label: 'Активность',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Уведомления',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/employee',
    label: 'Сотрудники',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Настройки',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
}

const THEMES = [
  { id: 'dark',  label: 'Obsidian', color: '#1a1a1c', ring: '#555' },
  { id: 'light', label: 'Arctic',   color: '#dde2f0', ring: '#8899cc' },
  { id: 'ocean', label: 'Ocean',    color: '#0a1e3d', ring: '#4080ff' },
  { id: 'sand',  label: 'Sand',     color: '#e8d5b0', ring: '#c4904a' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="px-3 py-2">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Тема</p>
      <div className="flex items-center gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            onClick={() => setTheme(t.id)}
            className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200 hover:scale-110"
            style={{
              background: t.color,
              boxShadow: theme === t.id
                ? `0 0 0 2px var(--bg-sidebar), 0 0 0 4px ${t.ring}`
                : `0 0 0 1px ${t.ring}40`,
            }}
          >
            {theme === t.id && (
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.id === 'light' || t.id === 'sand' ? '#000' : '#fff', opacity: 0.7 }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(!navigator.userAgent.includes('Windows'));
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    await uploadAvatar(user.id, file);
    await refreshUser();
    setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 hidden md:flex w-[240px] flex-col transition-colors duration-300"
      style={{
        background: 'var(--bg-sidebar)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRight: '1px solid var(--border-2)',
      }}
    >
      {/* Logo */}
      <div className="flex h-[68px] shrink-0 items-center justify-center px-4"
        style={{ borderBottom: '1px solid var(--border-2)' }}>
        <img
          src="/samruq-logo.png"
          alt="SAMRUQ Qurylys"
          className="h-[50px] w-auto object-contain"
          style={{ filter: 'drop-shadow(0 2px 10px rgba(216,176,106,0.20))' }}
        />
      </div>

      {/* Search trigger */}
      <div className="shrink-0 px-2 pt-2">
        <button
          type="button"
          onClick={openSearch}
          className="flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(216,176,106,0.35)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="flex-1 text-left text-[12px]">Поиск...</span>
          <kbd className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
            {isMac ? '⌘K' : 'Ctrl+K'}
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[13px] font-medium transition-all duration-150"
                style={
                  isActive
                    ? { background: 'rgba(216,176,106,0.14)', color: 'var(--text-primary)' }
                    : { color: 'var(--text-secondary)' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <span style={{ color: isActive ? '#d8b06a' : 'currentColor', transition: 'color 150ms' }}>
                  {item.icon}
                </span>
                <span style={{ letterSpacing: '-0.01em' }}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Theme toggle */}
      <div className="px-2 pb-1" style={{ borderTop: '1px solid var(--border-2)' }}>
        <ThemeToggle />
      </div>

      {/* User */}
      {user && (
        <div className="shrink-0 p-2" style={{ borderTop: '1px solid var(--border-2)' }}>
          <div className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              title="Сменить фото"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-7 w-7 shrink-0 rounded-full overflow-hidden"
              style={{ background: 'rgba(216,176,106,0.18)' }}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] font-bold" style={{ color: '#d8b06a' }}>
                  {getInitials(user.fullName)}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: 'rgba(0,0,0,0.45)' }}>
                {avatarUploading ? (
                  <svg className="h-3 w-3 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="h-3 w-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                )}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {user.fullName}
              </p>
              <p className="text-[10px]" style={{ color: '#d8b06a', opacity: 0.75 }}>
                {user.roleName}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Выйти"
              className="shrink-0 rounded-md p-1.5 transition-all duration-150"
              style={{ color: 'var(--text-tertiary)', minWidth: 28, minHeight: 28 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,59,48,0.12)';
                e.currentTarget.style.color = '#ff453a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '';
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
