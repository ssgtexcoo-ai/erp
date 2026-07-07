import type { RoleName } from '@/lib/types';

export const PAGE_ACCESS: Record<string, RoleName[]> = {
  dashboard: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
  leads: ['director', 'manager'],
  clients: ['director', 'manager'],
  deals: ['director', 'manager'],
  projects: ['director', 'project_manager', 'procurement'],
  kanban: ['director', 'project_manager', 'procurement'],
  gantt: ['director', 'project_manager'],
  calendar: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
  analytics: ['director'],
  activity: ['director', 'manager', 'project_manager'],
  documents: ['director', 'accountant', 'project_manager'],
  notifications: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
  employee: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
  settings: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
};

export function canAccessPage(role: RoleName, page: string) {
  const allowed = PAGE_ACCESS[page];
  return allowed ? allowed.includes(role) : false;
}
