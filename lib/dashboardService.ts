import { supabase } from '@/lib/supabaseClient';
import { fetchProjects, type ProjectWithDetails } from '@/lib/projectService';

export interface DashboardProjectSummary {
  id: number;
  name: string;
  clientName: string;
  budget: number;
  status: string;
  responsibleName?: string;
  stageProgress: number;
  stageCount: number;
  completedStages: number;
}

export interface DashboardData {
  leadsCount: number;
  dealsCount: number;
  projectsCount: number;
  activeTasksCount: number;
  pipelineValue: number;
  activeProjects: DashboardProjectSummary[];
}

export async function fetchDashboardData() {
  const [leadsCountResponse, dealsResponse, tasksCountResponse, projectsResponse] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('deals').select('id, amount', { count: 'exact' }),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'Выполнено'),
    fetchProjects(),
  ]);

  const leadsCount = Number(leadsCountResponse.count ?? 0);
  const dealsCount = Number(dealsResponse.count ?? 0);
  const activeTasksCount = Number(tasksCountResponse.count ?? 0);

  if (leadsCountResponse.error || dealsResponse.error || tasksCountResponse.error || projectsResponse.error) {
    return {
      data: null as DashboardData | null,
      error: leadsCountResponse.error || dealsResponse.error || tasksCountResponse.error || projectsResponse.error,
    };
  }

  const projects = (projectsResponse.projects ?? []) as ProjectWithDetails[];
  const deals = (dealsResponse.data ?? []) as Array<{ amount: number | string }>;
  const pipelineValue = deals.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  const activeProjects = projects
    .filter((project) => project.status !== 'closed')
    .slice(0, 4)
    .map((project) => ({
      id: project.id,
      name: project.name,
      clientName: project.clientName,
      budget: project.budget,
      status: project.status,
      responsibleName: project.responsibleName,
      stageProgress: project.stageProgress,
      stageCount: project.stageCount,
      completedStages: project.completedStages,
    }));

  return {
    data: {
      leadsCount,
      dealsCount,
      projectsCount: projects.length,
      activeTasksCount,
      pipelineValue,
      activeProjects,
    },
    error: null,
  };
}
