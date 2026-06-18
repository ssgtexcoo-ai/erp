import { supabase } from '@/lib/supabaseClient';
import type { Task, User } from '@/lib/types';

export interface TaskWithAssignee extends Task {
  assignedToName?: string;
}

export interface UserSummary {
  id: number;
  full_name: string;
}

export async function fetchTasks() {
  const [{ data: tasks, error: tasksError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from('tasks').select('*').order('due_date', { ascending: true }),
    supabase.from('users').select('id, full_name'),
  ]);

  if (tasksError || usersError) {
    return {
      tasks: [] as TaskWithAssignee[],
      users: [] as UserSummary[],
      error: tasksError || usersError,
    };
  }

  const userMap = new Map((users ?? []).map((user: UserSummary) => [user.id, user.full_name]));

  const enrichedTasks: TaskWithAssignee[] = (tasks ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    assignedTo: row.assigned_to,
    dueDate: row.due_date,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedToName: row.assigned_to ? userMap.get(row.assigned_to) : 'Не назначен',
  }));

  return {
    tasks: enrichedTasks,
    users: (users ?? []) as UserSummary[],
    error: null,
  };
}

export async function updateTask(taskId: number, updates: Partial<Pick<Task, 'status' | 'assignedTo' | 'dueDate' | 'priority' | 'title' | 'description'>>) {
  const payload: Record<string, unknown> = {};

  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;

  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);

  return { error };
}

export async function createTask(data: {
  projectId: number | null;
  title: string;
  description: string;
  assignedTo: number | null;
  dueDate: string | null;
  status: Task['status'];
  priority: Task['priority'];
}) {
  const payload: Record<string, unknown> = {
    project_id: data.projectId,
    title: data.title,
    description: data.description,
    assigned_to: data.assignedTo,
    due_date: data.dueDate,
    status: data.status,
    priority: data.priority,
  };

  const { data: insertedTask, error } = await supabase.from('tasks').insert(payload).select().single();

  if (!insertedTask) {
    return { task: null as TaskWithAssignee | null, error };
  }

  const row = insertedTask as any;
  return {
    task: {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    error,
  };
}

export async function deleteTask(taskId: number) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return { error };
}
