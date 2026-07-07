import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function createAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireDirector(req: Request, admin: SupabaseClient): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: row } = await admin
    .from('users')
    .select('role_id')
    .eq('auth_id', user.id)
    .single();

  return row?.role_id === 1 ? user.id : null;
}

export async function POST(req: Request) {
  const admin = createAdmin();
  const callerId = await requireDirector(req, admin);
  if (!callerId) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const { authId, userId } = await req.json();

  if (!authId || !userId) {
    return NextResponse.json({ error: 'Не указан пользователь' }, { status: 400 });
  }

  await admin
    .from('leads')
    .update({ assigned_to: null })
    .eq('assigned_to', userId);

  const { error: dbError } = await admin
    .from('users')
    .delete()
    .eq('id', userId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  const { error: authError } = await admin.auth.admin.deleteUser(authId);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
