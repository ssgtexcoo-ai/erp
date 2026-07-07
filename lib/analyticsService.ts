import { supabase } from '@/lib/supabaseClient';

export interface MonthlyRevenue {
  month: string;   // 'Янв', 'Фев', ...
  year: number;
  amount: number;
  count: number;
}

export interface ManagerStat {
  userId: number;
  name: string;
  avatarUrl: string | null;
  dealsCount: number;
  totalAmount: number;
  wonCount: number;
}

export interface ConversionFunnel {
  totalLeads: number;
  qualifiedLeads: number;
  totalDeals: number;
  wonDeals: number;
  conversionLeadToDeal: number;
  conversionDealToWon: number;
}

export interface AnalyticsData {
  monthlyRevenue: MonthlyRevenue[];
  managers: ManagerStat[];
  funnel: ConversionFunnel;
  avgDealCycleDays: number;
}

const MONTH_NAMES = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

export async function fetchAnalytics(): Promise<{ data: AnalyticsData | null; error: Error | null }> {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const fromStr = sixMonthsAgo.toISOString().split('T')[0];

  const [dealsRes, leadsRes, usersRes, wonStageRes] = await Promise.all([
    supabase
      .from('deals')
      .select('id, amount, stage_id, assigned_to, created_at, updated_at')
      .gte('created_at', fromStr),
    supabase
      .from('leads')
      .select('id, status, assigned_to, created_at'),
    supabase
      .from('users')
      .select('id, full_name, avatar_url'),
    supabase
      .from('deal_stages')
      .select('id, name')
      .in('name', ['Выиграно', 'Закрыто', 'Won', 'Closed', 'Успех']),
  ]);

  if (dealsRes.error || leadsRes.error || usersRes.error) {
    return { data: null, error: dealsRes.error ?? leadsRes.error ?? usersRes.error ?? new Error('Ошибка загрузки') };
  }

  const deals = (dealsRes.data ?? []) as Array<{
    id: number; amount: number | string; stage_id: number | null;
    assigned_to: number | null; created_at: string; updated_at: string;
  }>;
  const leads = (leadsRes.data ?? []) as Array<{
    id: number; status: string; assigned_to: number | null; created_at: string;
  }>;
  const users = (usersRes.data ?? []) as Array<{ id: number; full_name: string; avatar_url?: string | null }>;
  const wonStageIds = new Set((wonStageRes.data ?? []).map((s: { id: number }) => s.id));

  const userMap = new Map(users.map(u => [u.id, { name: u.full_name, avatarUrl: u.avatar_url ?? null }]));

  // ── Monthly revenue (last 6 months) ──────────────────────────────────────
  const monthMap = new Map<string, MonthlyRevenue>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap.set(key, { month: MONTH_NAMES[d.getMonth()]!, year: d.getFullYear(), amount: 0, count: 0 });
  }
  for (const deal of deals) {
    const d = new Date(deal.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.amount += Number(deal.amount ?? 0);
      entry.count += 1;
    }
  }
  const monthlyRevenue = [...monthMap.values()];

  // ── Manager stats ─────────────────────────────────────────────────────────
  const mgMap = new Map<number, ManagerStat>();
  for (const deal of deals) {
    const uid = deal.assigned_to;
    if (!uid) continue;
    if (!mgMap.has(uid)) {
      const u = userMap.get(uid);
      mgMap.set(uid, { userId: uid, name: u?.name ?? `#${uid}`, avatarUrl: u?.avatarUrl ?? null, dealsCount: 0, totalAmount: 0, wonCount: 0 });
    }
    const entry = mgMap.get(uid)!;
    entry.dealsCount += 1;
    entry.totalAmount += Number(deal.amount ?? 0);
    if (deal.stage_id != null && wonStageIds.has(deal.stage_id)) entry.wonCount += 1;
  }
  const managers = [...mgMap.values()].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 5);

  // ── Conversion funnel ─────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'closed').length;
  const totalDeals = deals.length;
  const wonDeals = deals.filter(d => d.stage_id != null && wonStageIds.has(d.stage_id)).length;

  const funnel: ConversionFunnel = {
    totalLeads,
    qualifiedLeads,
    totalDeals,
    wonDeals,
    conversionLeadToDeal: totalLeads > 0 ? Math.round((totalDeals / totalLeads) * 100) : 0,
    conversionDealToWon: totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0,
  };

  // ── Average deal cycle (days) ─────────────────────────────────────────────
  const wonDealsList = deals.filter(d => d.stage_id != null && wonStageIds.has(d.stage_id));
  const avgDealCycleDays = wonDealsList.length > 0
    ? Math.round(
        wonDealsList.reduce((sum, d) => {
          const created = new Date(d.created_at).getTime();
          const updated = new Date(d.updated_at).getTime();
          return sum + (updated - created) / 86_400_000;
        }, 0) / wonDealsList.length,
      )
    : 0;

  return {
    data: { monthlyRevenue, managers, funnel, avgDealCycleDays },
    error: null,
  };
}
