import { supabase } from '@/lib/supabaseClient';
import type { Deal } from '@/lib/types';
import { notifyNewDeal, notifyDealStageChanged } from '@/lib/telegram';
import { isTelegramEnabled } from '@/lib/notifPrefs';

export interface DealWithDetails extends Deal {
  stageId?: number | null;
  clientId?: number | null;
  assignedToName?: string;
  assignedToAvatarUrl?: string | null;
}

export interface DealStage {
  id: number;
  name: string;
  progress_percent: number;
}

export interface DealUser {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

export const DEALS_PAGE_SIZE = 50;

export async function fetchDeals(page = 0) {
  const from = page * DEALS_PAGE_SIZE;
  const to   = from + DEALS_PAGE_SIZE - 1;

  const [{ data: deals, error: dealsError }, { data: users, error: usersError }, { data: stages, error: stagesError }] =
    await Promise.all([
      supabase.from('deals').select('*').order('created_at', { ascending: false }).range(from, to),
      supabase.from('users').select('id, full_name, avatar_url'),
      supabase.from('deal_stages').select('id, name, progress_percent'),
    ]);

  if (dealsError || usersError || stagesError) {
    return {
      deals: [] as DealWithDetails[],
      users: [] as DealUser[],
      stages: [] as DealStage[],
      hasMore: false,
      error: dealsError || usersError || stagesError,
    };
  }

  const hasMore = (deals ?? []).length === DEALS_PAGE_SIZE;

  const userNameMap = new Map<number, string>();
  const userAvatarMap = new Map<number, string | null>();
  ((users ?? []) as Array<{ id: number; full_name: string; avatar_url?: string | null }>).forEach((u) => {
    userNameMap.set(u.id, u.full_name);
    userAvatarMap.set(u.id, u.avatar_url ?? null);
  });
  const stageMap = new Map<number, string>();
  ((stages ?? []) as Array<{ id: number; name: string }>).forEach((s) => stageMap.set(s.id, s.name));

  const enrichedDeals: DealWithDetails[] = (deals ?? []).map((row: any) => ({
    id: row.id,
    leadId: row.lead_id,
    clientId: row.client_id ?? null,
    customerName: row.customer_name,
    amount: Number(row.amount),
    stageId: row.stage_id,
    stage: stageMap.get(row.stage_id) ?? row.stage ?? 'Не определено',
    progressPercent: row.progress_percent,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedToName: row.assigned_to ? userNameMap.get(row.assigned_to) ?? `#${row.assigned_to}` : 'Не назначен',
    assignedToAvatarUrl: row.assigned_to ? (userAvatarMap.get(row.assigned_to) ?? null) : null,
  }));

  return {
    deals: enrichedDeals,
    users: (users ?? []) as DealUser[],
    stages: (stages ?? []) as DealStage[],
    hasMore,
    error: null,
  };
}

export async function createDeal(data: {
  customerName: string;
  amount: number;
  stageId: number;
  assignedTo: number | null;
  leadId?: number | null;
}) {
  const { data: stageRow } = await supabase.from('deal_stages').select('progress_percent').eq('id', data.stageId).single();
  const stageProgress = Number(stageRow?.progress_percent ?? 0);

  const payload: Record<string, unknown> = {
    customer_name: data.customerName,
    amount: data.amount,
    stage_id: data.stageId,
    assigned_to: data.assignedTo,
    lead_id: data.leadId ?? null,
    progress_percent: stageProgress,
  };

  const { data: insertedDeal, error } = await supabase.from('deals').insert(payload).select().single();

  if (!insertedDeal) {
    return { deal: null as DealWithDetails | null, error };
  }

  if (isTelegramEnabled('newDeal')) {
    notifyNewDeal(data.customerName, data.amount, 'Новая', '').catch(() => {});
  }

  const row = insertedDeal as any;
  return {
    deal: {
      id: row.id,
      leadId: row.lead_id,
      customerName: row.customer_name,
      amount: Number(row.amount),
      stageId: row.stage_id,
      stage: 'Не определено',
      progressPercent: row.progress_percent,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    error,
  };
}

export async function updateDeal(
  dealId: number,
  updates: Partial<{
    customerName: string;
    amount: number;
    stageId: number;
    assignedTo: number | null;
    progressPercent: number;
    fromStageName?: string;
    toStageName?: string;
  }>,
) {
  const payload: Record<string, unknown> = {};

  if (updates.stageId !== undefined) {
    const { data: stageRow } = await supabase.from('deal_stages').select('progress_percent').eq('id', updates.stageId).single();
    payload.progress_percent = Number(stageRow?.progress_percent ?? 0);
  }

  if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.stageId !== undefined) payload.stage_id = updates.stageId;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.progressPercent !== undefined) payload.progress_percent = updates.progressPercent;

  const { error } = await supabase.from('deals').update(payload).eq('id', dealId);

  if (!error && updates.stageId !== undefined && isTelegramEnabled('stageChange')) {
    notifyDealStageChanged(
      updates.customerName ?? '',
      updates.fromStageName ?? '—',
      updates.toStageName ?? '—',
      Number(updates.amount ?? 0),
    ).catch(() => {});
  }

  return { error };
}

export async function deleteDeal(dealId: number) {
  const { error } = await supabase.from('deals').delete().eq('id', dealId);
  return { error };
}

// ─── Deal Detail ──────────────────────────────────────────────────────────────
export interface DealDetailClient {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

export interface DealDetailLead {
  id: number;
  leadCode: string;
  status: string;
}

export interface DealDetailProject {
  id: number;
  name: string;
  status: string;
  budget: number;
}

export interface DealDetailTask {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  assignedToName: string;
  dueDate: string | null;
}

export interface DealDetail {
  client: DealDetailClient | null;
  lead: DealDetailLead | null;
  projects: DealDetailProject[];
  tasks: DealDetailTask[];
}

export async function fetchDealDetail(deal: DealWithDetails): Promise<{ detail: DealDetail; error: Error | null }> {
  const [clientRes, leadRes, projectsRes, usersRes] = await Promise.all([
    deal.clientId
      ? supabase.from('clients').select('id, name, phone, email').eq('id', deal.clientId).single()
      : Promise.resolve({ data: null, error: null }),
    deal.leadId
      ? supabase.from('leads').select('id, lead_code, status').eq('id', deal.leadId).single()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('projects').select('id, name, status, budget').eq('deal_id', deal.id),
    supabase.from('users').select('id, full_name'),
  ]);

  const projects: DealDetailProject[] = (projectsRes.data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as number,
    name: p.name as string,
    status: p.status as string,
    budget: Number(p.budget),
  }));

  const projectIds = projects.map((p) => p.id);
  let tasks: DealDetailTask[] = [];

  if (projectIds.length > 0) {
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, title, status, priority, assigned_to, due_date')
      .in('project_id', projectIds)
      .order('due_date', { ascending: true });

    const userMap = new Map<number, string>(
      ((usersRes.data ?? []) as Array<{ id: number; full_name: string }>).map((u) => [u.id, u.full_name]),
    );

    tasks = (taskRows ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as number,
      title: t.title as string,
      status: t.status as string,
      priority: (t.priority as string | null) ?? null,
      assignedToName: t.assigned_to ? (userMap.get(t.assigned_to as number) ?? 'Неизвестный') : 'Не назначен',
      dueDate: (t.due_date as string | null) ?? null,
    }));
  }

  const clientRow = clientRes.data as Record<string, unknown> | null;
  const leadRow = leadRes.data as Record<string, unknown> | null;

  return {
    detail: {
      client: clientRow ? { id: clientRow.id as number, name: clientRow.name as string, phone: (clientRow.phone as string | null) ?? null, email: (clientRow.email as string | null) ?? null } : null,
      lead: leadRow ? { id: leadRow.id as number, leadCode: leadRow.lead_code as string, status: leadRow.status as string } : null,
      projects,
      tasks,
    },
    error: null,
  };
}
