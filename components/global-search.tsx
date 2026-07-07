'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { globalSearch, TYPE_LABEL, type SearchResult, type SearchResultType } from '@/lib/searchService';

const TYPE_ICON: Record<SearchResultType, React.ReactNode> = {
  lead: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  deal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  client: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>
    </svg>
  ),
  task: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="9.5" y="3" width="5" height="12" rx="1.5"/><rect x="16" y="3" width="5" height="15" rx="1.5"/>
    </svg>
  ),
  project: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
};

const TYPE_COLOR: Record<SearchResultType, string> = {
  lead: '#0a84ff',
  deal: '#30d158',
  client: '#d8b06a',
  task: '#bf5af2',
  project: '#ff9f0a',
};

function groupResults(results: SearchResult[]): { type: SearchResultType; items: SearchResult[] }[] {
  const order: SearchResultType[] = ['deal', 'lead', 'client', 'project', 'task'];
  const map = new Map<SearchResultType, SearchResult[]>();
  for (const r of results) {
    if (!map.has(r.type)) map.set(r.type, []);
    map.get(r.type)!.push(r);
  }
  return order.filter((t) => map.has(t)).map((t) => ({ type: t, items: map.get(t)! }));
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsMac(!navigator.userAgent.includes('Windows'));
  }, []);

  // Cmd+K / Ctrl+K to open, custom event from sidebar button
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const customHandler = () => setOpen(true);
    document.addEventListener('keydown', keyHandler);
    document.addEventListener('samruq:search:open', customHandler);
    return () => {
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('samruq:search:open', customHandler);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQuery('');
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const res = await globalSearch(q);
      setResults(res);
      setActiveIndex(0);
      setLoading(false);
    }, 280);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    search(e.target.value);
  };

  const flatResults = results;

  const navigate = (result: SearchResult) => {
    router.push(result.href);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && flatResults[activeIndex]) navigate(flatResults[activeIndex]);
  };

  const grouped = groupResults(results);

  if (!open) return null;

  // Build a flat index map for grouping with correct active tracking
  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div
        className="w-full max-w-[600px] overflow-hidden rounded-[24px] shadow-2xl"
        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: results.length > 0 || loading ? '1px solid var(--border)' : 'none' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Поиск по лидам, сделкам, клиентам, задачам..."
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-[rgba(235,235,245,0.28)]"
            style={{ color: 'var(--text-primary)' }}
          />
          {loading && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 shrink-0" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
          )}
          {!loading && query && (
            <button type="button" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          <kbd className="shrink-0 rounded-[6px] px-1.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[420px] overflow-y-auto py-2">
            {grouped.map(({ type, items }) => (
              <div key={type}>
                <div className="px-5 pb-1 pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    {TYPE_LABEL[type]}
                  </span>
                </div>
                {items.map((result) => {
                  const idx = flatIdx++;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigate(result)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100"
                      style={{ background: isActive ? 'var(--bg-hover)' : 'transparent' }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                        style={{ background: `${TYPE_COLOR[type]}18`, color: TYPE_COLOR[type] }}
                      >
                        {TYPE_ICON[type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{result.title}</p>
                        <p className="truncate text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{result.subtitle}</p>
                      </div>
                      {isActive && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {query && !loading && results.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Ничего не найдено по «{query}»</p>
          </div>
        )}

        {/* Idle hint */}
        {!query && (
          <div className="px-5 py-4">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Начните вводить для поиска по всей системе</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['deal', 'lead', 'client', 'project', 'task'] as SearchResultType[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: `${TYPE_COLOR[t]}14`, color: TYPE_COLOR[t] }}>
                  {TYPE_ICON[t]}
                  {TYPE_LABEL[t]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
          {[['↑↓', 'выбор'], ['↵', 'перейти'], ['Esc', 'закрыть']].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5">
              <kbd className="rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{key}</kbd>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <kbd className="rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>открыть</span>
          </div>
        </div>
      </div>
    </div>
  );
}
