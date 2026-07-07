import { supabase } from '@/lib/supabaseClient';
import type { Task } from '@/lib/types';

export type NodeStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface DecompositionStage {
  id: string;
  title: string;
  isCritical: boolean;
  responsible?: string;
  dueDate?: string | null;
  reviewer?: string | null;
  status?: NodeStatus;
  children: DecompositionStage[];
}

export interface TaskWithAssignee extends Task {
  assignedToName?: string;
  assignedToAvatarUrl?: string | null;
  decomposition?: DecompositionStage[] | null;
}

export interface UserSummary {
  id: number;
  full_name: string;
  avatar_url?: string | null;
}

export async function fetchTasks() {
  const [{ data: tasks, error: tasksError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from('tasks').select('*').order('due_date', { ascending: true }),
    supabase.from('users').select('id, full_name, avatar_url'),
  ]);

  if (tasksError || usersError) {
    return {
      tasks: [] as TaskWithAssignee[],
      users: [] as UserSummary[],
      error: tasksError || usersError,
    };
  }

  const userNameMap = new Map((users ?? []).map((u: UserSummary) => [u.id, u.full_name]));
  const userAvatarMap = new Map((users ?? []).map((u: UserSummary) => [u.id, u.avatar_url ?? null]));

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
    assignedToName: row.assigned_to ? userNameMap.get(row.assigned_to) : 'Не назначен',
    assignedToAvatarUrl: row.assigned_to ? (userAvatarMap.get(row.assigned_to) ?? null) : null,
    decomposition: row.decomposition ?? null,
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

export async function saveDecomposition(taskId: number, stages: DecompositionStage[]) {
  const { error } = await supabase.from('tasks').update({ decomposition: stages }).eq('id', taskId);
  return { error };
}

export async function deleteTask(taskId: number) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  return { error };
}

// ─── Comments ─────────────────────────────────────────────────────────────────
export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  userName: string;
  avatarUrl: string | null;
  comment: string;
  createdAt: string;
}

export async function fetchComments(taskId: number): Promise<{ comments: TaskComment[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('task_comments')
    .select('id, task_id, user_id, comment, created_at, users ( full_name, avatar_url )')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) return { comments: [], error };

  const comments: TaskComment[] = (data ?? []).map((row: Record<string, unknown>) => {
    const u = row.users as { full_name: string; avatar_url?: string | null } | null;
    return {
      id: row.id as number,
      taskId: row.task_id as number,
      userId: row.user_id as number,
      userName: u?.full_name ?? 'Неизвестный',
      avatarUrl: u?.avatar_url ?? null,
      comment: row.comment as string,
      createdAt: row.created_at as string,
    };
  });

  return { comments, error: null };
}

export async function addComment(taskId: number, userId: number, comment: string): Promise<{ comment: TaskComment | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, user_id: userId, comment: comment.trim() })
    .select('id, task_id, user_id, comment, created_at, users ( full_name, avatar_url )')
    .single();

  if (error || !data) return { comment: null, error };

  const row = data as Record<string, unknown>;
  const u = row.users as { full_name: string; avatar_url?: string | null } | null;
  return {
    comment: {
      id: row.id as number,
      taskId: row.task_id as number,
      userId: row.user_id as number,
      userName: u?.full_name ?? 'Неизвестный',
      avatarUrl: u?.avatar_url ?? null,
      comment: row.comment as string,
      createdAt: row.created_at as string,
    },
    error: null,
  };
}

export async function deleteComment(commentId: number) {
  const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
  return { error };
}
