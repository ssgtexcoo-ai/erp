import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// GET — Facebook webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
}

// POST — Receive lead data from Facebook
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!pageToken) {
    return NextResponse.json({ error: 'FACEBOOK_PAGE_ACCESS_TOKEN not set' }, { status: 500 });
  }

  try {
    for (const entry of (body.entry ?? []) as any[]) {
      for (const change of (entry.changes ?? []) as any[]) {
        if (change.field !== 'leadgen') continue;

        const leadgenId = change.value?.leadgen_id as string | undefined;
        if (!leadgenId) continue;

        // Fetch full lead data from Graph API
        const fbRes = await fetch(
          `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,created_time&access_token=${pageToken}`,
        );
        const fbData = await fbRes.json();
        if (fbData.error) continue;

        // Parse field_data into key→value map
        const fields: Record<string, string> = {};
        for (const f of (fbData.field_data ?? []) as any[]) {
          fields[f.name as string] = (f.values?.[0] as string) ?? '';
        }

        const name  = fields['full_name'] || `${fields['first_name'] ?? ''} ${fields['last_name'] ?? ''}`.trim() || 'Facebook Lead';
        const phone = fields['phone_number'] || fields['phone'] || '';
        const email = fields['email'] || '';

        // Find or create client by phone/email
        let clientId: number | null = null;
        if (phone || email) {
          const orFilter = [phone ? `phone.eq.${phone}` : '', email ? `email.eq.${email}` : ''].filter(Boolean).join(',');
          const { data: existing } = await supabaseAdmin
            .from('clients')
            .select('id')
            .or(orFilter)
            .limit(1)
            .single();

          if (existing) {
            clientId = existing.id;
          } else {
            const { data: created } = await supabaseAdmin
              .from('clients')
              .insert({ name, phone: phone || null, email: email || null })
              .select('id')
              .single();
            clientId = created?.id ?? null;
          }
        }

        // Find "Facebook Lead Ads" source id or use null
        const { data: srcRow } = await supabaseAdmin
          .from('lead_sources')
          .select('id')
          .ilike('name', '%facebook%')
          .limit(1)
          .single();

        await supabaseAdmin.from('leads').insert({
          lead_code:     `FB-${leadgenId.slice(-8)}`,
          customer_name: name,
          client_id:     clientId,
          phone:         phone || null,
          email:         email || null,
          status:        'new',
          source_id:     srcRow?.id ?? null,
          sla_status:    'green',
          comment:       `Автоимпорт из Facebook Lead Ads (leadgen_id: ${leadgenId})`,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}
