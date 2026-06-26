import { supabase } from '@/lib/supabaseClient';
import type { Deal } from '@/lib/types';

export interface DealWithDetails extends Deal {
  stageId?: number | null;
  assignedToName?: string;
}

export interface DealStage {
  id: number;
  name: string;
  progress_percent: number;
}

export interface DealUser {
  id: number;
  full_name: string;
}

export async function fetchDeals() {
  const [{ data: deals, error: dealsError }, { data: users, error: usersError }, { data: stages, error: stagesError }] =
    await Promise.all([
      supabase.from('deals').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('id, full_name'),
      supabase.from('deal_stages').select('id, name, progress_percent'),
    ]);

  if (dealsError || usersError || stagesError) {
    return {
      deals: [] as DealWithDetails[],
      users: [] as DealUser[],
      stages: [] as DealStage[],
      error: dealsError || usersError || stagesError,
    };
  }

  const userMap = new Map<number, string>();
  ((users ?? []) as Array<{ id: number; full_name: string }>).forEach((u) => userMap.set(u.id, u.full_name));
  const stageMap = new Map<number, string>();
  ((stages ?? []) as Array<{ id: number; name: string }>).forEach((s) => stageMap.set(s.id, s.name));

  const enrichedDeals: DealWithDetails[] = (deals ?? []).map((row: any) => ({
    id: row.id,
    leadId: row.lead_id,
    customerName: row.customer_name,
    amount: Number(row.amount),
    stageId: row.stage_id,
    stage: stageMap.get(row.stage_id) ?? row.stage ?? 'Не определено',
    progressPercent: row.progress_percent,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedToName: row.assigned_to ? userMap.get(row.assigned_to) ?? `#${row.assigned_to}` : 'Не назначен',
  }));

  return {
    deals: enrichedDeals,
    users: (users ?? []) as DealUser[],
    stages: (stages ?? []) as DealStage[],
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
  return { error };
}

export async function deleteDeal(dealId: number) {
  const { error } = await supabase.from('deals').delete().eq('id', dealId);
  return { error };
}
