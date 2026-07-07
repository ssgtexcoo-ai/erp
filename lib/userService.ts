import { supabase } from '@/lib/supabaseClient';
import type { UserProfile, RoleName } from '@/lib/types';

export async function getUserProfile(userId: string): Promise<{ user?: UserProfile; error?: Error }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role_id, is_active, created_at, avatar_url, roles(name)')
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
      avatarUrl: data.avatar_url ?? null,
    },
  };
}

export async function uploadAvatar(userId: number, file: File): Promise<{ url: string | null; error: Error | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}?t=${Date.now()}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) return { url: null, error: updateError };

  return { url: publicUrl, error: null };
}
