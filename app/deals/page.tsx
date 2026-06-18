'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { createDeal, deleteDeal, fetchDeals, updateDeal, type DealStage, type DealUser, type DealWithDetails } from '@/lib/dealService';

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

  useEffect(() => {
    const loadDeals = async () => {
      setLoading(true);
      const response = await fetchDeals();
      if (response.error) {
        setError(response.error.message);
        setDeals([]);
        setUsers([]);
        setStages([]);
      } else {
        setDeals(response.deals);
        setUsers(response.users ?? []);
        setStages(response.stages ?? []);
        setError('');
      }
      setLoading(false);
    };

    loadDeals();
  }, []);

  const totalVolume = deals.reduce((sum, deal) => sum + deal.amount, 0);
  const inProposal = deals.filter((deal) => {
    const stage = deal.stage.toLowerCase();
    return stage === 'proposal_sent' || stage.includes('кп') || stage.includes('proposal');
  }).length;

  const openCreateDeal = () => {
    setEditingDeal(null);
    setIsCreatingDeal(true);
    setEditCustomerName('');
    setEditAmount('');
    setEditStageId(stages[0]?.id ?? null);
    setEditAssignedTo(null);
    setError('');
  };

  const openEditDeal = (deal: DealWithDetails) => {
    setEditingDeal(deal);
    setIsCreatingDeal(false);
    setEditCustomerName(deal.customerName);
    setEditAmount(String(deal.amount));
    setEditStageId(deal.stageId ?? stages.find((stage) => stage.name === deal.stage)?.id ?? null);
    setEditAssignedTo(deal.assignedTo ?? null);
    setError('');
  };

  const closeEditor = () => {
    setEditingDeal(null);
    setIsCreatingDeal(false);
    setError('');
  };

  const saveDeal = async () => {
    if (!editingDeal && !isCreatingDeal) return;

    const customerName = editCustomerName.trim();
    const amount = Number(editAmount);

    if (!customerName) {
      setError('Укажите имя клиента.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Сумма сделки должна быть больше 0.');
      return;
    }

    if (!editStageId) {
      setError('Выберите стадию сделки.');
      return;
    }

    setLoading(true);
    setError('');

    if (isCreatingDeal) {
      const { deal: newDeal, error: createError } = await createDeal({
        customerName,
        amount,
        stageId: editStageId,
        assignedTo: editAssignedTo,
      });

      if (createError || !newDeal) {
        setError(createError?.message ?? 'Ошибка создания сделки');
        setLoading(false);
        return;
      }

      setDeals((current) => [
        {
          ...newDeal,
          stage: stages.find((stage) => stage.id === editStageId)?.name ?? 'Не определено',
          progressPercent: stages.find((stage) => stage.id === editStageId)?.progress_percent ?? newDeal.progressPercent,
          assignedToName: editAssignedTo ? users.find((user) => user.id === editAssignedTo)?.full_name ?? 'Не назначен' : 'Не назначен',
        },
        ...current,
      ]);
      closeEditor();
      setLoading(false);
      return;
    }

    const { error: updateError } = await updateDeal(editingDeal.id, {
      customerName,
      amount,
      stageId: editStageId,
      assignedTo: editAssignedTo,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDeals((current) =>
      current.map((deal) =>
        deal.id === editingDeal.id
          ? {
              ...deal,
              customerName,
              amount,
              stageId: editStageId,
              stage: stages.find((stage) => stage.id === editStageId)?.name ?? deal.stage,
              progressPercent: stages.find((stage) => stage.id === editStageId)?.progress_percent ?? deal.progressPercent,
              assignedTo: editAssignedTo,
              assignedToName: editAssignedTo ? users.find((user) => user.id === editAssignedTo)?.full_name ?? 'Не назначен' : 'Не назначен',
            }
          : deal,
      ),
    );

    closeEditor();
    setLoading(false);
  };

  const removeDeal = async (dealId: number) => {
    if (!confirm('Удалить сделку?')) return;
    setLoading(true);
    const { error: deleteError } = await deleteDeal(dealId);
    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    setDeals((current) => current.filter((deal) => deal.id !== dealId));
    setLoading(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.deals}>
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">CRM сделки</h1>
                <p className="mt-3 text-slate-400">Управление воронкой продаж и видимость прогресса по каждому клиенту.</p>
              </div>
              <button
                type="button"
                onClick={openCreateDeal}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Добавить сделку
              </button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Активные сделки</p>
              <p className="mt-4 text-3xl font-semibold">{deals.length}</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Сумма воронки</p>
              <p className="mt-4 text-3xl font-semibold">{totalVolume.toLocaleString('ru-RU')} ₸</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Сделок в стадии КП</p>
              <p className="mt-4 text-3xl font-semibold">{inProposal}</p>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8">
            <h2 className="text-xl font-semibold">Список сделок</h2>
            {loading ? (
              <div className="mt-6 text-slate-300">Загрузка сделок...</div>
            ) : error ? (
              <div className="mt-6 text-red-400">{error}</div>
            ) : (
              <div className="mt-6 space-y-4">
                {deals.map((deal) => (
                  <article key={deal.id} className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-100">{deal.customerName}</h3>
                        <p className="mt-2 text-sm text-slate-400">Сумма: {deal.amount.toLocaleString('ru-RU')} ₸</p>
                      </div>
                      <div className="flex flex-col gap-3 items-start sm:items-end">
                        <div className="text-right">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Стадия сделки</p>
                          <p className="mt-2 text-lg font-semibold text-slate-100">{deal.stage}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditDeal(deal)}
                            className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDeal(deal.id)}
                            className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-rose-500"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 space-y-3">
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${deal.progressPercent}%` }} />
                      </div>
                      <p className="text-sm text-slate-400">Прогресс: {deal.progressPercent}%</p>
                      <p className="text-sm text-slate-400">Ответственный: {deal.assignedToName}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {editingDeal || isCreatingDeal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
              <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{isCreatingDeal ? 'Создать сделку' : 'Редактировать сделку'}</h2>
                    <p className="mt-1 text-sm text-slate-400">{isCreatingDeal ? 'Новая сделка' : editingDeal?.customerName}</p>
                  </div>
                  <button type="button" onClick={closeEditor} className="text-slate-400 transition hover:text-white">
                    Закрыть
                  </button>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    Клиент
                    <input
                      value={editCustomerName}
                      onChange={(event) => setEditCustomerName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    Сумма
                    <input
                      type="number"
                      min="0"
                      value={editAmount}
                      onChange={(event) => setEditAmount(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    Стадия
                    <select
                      value={editStageId ?? ''}
                      onChange={(event) => setEditStageId(event.target.value ? Number(event.target.value) : null)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    >
                      <option value="">Выберите стадию</option>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id} className="bg-slate-950 text-slate-100">
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    Ответственный
                    <select
                      value={editAssignedTo ?? ''}
                      onChange={(event) => setEditAssignedTo(event.target.value ? Number(event.target.value) : null)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    >
                      <option value="">Не назначен</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id} className="bg-slate-950 text-slate-100">
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
                  >
                    Отменить
                  </button>
                  <button
                    type="button"
                    onClick={saveDeal}
                    className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedPage>
  );
}
