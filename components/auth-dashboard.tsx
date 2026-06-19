'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { fetchDashboardData, type DashboardProjectSummary } from '@/lib/dashboardService';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function formatDate() {
  return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getStatusColor(status: string) {
  if (status === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
  if (status === 'planning') return 'bg-sky-500/15 text-sky-300 border-sky-500/20';
  if (status === 'closed') return 'bg-slate-700 text-slate-400 border-slate-600';
  return 'bg-slate-700/60 text-slate-400 border-slate-600';
}

function getStatusLabel(status: string) {
  if (status === 'active') return 'В работе';
  if (status === 'planning') return 'Планирование';
  if (status === 'closed') return 'Завершён';
  return status;
}

const KPI_CONFIG = [
  {
    key: 'leadsCount',
    label: 'Активных лидов',
    href: '/leads',
    color: 'from-violet-500/20 to-violet-600/5',
    border: 'border-violet-500/20',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
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
    color: 'from-sky-500/20 to-sky-600/5',
    border: 'border-sky-500/20',
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-400',
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
    color: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
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
    color: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

const QUICK_ACTIONS = [
  { href: '/leads', label: '+ Лид', color: 'border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20' },
  { href: '/deals', label: '+ Сделка', color: 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20' },
  { href: '/kanban', label: '+ Задача', color: 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' },
  { href: '/projects', label: '+ Объект', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' },
  { href: '/documents', label: '+ Документ', color: 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20' },
];

export function AuthDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<Record<string, number> | null>(null);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [activeProjects, setActiveProjects] = useState<DashboardProjectSummary[]>([]);
  const [error, setError] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  useEffect(() => {
    const load = async () => {
      setDataLoading(true);
      const response = await fetchDashboardData();
      if (response.error || !response.data) {
        setError(response.error?.message ?? 'Ошибка загрузки');
        setDataLoading(false);
        return;
      }
      setDashboardData({
        leadsCount: response.data.leadsCount,
        dealsCount: response.data.dealsCount,
        activeTasksCount: response.data.activeTasksCount,
        projectsCount: response.data.projectsCount,
      });
      setPipelineValue(response.data.pipelineValue);
      setActiveProjects(response.data.activeProjects);
      setDataLoading(false);
    };
    load();
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1020]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[rgba(241,205,127,0.15)] border-t-[#f1cd7f]" />
          <p className="text-sm text-[#6b7280]">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b1020] px-8 py-8 text-[#e5e7eb]">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <section>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-[#6b7280] capitalize">{formatDate()}</p>
              <h1 className="mt-1 text-3xl font-semibold text-[#e5e7eb]">
                {getGreeting()}, <span className="text-[#f1cd7f]">{user.fullName.split(' ')[0]}</span>
              </h1>
              <p className="mt-1.5 text-sm text-[#4b5563]">Добро пожаловать в систему управления SAMRUQ Qurylys</p>
            </div>
            {pipelineValue > 0 && (
              <div className="mt-4 sm:mt-0 rounded-2xl border border-[rgba(241,205,127,0.12)] bg-[rgba(241,205,127,0.06)] px-5 py-3 text-right">
                <p className="text-xs uppercase tracking-widest text-[#9f804b]">Сумма воронки</p>
                <p className="mt-1 text-2xl font-bold text-[#f1cd7f]">{pipelineValue.toLocaleString('ru-RU')} ₸</p>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-rose-800/40 bg-rose-950/30 px-5 py-4 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CONFIG.map((kpi) => (
            <Link key={kpi.key} href={kpi.href} className="group">
              <article className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${kpi.border} ${kpi.color}`}>
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl p-2.5 ${kpi.iconBg}`}>
                    <span className={kpi.iconColor}>{kpi.icon}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-[#374151] transition group-hover:text-[#6b7280]">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="mt-4">
                  {dataLoading ? (
                    <div className="h-8 w-16 animate-pulse rounded-lg bg-white/5" />
                  ) : (
                    <p className="text-3xl font-bold text-[#e5e7eb]">{dashboardData?.[kpi.key] ?? 0}</p>
                  )}
                  <p className="mt-1 text-sm text-[#6b7280]">{kpi.label}</p>
                </div>
              </article>
            </Link>
          ))}
        </section>

        {/* Active Projects */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#e5e7eb]">Активные объекты</h2>
            <Link href="/projects" className="text-sm text-[#d8b06a] transition hover:text-[#f1cd7f]">
              Все объекты →
            </Link>
          </div>

          {dataLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : activeProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(241,205,127,0.1)] bg-[rgba(241,205,127,0.03)] p-10 text-center">
              <p className="text-sm text-[#4b5563]">Нет активных объектов</p>
              <Link href="/projects" className="mt-3 inline-block text-sm text-[#d8b06a] hover:text-[#f1cd7f]">+ Добавить объект</Link>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {activeProjects.map((project) => (
                <article key={project.id} className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111827]/60 p-5 transition hover:border-[rgba(241,205,127,0.12)] hover:bg-[#111827]/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[#e5e7eb]">{project.name}</h3>
                      <p className="mt-0.5 text-sm text-[#6b7280]">{project.clientName}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[rgba(255,255,255,0.04)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[#4b5563]">Бюджет</p>
                      <p className="mt-1 font-semibold text-[#d8b06a]">{Number(project.budget).toLocaleString('ru-RU')} ₸</p>
                    </div>
                    <div className="rounded-xl bg-[rgba(255,255,255,0.04)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[#4b5563]">Ответственный</p>
                      <p className="mt-1 truncate text-sm font-medium text-[#9ca3af]">{project.responsibleName ?? 'Не назначен'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-[#6b7280]">
                      <span>Этапы: {project.completedStages}/{project.stageCount}</span>
                      <span className="font-semibold text-[#d8b06a]">{project.stageProgress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#d8b06a] to-[#f1cd7f] transition-all duration-500"
                        style={{ width: `${project.stageProgress}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[#e5e7eb]">Быстрые действия</h2>
          <div className="flex flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-150 ${action.color}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Navigation shortcuts */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { href: '/gantt', label: 'Диаграмма Ганта', desc: 'Сроки всех объектов', icon: '📅' },
            { href: '/employee', label: 'Рейтинг сотрудников', desc: 'Баллы и мотивация', icon: '⭐' },
            { href: '/notifications', label: 'Уведомления', desc: 'События системы', icon: '🔔' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111827]/40 px-4 py-4 transition-all hover:border-[rgba(241,205,127,0.12)] hover:bg-[#111827]/70"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#e5e7eb] group-hover:text-[#f1cd7f] transition-colors">{item.label}</p>
                <p className="text-xs text-[#4b5563]">{item.desc}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="ml-auto h-4 w-4 text-[#374151] transition group-hover:translate-x-0.5 group-hover:text-[#9f804b]">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </section>

      </div>
    </main>
  );
}