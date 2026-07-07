'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { UserAvatar } from '@/components/user-avatar';
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type ProjectUser,
  type ProjectWithDetails,
} from '@/lib/projectService';

const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'closed'] as const;

const STATUS_STYLE: Record<string, string> = {
  planning: 'bg-violet-500/15 text-violet-300',
  active: 'bg-emerald-500/15 text-emerald-300',
  on_hold: 'bg-amber-500/15 text-amber-300',
  closed: 'bg-[var(--bg-input)] text-[#6b7280]',
};

const STATUS_LABEL: Record<string, string> = {
  planning: 'Планирование',
  active: 'Активный',
  on_hold: 'Приостановлен',
  closed: 'Завершён',
};

const INPUT_CLS =
  'w-full rounded-[14px] px-4 py-3 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-[rgba(235,235,245,0.25)]';

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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

  const totalProfit = projects.reduce((sum, p) => sum + Number(p.profitEstimate ?? 0), 0);
  const overdueCount = projects.filter(
    (p) => p.endDate && new Date(p.endDate) < new Date() && p.status !== 'closed',
  ).length;
  const activeCount = projects.filter((p) => p.status === 'active').length;

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
    const currentProject = editingProject;

    const name = editName.trim();
    const clientName = editClientName.trim();
    const budget = Number(editBudget);
    const profitEstimate = editProfitEstimate.trim() ? Number(editProfitEstimate) : null;

    if (!name) { setError('Укажите название объекта.'); return; }
    if (!Number.isFinite(budget) || budget < 0) { setError('Укажите корректный бюджет.'); return; }
    if (profitEstimate !== null && (!Number.isFinite(profitEstimate) || profitEstimate < 0)) {
      setError('Укажите корректную прибыль.');
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
        name, clientName, budget, responsibleId: editResponsibleId,
        status: editStatus, startDate: editStartDate || null, endDate: editEndDate || null, profitEstimate,
      });

      if (createError || !newProject) {
        setError(createError?.message ?? 'Ошибка создания объекта');
        setLoading(false);
        return;
      }

      setProjects((current) => [
        { ...newProject, responsibleName: editResponsibleId ? users.find((u) => u.id === editResponsibleId)?.full_name ?? 'Не назначен' : 'Не назначен' },
        ...current,
      ]);
      closeEditor();
      setLoading(false);
      return;
    }

    if (!currentProject) return;
    const { error: updateError } = await updateProject(currentProject.id, {
      name, clientName, budget, responsibleId: editResponsibleId,
      status: editStatus, startDate: editStartDate || null, endDate: editEndDate || null, profitEstimate,
    });

    if (updateError) { setError(updateError.message); setLoading(false); return; }

    setProjects((current) =>
      current.map((p) =>
        p.id === currentProject.id
          ? {
              ...p, name, clientName, budget, responsibleId: editResponsibleId,
              responsibleName: editResponsibleId ? users.find((u) => u.id === editResponsibleId)?.full_name ?? 'Не назначен' : 'Не назначен',
              status: editStatus, startDate: editStartDate || null, endDate: editEndDate || null, profitEstimate,
            }
          : p,
      ),
    );

    closeEditor();
    setLoading(false);
  };

  const removeProject = async (projectId: number) => {
    setLoading(true);
    const { error: deleteError } = await deleteProject(projectId);
    if (deleteError) { setError(deleteError.message); setLoading(false); return; }
    setProjects((current) => current.filter((p) => p.id !== projectId));
    setConfirmDeleteId(null);
    setLoading(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.projects}>
      <main className="min-h-screen text-white px-3 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Header */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Строительство</p>
                <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em' }}>Объекты</h1>
                <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Карточки объектов, стадии и планируемая прибыль</p>
              </div>
              <button
                type="button"
                onClick={openCreateProject}
                className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90"
                style={{ background: '#d8b06a', color: '#000000', letterSpacing: '-0.01em' }}
              >
                + Добавить объект
              </button>
            </div>
          </section>

          {/* KPI strip */}
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Всего объектов', value: projects.length, color: '#d8b06a' },
              { label: 'Активных', value: activeCount, color: '#34c759' },
              { label: 'Просроченных', value: overdueCount, color: '#ff453a' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-[20px] p-6" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}>
                <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{kpi.label}</p>
                <p className="mt-3 text-[40px] font-bold" style={{ color: kpi.color, letterSpacing: '-0.05em' }}>{kpi.value}</p>
              </div>
            ))}
          </section>

          {/* Profit KPI */}
          <div className="rounded-[20px] px-6 py-5" style={{ background: 'rgba(216,176,106,0.08)', border: '1px solid rgba(216,176,106,0.16)' }}>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(216,176,106,0.60)' }}>Ожидаемая прибыль по всем объектам</p>
            <p className="mt-1 text-[30px] font-bold" style={{ color: '#d8b06a', letterSpacing: '-0.04em' }}>{totalProfit.toLocaleString('ru-RU')} ₸</p>
          </div>

          {/* Project list */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)' }}>
            <h2 className="text-[20px] font-semibold" style={{ letterSpacing: '-0.03em' }}>Список объектов</h2>
            {loading ? (
              <div className="mt-6 flex items-center gap-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
                Загрузка объектов...
              </div>
            ) : error ? (
              <div className="mt-6 text-[14px]" style={{ color: '#ff453a' }}>{error}</div>
            ) : (
              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                {projects.map((project) => (
                  <article key={project.id} className="group rounded-[20px] p-6 transition-all duration-200 hover:scale-[1.01]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-subtle)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-[16px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{project.name}</h3>
                        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>Клиент: {project.clientName || '—'}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <UserAvatar name={project.responsibleName ?? '?'} avatarUrl={project.responsibleAvatarUrl} size={22} />
                          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{project.responsibleName ?? 'Не назначен'}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${STATUS_STYLE[project.status] ?? ''}`} style={!STATUS_STYLE[project.status] ? { background: 'var(--bg-subtle)', color: 'var(--text-secondary)' } : {}}>
                          {STATUS_LABEL[project.status] ?? project.status}
                        </span>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => openEditProject(project)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>
                            Изменить
                          </button>
                          {confirmDeleteId === project.id ? (
                            <>
                              <button type="button" onClick={() => removeProject(project.id)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium" style={{ background: 'rgba(255,69,58,0.22)', color: '#ff453a' }}>Да, удалить</button>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Отмена</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => setConfirmDeleteId(project.id)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(255,69,58,0.10)', color: '#ff453a' }}>
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-[12px] p-4" style={{ background: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Бюджет</p>
                        <p className="mt-1.5 text-[15px] font-semibold" style={{ color: 'rgba(255,255,255,0.88)' }}>{Number(project.budget).toLocaleString('ru-RU')} ₸</p>
                      </div>
                      <div className="rounded-[12px] p-4" style={{ background: 'var(--bg-subtle)' }}>
                        <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Прибыль</p>
                        <p className="mt-1.5 text-[15px] font-semibold" style={{ color: '#d8b06a' }}>{Number(project.profitEstimate ?? 0).toLocaleString('ru-RU')} ₸</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>Старт: {project.startDate ?? '—'}</span>
                      <span>Финиш: {project.endDate ?? '—'}</span>
                    </div>

                    <div className="mt-4 rounded-[12px] p-4" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Прогресс этапов</p>
                        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{project.completedStages ?? 0}/{project.stageCount ?? 0}</p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${project.stageProgress ?? 0}%`, background: 'linear-gradient(90deg, #d8b06a, #f1cd7f)' }} />
                      </div>
                      <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{project.stageProgress ?? 0}%</p>
                    </div>
                  </article>
                ))}

                {!projects.length && !loading ? (
                  <div className="col-span-2 rounded-[20px] p-8 text-center text-[14px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                    Объектов пока нет. Нажмите «Добавить объект», чтобы создать первый.
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {/* Modal */}
        {editingProject || isCreatingProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[20px] sm:rounded-[28px] p-4 sm:p-8 shadow-2xl" style={{ background: 'rgba(28,28,30,0.96)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {isCreatingProject ? 'Создать объект' : 'Редактировать объект'}
                  </h2>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>{isCreatingProject ? 'Новый объект' : editingProject?.name}</p>
                </div>
                <button type="button" onClick={closeEditor} className="rounded-[10px] p-2 transition-all duration-150" style={{ color: 'var(--text-secondary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Название объекта
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Клиент
                  <input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Бюджет (₸)
                  <input type="number" min="0" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Прибыль (₸)
                  <input type="number" min="0" value={editProfitEstimate} onChange={(e) => setEditProfitEstimate(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Статус
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-[#1c1c1e]">{STATUS_LABEL[s] ?? s}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Ответственный
                  <select value={editResponsibleId ?? ''} onChange={(e) => setEditResponsibleId(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не назначен</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id} className="bg-[#1c1c1e]">{u.full_name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Дата старта
                  <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Дата завершения
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
              </div>

              {error ? <p className="mt-4 text-[13px]" style={{ color: '#ff453a' }}>{error}</p> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEditor} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Отменить
                </button>
                <button type="button" onClick={saveProject} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </ProtectedPage>
  );
}