'use client';

import { useEffect, useState } from 'react';
import { assignLeadBatch, AUTO_ASSIGN_MODES, getLeadSlaStatus } from '@/lib/leadAssignment';
import { fetchLeads, updateLead, createLead, deleteLead, type LeadWithDetails, type LeadSource } from '@/lib/leadService';
import { LEAD_STAGES } from '@/lib/constants';
import type { AutoAssignMode } from '@/lib/leadAssignment';
import type { EmployeeSummary } from '@/lib/types';

function getLeadInitials(name: string) {
  const letters = name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(Boolean);

  return letters
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export function LeadsBoard() {
  const [mode, setMode] = useState<AutoAssignMode>('round_robin');
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [managers, setManagers] = useState<EmployeeSummary[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Загрузка лидов...');
  const [error, setError] = useState('');
  const [lastIndex, setLastIndex] = useState(0);
  const [editingLead, setEditingLead] = useState<LeadWithDetails | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [editStatus, setEditStatus] = useState<LeadWithDetails['status']>('new');
  const [editSourceId, setEditSourceId] = useState<number | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState<number | null>(null);
  const [editComment, setEditComment] = useState('');

  useEffect(() => {
    const loadLeads = async () => {
      setLoading(true);
      const response = await fetchLeads();
      if (response.error) {
        setError(response.error.message);
        setMessage('Не удалось загрузить лиды.');
        setLeads([]);
      } else {
        setLeads(response.leads);
        setSources(response.sources);
        setManagers(
          (response.users ?? [])
            .filter((user) => user.role_id === 2)
            .map((user) => ({ id: user.id, name: user.full_name, role: 'manager', score: 0 })),
        );
        setMessage('Готово. Можно распределять лиды.');
      }
      setLoading(false);
    };

    loadLeads();
  }, []);

  const assigned = leads.filter((lead) => lead.assignedTo).length;
  const unassigned = leads.length - assigned;

  const handleAssign = async () => {
    if (!managers.length) {
      setMessage('Нет доступных менеджеров для распределения.');
      return;
    }

    setLoading(true);
    setError('');

    const { leads: updatedLeads, lastIndex: nextIndex } = assignLeadBatch(leads, managers, mode, lastIndex);
    const previousById = new Map(leads.map((lead) => [lead.id, lead.assignedTo]));
    const reassigned = updatedLeads.filter((lead) => previousById.get(lead.id) !== lead.assignedTo && lead.assignedTo);

    if (reassigned.length) {
      const results = await Promise.all(
        reassigned.map((lead) => updateLead(lead.id, { assignedTo: lead.assignedTo ?? null })),
      );
      const firstError = results.find((result) => result.error)?.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }
    }

    setLeads(updatedLeads as typeof leads);
    setLastIndex(nextIndex);
    const assignedCount = updatedLeads.filter((lead, index) => !leads[index].assignedTo && lead.assignedTo).length;
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
    setError('');
  };

  const closeEditModal = () => {
    setEditingLead(null);
    setIsCreatingLead(false);
    setError('');
  };

  const saveLead = async () => {
    if (!editingLead && !isCreatingLead) return;
    const currentLead = editingLead;
    const customerName = editCustomerName.trim();
    const phone = editPhone.trim();
    const email = editEmail.trim();
    const comment = editComment.trim();

    if (!customerName) {
      setError('Укажите имя клиента.');
      return;
    }

    if (!phone && !email) {
      setError('Укажите телефон или email клиента.');
      return;
    }

    if (email && !email.includes('@')) {
      setError('Укажите корректный email.');
      return;
    }

    setError('');
    setLoading(true);

    if (isCreatingLead) {
      if (!editSourceId) {
        setError('Выберите источник лида.');
        setLoading(false);
        return;
      }

      const { lead: newLead, error: createError } = await createLead({
        sourceId: editSourceId,
        assignedTo: editAssignedTo,
        status: editStatus,
        customerName,
        phone,
        email,
        comment,
      });

      if (createError || !newLead) {
        setError(createError?.message ?? 'Ошибка создания лида');
        setLoading(false);
        return;
      }

      setLeads((current) => [
        {
          ...newLead,
          sourceName: sources.find((source) => source.id === editSourceId)?.name,
          assignedToName: editAssignedTo ? managers.find((m) => m.id === editAssignedTo)?.name ?? 'Не назначен' : 'Не назначен',
        },
        ...current,
      ]);
      setMessage('Новый лид добавлен.');
      closeEditModal();
      setLoading(false);
      return;
    }

    if (!currentLead) return;
    const { error: updateError } = await updateLead(currentLead.id, {
      status: editStatus,
      sourceId: editSourceId ?? undefined,
      customerName,
      phone,
      email,
      assignedTo: editAssignedTo,
      comment,
    });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === currentLead.id
          ? {
              ...lead,
              sourceId: editSourceId ?? lead.sourceId,
              sourceName: sources.find((source) => source.id === editSourceId)?.name ?? lead.sourceName,
              customerName,
              phone,
              email,
              status: editStatus,
              assignedTo: editAssignedTo,
              comment,
              assignedToName: editAssignedTo ? managers.find((m) => m.id === editAssignedTo)?.name ?? lead.assignedToName : 'Не назначен',
            }
          : lead,
      ),
    );
    setMessage('Лид обновлён.');
    closeEditModal();
    setLoading(false);
  };

  const removeLead = async (leadId: number) => {
    if (!confirm('Удалить лид?')) return;
    setLoading(true);
    const { error: deleteError } = await deleteLead(leadId);
    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    setLeads((current) => current.filter((lead) => lead.id !== leadId));
    setMessage('Лид удалён.');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
          <div className="text-center text-slate-300">Загрузка лидов...</div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Лиды и маркетинг</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Отслеживайте лиды, их источники, SLA и автоматическое распределение между менеджерами.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openCreateLead}
              className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Добавить лид
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl bg-slate-950/80 p-4 text-slate-300">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Всего лидов</p>
              <p className="mt-2 text-3xl font-semibold text-white">{leads.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 text-slate-300">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Назначено</p>
              <p className="mt-2 text-3xl font-semibold text-white">{assigned}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 p-4 text-slate-300">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Свободных</p>
              <p className="mt-2 text-3xl font-semibold text-white">{unassigned}</p>
            </div>
          </div>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-3xl bg-slate-950/75 p-4 text-slate-300">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Менеджеры</p>
              <p className="mt-2 text-3xl font-semibold text-white">{managers.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/75 p-4 text-slate-300">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">SLA критичные</p>
              <p className="mt-2 text-3xl font-semibold text-white">{leads.filter((lead) => getLeadSlaStatus(lead.createdAt) === 'red').length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/75 p-4 text-slate-300">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Текущий режим</p>
              <p className="mt-2 text-3xl font-semibold text-white">{mode.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <span>Режим распределения</span>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as AutoAssignMode)}
                className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              >
                {AUTO_ASSIGN_MODES.map((item) => (
                  <option key={item} value={item} className="bg-slate-950 text-slate-100">
                    {item.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleAssign}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Распределить лиды
            </button>
          </div>
        </div>
        <p className="mt-6 text-slate-400">{error || message}</p>
      </section>

      <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Список лидов</h2>
            <p className="mt-2 text-sm text-slate-400">Карточки оформлены ближе к amoCRM: контакт, канал, SLA и быстрые действия в одном блоке.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
            <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2">Контакт</span>
            <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2">Канал</span>
            <span className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2">SLA</span>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {leads.map((lead) => (
            <article key={lead.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-lg font-semibold text-sky-100">
                    {getLeadInitials(lead.customerName)}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{lead.leadCode}</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-100">{lead.customerName}</h3>
                      <p className="mt-2 text-sm text-slate-400">Источник: {lead.sourceName || lead.sourceId}</p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                      <p className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">Телефон: {lead.phone}</p>
                      <p className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2">Email: {lead.email}</p>
                    </div>
                    <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-300">
                      {lead.comment}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">{lead.status.replace('_', ' ')}</span>
                    <span
                      className={`rounded-full px-3 py-1 ${
                        lead.slaStatus === 'red'
                          ? 'bg-red-500/15 text-red-300'
                          : lead.slaStatus === 'yellow'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      SLA: {lead.slaStatus}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">Менеджер: {lead.assignedToName || 'Не назначен'}</span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => startEditLead(lead)}
                      className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLead(lead.id)}
                      className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-rose-500"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editingLead || isCreatingLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">{isCreatingLead ? 'Создать лид' : 'Редактировать лид'}</h2>
                <p className="mt-1 text-sm text-slate-400">{isCreatingLead ? 'Новый лид' : editingLead?.customerName}</p>
              </div>
              <button type="button" onClick={closeEditModal} className="text-slate-400 transition hover:text-white">
                Закрыть
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                Источник
                <select
                  value={editSourceId ?? ''}
                  onChange={(event) => setEditSourceId(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="">Выберите источник</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id} className="bg-slate-950 text-slate-100">
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                Статус
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as LeadWithDetails['status'])}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value} className="bg-slate-950 text-slate-100">
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
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
                Телефон
                <input
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                Email
                <input
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                Менеджер
                <select
                  value={editAssignedTo ?? ''}
                  onChange={(event) => setEditAssignedTo(event.target.value ? Number(event.target.value) : null)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="">Не назначен</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id} className="bg-slate-950 text-slate-100">
                      {manager.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-6 block text-sm text-slate-300">
              Комментарий
              <textarea
                value={editComment}
                onChange={(event) => setEditComment(event.target.value)}
                className="mt-2 h-28 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              />
            </label>

            {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
              >
                Отменить
              </button>
              <button
                type="button"
                onClick={saveLead}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
