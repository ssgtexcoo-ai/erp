import { supabase } from '@/lib/supabaseClient';
import type { UserProfile, RoleName } from '@/lib/types';

export async function getUserProfile(userId: string): Promise<{ user?: UserProfile; error?: Error }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role_id, is_active, created_at, roles(name)')
    .eq('auth_id', userId)
    .single();

  if (error || !data) {
    return { error: error ?? new Error('Ошибка загрузки профиля') };
  }

  const roleName = (data.roles?.name ?? 'manager') as RoleName;

  return {
    user: {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      roleId: data.role_id,
      roleName,
      isActive: data.is_active,
      createdAt: data.created_at,
    },
  };
}
