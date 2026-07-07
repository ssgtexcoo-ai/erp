import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function requireDirector(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: row } = await supabaseAdmin
    .from('users')
    .select('role_id')
    .eq('auth_id', user.id)
    .single();

  return row?.role_id === 1 ? user.id : null;
}

export async function POST(req: Request) {
  const callerId = await requireDirector(req);
  if (!callerId) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  const { email, fullName, roleId, password } = await req.json();

  if (!email || !fullName || !roleId || !password) {
    return NextResponse.json({ error: 'Заполните все поля' }, { status: 400 });
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  await supabaseAdmin.auth.admin.updateUserById(created.user.id, {
    email_confirm: true,
  });

  const { error: insertError } = await supabaseAdmin
    .from('users')
    .insert({ auth_id: created.user.id, email, full_name: fullName, role_id: roleId, is_active: true });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
