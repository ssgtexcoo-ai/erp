import * as XLSX from 'xlsx';

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function sheet(data: Record<string, unknown>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data);
  // Auto-width columns
  const cols = Object.keys(data[0] ?? {});
  ws['!cols'] = cols.map((key) => ({
    wch: Math.max(key.length, ...data.map((r) => String(r[key] ?? '').length), 10),
  }));
  return ws;
}

export function exportDealsToExcel(
  deals: Array<{
    id: number;
    customerName: string;
    amount: number;
    stage: string;
    assignedToName?: string;
    createdAt: string;
    updatedAt: string;
  }>,
) {
  const rows = deals.map((d) => ({
    'ID': d.id,
    'Клиент': d.customerName,
    'Сумма (₸)': d.amount,
    'Стадия': d.stage,
    'Менеджер': d.assignedToName ?? 'Не назначен',
    'Дата создания': new Date(d.createdAt).toLocaleDateString('ru-RU'),
    'Обновлено': new Date(d.updatedAt).toLocaleDateString('ru-RU'),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(rows), 'Сделки');
  download(wb, `сделки_${today()}.xlsx`);
}

export function exportLeadsToExcel(
  leads: Array<{
    id: number;
    customerName?: string | null;
    phone?: string | null;
    email?: string | null;
    status: string;
    sourceName?: string;
    assignedToName?: string;
    createdAt: string;
  }>,
) {
  const rows = leads.map((l) => ({
    'ID': l.id,
    'Клиент': l.customerName ?? '—',
    'Телефон': l.phone ?? '—',
    'Email': l.email ?? '—',
    'Статус': l.status,
    'Источник': l.sourceName ?? '—',
    'Менеджер': l.assignedToName ?? 'Не назначен',
    'Дата': new Date(l.createdAt).toLocaleDateString('ru-RU'),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(rows), 'Лиды');
  download(wb, `лиды_${today()}.xlsx`);
}

export function exportTasksToExcel(
  tasks: Array<{
    id: number;
    title: string;
    description?: string | null;
    status: string;
    priority?: string | null;
    assignedToName?: string;
    dueDate?: string | null;
    createdAt: string;
  }>,
) {
  const PRIORITY_MAP: Record<string, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' };
  const rows = tasks.map((t) => ({
    'ID': t.id,
    'Название': t.title,
    'Описание': t.description ?? '—',
    'Статус': t.status,
    'Приоритет': PRIORITY_MAP[t.priority ?? ''] ?? t.priority ?? '—',
    'Исполнитель': t.assignedToName ?? 'Не назначен',
    'Срок': t.dueDate ? new Date(t.dueDate).toLocaleDateString('ru-RU') : '—',
    'Создана': new Date(t.createdAt).toLocaleDateString('ru-RU'),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(rows), 'Задачи');
  download(wb, `задачи_${today()}.xlsx`);
}

export function exportClientsToExcel(
  clients: Array<{
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    contactCount: number;
    leadCount: number;
    createdAt: string;
  }>,
) {
  const rows = clients.map((c) => ({
    'ID': c.id,
    'Название': c.name,
    'Телефон': c.phone ?? '—',
    'Email': c.email ?? '—',
    'Адрес': c.address ?? '—',
    'Контактов': c.contactCount,
    'Лидов': c.leadCount,
    'Добавлен': new Date(c.createdAt).toLocaleDateString('ru-RU'),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet(rows), 'Клиенты');
  download(wb, `клиенты_${today()}.xlsx`);
}

function today(): string {
  return new Date().toLocaleDateString('ru-RU').replace(/\./g, '-');
}
