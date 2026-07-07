'use client';

import { useEffect, useState } from 'react';
import { assignLeadBatch, AUTO_ASSIGN_MODES, getLeadSlaStatus } from '@/lib/leadAssignment';
import { LeadDetailPanel } from '@/components/lead-detail-panel';
import { ExcelImportModal } from '@/components/excel-import-modal';
import { fetchLeads, updateLead, createLead, deleteLead, setFollowUp, PRODUCT_TYPES, LEADS_PAGE_SIZE, type LeadWithDetails, type LeadSource } from '@/lib/leadService';
import { subscribeToTable } from '@/lib/realtimeService';
import { ClientSearch } from '@/components/client-search';
import { UserAvatar } from '@/components/user-avatar';
import { notifyTelegram } from '@/lib/telegram';
import { exportLeadsToExcel } from '@/lib/exportService';
import { LEAD_STAGES } from '@/lib/constants';
import type { AutoAssignMode } from '@/lib/leadAssignment';
import type { EmployeeSummary } from '@/lib/types';

function getLeadInitials(name: string) {
  const letters = name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return letters.slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
}

const AVATAR_PALETTE = [
  'bg-violet-500/20 text-violet-300',
  'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
];

const STATUS_STYLE: Record<string, string> = {
  new:           'bg-sky-500/15 text-sky-300',
  contacted:     'bg-violet-500/15 text-violet-300',
  negotiation:   'bg-amber-500/15 text-amber-300',
  proposal_sent: 'bg-blue-500/15 text-blue-300',
  agreement:     'bg-indigo-500/15 text-indigo-300',
  payment:       'bg-emerald-500/15 text-emerald-300',
  production:    'bg-teal-500/15 text-teal-300',
  installation:  'bg-cyan-500/15 text-cyan-300',
  handover:      'bg-orange-500/15 text-orange-300',
  signed:        'bg-green-500/15 text-green-300',
  closed:        'bg-[var(--bg-input)] text-[#6b7280]',
  qualified:     'bg-amber-500/15 text-amber-300',
  won:           'bg-emerald-500/15 text-emerald-300',
  lost:          'bg-[var(--bg-input)] text-[#6b7280]',
};

const STATUS_LABEL: Record<string, string> = {
  new:           'Новый лид',
  contacted:     'Первичный контакт',
  negotiation:   'Переговоры',
  proposal_sent: 'КП отправлено',
  agreement:     'Согласование',
  payment:       'Договор',
  production:    'В производстве',
  installation:  'Монтаж',
  handover:      'Сдача',
  signed:        'Подписано',
  closed:        'Закрыто',
  qualified:     'Квалифицирован',
  won:           'Выиграли',
  lost:          'Проиграли',
};

const INPUT_CLS =
  'w-full rounded-[14px] px-4 py-3 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-[rgba(235,235,245,0.25)]';

export function LeadsBoard() {
  const [mode, setMode] = useState<AutoAssignMode>('round_robin');
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [managers, setManagers] = useState<EmployeeSummary[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState('Загрузка лидов...');
  const [error, setError] = useState('');
  const [lastIndex, setLastIndex] = useState(0);
  const [editingLead, setEditingLead] = useState<LeadWithDetails | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [editStatus, setEditStatus] = useState<LeadWithDetails['status']>('new');
  const [editSourceId, setEditSourceId] = useState<number | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState<number | null>(null);
  const [editComment, setEditComment] = useState('');
  const [editProductType, setEditProductType] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [detailLead, setDetailLead] = useState<LeadWithDetails | null>(null);
  const [followUpLead, setFollowUpLead] = useState<LeadWithDetails | null>(null);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    setPage(0);
    const response = await fetchLeads(0);
    if (response.error) {
      setError(response.error.message);
      setMessage('Не удалось загрузить лиды.');
      setLeads([]);
    } else {
      setLeads(response.leads);
      setHasMore(response.hasMore);
      setSources(response.sources);
      setManagers(
        (response.users ?? [])
          .filter((u) => u.role_id === 2)
          .map((u) => ({ id: u.id, name: u.full_name, role: 'manager', score: 0 })),
      );
      setMessage('Готово.');
    }
    setLoading(false);
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const response = await fetchLeads(nextPage);
    if (!response.error) {
      setLeads((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const newLeads = response.leads.filter((l) => !existingIds.has(l.id));
        return [...prev, ...newLeads];
      });
      setHasMore(response.hasMore);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    loadLeads();
    return subscribeToTable('leads', loadLeads);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assigned = leads.filter((l) => l.assignedTo).length;
  const unassigned = leads.length - assigned;
  const criticalSla = leads.filter((l) => getLeadSlaStatus(l.createdAt) === 'red').length;

  const handleAssign = async () => {
    if (!managers.length) { setMessage('Нет доступных менеджеров для распределения.'); return; }
    setLoading(true);
    setError('');

    const { leads: updatedLeads, lastIndex: nextIndex } = assignLeadBatch(leads, managers, mode, lastIndex);
    const previousById = new Map(leads.map((l) => [l.id, l.assignedTo]));
    const reassigned = updatedLeads.filter((l) => previousById.get(l.id) !== l.assignedTo && l.assignedTo);

    if (reassigned.length) {
      const results = await Promise.all(reassigned.map((l) => updateLead(l.id, { assignedTo: l.assignedTo ?? null })));
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) { setError(firstError.message); setLoading(false); return; }
    }

    setLeads(updatedLeads as typeof leads);
    setLastIndex(nextIndex);
    const assignedCount = updatedLeads.filter((l, i) => !leads[i].assignedTo && l.assignedTo).length;
    setMessage(`Режим: ${mode.replace('_', ' ')}. Назначено ${assignedCount} лидов.`);
    setLoading(false);
  };

  const startEditLead = (lead: LeadWithDetails) => {
    setEditingLead(lead);
    setIsCreatingLead(false);
    setEditStatus(lead.status);
    setEditSourceId(lead.sourceId ?? null);
    setEditCustomerName(lead.customerName);
    setEditPhone(lead.phone);
    setEditEmail(lead.email);
    setEditAssignedTo(lead.assignedTo ?? null);
    setEditComment(lead.comment ?? '');
    setEditProductType(lead.productType ?? '');
  };

  const openCreateLead = () => {
    setEditingLead(null);
    setIsCreatingLead(true);
    setEditStatus('new');
    setEditSourceId(sources[0]?.id ?? null);
    setEditCustomerName('');
    setEditPhone('');
    setEditEmail('');
    setEditAssignedTo(null);
    setEditComment('');
    setEditProductType('');
    setError('');
  };

  const closeEditModal = () => { setEditingLead(null); setIsCreatingLead(false); setError(''); };

  const saveLead = async () => {
    if (!editingLead && !isCreatingLead) return;
    const currentLead = editingLead;
    const customerName = editCustomerName.trim();
    const phone = editPhone.trim();
    const email = editEmail.trim();
    const comment = editComment.trim();

    if (!customerName) { setError('Укажите имя клиента.'); return; }
    if (!phone && !email) { setError('Укажите телефон или email клиента.'); return; }
    if (email && !email.includes('@')) { setError('Укажите корректный email.'); return; }

    setError('');
    setLoading(true);

    if (isCreatingLead) {
      if (!editSourceId) { setError('Выберите источник лида.'); setLoading(false); return; }

      const { lead: newLead, error: createError } = await createLead({
        sourceId: editSourceId, assignedTo: editAssignedTo, status: editStatus,
        customerName, phone, email, comment, productType: editProductType || null,
      });

      if (createError || !newLead) { setError(createError?.message ?? 'Ошибка создания лида'); setLoading(false); return; }

      const sourceName = sources.find((s) => s.id === editSourceId)?.name ?? '—';
      const managerName = editAssignedTo ? managers.find((m) => m.id === editAssignedTo)?.name ?? 'Не назначен' : 'Не назначен';

      setLeads((current) => [
        { ...newLead, sourceName, assignedToName: managerName },
        ...current,
      ]);

      notifyTelegram(
        `🆕 *Новый лид*\n👤 ${customerName}\n📞 ${phone || email}\n📌 Источник: ${sourceName}\n👔 Менеджер: ${managerName}`,
      );

      setMessage('Новый лид добавлен.');
      closeEditModal();
      setLoading(false);
      return;
    }

    if (!currentLead) return;
    const { error: updateError } = await updateLead(currentLead.id, {
      status: editStatus, sourceId: editSourceId ?? undefined,
      customerName, phone, email, assignedTo: editAssignedTo, comment,
      productType: editProductType || null,
    });

    if (updateError) { setError(updateError.message); setLoading(false); return; }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === currentLead.id
          ? {
              ...lead, sourceId: editSourceId ?? lead.sourceId,
              sourceName: sources.find((s) => s.id === editSourceId)?.name ?? lead.sourceName,
              customerName, phone, email, status: editStatus, assignedTo: editAssignedTo, comment,
              assignedToName: editAssignedTo ? managers.find((m) => m.id === editAssignedTo)?.name ?? lead.assignedToName : 'Не назначен',
            }
          : lead,
      ),
    );
    setMessage('Лид обновлён.');
    closeEditModal();
    setLoading(false);
  };

  const openFollowUp = (lead: LeadWithDetails) => {
    setFollowUpLead(lead);
    setFollowUpDate(lead.followUpDate ?? '');
    setFollowUpNote(lead.followUpNote ?? '');
  };

  const saveFollowUp = async () => {
    if (!followUpLead) return;
    setFollowUpLoading(true);
    await setFollowUp(followUpLead.id, followUpDate || null, followUpNote || null);
    setLeads((curr) => curr.map((l) => l.id === followUpLead.id ? { ...l, followUpDate: followUpDate || null, followUpNote: followUpNote || null } : l));
    setFollowUpLead(null);
    setFollowUpLoading(false);
  };

  const removeFollowUp = async (leadId: number) => {
    await setFollowUp(leadId, null, null);
    setLeads((curr) => curr.map((l) => l.id === leadId ? { ...l, followUpDate: null, followUpNote: null } : l));
  };

  const removeLead = async (leadId: number) => {
    setLoading(true);
    const { error: deleteError } = await deleteLead(leadId);
    if (deleteError) { setError(deleteError.message); setLoading(false); return; }
    setLeads((current) => current.filter((l) => l.id !== leadId));
    setConfirmDeleteId(null);
    setMessage('Лид удалён.');
    setLoading(false);
  };

  if (loading && !leads.length) {
    return (
      <div className="space-y-8">
        <section className="rounded-[24px] p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
          <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Загрузка лидов...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-[24px] p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Продажи</p>
            <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>Лиды и маркетинг</h1>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Отслеживайте лиды, источники, SLA и распределение по менеджерам</p>
          </div>
          <div className="flex gap-2 self-start flex-wrap">
            <button type="button" onClick={() => setShowImport(true)} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              📊 Импорт Excel
            </button>
            <button
              type="button"
              onClick={() => exportLeadsToExcel(leads)}
              disabled={leads.length === 0}
              className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-[14px] font-semibold transition-all duration-150 disabled:opacity-40"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#30d158'; e.currentTarget.style.color = '#30d158'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Excel
            </button>
            <button type="button" onClick={openCreateLead} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
              + Добавить лид
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Всего лидов', value: leads.length, color: '#d8b06a' },
            { label: 'Назначено', value: assigned, color: '#34c759' },
            { label: 'Свободных', value: unassigned, color: 'var(--text-secondary)' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
              <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
              <p className="mt-1.5 text-[32px] font-bold" style={{ color: kpi.color, letterSpacing: '-0.05em' }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Auto-assign panel */}
      <section className="rounded-[24px] p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Менеджеры', value: managers.length, danger: false },
              { label: 'SLA критичные', value: criticalSla, danger: criticalSla > 0 },
              { label: 'Текущий режим', value: mode.replace('_', ' '), danger: false },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
                <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                <p className="mt-1.5 text-[20px] font-bold" style={{ color: stat.danger ? '#ff453a' : 'var(--text-primary)', letterSpacing: '-0.03em' }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-3 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="shrink-0">Режим</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as AutoAssignMode)} className="rounded-[14px] px-4 py-2.5 text-[14px] text-white outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                {AUTO_ASSIGN_MODES.map((item) => (
                  <option key={item} value={item} className="bg-[#1c1c1e]">{item.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={handleAssign} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
              Распределить лиды
            </button>
          </div>
        </div>

        {(error || message) && (
          <p className="mt-5 text-[13px]" style={{ color: error ? '#ff453a' : 'var(--text-secondary)' }}>{error || message}</p>
        )}
      </section>

      {/* Leads list */}
      <section className="rounded-[24px] p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', border: '1px solid var(--border)' }}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[20px] font-semibold" style={{ letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Список лидов</h2>
          <div className="flex items-center gap-3">
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="rounded-[12px] px-3 py-2 text-[13px] text-white outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <option value="" className="bg-[#1c1c1e]">Все продукты</option>
              {PRODUCT_TYPES.map((p) => <option key={p.value} value={p.value} className="bg-[#1c1c1e]">{p.label}</option>)}
            </select>
            <span className="rounded-full px-3 py-1 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{leads.length} лидов</span>
          </div>
        </div>

        <div className="space-y-4">
          {leads.filter((l) => !filterProduct || l.productType === filterProduct).map((lead, index) => {
            const sla = getLeadSlaStatus(lead.createdAt);
            const avatarClass = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
            const slaClass = sla === 'red' ? 'bg-rose-500/15 text-rose-400' : sla === 'yellow' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400';
            const slaLabel = sla === 'red' ? 'Просрочен' : sla === 'yellow' ? 'Внимание' : 'В норме';

            return (
              <article key={lead.id} className="group rounded-[18px] p-5 transition-all duration-200 hover:scale-[1.005]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-subtle)' }}>
                <div className="grid gap-5 xl:grid-cols-[1fr_320px] xl:items-center">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${avatarClass}`}>
                      {getLeadInitials(lead.customerName)}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{lead.leadCode}</p>
                        <h3
                          className="mt-1 cursor-pointer text-[16px] font-semibold underline-offset-2 hover:underline"
                          style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
                          onClick={() => setDetailLead(lead)}
                        >{lead.customerName}</h3>
                        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Источник: {lead.sourceName || lead.sourceId}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[12px]">
                        <span className="rounded-[10px] px-3 py-1.5" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                          {lead.phone}
                        </span>
                        <span className="rounded-[10px] px-3 py-1.5" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                          {lead.email}
                        </span>
                      </div>
                      {lead.comment && (
                        <p className="line-clamp-1 rounded-[10px] px-3 py-2 text-[12px]" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                          {lead.comment}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${STATUS_STYLE[lead.status] ?? ''}`} style={!STATUS_STYLE[lead.status] ? { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' } : {}}>
                        {STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${slaClass}`}>
                        SLA: {slaLabel}
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-0.5" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                        <UserAvatar name={lead.assignedToName || '?'} avatarUrl={lead.assignedToAvatarUrl} size={20} />
                        <span className="text-[11px]">{lead.assignedToName || 'Не назначен'}</span>
                      </span>
                      {lead.productType && (
                        <span className="rounded-full px-3 py-1 text-[11px] font-medium" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>
                          {PRODUCT_TYPES.find((p) => p.value === lead.productType)?.label ?? lead.productType}
                        </span>
                      )}
                    </div>
                    {lead.followUpDate && (
                      <div className="flex items-center justify-between rounded-[10px] px-3 py-2" style={{ background: 'rgba(10,132,255,0.10)', border: '1px solid rgba(10,132,255,0.20)' }}>
                        <span className="text-[12px]" style={{ color: '#0a84ff' }}>
                          📞 {new Date(lead.followUpDate).toLocaleDateString('ru-RU')}
                          {lead.followUpNote ? ` — ${lead.followUpNote}` : ''}
                        </span>
                        <button type="button" onClick={() => removeFollowUp(lead.id)} className="ml-2 text-[11px] opacity-60 hover:opacity-100" style={{ color: '#0a84ff' }}>✕</button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => startEditLead(lead)} className="flex-1 rounded-[10px] py-2 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>
                        Изменить
                      </button>
                      <button type="button" onClick={() => openFollowUp(lead)} className="rounded-[10px] px-3 py-2 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(10,132,255,0.12)', color: '#0a84ff' }}>
                        📞
                      </button>
                      {confirmDeleteId === lead.id ? (
                        <div className="flex flex-1 gap-1">
                          <button type="button" onClick={() => removeLead(lead.id)} className="flex-1 rounded-[10px] py-2 text-[12px] font-medium" style={{ background: 'rgba(255,69,58,0.20)', color: '#ff453a' }}>
                            Да
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-[10px] py-2 text-[12px] font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmDeleteId(lead.id)} className="flex-1 rounded-[10px] py-2 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(255,69,58,0.10)', color: '#ff453a' }}>
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!leads.length && (
            <div className="rounded-[18px] p-8 text-center text-[14px]" style={{ border: '1px dashed var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
              Лидов пока нет. Нажмите «Добавить лид».
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center pt-2 pb-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-[14px] px-6 py-2.5 text-[14px] font-medium transition-all duration-150 disabled:opacity-50"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {loadingMore ? 'Загрузка...' : `Загрузить ещё (${LEADS_PAGE_SIZE})`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Modal */}
      {editingLead || isCreatingLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] p-8 shadow-2xl" style={{ background: 'rgba(28,28,30,0.96)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  {isCreatingLead ? 'Создать лид' : 'Редактировать лид'}
                </h2>
                <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>{isCreatingLead ? 'Новый лид' : editingLead?.customerName}</p>
              </div>
              <button type="button" onClick={closeEditModal} className="rounded-[10px] p-2 transition-all duration-150" style={{ color: 'var(--text-secondary)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Источник
                <select value={editSourceId ?? ''} onChange={(e) => setEditSourceId(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <option value="" className="bg-[#1c1c1e]">Выберите источник</option>
                  {sources.map((s) => <option key={s.id} value={s.id} className="bg-[#1c1c1e]">{s.name}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Статус
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as LeadWithDetails['status'])} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value} className="bg-[#1c1c1e]">{stage.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Клиент
                <ClientSearch
                  value={editCustomerName}
                  onChange={(name) => setEditCustomerName(name)}
                  placeholder="Введите имя или выберите из базы"
                  className={INPUT_CLS}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                />
              </label>
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Телефон
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
              </label>
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Email
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
              </label>
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Менеджер
                <select value={editAssignedTo ?? ''} onChange={(e) => setEditAssignedTo(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <option value="" className="bg-[#1c1c1e]">Не назначен</option>
                  {managers.map((m) => <option key={m.id} value={m.id} className="bg-[#1c1c1e]">{m.name}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Продукт
                <select value={editProductType} onChange={(e) => setEditProductType(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <option value="" className="bg-[#1c1c1e]">Не выбрано</option>
                  {PRODUCT_TYPES.map((p) => <option key={p.value} value={p.value} className="bg-[#1c1c1e]">{p.label}</option>)}
                </select>
              </label>
            </div>

            <label className="mt-5 block space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Комментарий
              <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} className={`h-24 resize-none ${INPUT_CLS}`} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
            </label>

            {error ? <p className="mt-4 text-[13px]" style={{ color: '#ff453a' }}>{error}</p> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeEditModal} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Отменить
              </button>
              <button type="button" onClick={saveLead} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LeadDetailPanel lead={detailLead} onClose={() => setDetailLead(null)} />

      {showImport && (
        <ExcelImportModal onClose={() => setShowImport(false)} onImported={loadLeads} />
      )}

      {/* Follow-up modal */}
      {followUpLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }} onClick={() => setFollowUpLead(null)}>
          <div className="w-full max-w-sm rounded-[24px] p-7 space-y-5" style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-[20px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>Напоминание о звонке</h2>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{followUpLead.customerName}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Дата звонка</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Заметка (необязательно)</label>
                <input
                  type="text"
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Уточнить цену, спросить про замер..."
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setFollowUpLead(null)} className="flex-1 rounded-[14px] py-3 text-[14px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                Отмена
              </button>
              <button onClick={saveFollowUp} disabled={!followUpDate || followUpLoading} className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #0a84ff, #409cff)', color: 'var(--text-primary)' }}>
                {followUpLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}