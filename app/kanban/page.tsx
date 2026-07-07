'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchTasks, updateTask, createTask, deleteTask, fetchComments, addComment, deleteComment, type TaskWithAssignee, type UserSummary, type TaskComment } from '@/lib/taskService';
import { notifyTaskDone } from '@/lib/telegram';
import { logActivity } from '@/lib/activityService';
import { exportTasksToExcel } from '@/lib/exportService';
import { UserAvatar } from '@/components/user-avatar';
import { MindMap } from '@/components/mind-map';
import { fetchProjects, type ProjectWithDetails } from '@/lib/projectService';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants';
import { useAuth } from '@/components/auth-context';
import { subscribeToTable } from '@/lib/realtimeService';

const PRIORITY_STYLE: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-400',
  high: 'bg-rose-500/15 text-rose-400',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const STATUS_COLOR: Record<string, string> = {
  'План': 'border-t-[rgba(100,116,139,0.5)]',
  'В работе': 'border-t-sky-500/50',
  'На проверке': 'border-t-violet-500/50',
  'Выполнено': 'border-t-emerald-500/50',
  'Просрочено': 'border-t-rose-500/50',
};

const INPUT_CLS =
  'w-full rounded-[14px] px-4 py-3 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-[rgba(235,235,245,0.25)]';

export default function KanbanPage() {
  const { user: authUser } = useAuth();
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState<TaskWithAssignee | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<string>('План');
  const [editAssignedTo, setEditAssignedTo] = useState<number | null>(null);
  const [editPriority, setEditPriority] = useState<string>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Drag & drop state
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [fullPictureTask, setFullPictureTask] = useState<TaskWithAssignee | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      const [response, projectsResponse] = await Promise.all([fetchTasks(), fetchProjects()]);
      if (response.error) { setError(response.error.message); setTasks([]); }
      else { setTasks(response.tasks); setUsers(response.users ?? []); }
      if (projectsResponse.error) { setProjects([]); }
      else { setProjects(projectsResponse.projects); }
      setLoading(false);
    };
    loadTasks();
    return subscribeToTable('tasks', loadTasks);
  }, []);

  // Load comments when editing an existing task
  useEffect(() => {
    if (!editingTask) { setComments([]); setNewComment(''); return; }
    setCommentsLoading(true);
    fetchComments(editingTask.id).then(({ comments: c }) => {
      setComments(c);
      setCommentsLoading(false);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    });
  }, [editingTask?.id]);

  const submitComment = async () => {
    if (!newComment.trim() || !editingTask || !authUser?.id || submittingComment) return;
    setSubmittingComment(true);
    const { comment: created } = await addComment(editingTask.id, authUser.id, newComment);
    if (created) {
      setComments((prev) => [...prev, created]);
      setNewComment('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    }
    setSubmittingComment(false);
  };

  const removeComment = async (commentId: number) => {
    await deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const taskUsers = useMemo(() => users, [users]);

  // ── Drag & Drop handlers ──────────────────────────────────
  const handleDragStart = (taskId: number) => {
    setDragTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    if (dragTaskId === null) return;

    const task = tasks.find((t) => t.id === dragTaskId);
    if (!task || task.status === targetStatus) { setDragTaskId(null); return; }

    // Optimistic update
    setTasks((current) =>
      current.map((t) => (t.id === dragTaskId ? { ...t, status: targetStatus } : t)),
    );
    setDragTaskId(null);

    const result = await updateTask(dragTaskId, { status: targetStatus });
    if (result.error) {
      setError(result.error.message);
      // revert optimistic update
      setTasks((current) => current.map((t) => t.id === dragTaskId ? { ...t, status: task.status } : t));
    } else if (targetStatus === 'Выполнено') {
      notifyTaskDone(task.title, '', task.assignedToName ?? 'Не назначен');
      if (authUser?.id) logActivity({ userId: authUser.id, action: 'completed_task', entity: 'task', entityId: task.id, payload: { title: task.title } });
    }
  };

  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragOverStatus(null);
  };

  // ── CRUD ─────────────────────────────────────────────────
  const openEdit = (task: TaskWithAssignee) => {
    setEditingTask(task);
    setIsCreatingTask(false);
    setEditProjectId(task.projectId ?? null);
    setEditStatus(task.status);
    setEditAssignedTo(task.assignedTo ?? null);
    setEditPriority(task.priority ?? 'medium');
    setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '');
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setIsCreatingTask(true);
    setEditProjectId(projects[0]?.id ?? null);
    setEditStatus('План');
    setEditAssignedTo(null);
    setEditPriority('medium');
    setEditDueDate('');
    setEditTitle('');
    setEditDescription('');
    setError('');
  };

  const closeEditor = () => { setEditingTask(null); setIsCreatingTask(false); setError(''); };

  const saveTask = async () => {
    if (!editingTask && !isCreatingTask) return;
    const currentTask = editingTask;
    const title = editTitle.trim();
    const description = editDescription.trim();
    if (!title) { setError('Укажите название задачи.'); return; }

    setError('');
    setLoading(true);

    if (isCreatingTask) {
      if (!editProjectId) { setError('Выберите проект для задачи.'); setLoading(false); return; }
      const { task: newTask, error: createError } = await createTask({
        projectId: editProjectId, title, description, assignedTo: editAssignedTo,
        dueDate: editDueDate || null, status: editStatus,
        priority: editPriority as 'low' | 'medium' | 'high' | null,
      });
      if (createError || !newTask) { setError(createError?.message ?? 'Ошибка создания задачи'); setLoading(false); return; }
      setTasks((current) => [
        { ...newTask, assignedToName: editAssignedTo ? users.find((u) => u.id === editAssignedTo)?.full_name ?? 'Не назначен' : 'Не назначен' },
        ...current,
      ]);
      if (authUser?.id) logActivity({ userId: authUser.id, action: 'created_task', entity: 'task', entityId: newTask.id, payload: { title } });
      closeEditor();
      setLoading(false);
      return;
    }

    if (!currentTask) return;
    const { error: updateError } = await updateTask(currentTask.id, {
      status: editStatus, assignedTo: editAssignedTo,
      priority: editPriority as 'low' | 'medium' | 'high' | null,
      dueDate: editDueDate || null, title, description,
    });
    if (updateError) { setError(updateError.message); setLoading(false); return; }

    const assigneeName = editAssignedTo ? users.find((u) => u.id === editAssignedTo)?.full_name ?? 'Не назначен' : 'Не назначен';
    if (editStatus === 'Выполнено' && currentTask.status !== 'Выполнено') {
      notifyTaskDone(title, '', assigneeName);
    }

    setTasks((current) =>
      current.map((t) =>
        t.id === currentTask.id
          ? {
              ...t, status: editStatus, assignedTo: editAssignedTo,
              assignedToName: assigneeName,
              priority: editPriority as 'low' | 'medium' | 'high' | null,
              dueDate: editDueDate || null, title, description,
            }
          : t,
      ),
    );
    closeEditor();
    setLoading(false);
  };

  const removeTask = async (taskId: number) => {
    setLoading(true);
    const { error: deleteError } = await deleteTask(taskId);
    if (deleteError) { setError(deleteError.message); setLoading(false); return; }
    setTasks((current) => current.filter((t) => t.id !== taskId));
    setConfirmDeleteId(null);
    setLoading(false);
  };

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'Выполнено').length;

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.kanban}>
      <main className="min-h-screen text-white px-3 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-[1600px] space-y-8">

          {/* Header */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Задачи</p>
                <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em' }}>Канбан</h1>
                <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                  Перетаскивайте задачи между колонками · {doneTasks}/{totalTasks} выполнено
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportTasksToExcel(tasks)}
                  disabled={tasks.length === 0}
                  className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-[14px] font-semibold transition-all duration-150 disabled:opacity-40"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#30d158'; e.currentTarget.style.color = '#30d158'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Excel
                </button>
                <button type="button" onClick={openCreateTask} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
                  + Добавить задачу
                </button>
              </div>
            </div>
          </section>

          {loading && !tasks.length ? (
            <div className="rounded-[24px] p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
              <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Загрузка задач...</p>
            </div>
          ) : error ? (
            <div className="rounded-[24px] p-8 text-[14px]" style={{ background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.20)', color: '#ff453a' }}>{error}</div>
          ) : (
            <section className="flex gap-4 overflow-x-auto pb-2 xl:grid xl:grid-cols-5 xl:overflow-x-visible" style={{ scrollSnapType: 'x mandatory' }}>
              {TASK_STATUSES.map((status) => {
                const columnTasks = tasks.filter((t) => t.status === status);
                const isDragTarget = dragOverStatus === status;

                return (
                  <div
                    key={status}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`shrink-0 w-[280px] xl:w-auto rounded-[22px] border-t-2 p-5 transition-all ${STATUS_COLOR[status] ?? ''}`}
                    style={{
                      scrollSnapAlign: 'start',
                      background: isDragTarget ? 'rgba(216,176,106,0.06)' : 'var(--bg-card)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      borderLeft: '1px solid var(--bg-subtle)',
                      borderRight: '1px solid var(--bg-subtle)',
                      borderBottom: '1px solid var(--bg-subtle)',
                      outline: isDragTarget ? '2px solid rgba(216,176,106,0.25)' : 'none',
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{status}</h2>
                      <span className="rounded-full px-2 py-0.5 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {columnTasks.map((task) => (
                        <article
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onDragEnd={handleDragEnd}
                          className={`group cursor-grab rounded-[16px] p-4 transition-all duration-150 active:cursor-grabbing ${dragTaskId === task.id ? 'opacity-40 scale-95' : 'hover:scale-[1.02]'}`}
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--bg-subtle)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-[13px] font-semibold leading-snug flex-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{task.title}</h3>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {task.priority && (
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLE[task.priority]}`}>
                                  {PRIORITY_LABEL[task.priority] ?? task.priority}
                                </span>
                              )}
                              <button
                                type="button"
                                title="Полная картина"
                                onClick={(e) => { e.stopPropagation(); setFullPictureTask(task); }}
                                className="flex h-6 w-6 items-center justify-center rounded-[6px] transition-all duration-150"
                                style={{ background: task.decomposition?.length ? 'rgba(216,176,106,0.20)' : 'var(--bg-input)', color: task.decomposition?.length ? '#d8b06a' : 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(216,176,106,0.25)'; e.currentTarget.style.color = '#d8b06a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = task.decomposition?.length ? 'rgba(216,176,106,0.20)' : 'var(--bg-input)'; e.currentTarget.style.color = task.decomposition?.length ? '#d8b06a' : 'var(--text-tertiary)'; }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
                                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          {task.description && (
                            <p className="mt-2 line-clamp-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <UserAvatar name={task.assignedToName ?? '?'} avatarUrl={task.assignedToAvatarUrl} size={20} />
                                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{task.assignedToName ?? 'Не назначен'}</p>
                              </div>
                              {task.dueDate && (
                                <p className="text-[11px]" style={{ color: 'rgba(235,235,245,0.25)' }}>
                                  до {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                                </p>
                              )}
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 shrink-0 opacity-0 transition group-hover:opacity-100" style={{ color: 'var(--text-tertiary)' }}>
                              <path d="M5 9h14M5 15h14" strokeLinecap="round"/>
                            </svg>
                          </div>

                          <div className="mt-3 hidden gap-1.5 group-hover:flex flex-wrap">
                            <button
                              type="button"
                              onClick={() => setFullPictureTask(task)}
                              className="w-full rounded-[10px] py-1.5 text-[12px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5"
                              style={{ background: 'rgba(216,176,106,0.10)', color: '#d8b06a', border: '1px solid rgba(216,176,106,0.22)' }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                              </svg>
                              Полная картина
                            </button>
                            <button type="button" onClick={() => openEdit(task)} className="flex-1 rounded-[10px] py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                              Изменить
                            </button>
                            {confirmDeleteId === task.id ? (
                              <>
                                <button type="button" onClick={() => removeTask(task.id)} className="flex-1 rounded-[10px] py-1.5 text-[12px] font-medium" style={{ background: 'rgba(255,69,58,0.22)', color: '#ff453a' }}>Да</button>
                                <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-[10px] py-1.5 text-[12px] font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Нет</button>
                              </>
                            ) : (
                              <button type="button" onClick={() => setConfirmDeleteId(task.id)} className="flex-1 rounded-[10px] py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(255,69,58,0.10)', color: '#ff453a' }}>
                                Удалить
                              </button>
                            )}
                          </div>
                        </article>
                      ))}

                      {/* Drop zone */}
                      <div
                        className="rounded-[14px] border border-dashed p-4 text-center text-[12px] transition"
                        style={isDragTarget
                          ? { borderColor: 'rgba(216,176,106,0.35)', background: 'rgba(216,176,106,0.06)', color: '#d8b06a' }
                          : { borderColor: 'var(--bg-input)', color: 'rgba(235,235,245,0.20)' }
                        }
                      >
                        {isDragTarget ? 'Отпустите здесь' : columnTasks.length === 0 ? 'Нет задач' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {/* Modal */}
        {editingTask || isCreatingTask ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[20px] sm:rounded-[28px] p-4 sm:p-8 shadow-2xl" style={{ background: 'rgba(28,28,30,0.96)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {isCreatingTask ? 'Создать задачу' : 'Редактировать задачу'}
                  </h2>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>{isCreatingTask ? 'Новая задача' : editingTask?.title}</p>
                </div>
                <button type="button" onClick={closeEditor} className="rounded-[10px] p-2 transition-all duration-150" style={{ color: 'var(--text-secondary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <label className="mt-6 block space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Название задачи
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
              </label>

              <label className="mt-5 block space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                Описание
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={`h-24 resize-none ${INPUT_CLS}`} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
              </label>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Статус
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    {TASK_STATUSES.map((s) => <option key={s} value={s} className="bg-[#1c1c1e]">{s}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Приоритет
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p} className="bg-[#1c1c1e]">{PRIORITY_LABEL[p] ?? p}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Проект
                  <select value={editProjectId ?? ''} onChange={(e) => setEditProjectId(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не выбран</option>
                    {projects.map((p) => <option key={p.id} value={p.id} className="bg-[#1c1c1e]">{p.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Исполнитель
                  <select value={editAssignedTo ?? ''} onChange={(e) => setEditAssignedTo(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не назначен</option>
                    {taskUsers.map((u) => <option key={u.id} value={u.id} className="bg-[#1c1c1e]">{u.full_name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Срок выполнения
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>
              </div>

              {/* Comments — only for existing tasks */}
              {!isCreatingTask && (
                <div className="mt-7">
                  <div className="mb-3 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" style={{ color: '#d8b06a' }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Комментарии {comments.length > 0 && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({comments.length})</span>}
                    </span>
                  </div>

                  {/* Comment list */}
                  <div
                    className="mb-3 max-h-[260px] overflow-y-auto space-y-3 rounded-[16px] p-3"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                  >
                    {commentsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет комментариев</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="group flex gap-2.5">
                          <UserAvatar name={c.userName} avatarUrl={c.avatarUrl} size={28} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.userName}</span>
                              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                                {new Date(c.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{c.comment}</p>
                          </div>
                          {authUser?.id === c.userId && (
                            <button
                              type="button"
                              onClick={() => removeComment(c.id)}
                              className="shrink-0 self-start rounded-[6px] p-1 opacity-0 transition-opacity group-hover:opacity-100"
                              style={{ color: 'var(--text-tertiary)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#ff453a'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                              title="Удалить"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-3.5 w-3.5">
                                <path d="M18 6 6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={commentsEndRef} />
                  </div>

                  {/* New comment input */}
                  <div className="flex gap-2.5">
                    <UserAvatar name={authUser?.fullName ?? '?'} avatarUrl={authUser?.avatarUrl ?? null} size={28} />
                    <div className="flex flex-1 overflow-hidden rounded-[12px]" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                      <input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                        placeholder="Написать комментарий…"
                        className="flex-1 bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-[rgba(235,235,245,0.25)]"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        onClick={submitComment}
                        disabled={!newComment.trim() || submittingComment}
                        className="flex items-center gap-1 px-3 py-2 text-[12px] font-semibold transition-all duration-150 disabled:opacity-40"
                        style={{ color: '#d8b06a' }}
                      >
                        {submittingComment ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2" style={{ borderColor: 'rgba(216,176,106,0.25)', borderTopColor: '#d8b06a' }} />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {error ? <p className="mt-4 text-[13px]" style={{ color: '#ff453a' }}>{error}</p> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEditor} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Отменить
                </button>
                <button type="button" onClick={saveTask} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {fullPictureTask && (
        <MindMap
          taskId={fullPictureTask.id}
          taskTitle={fullPictureTask.title}
          teamMembers={users.map((u) => ({ name: u.full_name, avatarUrl: u.avatar_url ?? null }))}
          initialStages={fullPictureTask.decomposition}
          onClose={() => setFullPictureTask(null)}
          onSaved={(stages: import('@/lib/taskService').DecompositionStage[]) => {
            setTasks((prev) => prev.map((t) => t.id === fullPictureTask.id ? { ...t, decomposition: stages } : t));
          }}
        />
      )}
    </ProtectedPage>
  );
}