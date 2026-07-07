'use client';

import { useEffect, useRef, useState } from 'react';
import { saveDecomposition, type DecompositionStage, type NodeStatus } from '@/lib/taskService';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TeamMember { name: string; avatarUrl?: string | null }

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS = ['#d8b06a','#0a84ff','#30d158','#bf5af2','#ff9f0a','#64d2ff','#ff453a','#5e5ce6'];

const STATUS_LABEL: Record<NodeStatus, string> = { todo: 'Не начато', in_progress: 'В работе', review: 'На проверке', done: 'Принято' };
const STATUS_BG: Record<NodeStatus, string> = { todo: 'rgba(128,128,128,0.12)', in_progress: 'rgba(10,132,255,0.14)', review: 'rgba(255,159,10,0.14)', done: 'rgba(48,209,88,0.14)' };
const STATUS_TEXT: Record<NodeStatus, string> = { todo: '#888', in_progress: '#0a84ff', review: '#ff9f0a', done: '#30d158' };
const ROOT_ID = '__root__';
const GAP_X = 240;
const GAP_Y = 24;
const ROOT_H = 54;
const NODE_H = 42;
const MIN_W = 130;
const MAX_W = 300;

function rgb(hex: string) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}
function autoW(t: string, root = false) {
  return Math.min(MAX_W, Math.max(MIN_W, t.length * (root ? 9.5 : 8.5) + (root ? 52 : 40)));
}
function calcH(text: string, w: number, isRoot = false): number {
  const charW = isRoot ? 9.5 : 8;
  const availW = Math.max(1, w - (isRoot ? 56 : 38));
  const lines = Math.max(1, Math.ceil((text.length || 1) / Math.max(1, Math.floor(availW / charW))));
  return Math.max(isRoot ? ROOT_H : NODE_H, (isRoot ? 28 : 20) + lines * (isRoot ? 22 : 20));
}
function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${dt.getDate()} ${months[dt.getMonth()]}`;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
interface Pos { x: number; y: number; w: number; h: number; color: string; level: number }

function subtreeH(n: DecompositionStage, customW: Map<string, number>): number {
  const w = customW.get(n.id) ?? autoW(n.title);
  const h = calcH(n.title, w);
  if (!n.children.length) return h;
  return Math.max(h, n.children.reduce((s, c) => s + subtreeH(c, customW) + GAP_Y, -GAP_Y));
}
function buildLayout(
  stages: DecompositionStage[], posMap: Map<string, Pos>, rootTitle: string,
  customW: Map<string, number>, manualXY: Map<string, { x: number; y: number }>,
) {
  posMap.clear();
  const totalH = stages.reduce((s, n) => s + subtreeH(n, customW) + GAP_Y, -GAP_Y);
  const rw = customW.get(ROOT_ID) ?? autoW(rootTitle, true);
  const rh = calcH(rootTitle, rw, true);
  const rx = 80, ry = Math.max(0, totalH / 2 - rh / 2);
  const rp = manualXY.get(ROOT_ID);
  posMap.set(ROOT_ID, { x: rp?.x ?? rx, y: rp?.y ?? ry, w: rw, h: rh, color: '#d8b06a', level: 0 });
  let y0 = 0;
  stages.forEach((n, i) => {
    placeBranch(n, rx + rw + GAP_X, y0, COLORS[i % COLORS.length], 1, posMap, customW, manualXY);
    y0 += subtreeH(n, customW) + GAP_Y;
  });
}
function placeBranch(
  n: DecompositionStage, bx: number, yTop: number, color: string, lvl: number,
  posMap: Map<string, Pos>, customW: Map<string, number>, manualXY: Map<string, { x: number; y: number }>,
) {
  const th = subtreeH(n, customW);
  const w = customW.get(n.id) ?? autoW(n.title);
  const h = calcH(n.title, w);
  const cy = yTop + th / 2 - h / 2;
  const p = manualXY.get(n.id);
  posMap.set(n.id, { x: p?.x ?? bx, y: p?.y ?? cy, w, h, color, level: lvl });
  let childY = yTop;
  n.children.forEach(c => {
    placeBranch(c, bx + w + GAP_X, childY, color, lvl + 1, posMap, customW, manualXY);
    childY += subtreeH(c, customW) + GAP_Y;
  });
}

// ─── Pure tree helpers ────────────────────────────────────────────────────────
function walk(
  nodes: DecompositionStage[], id: string,
  fn: (n: DecompositionStage) => DecompositionStage,
): DecompositionStage[] {
  return nodes.map(n => n.id === id ? fn(n) : { ...n, children: walk(n.children, id, fn) });
}
function drop(nodes: DecompositionStage[], id: string): DecompositionStage[] {
  return nodes.filter(n => n.id !== id).map(n => ({ ...n, children: drop(n.children, id) }));
}
function buildParentMap(nodes: DecompositionStage[], parentId: string, m: Map<string, string>) {
  nodes.forEach(n => { m.set(n.id, parentId); buildParentMap(n.children, n.id, m); });
}
function countAll(s: DecompositionStage[]): number {
  return s.reduce((n, x) => n + 1 + countAll(x.children), 0);
}
function countCritical(s: DecompositionStage[]): number {
  return s.reduce((n, x) => n + (x.isCritical ? 1 : 0) + countCritical(x.children), 0);
}

// ─── Mini avatar ──────────────────────────────────────────────────────────────
function MiniAvatar({ name, avatarUrl, color }: { name: string; avatarUrl?: string | null; color: string }) {
  const letters = name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} title={name} style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `1.5px solid ${color}` }} />;
  }
  return (
    <div title={name} style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0, letterSpacing: 0 }}>
      {letters || '?'}
    </div>
  );
}

// ─── Edge with arrow ──────────────────────────────────────────────────────────
function Edge({ from, to, fid, tid }: { from: Pos; to: Pos; fid: string; tid: string }) {
  const gid = `eg-${fid.replace(/\W/g,'').slice(0,6)}-${tid.replace(/\W/g,'').slice(0,6)}`;
  const arrId = `arr-${to.color.slice(1)}`;

  // Downward edge: child positioned below and at roughly same x as parent
  const isDown = to.y >= from.y + from.h - 2 && to.x < from.x + from.w + 80;

  let d: string;
  let gx1: number, gy1: number, gx2: number, gy2: number;

  if (isDown) {
    const x1 = from.x + from.w / 2, y1 = from.y + from.h;
    const x2 = to.x + to.w / 2,   y2 = to.y - 4;
    const cy = y1 + (y2 - y1) * 0.45;
    d = `M${x1},${y1} C${x1},${cy} ${x2},${cy} ${x2},${y2}`;
    gx1 = x1; gy1 = y1; gx2 = x2; gy2 = y2;
  } else {
    const x1 = from.x + from.w, y1 = from.y + from.h / 2;
    const x2 = to.x - 4,        y2 = to.y + to.h / 2;
    const mx = x1 + (x2 - x1) * 0.5;
    d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
    gx1 = x1; gy1 = y1; gx2 = x2; gy2 = y2;
  }

  return (
    <>
      <defs>
        {/* userSpaceOnUse prevents degenerate gradient when edge is vertical (zero-width bbox) */}
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={gx1} y1={gy1} x2={gx2} y2={gy2}>
          <stop offset="0%" stopColor={from.color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={to.color} stopOpacity={0.85} />
        </linearGradient>
        <marker id={arrId} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill={to.color} fillOpacity={0.85} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none" stroke={`url(#${gid})`}
        strokeWidth={to.level === 1 ? 2.0 : 1.4} strokeLinecap="round"
        markerEnd={`url(#${arrId})`}
      />
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function ToolBtn({ color, title, onClick, children, active }: {
  color: string; title: string; onClick: () => void; children: React.ReactNode; active?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" title={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 700,
        background: (hov || active) ? `rgba(${rgb(color)},0.3)` : `rgba(${rgb(color)},0.13)`,
        color, transition: 'background 0.12s',
        outline: active ? `1.5px solid ${color}` : 'none',
      }}
    >{children}</button>
  );
}

function TeamItem({ label, onClick, dim, active, color, avatarUrl }: {
  label: string; onClick: () => void; dim?: boolean; active?: boolean; color?: string; avatarUrl?: string | null;
}) {
  const [hov, setHov] = useState(false);
  const c = color ?? '#888888';
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5,
        fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8,
        color: dim ? 'var(--text-tertiary)' : active && color ? color : 'var(--text-primary)',
        background: (hov || active) ? `rgba(${rgb(c)},0.1)` : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      {!dim && <MiniAvatar name={label} avatarUrl={avatarUrl} color={c} />}
      {active && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
    </div>
  );
}

// ─── Panel helpers ────────────────────────────────────────────────────────────
function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}

function MemberSelect({ value, members, onChange, color }: {
  value: string; members: TeamMember[]; onChange: (name: string) => void; color: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = members.find(m => m.name === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h, true);
    return () => document.removeEventListener('mousedown', h, true);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--bg-input)', border: `1px solid ${value ? color : 'var(--border-2)'}`,
        borderRadius: 10, cursor: 'pointer', textAlign: 'left',
      }}>
        {sel ? (
          <>
            <MiniAvatar name={sel.name} avatarUrl={sel.avatarUrl} color={color} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{sel.name}</span>
          </>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-tertiary)' }}>— Не назначен</span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 300,
          background: 'var(--bg-modal)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
        }}>
          <TeamItem label="— Не назначен" dim onClick={() => { onChange(''); setOpen(false); }} />
          {members.map(m => (
            <TeamItem key={m.name} label={m.name} avatarUrl={m.avatarUrl} active={m.name === value}
              color={color} onClick={() => { onChange(m.name); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NodeDetailPanel ──────────────────────────────────────────────────────────
function NodeDetailPanel({ node, teamMembers, onUpdate, onClose }: {
  node: DecompositionStage; teamMembers: TeamMember[];
  onUpdate: (patch: Partial<DecompositionStage>) => void;
  onClose: () => void;
}) {
  const status: NodeStatus = node.status ?? 'todo';

  const STEPS: { key: NodeStatus; label: string; color: string }[] = [
    { key: 'todo',        label: 'Не начато',    color: '#888888' },
    { key: 'in_progress', label: 'В работе',     color: '#0a84ff' },
    { key: 'review',      label: 'На проверке',  color: '#ff9f0a' },
    { key: 'done',        label: 'Принято',      color: '#30d158' },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === status);

  const canStartWork  = !!node.responsible;
  const canSendReview = !!node.reviewer;

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 292, zIndex: 50,
      background: 'var(--bg-modal)', borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      boxShadow: '-16px 0 48px rgba(0,0,0,0.4)',
    }}>

      {/* Header */}
      <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border-2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>ЭТАП</span>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 2 }}>✕</button>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.38, wordBreak: 'break-word', margin: 0 }}>
          {node.title || <span style={{ opacity: 0.4, fontWeight: 400 }}>Без названия</span>}
        </p>
        {node.isCritical && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: '#ff453a', fontWeight: 600 }}>
            ⚡ Критический этап
          </span>
        )}
      </div>

      {/* Status stepper */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-2)', flexShrink: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 14 }}>СТАТУС</p>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${i <= stepIdx ? s.color : 'var(--border-2)'}`,
                  background: i < stepIdx ? s.color : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: i < stepIdx ? '#000' : i === stepIdx ? s.color : 'var(--text-tertiary)',
                }}>
                  {i < stepIdx ? '✓' : i === stepIdx ? '●' : ''}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: i === stepIdx ? 700 : 400, textAlign: 'center',
                  color: i <= stepIdx ? s.color : 'var(--text-tertiary)', lineHeight: 1.25,
                  whiteSpace: 'pre-wrap', maxWidth: 48,
                }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 20, marginLeft: 2, marginRight: 2,
                  background: i < stepIdx ? STEPS[i].color : 'var(--border-2)',
                  borderRadius: 1,
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PanelField label="ИСПОЛНИТЕЛЬ">
          <MemberSelect value={node.responsible ?? ''} members={teamMembers} onChange={n => onUpdate({ responsible: n })} color="#0a84ff" />
        </PanelField>
        <PanelField label="ПРОВЕРЯЮЩИЙ">
          <MemberSelect value={node.reviewer ?? ''} members={teamMembers} onChange={n => onUpdate({ reviewer: n })} color="#ff9f0a" />
        </PanelField>
        {node.dueDate && (
          <PanelField label="СРОК">
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>📅 {fmtDate(node.dueDate)}</div>
          </PanelField>
        )}
        {/* Critical toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>⚡ Критический этап</span>
          <button type="button" onClick={() => onUpdate({ isCritical: !node.isCritical })} style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
            background: node.isCritical ? '#ff453a' : 'var(--bg-input)', transition: 'background 0.2s',
            position: 'relative', outline: 'none',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: node.isCritical ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%', background: '#fff',
              transition: 'left 0.18s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-2)', flexShrink: 0 }}>
        {status === 'todo' && (
          <>
            <button type="button" disabled={!canStartWork} onClick={() => canStartWork && onUpdate({ status: 'in_progress' })} style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
              cursor: canStartWork ? 'pointer' : 'not-allowed',
              background: canStartWork ? 'linear-gradient(135deg,#0a84ff,#0066cc)' : 'var(--bg-input)',
              color: canStartWork ? '#fff' : 'var(--text-tertiary)', transition: 'opacity 0.15s',
            }}>Взять в работу</button>
            {!canStartWork && <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>Сначала назначьте исполнителя</p>}
          </>
        )}
        {status === 'in_progress' && (
          <>
            <button type="button" disabled={!canSendReview} onClick={() => canSendReview && onUpdate({ status: 'review' })} style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13,
              cursor: canSendReview ? 'pointer' : 'not-allowed',
              background: canSendReview ? 'linear-gradient(135deg,#ff9f0a,#e6890a)' : 'var(--bg-input)',
              color: canSendReview ? '#fff' : 'var(--text-tertiary)',
            }}>Отправить на проверку</button>
            {!canSendReview && <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center' }}>Сначала назначьте проверяющего</p>}
          </>
        )}
        {status === 'review' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onUpdate({ status: 'in_progress' })} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 12, cursor: 'pointer',
              border: '1px solid rgba(255,69,58,0.35)', background: 'rgba(255,69,58,0.1)', color: '#ff453a',
            }}>Вернуть</button>
            <button type="button" onClick={() => onUpdate({ status: 'done' })} style={{
              flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: 'linear-gradient(135deg,#30d158,#28a745)', color: '#fff',
            }}>✓ Принять</button>
          </div>
        )}
        {status === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#30d158', fontWeight: 700, marginBottom: 6 }}>✓ Задача принята</div>
            <button type="button" onClick={() => onUpdate({ status: 'in_progress' })} style={{
              fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline',
            }}>Вернуть на доработку</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DatePopup ────────────────────────────────────────────────────────────────
function DatePopup({ currentDate, top, color, onDateChange, onClose, enter }: {
  currentDate: string; top: number; color: string;
  onDateChange: (d: string | null) => void; onClose: () => void; enter: () => void;
}) {
  const [val, setVal] = useState(currentDate);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onClose]);

  return (
    <div ref={ref} onMouseEnter={enter} style={{
      position: 'absolute', top, left: 0, zIndex: 100,
      background: 'var(--bg-modal)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 12, minWidth: 214,
      boxShadow: '0 16px 48px rgba(0,0,0,0.55)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em' }}>СРОК ВЫПОЛНЕНИЯ</span>
        <button type="button" onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2 }}>✕</button>
      </div>
      <input
        type="date"
        value={val}
        onFocus={enter}
        onChange={(e) => { const v = e.target.value; setVal(v); onDateChange(v || null); }}
        style={{
          width: '100%', background: 'var(--bg-input)',
          border: `1px solid ${val ? color : 'var(--border-2)'}`,
          borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)',
          fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
          boxSizing: 'border-box', display: 'block',
        }}
      />
      {val && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color, fontWeight: 600 }}>✓ {fmtDate(val)}</span>
          <button type="button"
            onClick={() => { setVal(''); onDateChange(null); onClose(); }}
            style={{
              marginLeft: 'auto', padding: '4px 10px', borderRadius: 7, border: 'none',
              background: 'rgba(255,69,58,0.12)', color: '#ff453a', fontSize: 11, cursor: 'pointer', fontWeight: 600,
            }}>Убрать</button>
        </div>
      )}
    </div>
  );
}

// ─── NodeBox ──────────────────────────────────────────────────────────────────
interface NodeBoxProps {
  node: DecompositionStage;
  pos: Pos; isRoot?: boolean; editing: boolean; teamMembers: TeamMember[];
  onStartEdit: () => void; onEdit: (v: string) => void; onEndEdit: () => void;
  onAddChild: () => void; onAddBelow: () => void; onDelete?: () => void;
  onResponsible: (n: string) => void; onToggleCritical: () => void;
  onDateChange: (d: string | null) => void;
  onDragStart: (cx: number, cy: number) => void;
  onResizeStart: (cx: number, w: number) => void;
}

function NodeBox({
  node, pos, isRoot, editing, teamMembers,
  onStartEdit, onEdit, onEndEdit, onAddChild, onAddBelow, onDelete,
  onResponsible, onToggleCritical, onDateChange,
  onDragStart, onResizeStart,
}: NodeBoxProps) {
  const [hover, setHover] = useState(false);
  const [popup, setPopup] = useState<'team' | 'date' | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.selectionStart = inputRef.current.value.length;
    }
  }, [editing]);
  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  const enter = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setHover(true); };
  // When a popup is open keep the delay long so native date-picker doesn't close it
  const leave = () => {
    leaveTimer.current = setTimeout(
      () => { setHover(false); setPopup(null); },
      popup !== null ? 800 : 300,
    );
  };

  const isR = !!isRoot;
  const lv = pos.level;
  const bg = isR
    ? `linear-gradient(135deg, ${pos.color} 0%, #f1cd7f 100%)`
    : `rgba(${rgb(pos.color)},${lv === 1 ? 0.13 : 0.08})`;
  const borderL = isR ? `2px solid ${pos.color}` : `4px solid ${pos.color}`;
  const border = isR ? `2px solid ${pos.color}` : `1px solid rgba(${rgb(pos.color)},0.25)`;
  const shadow = isR
    ? `0 0 0 1px rgba(${rgb(pos.color)},0.3), 0 8px 32px rgba(${rgb(pos.color)},0.2)`
    : node.isCritical
    ? `0 0 0 2px rgba(255,69,58,0.4), 0 4px 16px rgba(255,69,58,0.15)`
    : lv === 1 ? `0 2px 10px rgba(${rgb(pos.color)},0.1)` : 'none';
  const textCol = isR ? '#1a1200' : 'var(--text-primary)';
  const fontSize = isR ? 15 : lv === 1 ? 13.5 : 13;

  const member = node.responsible ? teamMembers.find(m => m.name === node.responsible) : null;

  const nodeStatus: NodeStatus = node.status ?? 'todo';
  const hasStatus = !isR && nodeStatus !== 'todo';
  // Actual node height may exceed pos.h when badges are present — offset toolbar accordingly
  const badgeRowH = (!isR && (member || node.dueDate || hasStatus)) ? 30 : 0;
  const toolbarTop = pos.h + badgeRowH + 10;

  return (
    <foreignObject
      x={pos.x} y={pos.y}
      width={pos.w + 280}
      height={pos.h + 280}
      overflow="visible" style={{ overflow: 'visible' }}
    >
      <div style={{ position: 'relative', width: pos.w }} onMouseEnter={enter} onMouseLeave={leave}>

        {/* ── Main box ── */}
        <div
          onMouseDown={(e) => {
            if (editing || (e.target as Element).closest('[data-resize]')) return;
            e.stopPropagation();
            onDragStart(e.clientX, e.clientY);
          }}
          onDoubleClick={onStartEdit}
          style={{
            position: 'relative', minHeight: isR ? ROOT_H : NODE_H, width: pos.w,
            display: 'flex', alignItems: 'flex-start', flexDirection: 'column',
            padding: isR ? '12px 22px 12px 20px' : '9px 22px 9px 14px',
            gap: 4,
            borderRadius: isR ? 20 : 12,
            background: bg, border, borderLeft: borderL,
            boxShadow: shadow,
            cursor: editing ? 'text' : 'grab',
            userSelect: 'none', transition: 'box-shadow 0.2s',
            boxSizing: 'border-box',
          }}
        >
          {/* Row 1: icon + text */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, width: '100%' }}>
            {node.isCritical && <span style={{ fontSize: 12, flexShrink: 0, marginTop: 2, filter: 'drop-shadow(0 0 4px #ff453a)' }}>⚡</span>}
            {editing ? (
              <textarea
                ref={inputRef}
                defaultValue={node.title}
                onChange={(e) => onEdit(e.target.value)}
                onBlur={onEndEdit}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEndEdit(); setTimeout(onAddBelow, 10); }
                  else if (e.key === 'Tab') { e.preventDefault(); onEndEdit(); setTimeout(onAddChild, 10); }
                  else if (e.key === 'Escape') { onEndEdit(); }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                  color: textCol, fontSize, fontWeight: isR ? 700 : 600,
                  fontFamily: 'inherit', minWidth: 0, padding: 0, margin: 0,
                  lineHeight: '1.45', wordBreak: 'break-word', minHeight: 20,
                }}
              />
            ) : (
              <span style={{
                flex: 1, minWidth: 0,
                fontSize, fontWeight: isR ? 700 : 600,
                color: textCol, letterSpacing: '-0.01em',
                lineHeight: '1.45', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
              }}>
                {node.title || <span style={{ opacity: 0.3, fontWeight: 400, fontSize: 12 }}>Название...</span>}
              </span>
            )}
          </div>

          {/* Row 2: badges (status + avatar + date) */}
          {(member || node.dueDate || hasStatus) && !isR && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', paddingLeft: node.isCritical ? 18 : 0 }}>
              {hasStatus && (
                <span style={{
                  fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 5,
                  background: STATUS_BG[nodeStatus], color: STATUS_TEXT[nodeStatus],
                  letterSpacing: '0.02em', flexShrink: 0,
                }}>
                  {STATUS_LABEL[nodeStatus]}
                </span>
              )}
              {member && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MiniAvatar name={member.name} avatarUrl={member.avatarUrl} color={pos.color} />
                  <span style={{ fontSize: 10.5, color: pos.color, fontWeight: 600 }}>
                    {member.name.split(' ')[0]}
                  </span>
                </div>
              )}
              {node.dueDate && (
                <span style={{
                  fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  📅 {fmtDate(node.dueDate)}
                </span>
              )}
            </div>
          )}

          {/* Resize handle */}
          <div data-resize="1"
            onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e.clientX, pos.w); }}
            style={{
              position: 'absolute', right: 0, top: 0, bottom: 0, width: 10,
              cursor: 'ew-resize', borderRadius: '0 12px 12px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hover ? 1 : 0, transition: 'opacity 0.15s',
              background: `rgba(${rgb(pos.color)},0.2)`,
            }}
          >
            <div style={{ width: 2, height: 16, borderRadius: 2, background: pos.color }} />
          </div>
        </div>

        {/* ── Toolbar (hover-only) ── */}
        {hover && !editing && (
          <div onMouseEnter={enter} onMouseLeave={leave} style={{
            position: 'absolute', top: toolbarTop, left: 0, zIndex: 20,
            display: 'flex', gap: 4,
            background: 'var(--bg-modal)', border: '1px solid var(--border-2)',
            borderRadius: 12, padding: '5px 7px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4)',
          }}>
            <ToolBtn color="#30d158" title="Добавить дочернюю ветку [Tab]" onClick={onAddChild}>⇥ +</ToolBtn>
            {!isR && <ToolBtn color="#0a84ff" title="Добавить ветку ниже [Enter]" onClick={onAddBelow}>↵ +</ToolBtn>}
            {!isR && <ToolBtn color="#0a84ff" title="Переименовать" onClick={onStartEdit}>✎</ToolBtn>}
            {!isR && (
              <ToolBtn color={node.isCritical ? '#ff453a' : '#888'} title="Критический" onClick={onToggleCritical} active={node.isCritical}>⚡</ToolBtn>
            )}
            {!isR && (
              <ToolBtn color="#ff9f0a" title="Срок выполнения" onClick={() => setPopup(p => p === 'date' ? null : 'date')} active={popup === 'date'}>📅</ToolBtn>
            )}
            <ToolBtn color={pos.color} title="Ответственный" onClick={() => setPopup(p => p === 'team' ? null : 'team')} active={popup === 'team'}>👤</ToolBtn>
            {!isR && onDelete && (
              <ToolBtn color="#ff453a" title="Удалить" onClick={onDelete}>✕</ToolBtn>
            )}
          </div>
        )}

        {/* ── Date popup (independent of hover) ── */}
        {popup === 'date' && !isR && (
          <DatePopup
            currentDate={node.dueDate ?? ''}
            top={toolbarTop + 38}
            color={pos.color}
            onDateChange={onDateChange}
            onClose={() => setPopup(null)}
            enter={enter}
          />
        )}

        {/* ── Team popup (independent of hover) ── */}
        {popup === 'team' && (
          <div onMouseEnter={enter} style={{
            position: 'absolute', top: toolbarTop + 38, left: 0, zIndex: 100, minWidth: 200,
            background: 'var(--bg-modal)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 6,
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}>
            <TeamItem label="— Не назначен" dim onClick={() => { onResponsible(''); setPopup(null); }} />
            {teamMembers.map(m => (
              <TeamItem key={m.name} label={m.name} avatarUrl={m.avatarUrl} active={node.responsible === m.name}
                color={pos.color} onClick={() => { onResponsible(m.name); setPopup(null); }} />
            ))}
          </div>
        )}
      </div>
    </foreignObject>
  );
}

// ─── MindMap ──────────────────────────────────────────────────────────────────
interface Props {
  taskId: number; taskTitle: string; teamMembers: TeamMember[];
  initialStages?: DecompositionStage[] | null;
  onClose: () => void; onSaved: (stages: DecompositionStage[]) => void;
}

export function MindMap({ taskId, taskTitle, teamMembers, initialStages, onClose, onSaved }: Props) {
  const [stages, setStages] = useState<DecompositionStage[]>(initialStages ?? []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [customW, setCustomW] = useState<Map<string, number>>(new Map());
  const [manualXY, setManualXY] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [isPanning, setIsPanning] = useState(false);
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1);
  const panRef = useRef<{ cx: number; cy: number; px: number; py: number } | null>(null);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // layout + parent map computed every render
  const posMap = useRef(new Map<string, Pos>());
  const parentMap = useRef(new Map<string, string>());
  buildLayout(stages, posMap.current, taskTitle, customW, manualXY);
  parentMap.current.clear();
  buildParentMap(stages, ROOT_ID, parentMap.current);

  // ─── wheel zoom ───────────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(2.5, Math.max(0.2, z - e.deltaY * 0.001)));
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, []);

  // ─── drag node ────────────────────────────────────────────────────────────
  function startNodeDrag(nodeId: string, clientX: number, clientY: number) {
    const p = posMap.current.get(nodeId);
    if (!p) return;
    const sx = p.x, sy = p.y, cx0 = clientX, cy0 = clientY, z = zoomRef.current;
    let moved = false;
    const onMove = (e: MouseEvent) => {
      if (!moved && (Math.abs(e.clientX - cx0) > 4 || Math.abs(e.clientY - cy0) > 4)) moved = true;
      if (moved) {
        const dx = (e.clientX - cx0) / z, dy = (e.clientY - cy0) / z;
        setManualXY(prev => { const m = new Map(prev); m.set(nodeId, { x: sx + dx, y: sy + dy }); return m; });
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!moved) setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ─── resize node ─────────────────────────────────────────────────────────
  function startResize(nodeId: string, clientX: number, startW: number) {
    const z = zoomRef.current;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - clientX) / z;
      setCustomW(prev => { const m = new Map(prev); m.set(nodeId, Math.max(MIN_W, startW + dx)); return m; });
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ─── mutations ────────────────────────────────────────────────────────────
  const stagesRef = useRef(stages);
  useEffect(() => { stagesRef.current = stages; }, [stages]);

  function makeNode(): DecompositionStage {
    return { id: crypto.randomUUID(), title: '', isCritical: false, responsible: '', dueDate: null, reviewer: null, status: 'todo', children: [] };
  }

  function addChild(parentId: string) {
    const fresh = makeNode();
    if (parentId === ROOT_ID) {
      setStages(s => [...s, fresh]);
    } else {
      setStages(s => walk(s, parentId, n => ({ ...n, children: [...n.children, fresh] })));
    }
    setEditingId(fresh.id);
  }

  // Enter: create child of current node, placed BELOW it (not to the right)
  function addChildBelow(nodeId: string) {
    const fresh = makeNode();
    const parentPos = posMap.current.get(nodeId);

    if (nodeId === ROOT_ID) {
      setStages(s => [...s, fresh]);
    } else {
      setStages(s => walk(s, nodeId, n => ({ ...n, children: [...n.children, fresh] })));
    }

    // Position below the parent node
    if (parentPos) {
      setManualXY(prev => {
        const m = new Map(prev);
        m.set(fresh.id, { x: parentPos.x, y: parentPos.y + parentPos.h + 36 });
        return m;
      });
    }
    setEditingId(fresh.id);
  }

  function updateNode(id: string, patch: Partial<DecompositionStage>) {
    setStages(s => walk(s, id, n => ({ ...n, ...patch })));
  }

  // ─── canvas pan ───────────────────────────────────────────────────────────
  function onSvgDown(e: React.MouseEvent<SVGSVGElement>) {
    if ((e.target as Element).closest('foreignObject')) return;
    setSelectedNodeId(null);
    panRef.current = { cx: e.clientX, cy: e.clientY, px: pan.x, py: pan.y };
    setIsPanning(true);
  }
  function onSvgMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!panRef.current) return;
    setPan({ x: panRef.current.px + (e.clientX - panRef.current.cx), y: panRef.current.py + (e.clientY - panRef.current.cy) });
  }
  function onSvgUp() { panRef.current = null; setIsPanning(false); }

  // ─── save ────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    await saveDecomposition(taskId, stages);
    setSaving(false); setSavedOk(true); onSaved(stages);
    setTimeout(() => setSavedOk(false), 2500);
  }

  // ─── collect edges + flatten ──────────────────────────────────────────────
  const edges: { fid: string; tid: string; from: Pos; to: Pos }[] = [];
  function collectEdges(parentId: string, nodes: DecompositionStage[]) {
    nodes.forEach(n => {
      const from = posMap.current.get(parentId), to = posMap.current.get(n.id);
      if (from && to) edges.push({ fid: parentId, tid: n.id, from, to });
      collectEdges(n.id, n.children);
    });
  }
  collectEdges(ROOT_ID, stages);

  const flatNodes: { node: DecompositionStage; pos: Pos }[] = [];
  function flatten(nodes: DecompositionStage[]) {
    nodes.forEach(n => {
      const p = posMap.current.get(n.id);
      if (p) flatNodes.push({ node: n, pos: p });
      flatten(n.children);
    });
  }
  flatten(stages);

  const rootPos = posMap.current.get(ROOT_ID);
  const total = countAll(stages);
  const critical = countCritical(stages);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--bg-page)' }}>

      {/* ── Top bar ── */}
      <div className="flex shrink-0 items-center gap-4 px-6 py-3"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-2)' }}>
        <button onClick={onClose} className="rounded-[10px] p-2 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Полная картина</p>
          <h1 className="truncate text-[15px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{taskTitle}</h1>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>{total} этапов</span>
            {critical > 0 && <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a' }}>⚡ {critical}</span>}
          </div>
        )}
        {/* Hint */}
        <div className="hidden lg:flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-2)' }}>Tab</span>
          <span>дочерняя</span>
          <span className="rounded px-1.5 py-0.5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-2)' }}>Enter</span>
          <span>ниже</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-[10px] px-1.5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-2)' }}>
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="px-2 py-1.5 text-[16px] hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>−</button>
            <span className="w-10 text-center text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="px-2 py-1.5 text-[16px] hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>+</button>
          </div>
          <button onClick={() => { setPan({ x: 100, y: 100 }); setZoom(1); setManualXY(new Map()); }}
            className="rounded-[10px] px-3 py-2 text-[12px] hover:opacity-70"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
            Сбросить
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50"
            style={{ background: savedOk ? 'rgba(48,209,88,0.18)' : 'linear-gradient(135deg,#d8b06a,#f1cd7f)', color: savedOk ? '#30d158' : '#000' }}>
            {saving ? 'Сохранение...' : savedOk ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="relative flex-1 overflow-hidden">
        <svg ref={svgRef} width="100%" height="100%"
          style={{ display: 'block', cursor: isPanning ? 'grabbing' : 'default' }}
          onMouseDown={onSvgDown} onMouseMove={onSvgMove}
          onMouseUp={onSvgUp} onMouseLeave={onSvgUp}
        >
          <defs>
            <pattern id="mm-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1.3" fill="rgba(128,128,128,0.07)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mm-dots)" />
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {edges.map(({ fid, tid, from, to }) => (
              <Edge key={`${fid}-${tid}`} from={from} to={to} fid={fid} tid={tid} />
            ))}
            {rootPos && (
              <NodeBox
                node={{ id: ROOT_ID, title: taskTitle, isCritical: false, responsible: '', dueDate: null, children: [] }}
                pos={rootPos} isRoot editing={editingId === ROOT_ID}
                teamMembers={teamMembers}
                onStartEdit={() => setEditingId(ROOT_ID)}
                onEdit={() => {}} onEndEdit={() => setEditingId(null)}
                onAddChild={() => addChild(ROOT_ID)}
                onAddBelow={() => {}}
                onResponsible={() => {}} onToggleCritical={() => {}} onDateChange={() => {}}
                onDragStart={(cx, cy) => startNodeDrag(ROOT_ID, cx, cy)}
                onResizeStart={(cx, w) => startResize(ROOT_ID, cx, w)}
              />
            )}
            {flatNodes.map(({ node, pos }) => (
              <NodeBox key={node.id} node={node} pos={pos}
                editing={editingId === node.id} teamMembers={teamMembers}
                onStartEdit={() => setEditingId(node.id)}
                onEdit={(v) => updateNode(node.id, { title: v })}
                onEndEdit={() => setEditingId(null)}
                onAddChild={() => addChild(node.id)}
                onAddBelow={() => addChildBelow(node.id)}
                onDelete={() => setStages(s => drop(s, node.id))}
                onResponsible={(n) => updateNode(node.id, { responsible: n })}
                onToggleCritical={() => updateNode(node.id, { isCritical: !node.isCritical })}
                onDateChange={(d) => updateNode(node.id, { dueDate: d })}
                onDragStart={(cx, cy) => startNodeDrag(node.id, cx, cy)}
                onResizeStart={(cx, w) => startResize(node.id, cx, w)}
              />
            ))}
          </g>
        </svg>

        {/* ── Node detail panel ── */}
        {selectedNodeId && (() => {
          const sel = flatNodes.find(n => n.node.id === selectedNodeId);
          return sel ? (
            <NodeDetailPanel
              node={sel.node}
              teamMembers={teamMembers}
              onUpdate={(patch) => updateNode(selectedNodeId, patch)}
              onClose={() => setSelectedNodeId(null)}
            />
          ) : null;
        })()}

        {stages.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="text-5xl opacity-20">🗺</div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Карта пуста</p>
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нажмите кнопку ниже или Tab/Enter при редактировании</p>
          </div>
        )}
      </div>

      {/* ── Add button ── */}
      <button onClick={() => addChild(ROOT_ID)}
        className="fixed bottom-6 z-[300] flex items-center gap-2 rounded-[16px] px-5 py-3 text-[14px] font-semibold transition-all duration-200 hover:scale-105"
        style={{ right: selectedNodeId ? 316 : 24, background: 'linear-gradient(135deg,#d8b06a,#f1cd7f)', color: '#000', boxShadow: '0 8px 30px rgba(216,176,106,0.4)', transition: 'right 0.22s ease' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Добавить ветку
      </button>
    </div>
  );
}
