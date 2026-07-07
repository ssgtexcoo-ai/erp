import { supabase } from '@/lib/supabaseClient';

export interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  avatarUrl: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  created_deal: 'создал сделку',
  moved_deal: 'переместил сделку',
  created_lead: 'добавил лид',
  updated_lead: 'обновил лид',
  created_task: 'создал задачу',
  completed_task: 'завершил задачу',
  updated_task: 'обновил задачу',
  created_client: 'добавил клиента',
  created_comment: 'оставил комментарий',
};

export { ACTION_LABEL };

export async function logActivity(params: {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      user_id: params.userId,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      payload: params.payload ?? null,
    });
  } catch {
    // Fire-and-forget — never block UI
  }
}

export async function fetchActivityLog(limit = 60): Promise<{ logs: ActivityLog[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, user_id, action, entity, entity_id, payload, created_at, users ( full_name, avatar_url )')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { logs: [], error };

  const logs: ActivityLog[] = (data ?? []).map((row: Record<string, unknown>) => {
    const u = row.users as { full_name: string; avatar_url?: string | null } | null;
    return {
      id: row.id as number,
      userId: row.user_id as number,
      userName: u?.full_name ?? 'Система',
      avatarUrl: u?.avatar_url ?? null,
      action: row.action as string,
      entity: row.entity as string,
      entityId: (row.entity_id as number | null) ?? null,
      payload: (row.payload as Record<string, unknown> | null) ?? null,
      createdAt: row.created_at as string,
    };
  });

  return { logs, error: null };
}

export async function fetchEntityActivity(entity: string, entityId: number): Promise<{ logs: ActivityLog[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, user_id, action, entity, entity_id, payload, created_at, users ( full_name, avatar_url )')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { logs: [], error };

  const logs: ActivityLog[] = (data ?? []).map((row: Record<string, unknown>) => {
    const u = row.users as { full_name: string; avatar_url?: string | null } | null;
    return {
      id: row.id as number,
      userId: row.user_id as number,
      userName: u?.full_name ?? 'Система',
      avatarUrl: u?.avatar_url ?? null,
      action: row.action as string,
      entity: row.entity as string,
      entityId: (row.entity_id as number | null) ?? null,
      payload: (row.payload as Record<string, unknown> | null) ?? null,
      createdAt: row.created_at as string,
    };
  });

  return { logs, error: null };
}
