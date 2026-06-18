'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchProjects, type ProjectUser, type ProjectWithDetails } from '@/lib/projectService';
import { fetchTasks, type TaskWithAssignee } from '@/lib/taskService';

type DateRange = {
  start: string;
  end: string;
};

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: Date | null) {
  if (!value) return '—';
  return value.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getProgressPercent(tasks: TaskWithAssignee[]) {
  if (!tasks.length) return 0;
  const complete = tasks.filter((task) => task.status === 'Выполнено').length;
  return Math.round((complete / tasks.length) * 100);
}

function formatProjectStatus(status: string) {
  if (status === 'active') return 'В работе';
  if (status === 'planning') return 'Планирование';

  return status
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRangeBounds(projects: ProjectWithDetails[], tasks: TaskWithAssignee[]) {
  const dates = [
    ...projects.flatMap((project) => [toDate(project.startDate), toDate(project.endDate)]),
    ...tasks.map((task) => toDate(task.dueDate)),
  ].filter((date): date is Date => Boolean(date));

  if (!dates.length) {
    const today = new Date();
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    };
  }

  const start = new Date(Math.min(...dates.map((date) => date.getTime())));
  const end = new Date(Math.max(...dates.map((date) => date.getTime())));
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function getOffsetPercent(date: Date | null, bounds: DateRange) {
  const start = toDate(bounds.start);
  const end = toDate(bounds.end);
  if (!date || !start || !end) return 0;

  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;

  return clamp(((date.getTime() - start.getTime()) / total) * 100, 0, 100);
}

function getWidthPercent(startDate: Date | null, endDate: Date | null, bounds: DateRange) {
  const start = toDate(bounds.start);
  const end = toDate(bounds.end);
  if (!startDate || !endDate || !start || !end) return 0;

  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;

  return clamp(((endDate.getTime() - startDate.getTime()) / total) * 100, 1, 100);
}

function buildTimelineTicks(bounds: DateRange) {
  const start = toDate(bounds.start);
  const end = toDate(bounds.end);
  if (!start || !end) return [] as Date[];

  const ticks: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    ticks.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return ticks;
}

export default function GanttPage() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateRange>({ start: '', end: '' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [projectsResponse, tasksResponse] = await Promise.all([fetchProjects(), fetchTasks()]);

      if (projectsResponse.error || tasksResponse.error) {
        setError((projectsResponse.error || tasksResponse.error)?.message ?? 'Не удалось загрузить данные');
        setProjects([]);
        setTasks([]);
        setUsers([]);
      } else {
        setProjects(projectsResponse.projects);
        setTasks(tasksResponse.tasks);
        setUsers(projectsResponse.users ?? []);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const visibleStatuses = useMemo(() => Array.from(new Set(projects.map((project) => project.status))).sort(), [projects]);

  const responsibleOptions = useMemo(() => {
    const map = new Map<number, string>();

    users.forEach((user) => {
      map.set(user.id, user.full_name);
    });

    projects.forEach((project) => {
      if (project.responsibleId && project.responsibleName) {
        map.set(project.responsibleId, project.responsibleName);
      }
    });

    return Array.from(map.entries()).map(([id, fullName]) => ({ id, fullName }));
  }, [projects, users]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const startBoundary = dateFilter.start ? toDate(dateFilter.start) : null;
    const endBoundary = dateFilter.end ? toDate(dateFilter.end) : null;

    return projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
      if (responsibleFilter !== 'all' && String(project.responsibleId ?? '') !== responsibleFilter) return false;

      if (startBoundary || endBoundary) {
        const projectStart = toDate(project.startDate);
        const projectEnd = toDate(project.endDate);

        if (startBoundary && projectEnd && projectEnd < startBoundary) return false;
        if (endBoundary && projectStart && projectStart > endBoundary) return false;
      }

      if (!query) return true;

      return [project.name, project.clientName, project.responsibleName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [dateFilter.end, dateFilter.start, projects, responsibleFilter, searchQuery, statusFilter]);

  const filteredTasks = useMemo(() => {
    const projectIds = new Set(filteredProjects.map((project) => project.id));
    return tasks.filter((task) => projectIds.has(task.projectId));
  }, [filteredProjects, tasks]);

  const timelineBounds = useMemo(() => getRangeBounds(filteredProjects, filteredTasks), [filteredProjects, filteredTasks]);
  const timelineTicks = useMemo(() => buildTimelineTicks(timelineBounds), [timelineBounds]);

  const totalBudget = filteredProjects.reduce((sum, project) => sum + Number(project.budget ?? 0), 0);
  const activeTasks = filteredTasks.filter((task) => task.status !== 'Выполнено');
  const overdueTasks = filteredTasks.filter((task) => {
    const dueDate = toDate(task.dueDate);
    return Boolean(dueDate && task.status !== 'Выполнено' && dueDate.getTime() < Date.now());
  });

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.gantt}>
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <h1 className="text-3xl font-semibold">Диаграмма Ганта</h1>
            <p className="mt-3 text-slate-400">
              Таймлайн по объектам, задачам и срокам. Срез собран на текущих проектах, без новой схемы данных.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Проекты</p>
              <p className="mt-3 text-3xl font-semibold text-white">{filteredProjects.length}</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Активные задачи</p>
              <p className="mt-3 text-3xl font-semibold text-white">{activeTasks.length}</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Просрочено</p>
              <p className="mt-3 text-3xl font-semibold text-white">{overdueTasks.length}</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Бюджет</p>
              <p className="mt-3 text-3xl font-semibold text-white">{totalBudget.toLocaleString('ru-RU')} ₸</p>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20">
            <div className="grid gap-4 xl:grid-cols-4">
              <label className="space-y-2 text-sm text-slate-300">
                Поиск
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Проект, клиент, ответственный"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-600"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                Статус
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="all">Все статусы</option>
                  {visibleStatuses.map((status) => (
                    <option key={status} value={status} className="bg-slate-950 text-slate-100">
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                Ответственный
                <select
                  value={responsibleFilter}
                  onChange={(event) => setResponsibleFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="all">Все</option>
                  {responsibleOptions.map((item) => (
                    <option key={item.id} value={String(item.id)} className="bg-slate-950 text-slate-100">
                      {item.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                Диапазон дат
                <input
                  type="date"
                  value={dateFilter.start}
                  onChange={(event) => setDateFilter((current) => ({ ...current, start: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-300 xl:col-start-4">
                До
                <input
                  type="date"
                  value={dateFilter.end}
                  onChange={(event) => setDateFilter((current) => ({ ...current, end: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sky-100">Проект</span>
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-violet-100">Задача</span>
              <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-100">Просрочено</span>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">План проекта</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Полоса проекта показывает окно работ, а маркеры ниже отражают дедлайны задач внутри него.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-slate-500">
                <span>{formatDate(timelineBounds.start)}</span>
                <span>—</span>
                <span>{formatDate(timelineBounds.end)}</span>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 text-slate-300">Загрузка проектов...</div>
            ) : error ? (
              <div className="mt-6 text-red-400">{error}</div>
            ) : !filteredProjects.length ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-slate-400">
                По заданным фильтрам ничего не найдено.
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="hidden lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6 lg:px-2 lg:text-xs lg:uppercase lg:tracking-[0.25em] lg:text-slate-500">
                  <div>Проект</div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(timelineTicks.length, 1)}, minmax(88px, 1fr))` }}>
                    {timelineTicks.map((tick) => (
                      <div key={tick.toISOString()} className="text-center">
                        {formatDate(tick)}
                      </div>
                    ))}
                  </div>
                </div>

                {filteredProjects.map((project) => {
                  const projectTasks = filteredTasks.filter((task) => task.projectId === project.id);
                  const progressPercent = getProgressPercent(projectTasks);
                  const projectStart = toDate(project.startDate) ?? timelineBounds.start;
                  const projectEnd = toDate(project.endDate) ?? timelineBounds.end;
                  const projectOffset = getOffsetPercent(projectStart, timelineBounds);
                  const projectWidth = Math.max(3, getWidthPercent(projectStart, projectEnd, timelineBounds));
                  const taskRows = projectTasks.filter((task) => toDate(task.dueDate));
                  const trackHeight = Math.max(140, 84 + taskRows.length * 28);

                  return (
                    <article key={project.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-100">{project.name}</h3>
                              <p className="mt-2 text-sm text-slate-400">Клиент: {project.clientName}</p>
                              <p className="mt-1 text-sm text-slate-500">Ответственный: {project.responsibleName ?? 'Не назначен'}</p>
                            </div>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{formatProjectStatus(project.status)}</span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-3xl bg-slate-900 p-4">
                              <p className="text-sm text-slate-400">Сроки</p>
                              <p className="mt-2 text-sm font-semibold text-slate-100">
                                {formatDate(projectStart)} — {formatDate(projectEnd)}
                              </p>
                            </div>
                            <div className="rounded-3xl bg-slate-900 p-4">
                              <p className="text-sm text-slate-400">Этапы</p>
                              <p className="mt-2 text-sm font-semibold text-slate-100">{project.stageProgress}%</p>
                              <p className="mt-1 text-xs text-slate-500">{project.completedStages}/{project.stageCount} завершено</p>
                            </div>
                          </div>

                          <div className="rounded-3xl bg-slate-900 p-4">
                            <p className="text-sm text-slate-400">Бюджет</p>
                            <p className="mt-2 text-lg font-semibold text-slate-100">{Number(project.budget ?? 0).toLocaleString('ru-RU')} ₸</p>
                            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                              <div className="h-full rounded-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <p className="mt-2 text-sm text-slate-400">Завершено задач: {progressPercent}%</p>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80" style={{ minHeight: `${trackHeight}px` }}>
                            <div className="absolute inset-0 flex">
                              {timelineTicks.map((tick) => (
                                <div key={tick.toISOString()} className="flex-1 border-r border-slate-800/60 last:border-r-0" />
                              ))}
                            </div>

                            <div
                              className="absolute top-4 h-6 rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 shadow-lg shadow-sky-500/20"
                              style={{ left: `${projectOffset}%`, width: `${projectWidth}%` }}
                            />
                            <div
                              className="absolute top-4 h-6 rounded-full border border-sky-300/50 bg-sky-400/20"
                              style={{ left: `${projectOffset}%`, width: `${projectWidth}%` }}
                            />

                            {projectTasks.map((task, index) => {
                              const dueDate = toDate(task.dueDate);
                              if (!dueDate) return null;

                              const taskOffset = getOffsetPercent(dueDate, timelineBounds);
                              const isLate = task.status !== 'Выполнено' && dueDate.getTime() < Date.now();

                              return (
                                <div
                                  key={task.id}
                                  className="absolute"
                                  style={{ left: `${taskOffset}%`, top: `${72 + index * 28}px` }}
                                >
                                  <div className="flex -translate-x-1/2 flex-col items-center gap-1 text-center">
                                    <span className={`h-4 w-px ${isLate ? 'bg-rose-400' : 'bg-violet-300'}`} />
                                    <span
                                      className={`max-w-[200px] rounded-full border px-3 py-1 text-[11px] shadow-lg shadow-slate-950/40 ${
                                        isLate
                                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-100'
                                          : 'border-violet-500/40 bg-violet-500/15 text-violet-100'
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                      {task.assignedToName ?? 'Не назначен'} · {formatDate(dueDate)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/75 px-4 py-3 text-sm text-slate-300">
                              <span>Задач в проекте: {projectTasks.length}</span>
                              <span>Активных: {projectTasks.filter((task) => task.status !== 'Выполнено').length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
