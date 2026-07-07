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

  const { authId, password } = await req.json();

  if (!authId || !password || password.length < 6) {
    return NextResponse.json({ error: 'Пароль минимум 6 символов' }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(authId, {
    password,
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
