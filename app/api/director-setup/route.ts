import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const DIRECTOR_AUTH_ID = '3e202dfe-6d76-496c-b916-8052925e99c9';
const SETUP_SECRET = 'SAMRUQ_SETUP_2026';

export async function POST(req: Request) {
  const { secret, password } = await req.json();

  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Неверный код' }, { status: 403 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Минимум 6 символов' }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error } = await admin.auth.admin.updateUserById(DIRECTOR_AUTH_ID, {
    password,
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
