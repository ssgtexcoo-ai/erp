'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { fetchDashboardData, type DashboardProjectSummary } from '@/lib/dashboardService';

export function AuthDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<{
    leadsCount: number;
    pipelineValue: number;
    activeTasksCount: number;
    projectsCount: number;
  } | null>(null);
  const [activeProjects, setActiveProjects] = useState<DashboardProjectSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, router, user]);

  useEffect(() => {
    const loadDashboard = async () => {
      const response = await fetchDashboardData();
      if (response.error || !response.data) {
        setError(response.error?.message ?? 'Ошибка загрузки дашборда');
        setDashboardData(null);
        setActiveProjects([]);
        return;
      }

      setDashboardData({
        leadsCount: response.data.leadsCount,
        pipelineValue: response.data.pipelineValue,
        activeTasksCount: response.data.activeTasksCount,
        projectsCount: response.data.projectsCount,
      });
      setActiveProjects(response.data.activeProjects);
    };

    loadDashboard();
  }, []);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/90 p-10 text-center text-slate-300 shadow-2xl shadow-slate-950/30">
          Загрузка профиля...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-400">Дашборд директора</p>
              <h1 className="mt-3 text-4xl font-semibold">Добро пожаловать, {user.fullName}</h1>
              <p className="mt-3 text-slate-400">Роль: {user.roleName}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              Выйти
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-3xl border border-red-700 bg-red-950/40 p-6 text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Активные лиды</p>
            <p className="mt-4 text-3xl font-semibold">{dashboardData?.leadsCount ?? '—'}</p>
          </article>
          <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Сумма воронки</p>
            <p className="mt-4 text-3xl font-semibold">
              {dashboardData ? dashboardData.pipelineValue.toLocaleString('ru-RU') : '—'} ₸
            </p>
          </article>
          <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Выполняется задач</p>
            <p className="mt-4 text-3xl font-semibold">{dashboardData?.activeTasksCount ?? '—'}</p>
          </article>
        </section>

        <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8">
          <h2 className="text-xl font-semibold">Активные объекты</h2>
          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {activeProjects.length > 0 ? (
              activeProjects.map((project) => (
                <article key={project.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                  <h3 className="text-lg font-semibold text-slate-100">{project.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">Клиент: {project.clientName}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                    <span>Бюджет: {project.budget.toLocaleString('ru-RU')} ₸</span>
                    <span>Статус: {project.status}</span>
                    <span>Ответственный: {project.responsibleName}</span>
                  </div>
                  <div className="mt-4 rounded-3xl bg-slate-900 p-4">
                    <p className="text-sm text-slate-400">Этапы: {project.completedStages}/{project.stageCount}</p>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${project.stageProgress}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Прогресс этапов: {project.stageProgress}%</p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-400">Нет активных объектов для отображения.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
