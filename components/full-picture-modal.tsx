'use client';

import { useCallback, useRef, useState } from 'react';
import { saveDecomposition, type DecompositionStage } from '@/lib/taskService';

interface Props {
  taskId: number;
  taskTitle: string;
  taskDescription?: string;
  teamMembers: string[];
  initialStages?: DecompositionStage[] | null;
  onClose: () => void;
  onSaved: (stages: DecompositionStage[]) => void;
}

function newStage(title = ''): DecompositionStage {
  return { id: crypto.randomUUID(), title, isCritical: false, responsible: '', children: [] };
}

// ─── Inline edit title ───────────────────────────────────────────────────────
function EditableTitle({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(!value);
  const inputRef = useRef<HTMLInputElement>(null);

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (value.trim()) setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) setEditing(false); }}
        placeholder={placeholder ?? 'Название этапа...'}
        className="flex-1 rounded-[8px] px-2 py-1 text-[13px] font-medium outline-none"
        style={{ background: 'var(--bg-input)', border: '1px solid rgba(216,176,106,0.40)', color: 'var(--text-primary)', minWidth: 0 }}
      />
    );
  }

  return (
    <span
      className="flex-1 cursor-text text-[13px] font-medium rounded px-1 py-0.5 hover:bg-[var(--bg-input)] transition-colors"
      style={{ color: 'var(--text-primary)' }}
      onClick={() => setEditing(true)}
    >
      {value || <span style={{ color: 'var(--text-placeholder)' }}>{placeholder}</span>}
    </span>
  );
}

// ─── Single stage row ─────────────────────────────────────────────────────────
function StageRow({
  stage, depth, teamMembers,
  onUpdate, onDelete, onAddChild, onMoveUp, onMoveDown, canMoveUp, canMoveDown,
}: {
  stage: DecompositionStage;
  depth: number;
  teamMembers: string[];
  onUpdate: (updated: DecompositionStage) => void;
  onDelete: () => void;
  onAddChild: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [showResponsible, setShowResponsible] = useState(false);
  const hasChildren = stage.children.length > 0;

  const updateChild = useCallback((idx: number, updated: DecompositionStage) => {
    const children = stage.children.map((c, i) => (i === idx ? updated : c));
    onUpdate({ ...stage, children });
  }, [stage, onUpdate]);

  const deleteChild = useCallback((idx: number) => {
    onUpdate({ ...stage, children: stage.children.filter((_, i) => i !== idx) });
  }, [stage, onUpdate]);

  const addGrandchild = useCallback((idx: number) => {
    const children = stage.children.map((c, i) => i === idx ? { ...c, children: [...c.children, newStage()] } : c);
    onUpdate({ ...stage, children });
  }, [stage, onUpdate]);

  const moveChildUp = useCallback((idx: number) => {
    if (idx === 0) return;
    const ch = [...stage.children];
    [ch[idx - 1], ch[idx]] = [ch[idx], ch[idx - 1]];
    onUpdate({ ...stage, children: ch });
  }, [stage, onUpdate]);

  const moveChildDown = useCallback((idx: number) => {
    if (idx === stage.children.length - 1) return;
    const ch = [...stage.children];
    [ch[idx], ch[idx + 1]] = [ch[idx + 1], ch[idx]];
    onUpdate({ ...stage, children: ch });
  }, [stage, onUpdate]);

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className="group flex items-center gap-1.5 rounded-[10px] px-2 py-1.5 transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
      >
        {/* Toggle */}
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded transition-opacity"
          style={{ color: 'var(--text-tertiary)', opacity: hasChildren ? 1 : 0.25, cursor: hasChildren ? 'pointer' : 'default' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 transition-transform" style={{ transform: hasChildren && open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Critical toggle */}
        <button
          type="button"
          title="Критический этап"
          onClick={() => onUpdate({ ...stage, isCritical: !stage.isCritical })}
          className="shrink-0 rounded px-1 py-0.5 text-[11px] font-bold transition-all"
          style={stage.isCritical
            ? { background: 'rgba(255,69,58,0.18)', color: '#ff453a' }
            : { background: 'transparent', color: 'var(--text-tertiary)', opacity: 0 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={(e) => { if (!stage.isCritical) (e.currentTarget as HTMLElement).style.opacity = '0'; }}
        >
          ⚡
        </button>

        {/* Title */}
        <EditableTitle
          value={stage.title}
          onChange={(v) => onUpdate({ ...stage, title: v })}
          placeholder={depth === 0 ? 'Этап...' : 'Подэтап...'}
        />

        {/* Responsible */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowResponsible((s) => !s)}
            className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-[11px] transition-all opacity-0 group-hover:opacity-100"
            style={{ background: 'var(--bg-input)', color: stage.responsible ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3 w-3">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {stage.responsible || 'Назначить'}
          </button>
          {showResponsible && (
            <div
              className="absolute right-0 top-full z-10 mt-1 w-44 rounded-[12px] p-1.5 shadow-xl"
              style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}
            >
              <button
                type="button"
                onClick={() => { onUpdate({ ...stage, responsible: '' }); setShowResponsible(false); }}
                className="w-full rounded-[8px] px-3 py-1.5 text-left text-[12px] transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
              >
                — Не назначен
              </button>
              {teamMembers.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onUpdate({ ...stage, responsible: name }); setShowResponsible(false); }}
                  className="w-full rounded-[8px] px-3 py-1.5 text-left text-[12px] font-medium transition-colors"
                  style={{ color: stage.responsible === name ? '#d8b06a' : 'var(--text-primary)', background: stage.responsible === name ? 'rgba(216,176,106,0.10)' : '' }}
                  onMouseEnter={(e) => { if (stage.responsible !== name) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (stage.responsible !== name) e.currentTarget.style.background = ''; }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp} className="rounded p-1 transition-opacity disabled:opacity-20" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3"><path d="M18 15l-6-6-6 6" strokeLinecap="round"/></svg>
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown} className="rounded p-1 transition-opacity disabled:opacity-20" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3"><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg>
          </button>
          {depth < 3 && (
            <button type="button" onClick={onAddChild} className="rounded p-1 transition-opacity" title="Добавить подэтап" style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#30d158'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
            </button>
          )}
          <button type="button" onClick={onDelete} className="rounded p-1 transition-opacity" title="Удалить" style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff453a'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div style={{ borderLeft: '1px dashed var(--border-2)', marginLeft: depth * 20 + 22 }}>
          {stage.children.map((child, idx) => (
            <StageRow
              key={child.id}
              stage={child}
              depth={depth + 1}
              teamMembers={teamMembers}
              onUpdate={(u) => updateChild(idx, u)}
              onDelete={() => deleteChild(idx)}
              onAddChild={() => addGrandchild(idx)}
              onMoveUp={() => moveChildUp(idx)}
              onMoveDown={() => moveChildDown(idx)}
              canMoveUp={idx > 0}
              canMoveDown={idx < stage.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Count helpers ────────────────────────────────────────────────────────────
function countAll(stages: DecompositionStage[]): number {
  return stages.reduce((n, s) => n + 1 + countAll(s.children), 0);
}
function countCritical(stages: DecompositionStage[]): number {
  return stages.reduce((n, s) => n + (s.isCritical ? 1 : 0) + countCritical(s.children), 0);
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function FullPictureModal({ taskId, taskTitle, taskDescription, teamMembers, initialStages, onClose, onSaved }: Props) {
  const [stages, setStages] = useState<DecompositionStage[]>(initialStages ?? []);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const addStage = () => setStages((s) => [...s, newStage()]);

  const updateStage = useCallback((idx: number, updated: DecompositionStage) => {
    setStages((s) => s.map((st, i) => (i === idx ? updated : st)));
  }, []);

  const deleteStage = useCallback((idx: number) => {
    setStages((s) => s.filter((_, i) => i !== idx));
  }, []);

  const addChildToStage = useCallback((idx: number) => {
    setStages((s) => s.map((st, i) => i === idx ? { ...st, children: [...st.children, newStage()] } : st));
  }, []);

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    setStages((s) => { const a = [...s]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
  }, []);

  const moveDown = useCallback((idx: number) => {
    setStages((s) => { if (idx >= s.length - 1) return s; const a = [...s]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await saveDecomposition(taskId, stages);
    setSaving(false);
    setSavedOk(true);
    onSaved(stages);
    setTimeout(() => setSavedOk(false), 2000);
  };

  const total = countAll(stages);
  const critical = countCritical(stages);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)' }}>
      <div
        className="relative flex w-full max-w-2xl flex-col rounded-[28px] overflow-hidden"
        style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border-2)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Полная картина</p>
            <h2 className="text-[18px] font-bold truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{taskTitle}</h2>
            {taskDescription && (
              <p className="mt-0.5 text-[12px] line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{taskDescription}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Stats pills */}
            {total > 0 && (
              <>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>{total} этапов</span>
                {critical > 0 && <span className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a' }}>⚡ {critical}</span>}
              </>
            )}
            <button onClick={onClose} className="rounded-[10px] p-2 transition-opacity hover:opacity-70" style={{ color: 'var(--text-tertiary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hint */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-2.5 text-[11px]" style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-2)', color: 'var(--text-tertiary)' }}>
          <span>Нажмите на название чтобы изменить</span>
          <span>·</span>
          <span className="flex items-center gap-1">⚡ — критический этап</span>
          <span>·</span>
          <span>Наведите на строку чтобы увидеть действия</span>
        </div>

        {/* Stage tree */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" className="h-7 w-7">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
              </div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>Этапов пока нет</p>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нажмите «+ Добавить этап» чтобы начать</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {stages.map((stage, idx) => (
                <StageRow
                  key={stage.id}
                  stage={stage}
                  depth={0}
                  teamMembers={teamMembers}
                  onUpdate={(u) => updateStage(idx, u)}
                  onDelete={() => deleteStage(idx)}
                  onAddChild={() => addChildToStage(idx)}
                  onMoveUp={() => moveUp(idx)}
                  onMoveDown={() => moveDown(idx)}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < stages.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border-2)' }}>
          <button
            type="button"
            onClick={addStage}
            className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-medium transition-all duration-150"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(216,176,106,0.35)'; e.currentTarget.style.color = '#d8b06a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Добавить этап
          </button>

          <div className="flex-1" />

          <button onClick={onClose} className="rounded-[12px] px-4 py-2.5 text-[13px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 disabled:opacity-60"
            style={{ background: savedOk ? 'rgba(48,209,88,0.20)' : 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: savedOk ? '#30d158' : '#000' }}
          >
            {saving ? (
              <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Сохранение...</>
            ) : savedOk ? (
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4"><path d="M20 6 9 17l-5-5"/></svg>Сохранено</>
            ) : (
              'Сохранить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
