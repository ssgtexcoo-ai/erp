'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { createDeal, deleteDeal, fetchDeals, updateDeal, fetchDealDetail, DEALS_PAGE_SIZE, type DealStage, type DealUser, type DealWithDetails, type DealDetail } from '@/lib/dealService';
import { UserAvatar } from '@/components/user-avatar';
import { notifyNewDeal, notifyDealStageChanged } from '@/lib/telegram';
import { logActivity, fetchEntityActivity, ACTION_LABEL, type ActivityLog } from '@/lib/activityService';
import { useAuth } from '@/components/auth-context';
import { exportDealsToExcel } from '@/lib/exportService';
import { subscribeToTable } from '@/lib/realtimeService';
import { ClientSearch } from '@/components/client-search';

function getDaysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)));
}

function getSlaBorderClass(days: number): string {
  if (days > 7) return 'border-rose-500/70';
  if (days >= 4) return 'border-yellow-500/60';
  return 'border-slate-700/60';
}

function getSlaBadgeClass(days: number): string {
  if (days > 7) return 'bg-rose-500/15 text-rose-300';
  if (days >= 4) return 'bg-yellow-500/15 text-yellow-300';
  return 'bg-slate-800 text-slate-400';
}

export default function DealsPage() {
  const { user: authUser } = useAuth();
  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [users, setUsers] = useState<DealUser[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [editingDeal, setEditingDeal] = useState<DealWithDetails | null>(null);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editStageId, setEditStageId] = useState<number | null>(null);
  const [editAssignedTo, setEditAssignedTo] = useState<number | null>(null);
  const [dragDealId, setDragDealId] = useState<number | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Detail panel
  const [selectedDeal, setSelectedDeal] = useState<DealWithDetails | null>(null);
  const [dealDetail, setDealDetail] = useState<DealDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dealHistory, setDealHistory] = useState<ActivityLog[]>([]);
  const [historyTab, setHistoryTab] = useState<'info' | 'history'>('info');

  const openDetail = async (deal: DealWithDetails) => {
    setSelectedDeal(deal);
    setDealDetail(null);
    setDealHistory([]);
    setHistoryTab('info');
    setDetailLoading(true);
    const [{ detail }, { logs }] = await Promise.all([
      fetchDealDetail(deal),
      fetchEntityActivity('deal', deal.id),
    ]);
    setDealDetail(detail);
    setDealHistory(logs);
    setDetailLoading(false);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPage(0);
      const response = await fetchDeals(0);
      if (response.error) {
        setError(response.error.message);
      } else {
        setDeals(response.deals);
        setUsers(response.users ?? []);
        setStages(response.stages ?? []);
        setHasMore(response.hasMore ?? false);
      }
      setLoading(false);
    };
    load();
    return subscribeToTable('deals', load);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMoreDeals = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    const response = await fetchDeals(nextPage);
    if (!response.error) {
      setDeals((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        return [...prev, ...response.deals.filter((d) => !existingIds.has(d.id))];
      });
      setHasMore(response.hasMore ?? false);
      setPage(nextPage);
    }
    setLoadingMore(false);
  };

  const dealsByStage = stages.map((stage) => ({
    stage,
    items: deals.filter((deal) => deal.stageId === stage.id),
  }));

  const totalVolume = deals.reduce((sum, deal) => sum + deal.amount, 0);

  const openCreate = () => {
    setEditingDeal(null);
    setIsCreatingDeal(true);
    setEditCustomerName('');
    setEditAmount('');
    setEditStageId(stages[0]?.id ?? null);
    setEditAssignedTo(null);
    setError('');
  };

  const openEdit = (deal: DealWithDetails) => {
    setEditingDeal(deal);
    setIsCreatingDeal(false);
    setEditCustomerName(deal.customerName);
    setEditAmount(String(deal.amount));
    setEditStageId(deal.stageId ?? stages.find((s) => s.name === deal.stage)?.id ?? null);
    setEditAssignedTo(deal.assignedTo ?? null);
    setError('');
  };

  const closeEditor = () => {
    setEditingDeal(null);
    setIsCreatingDeal(false);
    setError('');
  };

  const saveDeal = async () => {
    const customerName = editCustomerName.trim();
    const amount = Number(editAmount);
    if (!customerName) { setError('Укажите имя клиента.'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { setError('Сумма должна быть больше 0.'); return; }
    if (!editStageId) { setError('Выберите стадию.'); return; }

    setSaving(true);
    setError('');

    if (isCreatingDeal) {
      const { deal: newDeal, error: err } = await createDeal({ customerName, amount, stageId: editStageId, assignedTo: editAssignedTo });
      if (err || !newDeal) { setError(err?.message ?? 'Ошибка создания'); setSaving(false); return; }
      const stageName = stages.find((s) => s.id === editStageId)?.name ?? '';
      const managerName = editAssignedTo ? users.find((u) => u.id === editAssignedTo)?.full_name ?? '' : 'Не назначен';
      setDeals((current) => [{ ...newDeal, stage: stageName, progressPercent: stages.find((s) => s.id === editStageId)?.progress_percent ?? 0, assignedToName: managerName }, ...current]);
      notifyNewDeal(customerName, amount, stageName, managerName);
      if (authUser?.id) logActivity({ userId: authUser.id, action: 'created_deal', entity: 'deal', entityId: newDeal.id, payload: { customerName, amount } });
      closeEditor();
      setSaving(false);
      return;
    }

    if (!editingDeal) return;
    const { error: err } = await updateDeal(editingDeal.id, { customerName, amount, stageId: editStageId, assignedTo: editAssignedTo });
    if (err) { setError(err.message); setSaving(false); return; }
    setDeals((current) => current.map((d) =>
      d.id === editingDeal.id
        ? {
            ...d,
            customerName,
            amount,
            stageId: editStageId,
            stage: stages.find((s) => s.id === editStageId)?.name ?? d.stage,
            progressPercent: stages.find((s) => s.id === editStageId)?.progress_percent ?? d.progressPercent,
            assignedTo: editAssignedTo,
            assignedToName: editAssignedTo ? users.find((u) => u.id === editAssignedTo)?.full_name ?? '' : 'Не назначен',
          }
        : d,
    ));
    closeEditor();
    setSaving(false);
  };

  const removeDeal = async (dealId: number) => {
    const { error: err } = await deleteDeal(dealId);
    if (err) { setError(err.message); return; }
    setDeals((current) => current.filter((d) => d.id !== dealId));
    setConfirmDeleteId(null);
  };

  const handleDragStart = (e: React.DragEvent, dealId: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStageId(stageId);
  };

  const handleDrop = async (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    setDragOverStageId(null);
    if (!dragDealId) return;
    const deal = deals.find((d) => d.id === dragDealId);
    if (!deal || deal.stageId === stageId) { setDragDealId(null); return; }
    setDeals((current) => current.map((d) =>
      d.id === dragDealId
        ? { ...d, stageId, stage: stages.find((s) => s.id === stageId)?.name ?? d.stage, progressPercent: stages.find((s) => s.id === stageId)?.progress_percent ?? d.progressPercent, updatedAt: new Date().toISOString() }
        : d,
    ));
    const newStageName = stages.find((s) => s.id === stageId)?.name ?? '';
    notifyDealStageChanged(deal.customerName, deal.stage, newStageName, deal.amount);
    if (authUser?.id) logActivity({ userId: authUser.id, action: 'moved_deal', entity: 'deal', entityId: deal.id, payload: { customerName: deal.customerName, fromStage: deal.stage, toStage: newStageName } });
    setDragDealId(null);
    const result = await updateDeal(dragDealId, { stageId });
    if (result.error) {
      setError(result.error.message);
      // revert optimistic update
      setDeals((current) => current.map((d) => d.id === dragDealId ? { ...d, stageId: deal.stageId, stage: deal.stage } : d));
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStageId(null);
    }
  };

  const handleDragEnd = () => {
    setDragDealId(null);
    setDragOverStageId(null);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.deals}>
      <main className="min-h-screen text-white">
        <div className="px-4 py-5 sm:px-6 sm:py-8" style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[26px] font-bold" style={{ letterSpacing: '-0.03em' }}>CRM · Воронка продаж</h1>
              <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                {deals.length} сделок · {totalVolume.toLocaleString('ru-RU')} ₸
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportDealsToExcel(deals)}
                disabled={deals.length === 0}
                className="flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-[14px] font-semibold transition-all duration-150 disabled:opacity-40"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#30d158'; e.currentTarget.style.color = '#30d158'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Excel
              </button>
              <button type="button" onClick={openCreate} className="rounded-[14px] px-5 py-2.5 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#0a84ff', color: 'var(--text-primary)' }}>
                + Добавить сделку
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Загрузка...</div>
        ) : error ? (
          <div className="px-6 pt-6 text-[14px]" style={{ color: '#ff453a' }}>{error}</div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Стадии сделок не настроены</div>
        ) : (
          <div className="overflow-x-auto px-6 py-6">
            <div className="flex gap-3" style={{ minWidth: `${stages.length * 292}px` }}>
              {dealsByStage.map(({ stage, items }) => {
                const columnTotal = items.reduce((sum, d) => sum + d.amount, 0);
                const isOver = dragOverStageId === stage.id;

                return (
                  <div
                    key={stage.id}
                    className="flex w-72 flex-shrink-0 flex-col rounded-[20px] transition-all duration-150"
                    style={
                      isOver
                        ? { background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.35)', outline: '1px solid rgba(10,132,255,0.20)' }
                        : { background: 'var(--bg-card)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--border)' }
                    }
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{stage.name}</p>
                        <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{items.length} сделок</p>
                      </div>
                      <div className="flex h-6 w-12 items-center justify-end">
                        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                          <div className="h-full rounded-full" style={{ width: `${stage.progress_percent}%`, background: '#0a84ff' }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 px-3 pb-3 flex-1 min-h-[160px]">
                      {items.length === 0 ? (
                        <div
                          className="flex flex-1 items-center justify-center rounded-[12px] border border-dashed text-[12px] transition-colors"
                          style={isOver ? { borderColor: 'rgba(10,132,255,0.40)', color: '#0a84ff' } : { borderColor: 'var(--bg-input)', color: 'rgba(235,235,245,0.25)' }}
                        >
                          Нет сделок
                        </div>
                      ) : (
                        items.map((deal) => {
                          const days = getDaysInStage(deal.updatedAt);
                          const isDragging = dragDealId === deal.id;

                          return (
                            <div
                              key={deal.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, deal.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => openDetail(deal)}
                              className={`group relative rounded-[14px] px-4 py-3 cursor-pointer select-none transition-all duration-150 hover:scale-[1.02] border-t-2 ${getSlaBorderClass(days)} ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'}`}
                              style={{ background: 'var(--bg-input)', borderLeft: '1px solid var(--bg-subtle)', borderRight: '1px solid var(--bg-subtle)', borderBottom: '1px solid var(--bg-subtle)' }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{deal.customerName}</p>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${getSlaBadgeClass(days)}`}>
                                  {days}д
                                </span>
                              </div>

                              <p className="mt-2 text-[15px] font-bold tabular-nums" style={{ color: '#0a84ff' }}>
                                {deal.amount.toLocaleString('ru-RU')} ₸
                              </p>

                              <div className="mt-2.5 flex items-center gap-2">
                                <UserAvatar name={deal.assignedToName ?? '?'} avatarUrl={deal.assignedToAvatarUrl} size={20} />
                                <p className="truncate text-[12px]" style={{ color: 'var(--text-secondary)' }}>{deal.assignedToName ?? 'Не назначен'}</p>
                              </div>

                              {confirmDeleteId === deal.id ? (
                                <div className="absolute right-2 top-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <button type="button" onClick={() => removeDeal(deal.id)}
                                    className="rounded px-2 py-0.5 text-[11px] font-medium"
                                    style={{ background: 'rgba(255,69,58,0.20)', color: '#ff453a' }}>
                                    Да
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteId(null)}
                                    className="rounded px-2 py-0.5 text-[11px] font-medium"
                                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                                    Нет
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(deal.id); }}
                                  className="absolute right-2 top-2 hidden rounded-lg p-1 transition hover:bg-[rgba(255,69,58,0.15)] hover:text-[#ff453a] group-hover:flex"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="px-4 py-3" style={{ borderTop: '1px solid var(--bg-subtle)' }}>
                      <p className="text-[13px] font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {columnTotal.toLocaleString('ru-RU')} ₸
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center py-4">
                <button
                  type="button"
                  onClick={loadMoreDeals}
                  disabled={loadingMore}
                  className="rounded-[14px] px-6 py-2.5 text-[14px] font-medium transition-all duration-150 disabled:opacity-50"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  {loadingMore ? 'Загрузка...' : `Загрузить ещё (${DEALS_PAGE_SIZE})`}
                </button>
              </div>
            )}
          </div>
        )}

        {(editingDeal || isCreatingDeal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-2xl rounded-[28px] p-8 shadow-2xl" style={{ background: 'rgba(28,28,30,0.96)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{isCreatingDeal ? 'Новая сделка' : 'Редактировать сделку'}</h2>
                  {editingDeal && <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>{editingDeal.customerName}</p>}
                </div>
                <button type="button" onClick={closeEditor} className="rounded-[10px] p-2 transition-all duration-150" style={{ color: 'var(--text-secondary)' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 4l12 12M16 4l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Клиент
                  <ClientSearch
                    value={editCustomerName}
                    onChange={(name) => setEditCustomerName(name)}
                    placeholder="Введите имя или выберите из базы"
                    className="rounded-[14px] px-4 py-3 text-[15px] text-white outline-none w-full"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                  />
                </label>
                <label className="flex flex-col gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Сумма (₸)
                  <input type="number" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="rounded-[14px] px-4 py-3 text-[15px] text-white outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
                <label className="flex flex-col gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Стадия
                  <select value={editStageId ?? ''} onChange={(e) => setEditStageId(e.target.value ? Number(e.target.value) : null)} className="rounded-[14px] px-4 py-3 text-[15px] text-white outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Выберите стадию</option>
                    {stages.map((s) => <option key={s.id} value={s.id} className="bg-[#1c1c1e]">{s.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Ответственный
                  <select value={editAssignedTo ?? ''} onChange={(e) => setEditAssignedTo(e.target.value ? Number(e.target.value) : null)} className="rounded-[14px] px-4 py-3 text-[15px] text-white outline-none" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не назначен</option>
                    {users.map((u) => <option key={u.id} value={u.id} className="bg-[#1c1c1e]">{u.full_name}</option>)}
                  </select>
                </label>
              </div>

              {error && <p className="mt-4 text-[13px]" style={{ color: '#ff453a' }}>{error}</p>}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEditor} className="rounded-[14px] px-5 py-2.5 text-[14px] font-semibold transition-all duration-150" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Отменить
                </button>
                <button type="button" onClick={saveDeal} disabled={saving} className="rounded-[14px] px-5 py-2.5 text-[14px] font-semibold transition-all duration-150 hover:opacity-90 disabled:opacity-40" style={{ background: '#0a84ff', color: 'var(--text-primary)' }}>
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Deal Detail Drawer */}
      {selectedDeal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedDeal(null)}
          />

          {/* Panel */}
          <aside
            className="fixed right-0 top-0 z-50 flex h-full w-full sm:w-[420px] flex-col overflow-hidden"
            style={{ background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border)', boxShadow: '-24px 0 64px rgba(0,0,0,0.35)' }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Сделка #{selectedDeal.id}</p>
                <h2 className="mt-1 text-[20px] font-bold leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{selectedDeal.customerName}</h2>
                <p className="mt-1 text-[22px] font-bold tabular-nums" style={{ color: '#0a84ff' }}>{selectedDeal.amount.toLocaleString('ru-RU')} ₸</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeal(null)}
                className="shrink-0 rounded-[10px] p-2 transition-all duration-150"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Stage stepper */}
            <div className="shrink-0 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Воронка</p>
              <div className="flex items-center gap-0">
                {stages.map((s, i) => {
                  const isActive = s.id === selectedDeal.stageId;
                  const isPast = stages.findIndex((st) => st.id === selectedDeal.stageId) > i;
                  return (
                    <div key={s.id} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className="h-2 w-full rounded-full transition-all"
                          style={{ background: isActive ? '#0a84ff' : isPast ? 'rgba(10,132,255,0.35)' : 'var(--bg-subtle)' }}
                        />
                        <span className="text-[10px] font-medium text-center leading-tight" style={{ color: isActive ? '#0a84ff' : isPast ? 'rgba(10,132,255,0.6)' : 'var(--text-tertiary)' }}>
                          {s.name}
                        </span>
                      </div>
                      {i < stages.length - 1 && <div className="h-px w-2 shrink-0" style={{ background: 'var(--border)' }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[14px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Ответственный</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <UserAvatar name={selectedDeal.assignedToName ?? '?'} avatarUrl={selectedDeal.assignedToAvatarUrl} size={22} />
                    <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{selectedDeal.assignedToName ?? 'Не назначен'}</span>
                  </div>
                </div>
                <div className="rounded-[14px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>В стадии</p>
                  <p className="mt-1.5 text-[20px] font-bold tabular-nums" style={{ color: getDaysInStage(selectedDeal.updatedAt) > 7 ? '#ff453a' : getDaysInStage(selectedDeal.updatedAt) >= 4 ? '#ff9f0a' : 'var(--text-primary)' }}>
                    {getDaysInStage(selectedDeal.updatedAt)}д
                  </p>
                </div>
                <div className="rounded-[14px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Создана</p>
                  <p className="mt-1.5 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {new Date(selectedDeal.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="rounded-[14px] p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Прогресс</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${selectedDeal.progressPercent ?? 0}%`, background: '#0a84ff' }} />
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: '#0a84ff' }}>{selectedDeal.progressPercent ?? 0}%</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 rounded-[12px] p-1" style={{ background: 'var(--bg-input)' }}>
                {(['info', 'history'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHistoryTab(tab)}
                    className="flex-1 rounded-[9px] py-1.5 text-[13px] font-medium transition-all duration-150"
                    style={{
                      background: historyTab === tab ? 'var(--bg-card)' : 'transparent',
                      color: historyTab === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {tab === 'info' ? 'Информация' : `История${dealHistory.length ? ` (${dealHistory.length})` : ''}`}
                  </button>
                ))}
              </div>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#0a84ff' }} />
                </div>
              ) : historyTab === 'history' ? (
                <div className="space-y-1">
                  {dealHistory.length === 0 ? (
                    <p className="py-8 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>История пуста</p>
                  ) : dealHistory.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 rounded-[12px] px-3 py-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                        {log.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                          <span className="font-semibold">{log.userName}</span>
                          {' '}<span style={{ color: 'var(--text-secondary)' }}>{ACTION_LABEL[log.action] ?? log.action}</span>
                        </p>
                        {log.payload && typeof log.payload === 'object' && 'from' in log.payload && (
                          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                            {String(log.payload.from)} → {String(log.payload.to)}
                          </p>
                        )}
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {new Date(log.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : dealDetail ? (
                <>
                  {/* Client */}
                  {dealDetail.client && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Клиент</p>
                      <div className="rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{dealDetail.client.name}</p>
                        {dealDetail.client.phone && <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{dealDetail.client.phone}</p>}
                        {dealDetail.client.email && <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{dealDetail.client.email}</p>}
                      </div>
                    </div>
                  )}

                  {/* Lead */}
                  {dealDetail.lead && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Лид</p>
                      <div className="flex items-center gap-3 rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4 shrink-0" style={{ color: '#0a84ff' }}>
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <div>
                          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{dealDetail.lead.leadCode}</p>
                          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{dealDetail.lead.status}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Projects */}
                  {dealDetail.projects.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Объекты ({dealDetail.projects.length})</p>
                      <div className="space-y-2">
                        {dealDetail.projects.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-[12px] px-4 py-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div>
                              <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{p.budget.toLocaleString('ru-RU')} ₸</p>
                            </div>
                            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {dealDetail.tasks.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Задачи ({dealDetail.tasks.length})</p>
                      <div className="space-y-2">
                        {dealDetail.tasks.map((t) => (
                          <div key={t.id} className="rounded-[12px] px-4 py-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                  background: t.status === 'Выполнено' ? 'rgba(48,209,88,0.15)' : t.status === 'В работе' ? 'rgba(10,132,255,0.15)' : 'var(--bg-subtle)',
                                  color: t.status === 'Выполнено' ? '#30d158' : t.status === 'В работе' ? '#0a84ff' : 'var(--text-secondary)',
                                }}
                              >
                                {t.status}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <UserAvatar name={t.assignedToName} avatarUrl={null} size={16} />
                              <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{t.assignedToName}</span>
                              {t.dueDate && (
                                <span className="ml-auto text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                  до {new Date(t.dueDate).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!dealDetail.client && !dealDetail.lead && dealDetail.projects.length === 0 && dealDetail.tasks.length === 0 && (
                    <p className="text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Связанных данных нет</p>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="shrink-0 flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => { setSelectedDeal(null); openEdit(selectedDeal); }}
                className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90"
                style={{ background: '#0a84ff', color: '#fff' }}
              >
                Редактировать
              </button>
              <button
                type="button"
                onClick={() => { setConfirmDeleteId(selectedDeal.id); }}
                className="rounded-[14px] px-4 py-3 text-[14px] font-semibold transition-all duration-150"
                style={{ background: 'rgba(255,69,58,0.12)', color: '#ff453a' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,69,58,0.22)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,69,58,0.12)'; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-4 w-4">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>

            {/* Confirm delete inside panel */}
            {confirmDeleteId === selectedDeal.id && (
              <div className="absolute inset-0 flex items-end justify-center pb-6" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                <div className="w-[340px] rounded-[20px] p-6 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Удалить сделку?</p>
                  <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{selectedDeal.customerName}</p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-[12px] py-2.5 text-[14px] font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Отмена</button>
                    <button type="button" onClick={async () => { await removeDeal(selectedDeal.id); setSelectedDeal(null); }} className="flex-1 rounded-[12px] py-2.5 text-[14px] font-semibold" style={{ background: 'rgba(255,69,58,0.22)', color: '#ff453a' }}>Удалить</button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </ProtectedPage>
  );
}