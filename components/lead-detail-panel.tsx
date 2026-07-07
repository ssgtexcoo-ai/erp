'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchLeadNotes, addLeadNote, PRODUCT_TYPES, type LeadWithDetails, type LeadNote } from '@/lib/leadService';
import { UserAvatar } from '@/components/user-avatar';
import { createDeal } from '@/lib/dealService';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/auth-context';
import { LEAD_STAGES } from '@/lib/constants';

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый лид', contacted: 'Первичный контакт', negotiation: 'Переговоры',
  proposal_sent: 'КП отправлено', agreement: 'Согласование', payment: 'Договор',
  production: 'В производстве', installation: 'Монтаж', handover: 'Сдача',
  signed: 'Подписано', closed: 'Закрыто', qualified: 'Квалифицирован',
  won: 'Выиграли', lost: 'Проиграли',
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  lead: LeadWithDetails | null;
  onClose: () => void;
}

export function LeadDetailPanel({ lead, onClose }: Props) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const [showDealModal, setShowDealModal] = useState(false);
  const [dealAmount, setDealAmount] = useState('');
  const [dealLoading, setDealLoading] = useState(false);
  const [dealError, setDealError] = useState('');
  const [dealSuccess, setDealSuccess] = useState('');

  useEffect(() => {
    if (!lead) return;
    setNotes([]);
    fetchLeadNotes(lead.id).then(({ notes: n }) => setNotes(n));
  }, [lead?.id]);

  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const handleCreateDeal = async () => {
    if (!lead) return;
    setDealLoading(true);
    setDealError('');
    try {
      const { data: stages } = await supabase.from('deal_stages').select('id').order('order_index').limit(1);
      const firstStageId = stages?.[0]?.id ?? 1;
      const { error } = await createDeal({
        customerName: lead.customerName,
        amount: parseFloat(dealAmount) || 0,
        stageId: firstStageId,
        assignedTo: lead.assignedTo ?? null,
        leadId: lead.id,
      });
      if (error) {
        setDealError(error.message ?? JSON.stringify(error));
        return;
      }
      setDealSuccess('Сделка создана!');
      setShowDealModal(false);
      setDealAmount('');
      setTimeout(() => setDealSuccess(''), 3000);
    } catch (e: any) {
      setDealError(e?.message ?? 'Неизвестная ошибка');
    } finally {
      setDealLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !lead || !user) return;
    setSaving(true);
    await addLeadNote(lead.id, user.id, noteText.trim());
    setNotes((prev) => [...prev, {
      id: Date.now(), leadId: lead.id, userId: user.id,
      text: noteText.trim(), createdAt: new Date().toISOString(), userName: user.fullName,
    }]);
    setNoteText('');
    setSaving(false);
  };

  if (!lead) return null;

  const createdDate = new Date(lead.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.50)' }} onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col"
        style={{ background: 'var(--bg-page)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{lead.leadCode}</p>
            <h2 className="mt-1 truncate text-[20px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>{lead.customerName}</h2>
            <span className="mt-1 inline-block rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>
              {STATUS_LABEL[lead.status] ?? lead.status}
            </span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button onClick={onClose} className="rounded-[10px] p-2 transition-opacity hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <button onClick={() => { setShowDealModal(true); setDealError(''); }} className="rounded-[12px] px-3 py-1.5 text-[12px] font-semibold transition-opacity hover:opacity-80" style={{ background: 'rgba(216,176,106,0.15)', color: '#d8b06a', border: '1px solid rgba(216,176,106,0.30)' }}>
              + Создать сделку
            </button>
            {dealSuccess && <p className="text-[12px] text-[#30d158]">{dealSuccess}</p>}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Contact info */}
          <section>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Контакт</p>
            <div className="space-y-2">
              {[
                { label: 'Телефон', value: lead.phone, href: `tel:${lead.phone}` },
                { label: 'Email', value: lead.email, href: `mailto:${lead.email}` },
                { label: 'Продукт', value: lead.productType ? (PRODUCT_TYPES.find((p) => p.value === lead.productType)?.label ?? lead.productType) : '—', href: null },
                { label: 'Источник', value: lead.sourceName ?? '—', href: null },
                { label: 'Создан', value: createdDate, href: null },
              ].map(({ label, value, href }) => (
                <div key={label} className="flex items-center justify-between rounded-[12px] px-4 py-3" style={{ background: 'var(--bg-hover)' }}>
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                  {href ? (
                    <a href={href} className="text-[13px] font-medium transition-opacity hover:opacity-70" style={{ color: '#d8b06a' }}>{value}</a>
                  ) : (
                    <span className="text-[13px] font-medium text-white">{value}</span>
                  )}
                </div>
              ))}
              {/* Manager row with avatar */}
              <div className="flex items-center justify-between rounded-[12px] px-4 py-3" style={{ background: 'var(--bg-hover)' }}>
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Менеджер</span>
                <div className="flex items-center gap-2">
                  <UserAvatar name={lead.assignedToName || '?'} avatarUrl={lead.assignedToAvatarUrl} size={24} />
                  <span className="text-[13px] font-medium text-white">{lead.assignedToName ?? 'Не назначен'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Follow-up */}
          {lead.followUpDate && (
            <section className="rounded-[12px] px-4 py-3" style={{ background: 'rgba(10,132,255,0.10)', border: '1px solid rgba(10,132,255,0.20)' }}>
              <p className="text-[11px] font-medium uppercase tracking-widest mb-1" style={{ color: '#409cff' }}>Запланированный звонок</p>
              <p className="text-[14px] font-semibold text-white">{new Date(lead.followUpDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
              {lead.followUpNote && <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{lead.followUpNote}</p>}
            </section>
          )}

          {/* Comment */}
          {lead.comment && (
            <section>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Комментарий</p>
              <p className="rounded-[12px] px-4 py-3 text-[13px] leading-relaxed" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{lead.comment}</p>
            </section>
          )}

          {/* Stage pipeline */}
          <section>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Этапы</p>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_STAGES.map((stage) => (
                <span
                  key={stage.value}
                  className="rounded-full px-3 py-1 text-[11px] font-medium"
                  style={stage.value === lead.status
                    ? { background: 'rgba(216,176,106,0.20)', color: '#d8b06a', border: '1px solid rgba(216,176,106,0.40)' }
                    : { background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}
                >
                  {stage.label}
                </span>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Заметки</p>
            <div className="space-y-3">
              {notes.length === 0 && (
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Заметок пока нет</p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="rounded-[12px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium" style={{ color: '#d8b06a' }}>{note.userName}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{note.text}</p>
                </div>
              ))}
              <div ref={notesEndRef} />
            </div>
          </section>
        </div>

        {/* Note input */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--bg-subtle)' }}>
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote(); }}
              placeholder="Написать заметку... (Cmd+Enter для сохранения)"
              rows={2}
              className="flex-1 resize-none rounded-[14px] px-4 py-3 text-[14px] outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim() || saving}
              className="self-end rounded-[14px] px-4 py-3 text-[13px] font-semibold transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}
            >
              {saving ? '...' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Deal creation modal */}
      {showDealModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 100, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }} onClick={() => setShowDealModal(false)}>
          <div className="w-full max-w-sm rounded-[24px] p-7 space-y-5" style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-[20px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>Создать сделку</h2>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{lead.customerName}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Сумма сделки (₸)</label>
              <input
                type="number"
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>
            {dealError && <p className="text-[13px] text-[#ff453a]">{dealError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowDealModal(false)} className="flex-1 rounded-[14px] py-3 text-[14px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                Отмена
              </button>
              <button onClick={handleCreateDeal} disabled={dealLoading} className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}>
                {dealLoading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
