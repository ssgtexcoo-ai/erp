import { supabase } from '@/lib/supabaseClient';
import type { Lead } from '@/lib/types';
import { notifyNewLead } from '@/lib/telegram';
import { isTelegramEnabled } from '@/lib/notifPrefs';

export interface LeadSource {
  id: number;
  name: string;
}

export const PRODUCT_TYPES = [
  { value: 'construction',    label: '🏗 Строительство' },
  { value: 'sandwich_panels', label: '🧱 Сэндвич-панели' },
  { value: 'metal',           label: '⚙️ Металлоконструкции' },
] as const;

export type ProductType = typeof PRODUCT_TYPES[number]['value'];

export interface LeadWithDetails extends Lead {
  sourceName?: string;
  assignedToName?: string;
  assignedToAvatarUrl?: string | null;
  followUpDate?: string | null;
  followUpNote?: string | null;
  productType?: string | null;
}

interface ManagerRecord {
  id: number;
  full_name: string;
  role_id: number;
  avatar_url?: string | null;
}

export const LEADS_PAGE_SIZE = 50;

export interface LeadFetchResult {
  leads: LeadWithDetails[];
  users: ManagerRecord[];
  sources: LeadSource[];
  hasMore: boolean;
  error: Error | null;
}

export async function fetchLeads(page = 0): Promise<LeadFetchResult> {
  const from = page * LEADS_PAGE_SIZE;
  const to   = from + LEADS_PAGE_SIZE - 1;

  const [{ data: leads, error: leadsError }, { data: sources, error: sourcesError }, { data: users, error: usersError }] =
    await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }).range(from, to),
      supabase.from('lead_sources').select('*'),
      supabase.from('users').select('id, full_name, role_id, avatar_url'),
    ]);

  if (leadsError || sourcesError || usersError) {
    return {
      leads: [] as LeadWithDetails[],
      users: [] as ManagerRecord[],
      sources: [] as LeadSource[],
      hasMore: false,
      error: leadsError || sourcesError || usersError,
    };
  }

  const hasMore = (leads ?? []).length === LEADS_PAGE_SIZE;

  const sourceMap = new Map<number, string>();
  ((sources ?? []) as Array<{ id: number; name: string }>).forEach((s) => sourceMap.set(s.id, s.name));
  const userNameMap = new Map<number, string>();
  const userAvatarMap = new Map<number, string | null>();
  ((users ?? []) as Array<{ id: number; full_name: string; avatar_url?: string | null }>).forEach((u) => {
    userNameMap.set(u.id, u.full_name);
    userAvatarMap.set(u.id, u.avatar_url ?? null);
  });

  const enrichedLeads: LeadWithDetails[] = (leads ?? []).map((row: any) => ({
    id: row.id,
    leadCode: row.lead_code,
    sourceId: row.source_id,
    createdAt: row.created_at,
    assignedTo: row.assigned_to,
    status: row.status,
    customerName: row.customer_name,
    phone: row.phone,
    email: row.email,
    comment: row.comment,
    slaStatus: row.sla_status,
    followUpDate: row.follow_up_date ?? null,
    followUpNote: row.follow_up_note ?? null,
    productType: row.product_type ?? null,
    sourceName: sourceMap.get(row.source_id) ?? `#${row.source_id}`,
    assignedToName: row.assigned_to ? userNameMap.get(row.assigned_to) ?? `#${row.assigned_to}` : 'Не назначен',
    assignedToAvatarUrl: row.assigned_to ? (userAvatarMap.get(row.assigned_to) ?? null) : null,
  }));

  return {
    leads: enrichedLeads,
    users: (users ?? []) as ManagerRecord[],
    sources: (sources ?? []) as LeadSource[],
    hasMore,
    error: null,
  };
}

export async function createLead(data: {
  sourceId: number;
  assignedTo: number | null;
  status: Lead['status'];
  customerName: string;
  phone: string;
  email: string;
  comment: string | null;
  productType?: string | null;
}) {
  const payload: Record<string, unknown> = {
    lead_code: `L-${Date.now()}`,
    source_id: data.sourceId,
    assigned_to: data.assignedTo,
    status: data.status,
    customer_name: data.customerName,
    phone: data.phone,
    email: data.email,
    comment: data.comment,
    sla_status: 'green',
    product_type: data.productType ?? null,
  };

  const { data: insertedLead, error } = await supabase.from('leads').insert(payload).select().single();

  if (!insertedLead) {
    return { lead: null as LeadWithDetails | null, error };
  }

  if (isTelegramEnabled('newLead')) {
    notifyNewLead(data.customerName, String(data.sourceId), '').catch(() => {});
  }

  const row = insertedLead as any;
  return {
    lead: {
      id: row.id,
      leadCode: row.lead_code,
      sourceId: row.source_id,
      createdAt: row.created_at,
      assignedTo: row.assigned_to,
      status: row.status,
      customerName: row.customer_name,
      phone: row.phone,
      email: row.email,
      comment: row.comment,
      slaStatus: row.sla_status,
    },
    error,
  };
}

export async function setFollowUp(leadId: number, date: string | null, note: string | null) {
  const { error } = await supabase
    .from('leads')
    .update({ follow_up_date: date, follow_up_note: note })
    .eq('id', leadId);
  return { error };
}

export async function fetchTodayFollowUps(): Promise<{ leads: LeadWithDetails[]; error: Error | null }> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .lte('follow_up_date', today)
    .not('follow_up_date', 'is', null);
  if (error) return { leads: [], error };
  return { leads: (data ?? []).map((row: any) => ({ ...row, leadCode: row.lead_code, customerName: row.customer_name, followUpDate: row.follow_up_date, followUpNote: row.follow_up_note })), error: null };
}

export async function deleteLead(leadId: number) {
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  return { error };
}

export async function updateLead(
  leadId: number,
  updates: Partial<Pick<Lead, 'status' | 'assignedTo' | 'comment' | 'customerName' | 'phone' | 'email' | 'sourceId'>> & { productType?: string | null },
) {
  const payload: Record<string, unknown> = {};

  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.comment !== undefined) payload.comment = updates.comment;
  if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.sourceId !== undefined) payload.source_id = updates.sourceId;
  if (updates.productType !== undefined) payload.product_type = updates.productType;

  const { error } = await supabase.from('leads').update(payload).eq('id', leadId);

  return { error };
}

export interface LeadNote {
  id: number;
  leadId: number;
  userId: number | null;
  text: string;
  createdAt: string;
  userName?: string;
}

export async function fetchLeadNotes(leadId: number): Promise<{ notes: LeadNote[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*, users(full_name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) return { notes: [], error };
  return {
    notes: (data ?? []).map((r: any) => ({
      id: r.id, leadId: r.lead_id, userId: r.user_id,
      text: r.text, createdAt: r.created_at,
      userName: r.users?.full_name ?? 'Неизвестно',
    })),
    error: null,
  };
}

export async function addLeadNote(leadId: number, userId: number, text: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('lead_notes').insert({ lead_id: leadId, user_id: userId, text });
  return { error };
}
