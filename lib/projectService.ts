import { supabase } from '@/lib/supabaseClient';
import type { Project } from '@/lib/types';

export interface ProjectWithDetails extends Project {
  responsibleName?: string;
  responsibleAvatarUrl?: string | null;
  stageProgress: number;
  stageCount: number;
  completedStages: number;
}

export interface ProjectUser {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

export interface ProjectStageSummary {
  project_id: number;
  progress_percent: number;
}

export async function fetchProjects() {
  const [{ data: projects, error: projectsError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from('projects').select('*').order('start_date', { ascending: true }),
    supabase.from('users').select('id, full_name, avatar_url'),
  ]);

  if (projectsError || usersError) {
    return {
      projects: [] as ProjectWithDetails[],
      users: [] as ProjectUser[],
      error: projectsError || usersError,
    };
  }

  const projectRows = (projects ?? []) as Array<any>;
  const projectIds = projectRows.map((project) => project.id);

  const { data: projectStages, error: projectStagesError } = projectIds.length
    ? await supabase.from('project_stages').select('*').in('project_id', projectIds)
    : { data: [] as ProjectStageSummary[], error: null };

  if (projectStagesError) {
    return {
      projects: [] as ProjectWithDetails[],
      error: projectStagesError,
    };
  }

  const stageGroups = new Map<number, Array<ProjectStageSummary>>();
  ((projectStages ?? []) as ProjectStageSummary[]).forEach((stage: ProjectStageSummary) => {
    const items = stageGroups.get(stage.project_id) ?? [];
    items.push(stage);
    stageGroups.set(stage.project_id, items);
  });

  const userNameMap = new Map<number, string>();
  const userAvatarMap = new Map<number, string | null>();
  ((users ?? []) as Array<{ id: number; full_name: string; avatar_url?: string | null }>).forEach((u) => {
    userNameMap.set(u.id, u.full_name);
    userAvatarMap.set(u.id, u.avatar_url ?? null);
  });

  const enrichedProjects: ProjectWithDetails[] = projectRows.map((row) => {
    const stages = stageGroups.get(row.id) ?? [];
    const stageCount = stages.length;
    const completedStages = stages.filter((stage) => Number(stage.progress_percent) >= 100).length;
    const stageProgress = stageCount
      ? Math.round(stages.reduce((sum, stage) => sum + Number(stage.progress_percent ?? 0), 0) / stageCount)
      : 0;

    return {
      id: row.id,
      dealId: row.deal_id,
      name: row.name,
      clientName: row.client_name,
      budget: row.budget,
      responsibleId: row.responsible_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      profitEstimate: row.profit_estimate,
      responsibleName: row.responsible_id ? (userNameMap.get(Number(row.responsible_id)) ?? String(row.responsible_id)) : 'Не назначен',
      responsibleAvatarUrl: row.responsible_id ? (userAvatarMap.get(Number(row.responsible_id)) ?? null) : null,
      stageProgress,
      stageCount,
      completedStages,
    };
  });

  return {
    projects: enrichedProjects,
    users: (users ?? []) as ProjectUser[],
    error: null,
  };
}

export async function createProject(data: {
  name: string;
  clientName: string;
  budget: number;
  responsibleId: number | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  profitEstimate: number | null;
  dealId?: number | null;
}) {
  const payload: Record<string, unknown> = {
    name: data.name,
    client_name: data.clientName,
    budget: data.budget,
    responsible_id: data.responsibleId,
    status: data.status,
    start_date: data.startDate,
    end_date: data.endDate,
    profit_estimate: data.profitEstimate,
    deal_id: data.dealId ?? null,
  };

  const { data: insertedProject, error } = await supabase.from('projects').insert(payload).select().single();

  if (!insertedProject) {
    return { project: null as ProjectWithDetails | null, error };
  }

  const row = insertedProject as any;
  return {
    project: {
      id: row.id,
      dealId: row.deal_id,
      name: row.name,
      clientName: row.client_name,
      budget: Number(row.budget ?? 0),
      responsibleId: row.responsible_id,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      profitEstimate: row.profit_estimate,
      stageProgress: 0,
      stageCount: 0,
      completedStages: 0,
    },
    error,
  };
}

export async function updateProject(
  projectId: number,
  updates: Partial<{
    name: string;
    clientName: string;
    budget: number;
    responsibleId: number | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    profitEstimate: number | null;
  }>,
) {
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.clientName !== undefined) payload.client_name = updates.clientName;
  if (updates.budget !== undefined) payload.budget = updates.budget;
  if (updates.responsibleId !== undefined) payload.responsible_id = updates.responsibleId;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.startDate !== undefined) payload.start_date = updates.startDate;
  if (updates.endDate !== undefined) payload.end_date = updates.endDate;
  if (updates.profitEstimate !== undefined) payload.profit_estimate = updates.profitEstimate;

  const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
  return { error };
}

export async function deleteProject(projectId: number) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  return { error };
}
