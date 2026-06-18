'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type ProjectUser,
  type ProjectWithDetails,
} from '@/lib/projectService';

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'closed'] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProject, setEditingProject] = useState<ProjectWithDetails | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editProfitEstimate, setEditProfitEstimate] = useState('');
  const [editResponsibleId, setEditResponsibleId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>('planning');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true);
      const response = await fetchProjects();
      if (response.error) {
        setError(response.error.message);
        setProjects([]);
        setUsers([]);
      } else {
        setProjects(response.projects);
        setUsers(response.users ?? []);
        setError('');
      }
      setLoading(false);
    };

    loadProjects();
  }, []);

  const totalProfit = projects.reduce((sum, project) => sum + Number(project.profitEstimate ?? 0), 0);
  const overdueCount = projects.filter((project) => project.endDate && new Date(project.endDate) < new Date() && project.status !== 'closed').length;

  const openCreateProject = () => {
    setEditingProject(null);
    setIsCreatingProject(true);
    setEditName('');
    setEditClientName('');
    setEditBudget('');
    setEditProfitEstimate('');
    setEditResponsibleId(null);
    setEditStatus('planning');
    setEditStartDate('');
    setEditEndDate('');
    setError('');
  };

  const openEditProject = (project: ProjectWithDetails) => {
    setEditingProject(project);
    setIsCreatingProject(false);
    setEditName(project.name);
    setEditClientName(project.clientName ?? '');
    setEditBudget(String(project.budget ?? ''));
    setEditProfitEstimate(String(project.profitEstimate ?? ''));
    setEditResponsibleId(project.responsibleId ?? null);
    setEditStatus(project.status || 'planning');
    setEditStartDate(project.startDate ?? '');
    setEditEndDate(project.endDate ?? '');
    setError('');
  };

  const closeEditor = () => {
    setEditingProject(null);
    setIsCreatingProject(false);
    setError('');
  };

  const saveProject = async () => {
    if (!editingProject && !isCreatingProject) return;

    const name = editName.trim();
    const clientName = editClientName.trim();
    const budget = Number(editBudget);
    const profitEstimate = editProfitEstimate.trim() ? Number(editProfitEstimate) : null;

    if (!name) {
      setError('Укажите название объекта.');
      return;
    }

    if (!Number.isFinite(budget) || budget < 0) {
      setError('Укажите корректный бюджет (0 или больше).');
      return;
    }

    if (profitEstimate !== null && (!Number.isFinite(profitEstimate) || profitEstimate < 0)) {
      setError('Укажите корректную прибыль (0 или больше).');
      return;
    }

    if (editStartDate && editEndDate && new Date(editStartDate) > new Date(editEndDate)) {
      setError('Дата старта не может быть позже даты завершения.');
      return;
    }

    setLoading(true);
    setError('');

    if (isCreatingProject) {
      const { project: newProject, error: createError } = await createProject({
        name,
        clientName,
        budget,
        responsibleId: editResponsibleId,
        status: editStatus,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
        profitEstimate,
      });

      if (createError || !newProject) {
        setError(createError?.message ?? 'Ошибка создания объекта');
        setLoading(false);
        return;
      }

      setProjects((current) => [
        {
          ...newProject,
          responsibleName: editResponsibleId ? users.find((user) => user.id === editResponsibleId)?.full_name ?? 'Не назначен' : 'Не назначен',
        },
        ...current,
      ]);
      closeEditor();
      setLoading(false);
      return;
    }

    const { error: updateError } = await updateProject(editingProject.id, {
      name,
      clientName,
      budget,
      responsibleId: editResponsibleId,
      status: editStatus,
      startDate: editStartDate || null,
      endDate: editEndDate || null,
      profitEstimate,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setProjects((current) =>
      current.map((project) =>
        project.id === editingProject.id
          ? {
              ...project,
              name,
              clientName,
              budget,
              responsibleId: editResponsibleId,
              responsibleName: editResponsibleId ? users.find((user) => user.id === editResponsibleId)?.full_name ?? 'Не назначен' : 'Не назначен',
              status: editStatus,
              startDate: editStartDate || null,
              endDate: editEndDate || null,
              profitEstimate,
            }
          : project,
      ),
    );

    closeEditor();
    setLoading(false);
  };

  const removeProject = async (projectId: number) => {
    if (!confirm('Удалить объект?')) return;

    setLoading(true);
    const { error: deleteError } = await deleteProject(projectId);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    setProjects((current) => current.filter((project) => project.id !== projectId));
    setLoading(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.projects}>
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Объекты</h1>
                <p className="mt-3 text-slate-400">Карточки объектов, стадии строительства и планируемая прибыль.</p>
              </div>
              <button
                type="button"
                onClick={openCreateProject}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Добавить объект
              </button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Активные объекты</p>
              <p className="mt-4 text-3xl font-semibold">{projects.length}</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Просроченные</p>
              <p className="mt-4 text-3xl font-semibold">{overdueCount}</p>
            </article>
            <article className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Ожидаемая прибыль</p>
              <p className="mt-4 text-3xl font-semibold">{totalProfit.toLocaleString('ru-RU')} ₸</p>
            </article>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8">
            <h2 className="text-xl font-semibold">Список объектов</h2>
            {loading ? (
              <div className="mt-6 text-slate-300">Загрузка объектов...</div>
            ) : error ? (
              <div className="mt-6 text-red-400">{error}</div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {projects.map((project) => (
                  <article key={project.id} className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-100">{project.name}</h3>
                        <p className="mt-2 text-sm text-slate-400">Клиент: {project.clientName}</p>
                        <p className="mt-1 text-sm text-slate-400">Ответственный: {project.responsibleName}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{project.status}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProject(project)}
                            className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProject(project.id)}
                            className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-rose-500"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-900/90 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Бюджет</p>
                        <p className="mt-2 text-lg font-semibold text-slate-100">{Number(project.budget).toLocaleString('ru-RU')} ₸</p>
                      </div>
                      <div className="rounded-2xl bg-slate-900/90 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Прибыль</p>
                        <p className="mt-2 text-lg font-semibold text-slate-100">{Number(project.profitEstimate ?? 0).toLocaleString('ru-RU')} ₸</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-400">
                      <span>Старт: {project.startDate ?? '—'}</span>
                      <span>Финиш: {project.endDate ?? '—'}</span>
                    </div>
                    <div className="mt-5 rounded-2xl bg-slate-900/90 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Прогресс этапов</p>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${project.stageProgress ?? 0}%` }} />
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{project.stageProgress ?? 0}% ({project.completedStages ?? 0}/{project.stageCount ?? 0})</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {editingProject || isCreatingProject ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
              <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{isCreatingProject ? 'Создать объект' : 'Редактировать объект'}</h2>
                    <p className="mt-1 text-sm text-slate-400">{isCreatingProject ? 'Новый объект' : editingProject?.name}</p>
                  </div>
                  <button type="button" onClick={closeEditor} className="text-slate-400 transition hover:text-white">
                    Закрыть
                  </button>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    Название объекта
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    Клиент
                    <input
                      value={editClientName}
                      onChange={(event) => setEditClientName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    Бюджет
                    <input
                      type="number"
                      min="0"
                      value={editBudget}
                      onChange={(event) => setEditBudget(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    Прибыль
                    <input
                      type="number"
                      min="0"
                      value={editProfitEstimate}
                      onChange={(event) => setEditProfitEstimate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    Статус
                    <select
                      value={editStatus}
                      onChange={(event) => setEditStatus(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    >
                      {PROJECT_STATUSES.map((status) => (
                        <option key={status} value={status} className="bg-slate-950 text-slate-100">
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    Ответственный
                    <select
                      value={editResponsibleId ?? ''}
                      onChange={(event) => setEditResponsibleId(event.target.value ? Number(event.target.value) : null)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    >
                      <option value="">Не назначен</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id} className="bg-slate-950 text-slate-100">
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    Дата старта
                    <input
                      type="date"
                      value={editStartDate}
                      onChange={(event) => setEditStartDate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-slate-300">
                    Дата завершения
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(event) => setEditEndDate(event.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                    />
                  </label>
                </div>

                {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
                  >
                    Отменить
                  </button>
                  <button
                    type="button"
                    onClick={saveProject}
                    className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </ProtectedPage>
  );
}
