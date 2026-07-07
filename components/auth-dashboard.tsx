'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { fetchDashboardData, type DashboardProjectSummary, type FunnelStage, type RecentLead } from '@/lib/dashboardService';
import { fetchTodayFollowUps, type LeadWithDetails } from '@/lib/leadService';
import { UserAvatar } from '@/components/user-avatar';
import { subscribeToTable } from '@/lib/realtimeService';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}
function formatDate() {
  return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₸`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K ₸`;
  return `${n} ₸`;
}

const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  new:        { label: 'Новый',          color: '#0a84ff' },
  in_work:    { label: 'В работе',       color: '#ff9f0a' },
  qualified:  { label: 'Квалифицирован', color: '#30d158' },
  rejected:   { label: 'Отказ',         color: '#ff453a' },
  closed:     { label: 'Закрыт',        color: '#6e6e73' },
};

const FUNNEL_COLORS = ['#d8b06a','#e8c27a','#bf8f4e','#0a84ff','#30d158','#ff9f0a','#bf5af2'];

const KPI_CONFIG = [
  {
    key: 'leadsCount',
    label: 'Активных лидов',
    href: '/leads',
    color: '#bf5af2',
    bg: 'rgba(191,90,242,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'dealsCount',
    label: 'Сделок в воронке',
    href: '/deals',
    color: '#0a84ff',
    bg: 'rgba(10,132,255,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    key: 'activeTasksCount',
    label: 'Активных задач',
    href: '/kanban',
    color: '#ff9f0a',
    bg: 'rgba(255,159,10,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="3" width="5" height="18" rx="1.5" />
        <rect x="9.5" y="3" width="5" height="12" rx="1.5" />
        <rect x="16" y="3" width="5" height="15" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'projectsCount',
    label: 'Объектов',
    href: '/projects',
    color: '#30d158',
    bg: 'rgba(48,209,88,0.12)',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-white/5 ${className ?? ''}`} />;
}

// ─── Deal funnel chart ────────────────────────────────────────────────────────
function DealFunnel({ stages, loading }: { stages: FunnelStage[]; loading: boolean }) {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <section className="rounded-[22px] p-6" style={{ background: 'var(--bg-card)' }}>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Воронка сделок
        </h2>
        <Link href="/deals" className="text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: '#d8b06a' }}>
          Все сделки →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-9" />)}
        </div>
      ) : stages.length === 0 ? (
        <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет сделок</p>
      ) : (
        <div className="space-y-2.5">
          {stages.map((s, i) => {
            const pct = Math.max(4, (s.count / maxCount) * 100);
            const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
            return (
              <div key={s.stageId} className="group flex items-center gap-3">
                <span className="w-[130px] shrink-0 truncate text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {s.stageName}
                </span>
                <div className="relative flex-1 overflow-hidden rounded-full" style={{ height: 28, background: 'var(--bg-input)' }}>
                  <div
                    className="flex h-full items-center px-3 transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}cc, ${color})`,
                      borderRadius: '999px',
                      minWidth: 60,
                    }}
                  >
                    <span className="text-[11px] font-bold text-black/80 whitespace-nowrap">
                      {s.count} {s.count === 1 ? 'сделка' : s.count < 5 ? 'сделки' : 'сделок'}
                    </span>
                  </div>
                </div>
                <span className="w-[90px] shrink-0 text-right text-[12px] font-semibold tabular-nums" style={{ color }}>
                  {fmtMoney(s.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Recent leads ─────────────────────────────────────────────────────────────
function RecentLeads({ leads, loading }: { leads: RecentLead[]; loading: boolean }) {
  return (
    <section className="rounded-[22px] p-6" style={{ background: 'var(--bg-card)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
          Последние лиды
        </h2>
        <Link href="/leads" className="text-[12px] font-medium transition-opacity hover:opacity-70" style={{ color: '#d8b06a' }}>
          Все лиды →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-11" />)}
        </div>
      ) : leads.length === 0 ? (
        <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет лидов</p>
      ) : (
        <div className="space-y-1">
          {leads.map(lead => {
            const st = LEAD_STATUS[lead.status] ?? { label: lead.status, color: '#888' };
            return (
              <Link key={lead.id} href="/leads"
                className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors duration-150"
                style={{ ':hover': { background: 'var(--bg-hover)' } } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {lead.customerName || '—'}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    {lead.assignedToName ?? 'Не назначен'} · {timeAgo(lead.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${st.color}18`, color: st.color }}>
                  {st.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────
function getStatusLabel(s: string) {
  if (s === 'active')   return 'В работе';
  if (s === 'planning') return 'Планирование';
  if (s === 'closed')   return 'Завершён';
  return s;
}
function getStatusColor(s: string) {
  if (s === 'active')   return '#30d158';
  if (s === 'planning') return '#0a84ff';
  return '#6e6e73';
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AuthDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [kpis, setKpis]                   = useState<Record<string, number> | null>(null);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [overdueCount, setOverdueCount]   = useState(0);
  const [activeProjects, setActiveProjects] = useState<DashboardProjectSummary[]>([]);
  const [funnelStages, setFunnelStages]   = useState<FunnelStage[]>([]);
  const [recentLeads, setRecentLeads]     = useState<RecentLead[]>([]);
  const [dataLoading, setDataLoading]     = useState(true);
  const [error, setError]                 = useState('');
  const [followUps, setFollowUps]         = useState<LeadWithDetails[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      setDataLoading(true);
      const [res, fuRes] = await Promise.all([
        fetchDashboardData(),
        fetchTodayFollowUps(),
      ]);
      setFollowUps(fuRes.leads);
      if (res.error || !res.data) {
        setError(res.error?.message ?? 'Ошибка загрузки');
        setDataLoading(false);
        return;
      }
      const d = res.data;
      setKpis({ leadsCount: d.leadsCount, dealsCount: d.dealsCount, activeTasksCount: d.activeTasksCount, projectsCount: d.projectsCount });
      setPipelineValue(d.pipelineValue);
      setOverdueCount(d.overdueTasksCount);
      setActiveProjects(d.activeProjects);
      setFunnelStages(d.funnelStages);
      setRecentLeads(d.recentLeads);
      setDataLoading(false);
    };

    const reload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(load, 800);
    };

    load();

    const unsubs = [
      subscribeToTable('leads', reload),
      subscribeToTable('deals', reload),
      subscribeToTable('tasks', reload),
      subscribeToTable('projects', reload),
    ];

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubs.forEach((u) => u());
    };
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-[1.5px]"
          style={{ borderColor: 'rgba(216,176,106,0.12)', borderTopColor: '#d8b06a' }} />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 sm:py-8 xl:px-10" style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      <div className="mx-auto max-w-[1180px] space-y-5">

        {/* ── Hero ── */}
        <section>
          <p className="mb-1.5 text-[13px]" style={{ color: 'var(--text-tertiary)', letterSpacing: '-0.01em' }}>{formatDate()}</p>
          <h1 className="text-[42px] font-bold leading-[1.06]" style={{ letterSpacing: '-0.045em', color: 'var(--text-primary)' }}>
            {getGreeting()},{' '}
            <span style={{ color: '#d8b06a' }}>{user.fullName.split(' ')[0]}</span>
          </h1>
        </section>

        {error && (
          <div className="rounded-[14px] px-4 py-3 text-[13px]"
            style={{ background: 'rgba(255,69,58,0.10)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.18)' }}>
            {error}
          </div>
        )}

        {/* ── Follow-ups ── */}
        {followUps.length > 0 && (
          <div className="rounded-[18px] p-5 space-y-2" style={{ background: 'rgba(10,132,255,0.07)', border: '1px solid rgba(10,132,255,0.2)' }}>
            <p className="text-[13px] font-semibold" style={{ color: '#409cff' }}>📞 Сегодня нужно позвонить ({followUps.length})</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {followUps.map(lead => (
                <div key={lead.id} className="flex items-center justify-between rounded-[12px] px-4 py-2.5"
                  style={{ background: 'rgba(10,132,255,0.10)' }}>
                  <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{lead.customerName}</p>
                    {lead.followUpNote && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{lead.followUpNote}</p>}
                  </div>
                  <Link href="/leads" className="text-[12px] font-medium" style={{ color: '#409cff' }}>Открыть →</Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Row 1: pipeline + KPIs ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Pipeline + overdue */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <div className="flex flex-1 flex-col justify-between rounded-[22px] p-6" style={{ background: 'var(--bg-card)' }}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-tertiary)' }}>Сумма воронки</p>
                {dataLoading ? <Skeleton className="mt-3 h-10 w-36" /> : (
                  <p className="mt-2 text-[36px] font-bold" style={{ letterSpacing: '-0.045em', color: '#d8b06a' }}>
                    {pipelineValue > 0 ? fmtMoney(pipelineValue) : '—'}
                  </p>
                )}
              </div>
              <Link href="/deals" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium hover:opacity-70" style={{ color: '#d8b06a' }}>
                Воронка сделок
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Overdue tasks warning */}
            <Link href="/kanban"
              className="flex items-center gap-3 rounded-[18px] px-5 py-4 transition-opacity hover:opacity-80"
              style={{
                background: overdueCount > 0 ? 'rgba(255,69,58,0.10)' : 'var(--bg-card)',
                border: overdueCount > 0 ? '1px solid rgba(255,69,58,0.25)' : '1px solid var(--border)',
              }}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: overdueCount > 0 ? 'rgba(255,69,58,0.15)' : 'var(--bg-input)', color: overdueCount > 0 ? '#ff453a' : 'var(--text-tertiary)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                {dataLoading ? <Skeleton className="h-5 w-12" /> : (
                  <p className="text-[20px] font-bold leading-none" style={{ color: overdueCount > 0 ? '#ff453a' : 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {overdueCount}
                  </p>
                )}
                <p className="mt-0.5 text-[11px]" style={{ color: overdueCount > 0 ? '#ff453a' : 'var(--text-tertiary)', fontWeight: 500 }}>
                  {overdueCount > 0 ? 'просроченных задач' : 'Просроченных задач нет'}
                </p>
              </div>
            </Link>
          </div>

          {/* 2x2 KPI tiles */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {KPI_CONFIG.map(kpi => (
              <Link key={kpi.key} href={kpi.href}
                className="group flex flex-col justify-between rounded-[22px] p-5 transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-card)', minHeight: 100 }}>
                <div className="flex items-center justify-between">
                  <div className="rounded-[10px] p-2.5" style={{ background: kpi.bg, color: kpi.color }}>{kpi.icon}</div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    style={{ color: 'var(--border)' }}>
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="mt-3">
                  {dataLoading ? <Skeleton className="h-7 w-10" /> : (
                    <p className="text-[30px] font-bold leading-none" style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>
                      {kpis?.[kpi.key] ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Row 2: Deal funnel (full width) ── */}
        <DealFunnel stages={funnelStages} loading={dataLoading} />

        {/* ── Row 3: Active projects ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold" style={{ letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
              Активные объекты
            </h2>
            <Link href="/projects" className="text-[12px] font-medium hover:opacity-70" style={{ color: '#d8b06a' }}>
              Все объекты →
            </Link>
          </div>

          {dataLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[1,2].map(i => <Skeleton key={i} className="h-40 rounded-[22px]" />)}
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="rounded-[22px] p-10 text-center" style={{ background: 'var(--bg-card)' }}>
              <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>Нет активных объектов</p>
              <Link href="/projects" className="mt-2 inline-block text-[13px] font-medium hover:opacity-70" style={{ color: '#d8b06a' }}>
                + Добавить объект
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {activeProjects.map(project => (
                <article key={project.id} className="rounded-[22px] p-6" style={{ background: 'var(--bg-card)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{project.name}</h3>
                      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{project.clientName}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                      style={{ background: `${getStatusColor(project.status)}18`, color: getStatusColor(project.status) }}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-[12px] p-3" style={{ background: 'var(--bg-input)' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Бюджет</p>
                      <p className="mt-1 text-[14px] font-semibold" style={{ color: '#d8b06a', letterSpacing: '-0.02em' }}>
                        {Number(project.budget).toLocaleString('ru-RU')} ₸
                      </p>
                    </div>
                    <div className="rounded-[12px] p-3" style={{ background: 'var(--bg-input)' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Ответственный</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <UserAvatar name={project.responsibleName ?? '?'} avatarUrl={project.responsibleAvatarUrl} size={20} />
                        <p className="truncate text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {project.responsibleName ?? 'Не назначен'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: 'var(--text-tertiary)' }}>Этапы: {project.completedStages}/{project.stageCount}</span>
                      <span className="font-semibold" style={{ color: '#d8b06a' }}>{project.stageProgress}%</span>
                    </div>
                    <div className="mt-1.5 h-[3px] overflow-hidden rounded-full" style={{ background: 'var(--bg-input)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.stageProgress}%`, background: 'linear-gradient(90deg,#d8b06a,#f1cd7f)' }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Row 4: Recent leads + Quick actions ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

          {/* Recent leads */}
          <div className="lg:col-span-3">
            <RecentLeads leads={recentLeads} loading={dataLoading} />
          </div>

          {/* Quick actions + nav */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-[22px] p-5" style={{ background: 'var(--bg-card)' }}>
              <p className="mb-3 text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Быстрые действия</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { href: '/leads',     label: 'Новый лид',      color: '#bf5af2' },
                  { href: '/deals',     label: 'Новая сделка',   color: '#0a84ff' },
                  { href: '/kanban',    label: 'Новая задача',   color: '#ff9f0a' },
                  { href: '/projects',  label: 'Новый объект',   color: '#30d158' },
                  { href: '/documents', label: 'Новый документ', color: '#ff453a' },
                ].map(a => (
                  <Link key={a.href} href={a.href}
                    className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-medium transition-opacity hover:opacity-80"
                    style={{ background: `${a.color}12`, color: a.color }}>
                    <span className="text-[15px] font-light leading-none">+</span>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { href: '/gantt',     label: 'Диаграмма Ганта',     desc: 'Сроки всех объектов',      color: '#0a84ff', bg: 'rgba(10,132,255,0.12)' },
                { href: '/employee',  label: 'Рейтинг сотрудников', desc: 'Баллы и мотивация',         color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)' },
                { href: '/notifications', label: 'Уведомления',     desc: 'Последние события',         color: '#30d158', bg: 'rgba(48,209,88,0.12)' },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="group flex items-center gap-3 rounded-[18px] px-4 py-3 transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bg-card)' }}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                    style={{ background: item.bg, color: item.color }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
