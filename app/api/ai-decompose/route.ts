import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY не настроен' }, { status: 500 });
  }

  const { title, description, depth, productType, teamMembers, similarProjects } = await req.json();

  const depthMap: Record<string, string> = {
    minimal: 'минимальная (2-3 уровня, 5-8 этапов)',
    medium: 'средняя (3-4 уровня, 10-15 этапов)',
    maximum: 'максимальная (4-5 уровней, 20+ атомарных действий)',
  };

  const teamStr = (teamMembers ?? []).length > 0
    ? `\nКоманда компании: ${(teamMembers as string[]).join(', ')}`
    : '';
  const productStr = productType ? `\nТип продукта: ${productType}` : '';
  const descStr = description ? `\nОписание: ${description}` : '';
  const similarStr = (similarProjects ?? []).length > 0
    ? `\nПохожие завершённые проекты компании: ${(similarProjects as string[]).join(', ')}`
    : '';

  const prompt = `Ты — эксперт по управлению строительными и производственными проектами для казахстанской компании SAMRUQ Qurylys, которая занимается строительством, сэндвич-панелями и металлоконструкциями.

Задача: ${title}${descStr}${productStr}${teamStr}${similarStr}

Создай полную декомпозицию этой задачи. Уровень детализации: ${depthMap[depth] ?? depthMap.medium}.

Правила:
- Этапы должны идти в логическом порядке реализации
- Критические этапы — те, от которых зависит весь проект (обычно 2-4 штуки)
- Назначай ответственных только из списка команды (если список пустой — предлагай роль: "Руководитель проекта", "Снабженец" и т.д.)
- Риски — конкретные, применимые к этому проекту
- qualityScore — реалистичная оценка 60-95 (не всегда 100)

Верни ТОЛЬКО валидный JSON без markdown-блоков, строго в этом формате:
{
  "stages": [
    {
      "id": "1",
      "title": "Название этапа",
      "isCritical": false,
      "suggestedResponsible": "Имя или роль",
      "children": [
        {
          "id": "1.1",
          "title": "Подэтап",
          "isCritical": false,
          "suggestedResponsible": "Имя или роль",
          "children": []
        }
      ]
    }
  ],
  "risks": [
    "Конкретный риск №1",
    "Конкретный риск №2"
  ],
  "qualityScore": 82,
  "qualityIssues": [
    "Причина снижения оценки"
  ]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text;

    const result = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Ошибка AI' }, { status: 500 });
  }
}
