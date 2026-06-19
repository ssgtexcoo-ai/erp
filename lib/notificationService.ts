import { supabase } from '@/lib/supabaseClient';
import type { NotificationRecord } from '@/lib/types';

export interface NotificationWithUser extends NotificationRecord {
  userName?: string;
}

export async function fetchNotifications() {
  const [{ data: notifications, error: notificationsError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('users').select('id, full_name'),
  ]);

  if (notificationsError || usersError) {
    return {
      notifications: [] as NotificationWithUser[],
      error: notificationsError || usersError,
    };
  }

  const userMap = new Map<number, string>();
  ((users ?? []) as Array<{ id: number; full_name: string }>).forEach((u) => userMap.set(u.id, u.full_name));

  const enrichedNotifications: NotificationWithUser[] = (notifications ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    payload: row.payload,
    isRead: row.is_read,
    createdAt: row.created_at,
    userName: row.user_id ? userMap.get(row.user_id) : undefined,
  }));

  return { notifications: enrichedNotifications, error: null };
}

export async function updateNotificationStatus(notificationId: number, isRead: boolean) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: isRead })
    .eq('id', notificationId);

  return { error };
}
