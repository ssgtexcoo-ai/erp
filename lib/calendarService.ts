import { supabase } from '@/lib/supabaseClient';

export type CalendarEventType = 'task' | 'project_start' | 'project_end' | 'stage_start' | 'stage_end';

export interface CalendarEvent {
  id: number;
  type: CalendarEventType;
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  color: string;
}

const COLOR: Record<CalendarEventType, string> = {
  task: '#bf5af2',
  project_start: '#0a84ff',
  project_end: '#d8b06a',
  stage_start: '#5ac8fa',
  stage_end: '#ff9f0a',
};

function pad(y: number, m: number): { from: string; to: string } {
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export async function fetchCalendarEvents(year: number, month: number): Promise<{ events: CalendarEvent[]; error: Error | null }> {
  const { from, to } = pad(year, month);

  const [tasksRes, projectsRes, stagesRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, due_date, priority')
      .gte('due_date', from)
      .lte('due_date', to)
      .not('due_date', 'is', null),
    supabase
      .from('projects')
      .select('id, name, start_date, end_date, status')
      .lte('start_date', to)
      .gte('end_date', from),
    supabase
      .from('project_stages')
      .select('id, name, start_date, end_date, project_id')
      .lte('start_date', to)
      .gte('end_date', from),
  ]);

  const events: CalendarEvent[] = [];

  for (const row of (tasksRes.data ?? []) as Array<Record<string, unknown>>) {
    const date = row.due_date as string;
    if (date >= from && date <= to) {
      events.push({
        id: row.id as number,
        type: 'task',
        title: row.title as string,
        subtitle: `Задача · ${row.status}`,
        date,
        color: COLOR.task,
      });
    }
  }

  for (const row of (projectsRes.data ?? []) as Array<Record<string, unknown>>) {
    const startDate = row.start_date as string | null;
    const endDate = row.end_date as string | null;
    if (startDate && startDate >= from && startDate <= to) {
      events.push({
        id: row.id as number,
        type: 'project_start',
        title: row.name as string,
        subtitle: 'Начало объекта',
        date: startDate,
        color: COLOR.project_start,
      });
    }
    if (endDate && endDate >= from && endDate <= to) {
      events.push({
        id: row.id as number,
        type: 'project_end',
        title: row.name as string,
        subtitle: 'Конец объекта',
        date: endDate,
        color: COLOR.project_end,
      });
    }
  }

  for (const row of (stagesRes.data ?? []) as Array<Record<string, unknown>>) {
    const startDate = row.start_date as string | null;
    const endDate = row.end_date as string | null;
    if (startDate && startDate >= from && startDate <= to) {
      events.push({
        id: row.id as number,
        type: 'stage_start',
        title: row.name as string,
        subtitle: 'Начало этапа',
        date: startDate,
        color: COLOR.stage_start,
      });
    }
    if (endDate && endDate >= from && endDate <= to) {
      events.push({
        id: row.id as number,
        type: 'stage_end',
        title: row.name as string,
        subtitle: 'Конец этапа',
        date: endDate,
        color: COLOR.stage_end,
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return { events, error: null };
}
