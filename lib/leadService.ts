import { supabase } from '@/lib/supabaseClient';
import type { Lead } from '@/lib/types';

export interface LeadSource {
  id: number;
  name: string;
}

export interface LeadWithDetails extends Lead {
  sourceName?: string;
  assignedToName?: string;
}

interface ManagerRecord {
  id: number;
  full_name: string;
  role_id: number;
}

export interface LeadFetchResult {
  leads: LeadWithDetails[];
  users: ManagerRecord[];
  sources: LeadSource[];
  error: Error | null;
}

export async function fetchLeads(): Promise<LeadFetchResult> {
  const [{ data: leads, error: leadsError }, { data: sources, error: sourcesError }, { data: users, error: usersError }] =
    await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('lead_sources').select('*'),
      supabase.from('users').select('id, full_name, role_id'),
    ]);

  if (leadsError || sourcesError || usersError) {
    return {
      leads: [] as LeadWithDetails[],
      users: [] as ManagerRecord[],
      sources: [] as LeadSource[],
      error: leadsError || sourcesError || usersError,
    };
  }

  const sourceMap = new Map<number, string>();
  ((sources ?? []) as Array<{ id: number; name: string }>).forEach((s) => sourceMap.set(s.id, s.name));
  const userMap = new Map<number, string>();
  ((users ?? []) as Array<{ id: number; full_name: string }>).forEach((u) => userMap.set(u.id, u.full_name));

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
    sourceName: sourceMap.get(row.source_id) ?? `#${row.source_id}`,
    assignedToName: row.assigned_to ? userMap.get(row.assigned_to) ?? `#${row.assigned_to}` : 'Не назначен',
  }));

  return {
    leads: enrichedLeads,
    users: (users ?? []) as ManagerRecord[],
    sources: (sources ?? []) as LeadSource[],
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
  };

  const { data: insertedLead, error } = await supabase.from('leads').insert(payload).select().single();

  if (!insertedLead) {
    return { lead: null as LeadWithDetails | null, error };
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

export async function deleteLead(leadId: number) {
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  return { error };
}

export async function updateLead(
  leadId: number,
  updates: Partial<Pick<Lead, 'status' | 'assignedTo' | 'comment' | 'customerName' | 'phone' | 'email' | 'sourceId'>>,
) {
  const payload: Record<string, unknown> = {};

  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.comment !== undefined) payload.comment = updates.comment;
  if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.sourceId !== undefined) payload.source_id = updates.sourceId;

  const { error } = await supabase.from('leads').update(payload).eq('id', leadId);

  return { error };
}
