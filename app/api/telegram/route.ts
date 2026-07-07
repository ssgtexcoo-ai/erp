import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ ok: false, reason: 'Telegram not configured' });
  }

  const { text } = (await req.json()) as { text?: string };
  if (!text) {
    return NextResponse.json({ ok: false, reason: 'No text provided' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    return NextResponse.json({ ok: data.ok });
  } catch {
    return NextResponse.json({ ok: false, reason: 'Telegram API unreachable' }, { status: 500 });
  }
}