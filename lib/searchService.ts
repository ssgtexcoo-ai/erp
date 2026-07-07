import { supabase } from '@/lib/supabaseClient';

export type SearchResultType = 'lead' | 'deal' | 'client' | 'task' | 'project';

export interface SearchResult {
  id: number;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_LABEL: Record<SearchResultType, string> = {
  lead: 'Лид',
  deal: 'Сделка',
  client: 'Клиент',
  task: 'Задача',
  project: 'Объект',
};

export { TYPE_LABEL };

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const like = `%${q}%`;

  const [leadsRes, dealsRes, clientsRes, tasksRes, projectsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, lead_code, customer_name, status')
      .or(`customer_name.ilike.${like},lead_code.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .limit(5),
    supabase
      .from('deals')
      .select('id, customer_name, amount')
      .ilike('customer_name', like)
      .limit(5),
    supabase
      .from('clients')
      .select('id, name, phone, email')
      .or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`)
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, status')
      .ilike('title', like)
      .limit(5),
    supabase
      .from('projects')
      .select('id, name, client_name, status')
      .or(`name.ilike.${like},client_name.ilike.${like}`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const row of (leadsRes.data ?? []) as Array<Record<string, unknown>>) {
    results.push({
      id: row.id as number,
      type: 'lead',
      title: (row.customer_name as string | null) ?? (row.lead_code as string),
      subtitle: `Лид · ${row.lead_code} · ${row.status}`,
      href: '/leads',
    });
  }

  for (const row of (dealsRes.data ?? []) as Array<Record<string, unknown>>) {
    results.push({
      id: row.id as number,
      type: 'deal',
      title: row.customer_name as string,
      subtitle: `Сделка · ${Number(row.amount).toLocaleString('ru-RU')} ₸`,
      href: '/deals',
    });
  }

  for (const row of (clientsRes.data ?? []) as Array<Record<string, unknown>>) {
    results.push({
      id: row.id as number,
      type: 'client',
      title: row.name as string,
      subtitle: `Клиент · ${(row.phone as string | null) ?? (row.email as string | null) ?? ''}`,
      href: '/clients',
    });
  }

  for (const row of (tasksRes.data ?? []) as Array<Record<string, unknown>>) {
    results.push({
      id: row.id as number,
      type: 'task',
      title: row.title as string,
      subtitle: `Задача · ${row.status}`,
      href: '/kanban',
    });
  }

  for (const row of (projectsRes.data ?? []) as Array<Record<string, unknown>>) {
    results.push({
      id: row.id as number,
      type: 'project',
      title: row.name as string,
      subtitle: `Объект · ${(row.client_name as string | null) ?? ''} · ${row.status}`,
      href: '/projects',
    });
  }

  return results;
}
