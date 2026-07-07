import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'documents';

function isDemoMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return !url || url.includes('your-project-ref') || !key || key.includes('your-service-role');
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Файл не выбран' }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'Размер файла превышает 50 МБ' }, { status: 400 });
  }

  if (isDemoMode()) {
    return NextResponse.json({ url: `https://placehold.co/600x400?text=${encodeURIComponent(file.name)}`, demo: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${Date.now()}-${safeName}`;

  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}