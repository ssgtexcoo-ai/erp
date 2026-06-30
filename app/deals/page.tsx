'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { createDeal, deleteDeal, fetchDeals, updateDeal, type DealStage, type DealUser, type DealWithDetails } from '@/lib/dealService';

function getDaysInStage(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)));
}

function getSlaBorderClass(days: number): string {
  if (days > 7) return 'border-rose-500';
  if (days >= 4) return 'border-amber-500';
  return 'border-slate-700';
}

function getSlaTextClass(days: number): string {
  if (days > 7) return 'text-rose-400';
  if (days >= 4) return 'text-amber-400';
  return 'text-slate-500';
}

function getSlaBadgeClass(days: number): string {
  if (days > 7) return 'bg-rose-500/15 text-rose-300';
  if (days >= 4) return 'bg-amber-500/15 text-amber-300';
  return 'bg-slate-800 text-slate-400';
}

export default function DealsPage() {
  const [deals, setDeals] = useState<DealWithDetails[]>([]);
  const [users, setUsers] = useState<DealUser[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetchDeals();
      if (response.error) {
        setError(response.error.message);
      } else {
        setDeals(response.deals);
        setUsers(response.users ?? []);
        setStages(response.stages ?? []);
      }
      setLoading(false);
    };
    load();
  }, []);

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
    if (!confirm('Удалить сделку?')) return;
    const { error: err } = await deleteDeal(dealId);
    if (err) { setError(err.message); return; }
    setDeals((current) => current.filter((d) => d.id !== dealId));
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
    setDragDealId(null);
    await updateDeal(dragDealId, { stageId });
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
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="px-6 py-8 border-b border-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">CRM · Воронка продаж</h1>
              <p className="mt-1 text-sm text-slate-400">Pipeline сделок</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              + Добавить сделку
            </button>
          </div>

          {/* Stats panel */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Всего сделок', value: deals.length },
              { label: 'Сумма воронки', value: `${totalVolume.toLocaleString('ru-RU')} ₸` },
              {
                label: 'В стадии КП',
                value: deals.filter((d) =>
                  stages.find((s) => s.id === d.stageId)?.name?.toLowerCase().includes('кп') ||
                  stages.find((s) => s.id === d.stageId)?.name?.toLowerCase().includes('коммерческое')
                ).length,
              },
              { label: 'Стадий', value: stages.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{stat.label}</p>
                <p className="mt-1.5 text-xl font-semibold text-white tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Загрузка...</div>
        ) : error ? (
          <div className="px-6 pt-6 text-rose-400">{error}</div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-500">Стадии сделок не настроены</div>
        ) : (
          <div className="overflow-x-auto px-6 py-6">
            <div className="flex gap-3" style={{ minWidth: `${stages.length * 292}px` }}>
              {dealsByStage.map(({ stage, items }) => {
                const columnTotal = items.reduce((sum, d) => sum + d.amount, 0);
                const isOver = dragOverStageId === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={`flex w-72 flex-shrink-0 flex-col rounded-2xl border transition-all duration-150 ${isOver ? 'border-sky-500/60 bg-sky-950/20 shadow-lg shadow-sky-500/10' : 'border-slate-800 bg-slate-900/40'}`}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <div className="px-4 pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">{stage.name}</p>
                        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          {items.length}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-sky-400">
                        {columnTotal > 0 ? `${columnTotal.toLocaleString('ru-RU')} ₸` : '—'}
                      </p>
                      <div className="mt-2 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-sky-500/60" style={{ width: `${stage.progress_percent}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 px-3 pb-3 flex-1 min-h-[160px]">
                      {items.length === 0 ? (
                        <div className={`flex flex-1 items-center justify-center rounded-xl border border-dashed text-xs transition-colors ${isOver ? 'border-sky-500/40 text-sky-400' : 'border-slate-700/50 text-slate-600'}`}>
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
                              onClick={() => openEdit(deal)}
                              className={`group relative rounded-2xl border bg-slate-900/80 px-4 py-3 cursor-pointer select-none transition-all hover:bg-slate-900 hover:shadow-md ${getSlaBorderClass(days)} ${isDragging ? 'opacity-30 scale-95' : 'opacity-100'}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-100 leading-snug">{deal.customerName}</p>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${getSlaBadgeClass(days)}`}>
                                  {days}д
                                </span>
                              </div>

                              <p className="mt-2 text-base font-bold text-sky-400 tabular-nums">
                                {deal.amount.toLocaleString('ru-RU')} ₸
                              </p>

                              <div className="mt-2.5 flex items-center gap-2">
                                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-slate-300">
                                  {(deal.assignedToName ?? '?').charAt(0).toUpperCase()}
                                </div>
                                <p className="truncate text-xs text-slate-400">{deal.assignedToName ?? 'Не назначен'}</p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeDeal(deal.id); }}
                                className="absolute right-2 top-2 hidden rounded-lg p-1 text-slate-600 transition hover:bg-rose-500/20 hover:text-rose-400 group-hover:flex"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-slate-800/60 px-4 py-2.5">
                      <p className="text-[10px] tabular-nums text-slate-500">
                        {items.length === 0 ? 'Нет сделок' : `${items.length} ${items.length === 1 ? 'сделка' : items.length < 5 ? 'сделки' : 'сделок'} · ${columnTotal.toLocaleString('ru-RU')} ₸`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(editingDeal || isCreatingDeal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl shadow-slate-950/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{isCreatingDeal ? 'Новая сделка' : 'Редактировать сделку'}</h2>
                  {editingDeal && <p className="mt-1 text-sm text-slate-400">{editingDeal.customerName}</p>}
                </div>
                <button type="button" onClick={closeEditor} className="rounded-lg p-1 text-slate-400 transition hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 4l12 12M16 4l-12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Клиент
                  <input
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Сумма (₸)
                  <input
                    type="number"
                    min="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Стадия
                  <select
                    value={editStageId ?? ''}
                    onChange={(e) => setEditStageId(e.target.value ? Number(e.target.value) : null)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                  >
                    <option value="">Выберите стадию</option>
                    {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  Ответственный
                  <select
                    value={editAssignedTo ?? ''}
                    onChange={(e) => setEditAssignedTo(e.target.value ? Number(e.target.value) : null)}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-500"
                  >
                    <option value="">Не назначен</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </label>
              </div>

              {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEditor} className="rounded-2xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800">
                  Отменить
                </button>
                <button type="button" onClick={saveDeal} disabled={saving} className="rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}