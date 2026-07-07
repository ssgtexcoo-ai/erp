'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ClientOption {
  id: number;
  name: string;
  phone?: string | null;
}

interface Props {
  value: string;
  onChange: (name: string, clientId?: number) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

async function searchClients(query: string): Promise<ClientOption[]> {
  if (!query.trim()) return [];
  const { data } = await supabase
    .from('clients')
    .select('id, name, phone')
    .ilike('name', `%${query}%`)
    .limit(6);
  return (data ?? []) as ClientOption[];
}

export function ClientSearch({ value, onChange, placeholder, className, style }: Props) {
  const [results, setResults] = useState<ClientOption[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      const res = await searchClients(value);
      setResults(res);
      setOpen(res.length > 0);
      setActive(-1);
    }, 220);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(c: ClientOption) {
    onChange(c.name, c.id);
    setOpen(false);
    setResults([]);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && active >= 0) { e.preventDefault(); select(results[active]!); }
    if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
      />
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[14px] shadow-xl"
          style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)', top: '100%' }}
        >
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => select(c)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100"
              style={{
                background: i === active ? 'var(--bg-hover)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'rgba(216,176,106,0.15)', color: '#d8b06a' }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                {c.phone && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{c.phone}</p>}
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
