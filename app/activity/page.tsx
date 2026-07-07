'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchActivityLog, ACTION_LABEL, type ActivityLog } from '@/lib/activityService';
import { UserAvatar } from '@/components/user-avatar';

const ENTITY_ICON: Record<string, React.ReactNode> = {
  deal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  lead: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    </svg>
  ),
  task: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  client: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>
    </svg>
  ),
  comment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const ENTITY_COLOR: Record<string, string> = {
  deal: '#30d158',
  lead: '#0a84ff',
  task: '#bf5af2',
  client: '#d8b06a',
  comment: '#5ac8fa',
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

function buildDescription(log: ActivityLog): string {
  const action = ACTION_LABEL[log.action] ?? log.action;
  const payload = log.payload;
  if (!payload) return action;

  if (log.action === 'created_deal' || log.action === 'moved_deal') {
    const name = payload.customerName as string | undefined;
    if (log.action === 'moved_deal') {
      return `${action} "${name}" → ${payload.toStage}`;
    }
    return `${action} "${name}"`;
  }
  if (log.action === 'created_lead' || log.action === 'updated_lead') {
    return `${action} "${payload.customerName}"`;
  }
  if (log.action === 'created_task' || log.action === 'completed_task' || log.action === 'updated_task') {
    return `${action} "${payload.title}"`;
  }
  if (log.action === 'created_client') {
    return `${action} "${payload.name}"`;
  }
  if (log.action === 'created_comment') {
    return `${action} к задаче "${payload.taskTitle}"`;
  }
  return action;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchActivityLog(100).then(({ logs: l }) => {
      setLogs(l);
      setLoading(false);
    });
  }, []);

  const entities = ['all', 'deal', 'lead', 'task', 'client', 'comment'];
  const ENTITY_LABEL: Record<string, string> = {
    all: 'Все',
    deal: 'Сделки',
    lead: 'Лиды',
    task: 'Задачи',
    client: 'Клиенты',
    comment: 'Комментарии',
  };

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.entity === filter);

  // Group by date
  const grouped: { date: string; items: ActivityLog[] }[] = [];
  const dateMap = new Map<string, ActivityLog[]>();
  for (const log of filtered) {
    const d = new Date(log.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!dateMap.has(d)) dateMap.set(d, []);
    dateMap.get(d)!.push(log);
  }
  for (const [date, items] of dateMap) grouped.push({ date, items });

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.activity}>
      <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-10" style={{ color: 'var(--text-primary)' }}>
        <div className="mx-auto max-w-[800px] space-y-6">

          {/* Header */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Журнал</p>
            <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em' }}>Активность</h1>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
              {loading ? 'Загрузка...' : `${logs.length} событий`}
            </p>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-2">
              {entities.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setFilter(e)}
                  className="rounded-full px-3 py-1 text-[12px] font-semibold transition-all duration-150"
                  style={
                    filter === e
                      ? { background: '#d8b06a', color: '#000' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
                  }
                >
                  {ENTITY_LABEL[e]}
                </button>
              ))}
            </div>
          </section>

          {/* Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[24px] py-16 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Событий пока нет</p>
            </div>
          ) : (
            grouped.map(({ date, items }) => (
              <div key={date}>
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{date}</p>
                <div className="rounded-[20px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  {items.map((log, idx) => {
                    const color = ENTITY_COLOR[log.entity] ?? '#888';
                    const icon = ENTITY_ICON[log.entity];
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 px-5 py-4"
                        style={{ borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        {/* Avatar */}
                        <UserAvatar name={log.userName} avatarUrl={log.avatarUrl} size={34} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{log.userName}</span>
                            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{buildDescription(log)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{ background: `${color}18`, color }}
                            >
                              {icon}
                              {log.entity}
                            </span>
                            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(log.createdAt)}</span>
                          </div>
                        </div>

                        {/* Time */}
                        <span className="shrink-0 text-[12px] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                          {new Date(log.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
