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

  const { authId, userId } = await req.json();

  if (!authId || !userId) {
    return NextResponse.json({ error: 'Не указан пользователь' }, { status: 400 });
  }

  // Unassign leads from this user
  await supabaseAdmin
    .from('leads')
    .update({ assigned_to: null })
    .eq('assigned_to', userId);

  // Delete from users table
  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', userId);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  // Delete from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authId);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
