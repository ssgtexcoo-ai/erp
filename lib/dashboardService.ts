import { supabase } from '@/lib/supabaseClient';
import { fetchProjects, type ProjectWithDetails } from '@/lib/projectService';

export interface DashboardProjectSummary {
  id: number;
  name: string;
  clientName: string;
  budget: number;
  status: string;
  responsibleName?: string;
  responsibleAvatarUrl?: string | null;
  stageProgress: number;
  stageCount: number;
  completedStages: number;
}

export interface FunnelStage {
  stageId: number;
  stageName: string;
  orderIndex: number;
  count: number;
  amount: number;
}

export interface RecentLead {
  id: number;
  customerName: string;
  status: string;
  createdAt: string;
  assignedToName?: string;
  assignedToAvatarUrl?: string | null;
}

export interface DashboardData {
  leadsCount: number;
  dealsCount: number;
  projectsCount: number;
  activeTasksCount: number;
  overdueTasksCount: number;
  pipelineValue: number;
  activeProjects: DashboardProjectSummary[];
  funnelStages: FunnelStage[];
  recentLeads: RecentLead[];
}

export async function fetchDashboardData() {
  const today = new Date().toISOString().split('T')[0];

  const [
    leadsCountResponse,
    dealsResponse,
    tasksCountResponse,
    overdueTasksResponse,
    stagesResponse,
    projectsResponse,
    recentLeadsResponse,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('deals').select('id, amount, stage_id', { count: 'exact' }),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'Выполнено'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).lt('due_date', today).neq('status', 'Выполнено'),
    supabase.from('deal_stages').select('id, name, order_index').order('order_index'),
    fetchProjects(),
    supabase.from('leads').select('id, customer_name, status, created_at, assigned_to').order('created_at', { ascending: false }).limit(6),
  ]);

  const hasError =
    leadsCountResponse.error || dealsResponse.error ||
    tasksCountResponse.error || overdueTasksResponse.error ||
    stagesResponse.error || recentLeadsResponse.error;

  if (hasError || projectsResponse.error) {
    return {
      data: null as DashboardData | null,
      error: hasError || projectsResponse.error,
    };
  }

  const leadsCount         = Number(leadsCountResponse.count ?? 0);
  const dealsCount         = Number(dealsResponse.count ?? 0);
  const activeTasksCount   = Number(tasksCountResponse.count ?? 0);
  const overdueTasksCount  = Number(overdueTasksResponse.count ?? 0);

  const projects = (projectsResponse.projects ?? []) as ProjectWithDetails[];
  const deals    = (dealsResponse.data ?? []) as Array<{ amount: number | string; stage_id: number | null }>;
  const stages   = (stagesResponse.data ?? []) as Array<{ id: number; name: string; order_index: number }>;

  const pipelineValue = deals.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  // Build funnel by grouping deals into stages
  const stageMap = new Map<number, FunnelStage>();
  stages.forEach(s => stageMap.set(s.id, { stageId: s.id, stageName: s.name, orderIndex: s.order_index, count: 0, amount: 0 }));
  deals.forEach(d => {
    if (d.stage_id != null) {
      const s = stageMap.get(d.stage_id);
      if (s) { s.count++; s.amount += Number(d.amount ?? 0); }
    }
  });
  const funnelStages = [...stageMap.values()].filter(s => s.count > 0);

  // Recent leads — enrich with user names
  const rawLeads = (recentLeadsResponse.data ?? []) as Array<{ id: number; customer_name: string; status: string; created_at: string; assigned_to: number | null }>;
  const assignedIds = [...new Set(rawLeads.map(l => l.assigned_to).filter(Boolean))] as number[];
  let userMap = new Map<number, { name: string; avatarUrl: string | null }>();
  if (assignedIds.length > 0) {
    const { data: usersData } = await supabase.from('users').select('id, full_name, avatar_url').in('id', assignedIds);
    (usersData ?? []).forEach((u: { id: number; full_name: string; avatar_url?: string | null }) => {
      userMap.set(u.id, { name: u.full_name, avatarUrl: u.avatar_url ?? null });
    });
  }
  const recentLeads: RecentLead[] = rawLeads.map(l => ({
    id: l.id,
    customerName: l.customer_name,
    status: l.status,
    createdAt: l.created_at,
    assignedToName:      l.assigned_to ? userMap.get(l.assigned_to)?.name      : undefined,
    assignedToAvatarUrl: l.assigned_to ? userMap.get(l.assigned_to)?.avatarUrl : null,
  }));

  const activeProjects = projects
    .filter(p => p.status !== 'closed')
    .slice(0, 4)
    .map(p => ({
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      budget: p.budget,
      status: p.status,
      responsibleName: p.responsibleName,
      responsibleAvatarUrl: p.responsibleAvatarUrl ?? null,
      stageProgress: p.stageProgress,
      stageCount: p.stageCount,
      completedStages: p.completedStages,
    }));

  return {
    data: {
      leadsCount,
      dealsCount,
      projectsCount: projects.length,
      activeTasksCount,
      overdueTasksCount,
      pipelineValue,
      activeProjects,
      funnelStages,
      recentLeads,
    } satisfies DashboardData,
    error: null,
  };
}
