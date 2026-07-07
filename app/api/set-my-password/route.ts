import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { password } = await req.json();
  const { data, error } = await admin.auth.admin.updateUserById(
    '3e202dfe-6d76-496c-b916-8052925e99c9',
    { password }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, email: data.user.email });
}
