import { supabase } from '@/lib/supabaseClient';

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  contactCount: number;
  leadCount: number;
}

export interface Contact {
  id: number;
  clientId: number;
  fullName: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export async function fetchClients(): Promise<{ clients: Client[]; error: Error | null }> {
  const [clientsRes, contactsRes, leadsRes] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('contacts').select('id, client_id'),
    supabase.from('leads').select('id, client_id').not('client_id', 'is', null),
  ]);

  if (clientsRes.error) return { clients: [], error: clientsRes.error };

  const contactCounts = new Map<number, number>();
  (contactsRes.data ?? []).forEach((c: { id: number; client_id: number }) => {
    contactCounts.set(c.client_id, (contactCounts.get(c.client_id) ?? 0) + 1);
  });

  const leadCounts = new Map<number, number>();
  (leadsRes.data ?? []).forEach((l: { id: number; client_id: number | null }) => {
    if (l.client_id != null) leadCounts.set(l.client_id, (leadCounts.get(l.client_id) ?? 0) + 1);
  });

  const clients: Client[] = (clientsRes.data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as number,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    createdAt: row.created_at as string,
    contactCount: contactCounts.get(row.id as number) ?? 0,
    leadCount: leadCounts.get(row.id as number) ?? 0,
  }));

  return { clients, error: null };
}

export async function fetchContacts(clientId: number): Promise<{ contacts: Contact[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('full_name');

  if (error) return { contacts: [], error };

  const contacts: Contact[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as number,
    clientId: row.client_id as number,
    fullName: row.full_name as string,
    role: (row.role as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    createdAt: row.created_at as string,
  }));

  return { contacts, error: null };
}

export async function createClient(data: { name: string; phone: string; email: string; address: string }) {
  const { data: row, error } = await supabase.from('clients').insert({
    name: data.name.trim(),
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    address: data.address.trim() || null,
  }).select().single();
  return { client: row as Client | null, error };
}

export async function updateClient(id: number, data: { name: string; phone: string; email: string; address: string }) {
  const { error } = await supabase.from('clients').update({
    name: data.name.trim(),
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    address: data.address.trim() || null,
  }).eq('id', id);
  return { error };
}

export async function deleteClient(id: number) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  return { error };
}

export async function createContact(data: { clientId: number; fullName: string; role: string; phone: string; email: string }) {
  const { data: row, error } = await supabase.from('contacts').insert({
    client_id: data.clientId,
    full_name: data.fullName.trim(),
    role: data.role.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
  }).select().single();
  return { contact: row as Contact | null, error };
}

export async function updateContact(id: number, data: { fullName: string; role: string; phone: string; email: string }) {
  const { error } = await supabase.from('contacts').update({
    full_name: data.fullName.trim(),
    role: data.role.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
  }).eq('id', id);
  return { error };
}

export async function deleteContact(id: number) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  return { error };
}
