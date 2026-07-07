async function send(text: string): Promise<void> {
  try {
    await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch {
    // Fire-and-forget — never block the UI on notification failure
  }
}

export async function notifyTelegram(text: string): Promise<void> {
  await send(text);
}

export async function notifyNewDeal(customerName: string, amount: number, stageName: string, managerName: string): Promise<void> {
  await send(
    `🤝 *Новая сделка*\n` +
    `Клиент: *${customerName}*\n` +
    `Сумма: *${amount.toLocaleString('ru-RU')} ₸*\n` +
    `Стадия: ${stageName}\n` +
    `Менеджер: ${managerName}`,
  );
}

export async function notifyDealStageChanged(customerName: string, fromStage: string, toStage: string, amount: number): Promise<void> {
  await send(
    `📊 *Сделка сменила стадию*\n` +
    `Клиент: *${customerName}*\n` +
    `${fromStage} → *${toStage}*\n` +
    `Сумма: ${amount.toLocaleString('ru-RU')} ₸`,
  );
}

export async function notifyNewLead(customerName: string, source: string, managerName: string): Promise<void> {
  await send(
    `🔔 *Новый лид*\n` +
    `Клиент: *${customerName}*\n` +
    `Источник: ${source || 'не указан'}\n` +
    `Менеджер: ${managerName}`,
  );
}

export async function notifyTaskDone(taskTitle: string, projectName: string, assigneeName: string): Promise<void> {
  await send(
    `✅ *Задача выполнена*\n` +
    `*${taskTitle}*\n` +
    `Объект: ${projectName || 'без объекта'}\n` +
    `Исполнитель: ${assigneeName}`,
  );
}

export async function notifyTaskOverdue(taskTitle: string, assigneeName: string, dueDateStr: string): Promise<void> {
  await send(
    `🚨 *Просроченная задача*\n` +
    `*${taskTitle}*\n` +
    `Исполнитель: ${assigneeName}\n` +
    `Срок был: ${dueDateStr}`,
  );
}
