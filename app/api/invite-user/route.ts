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

  const { email, fullName, roleId, password } = await req.json();

  if (!email || !fullName || !roleId || !password) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  await admin.auth.admin.updateUserById(created.user.id, {
    email_confirm: true,
  });

  const { error: insertError } = await admin
    .from('users')
    .insert({ auth_id: created.user.id, email, full_name: fullName, role_id: roleId, is_active: true });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
