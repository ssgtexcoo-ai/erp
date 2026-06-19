'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchProjects, type ProjectUser, type ProjectWithDetails } from '@/lib/projectService';
import { fetchTasks, type TaskWithAssignee } from '@/lib/taskService';

type DateRange = { start: string; end: string };

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: Date | null | string | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? toDate(value) : value;
  if (!d) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function getProgressPercent(tasks: TaskWithAssignee[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === 'Выполнено').length / tasks.length) * 100);
}

function getStatusLabel(status: string) {
  if (status === 'active') return 'В работе';
  if (status === 'planning') return 'Планирование';
  if (status === 'closed') return 'Завершён';
  return status;
}

function getStatusBadgeClass(status: string) {
  if (status === 'active') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20';
  if (status === 'planning') return 'bg-sky-500/15 text-sky-300 border-sky-500/20';
  if (status === 'closed') return 'bg-slate-700 text-slate-400 border-slate-600';
  return 'bg-slate-800 text-slate-300 border-slate-700';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  'bg-sky-600', 'bg-violet-600', 'bg-emerald-600',
  'bg-rose-600', 'bg-amber-600', 'bg-cyan-600', 'bg-fuchsia-600',
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function getRangeBounds(projects: ProjectWithDetails[], tasks: TaskWithAssignee[]) {
  const dates = [
    ...projects.flatMap((p) => [toDate(p.startDate), toDate(p.endDate)]),
    ...tasks.map((t) => toDate(t.dueDate)),
  ].filter((d): d is Date => Boolean(d));

  if (!dates.length) {
    const today = new Date();
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 2, 0) };
  }

  const start = new Date(Math.min(...dates.map((d) => d.getTime())));
  const end = new Date(Math.max(...dates.map((d) => d.getTime())));
  start.setDate(start.getDate() - 7);
  end.setDate(end.getDate() + 14);
  return { start, end };
}

function getOffsetPercent(date: Date | null, bounds: { start: Date; end: Date }) {
  if (!date) return 0;
  const total = bounds.end.getTime() - bounds.start.getTime();
  if (total <= 0) return 0;
  return clamp(((date.getTime() - bounds.start.getTime()) / total) * 100, 0, 100);
}

function getWidthPercent(s: Date | null, e: Date | null, bounds: { start: Date; end: Date }) {
  if (!s || !e) return 0;
  const total = bounds.end.getTime() - bounds.start.getTime();
  if (total <= 0) return 0;
  return clamp(((e.getTime() - s.getTime()) / total) * 100, 1, 100);
}

function buildTicks(bounds: { start: Date; end: Date }) {
  const ticks: Date[] = [];
  const cursor = new Date(bounds.start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= bounds.end) {
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
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [hoveredTask, setHoveredTask] = useState<{ task: TaskWithAssignee; x: number; y: number } | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignee | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pr, tr] = await Promise.all([fetchProjects(), fetchTasks()]);
      if (pr.error || tr.error) {
        setError((pr.error || tr.error)?.message ?? 'Ошибка загрузки');
      } else {
        setProjects(pr.projects);
        setTasks(tr.tasks);
        setUsers(pr.users ?? []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const visibleStatuses = useMemo(() => Array.from(new Set(projects.map((p) => p.status))).sort(), [projects]);

  const responsibleOptions = useMemo(() => {
    const map = new Map<number, string>();
    users.forEach((u) => map.set(u.id, u.full_name));
    projects.forEach((p) => { if (p.responsibleId && p.responsibleName) map.set(p.responsibleId, p.responsibleName); });
    return Array.from(map.entries()).map(([id, fullName]) => ({ id, fullName }));
  }, [projects, users]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const s = dateFilter.start ? toDate(dateFilter.start) : null;
    const e = dateFilter.end ? toDate(dateFilter.end) : null;

    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (responsibleFilter !== 'all' && String(p.responsibleId ?? '') !== responsibleFilter) return false;
      if (s && toDate(p.endDate) && toDate(p.endDate)! < s) return false;
      if (e && toDate(p.startDate) && toDate(p.startDate)! > e) return false;
      if (q && !`${p.name} ${p.clientName} ${p.responsibleName ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, statusFilter, responsibleFilter, searchQuery, dateFilter]);

  const filteredTasks = useMemo(() => {
    const ids = new Set(filteredProjects.map((p) => p.id));
    return tasks.filter((t) => ids.has(t.projectId));
  }, [filteredProjects, tasks]);

  const bounds = useMemo(() => getRangeBounds(filteredProjects, filteredTasks), [filteredProjects, filteredTasks]);
  const ticks = useMemo(() => buildTicks(bounds), [bounds]);

  const todayOffset = useMemo(() => getOffsetPercent(new Date(), bounds), [bounds]);

  const totalBudget = filteredProjects.reduce((sum, p) => sum + Number(p.budget ?? 0), 0);
  const activeTasks = filteredTasks.filter((t) => t.status !== 'Выполнено').length;
  const overdueTasks = filteredTasks.filter((t) => {
    const d = toDate(t.dueDate);
    return d && t.status !== 'Выполнено' && d.getTime() < Date.now();
  }).length;

  const toggleExpand = (projectId: number) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const getTaskStatusClass = (status: string) => {
    if (status === 'Выполнено') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (status === 'В работе') return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    return 'bg-slate-700/60 text-slate-300 border-slate-600';
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.gantt}>
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
        <div className="mx-auto max-w-full space-y-6">

          {/* Header */}
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <h1 className="text-3xl font-semibold">Диаграмма Ганта</h1>
            <p className="mt-2 text-slate-400">Таймлайн проектов, задач и дедлайнов.</p>
          </section>

          {/* Stats */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Проекты', value: filteredProjects.length },
              { label: 'Активные задачи', value: activeTasks },
              { label: 'Просрочено', value: overdueTasks },
              { label: 'Бюджет', value: `${totalBudget.toLocaleString('ru-RU')} ₸` },
            ].map((stat) => (
              <article key={stat.label} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{stat.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
              </article>
            ))}
          </section>

          {/* Filters */}
          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Поиск
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Проект, клиент..." className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Статус
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none">
                  <option value="all">Все статусы</option>
                  {visibleStatuses.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-300">
                Ответственный
                <select value={responsibleFilter} onChange={(e) => setResponsibleFilter(e.target.value)} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none">
                  <option value="all">Все</option>
                  {responsibleOptions.map((r) => <option key={r.id} value={String(r.id)}>{r.fullName}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-2 text-sm text-slate-300">
                  С
                  <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter((c) => ({ ...c, start: e.target.value }))} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none" />
                </label>
                <label className="flex flex-1 flex-col gap-2 text-sm text-slate-300">
                  По
                  <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter((c) => ({ ...c, end: e.target.value }))} className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 outline-none" />
                </label>
              </div>
            </div>
          </section>

          {/* Gantt Body */}
          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 shadow-lg shadow-slate-950/20">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-slate-400">Загрузка...</div>
            ) : error ? (
              <div className="p-8 text-rose-400">{error}</div>
            ) : !filteredProjects.length ? (
              <div className="p-8 text-center text-slate-500">По фильтрам ничего не найдено</div>
            ) : (
              <div className="overflow-x-auto">
                {/* Timeline header */}
                <div className="grid gap-0 border-b border-slate-700" style={{ gridTemplateColumns: '300px 1fr' }}>
                  <div className="border-r border-slate-700 px-5 py-3 text-xs uppercase tracking-widest text-slate-500">Проект</div>
                  <div className="relative px-2 py-3">
                    <div className="flex">
                      {ticks.map((tick) => (
                        <div key={tick.toISOString()} className="flex-1 text-center text-xs text-slate-500">
                          {formatDate(tick)}
                        </div>
                      ))}
                    </div>
                    {/* Today marker in header */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-rose-500/40"
                      style={{ left: `${todayOffset}%` }}
                    />
                  </div>
                </div>

                {/* Project rows */}
                {filteredProjects.map((project) => {
                  const projectTasks = filteredTasks.filter((t) => t.projectId === project.id);
                  const progress = getProgressPercent(projectTasks);
                  const pStart = toDate(project.startDate);
                  const pEnd = toDate(project.endDate);
                  const barOffset = getOffsetPercent(pStart ?? bounds.start, bounds);
                  const barWidth = Math.max(2, getWidthPercent(pStart ?? bounds.start, pEnd ?? bounds.end, bounds));
                  const isExpanded = expandedProjects.has(project.id);
                  const taskRows = projectTasks.filter((t) => toDate(t.dueDate));

                  return (
                    <div key={project.id} className="border-b border-slate-800 last:border-b-0">
                      {/* Main row */}
                      <div className="grid min-h-[120px]" style={{ gridTemplateColumns: '300px 1fr' }}>

                        {/* LEFT PANEL — Bitrix-style contact card */}
                        <div className="border-r border-slate-800 p-4 flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            {/* Avatar with initials */}
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(project.id)}`}>
                              {getInitials(project.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-100 leading-snug">{project.name}</p>
                              <p className="mt-0.5 text-xs text-slate-400 truncate">{project.clientName}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(project.status)}`}>
                              {getStatusLabel(project.status)}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 space-y-1">
                            <p>Отв: <span className="text-slate-300">{project.responsibleName ?? 'Не назначен'}</span></p>
                            <p>Срок: <span className="text-slate-300">{formatDate(pStart)} — {formatDate(pEnd)}</span></p>
                            <p>Бюджет: <span className="text-slate-300">{Number(project.budget ?? 0).toLocaleString('ru-RU')} ₸</span></p>
                          </div>

                          {/* Stage progress bar */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-500">Этапы {project.completedStages}/{project.stageCount}</span>
                              <span className="text-[10px] text-slate-400">{project.stageProgress}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${project.stageProgress}%` }} />
                            </div>
                          </div>

                          {/* Quick actions */}
                          <div className="flex gap-2 mt-auto">
                            <Link
                              href="/kanban"
                              className="flex-1 rounded-xl bg-slate-800 px-3 py-1.5 text-center text-xs text-slate-300 transition hover:bg-slate-700"
                            >
                              Задачи
                            </Link>
                            <button
                              type="button"
                              onClick={() => toggleExpand(project.id)}
                              className={`flex-1 rounded-xl px-3 py-1.5 text-xs transition ${isExpanded ? 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                            >
                              {isExpanded ? '▲ Свернуть' : '▼ Задачи'}
                            </button>
                          </div>
                        </div>

                        {/* RIGHT PANEL — Timeline */}
                        <div className="relative overflow-hidden bg-slate-950/30 py-4 px-2">
                          {/* Grid lines */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {ticks.map((tick) => (
                              <div key={tick.toISOString()} className="flex-1 border-r border-slate-800/40 last:border-r-0" />
                            ))}
                          </div>

                          {/* Today line */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-rose-500 opacity-60 z-10 pointer-events-none"
                            style={{ left: `${todayOffset}%` }}
                          />

                          {/* Project bar */}
                          <div
                            className="absolute top-4 h-7 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 shadow-md shadow-sky-500/20 z-10"
                            style={{ left: `${barOffset}%`, width: `${barWidth}%` }}
                          />

                          {/* Task markers */}
                          {taskRows.map((task, idx) => {
                            const dueDate = toDate(task.dueDate);
                            if (!dueDate) return null;
                            const taskOffset = getOffsetPercent(dueDate, bounds);
                            const isLate = task.status !== 'Выполнено' && dueDate.getTime() < Date.now();
                            const isDone = task.status === 'Выполнено';

                            return (
                              <div
                                key={task.id}
                                className="absolute z-20 cursor-pointer"
                                style={{ left: `${taskOffset}%`, top: `${52 + idx * 26}px` }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredTask({ task, x: rect.left, y: rect.top });
                                }}
                                onMouseLeave={() => setHoveredTask(null)}
                                onClick={() => setSelectedTask(task)}
                              >
                                <div className="flex -translate-x-1/2 flex-col items-center">
                                  <div className={`h-3.5 w-px ${isLate ? 'bg-rose-400' : isDone ? 'bg-emerald-400' : 'bg-violet-400'}`} />
                                  <div className={`h-2.5 w-2.5 rounded-full border-2 ${isLate ? 'border-rose-400 bg-rose-900' : isDone ? 'border-emerald-400 bg-emerald-900' : 'border-violet-400 bg-violet-900'}`} />
                                </div>
                              </div>
                            );
                          })}

                          {/* Task count badge */}
                          {taskRows.length > 0 && (
                            <div className="absolute bottom-2 right-3 rounded-lg bg-slate-900/80 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                              {taskRows.length} задач
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Expanded task list */}
                      {isExpanded && projectTasks.length > 0 && (
                        <div className="border-t border-slate-800 bg-slate-950/40">
                          {projectTasks.map((task) => {
                            const dueDate = toDate(task.dueDate);
                            const isLate = dueDate && task.status !== 'Выполнено' && dueDate.getTime() < Date.now();

                            return (
                              <div key={task.id} className="grid border-b border-slate-800/50 last:border-b-0" style={{ gridTemplateColumns: '300px 1fr' }}>
                                <div className="flex items-center gap-3 border-r border-slate-800 px-4 py-2.5">
                                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${task.status === 'Выполнено' ? 'bg-emerald-400' : isLate ? 'bg-rose-400' : 'bg-violet-400'}`} />
                                  <div className="min-w-0">
                                    <p className="truncate text-xs text-slate-300">{task.title}</p>
                                    <p className="text-[10px] text-slate-500">{task.assignedToName ?? 'Не назначен'} · {formatDate(dueDate)}</p>
                                  </div>
                                </div>
                                <div className="relative flex items-center px-2">
                                  {dueDate && (
                                    <div
                                      className="absolute"
                                      style={{ left: `${getOffsetPercent(dueDate, bounds)}%` }}
                                    >
                                      <div className={`-translate-x-1/2 rounded-full border px-2 py-0.5 text-[10px] ${getTaskStatusClass(task.status)}`}>
                                        {task.status}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Hover tooltip */}
        {hoveredTask && (
          <div
            className="pointer-events-none fixed z-50 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl shadow-slate-950/60 text-xs"
            style={{ left: hoveredTask.x + 16, top: hoveredTask.y - 8, transform: 'translateY(-100%)' }}
          >
            <p className="font-semibold text-slate-100">{hoveredTask.task.title}</p>
            <p className="mt-1 text-slate-400">Исполнитель: {hoveredTask.task.assignedToName ?? 'Не назначен'}</p>
            <p className="text-slate-400">Срок: {formatDate(toDate(hoveredTask.task.dueDate))}</p>
            <p className="text-slate-400">Статус: {hoveredTask.task.status}</p>
          </div>
        )}

        {/* Task click mini-card */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-6 sm:items-center" onClick={() => setSelectedTask(null)}>
            <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Задача</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-100">{selectedTask.title}</h3>
                </div>
                <button type="button" onClick={() => setSelectedTask(null)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Статус</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${getTaskStatusClass(selectedTask.status)}`}>{selectedTask.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Исполнитель</span>
                  <span className="text-slate-200">{selectedTask.assignedToName ?? 'Не назначен'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Дедлайн</span>
                  <span className="text-slate-200">{formatDate(toDate(selectedTask.dueDate))}</span>
                </div>
                {selectedTask.priority && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Приоритет</span>
                    <span className="text-slate-200">{selectedTask.priority}</span>
                  </div>
                )}
                {selectedTask.description && (
                  <div className="rounded-xl bg-slate-950/60 p-3 text-slate-300 text-xs leading-relaxed">
                    {selectedTask.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}