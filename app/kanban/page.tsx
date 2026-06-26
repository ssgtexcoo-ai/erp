'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchTasks, updateTask, createTask, deleteTask, type TaskWithAssignee, type UserSummary } from '@/lib/taskService';
import { fetchProjects, type ProjectWithDetails } from '@/lib/projectService';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/lib/constants';

export default function KanbanPage() {
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

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      const [response, projectsResponse] = await Promise.all([fetchTasks(), fetchProjects()]);

      if (response.error) {
        setError(response.error.message);
        setTasks([]);
      } else {
        setTasks(response.tasks);
        setUsers(response.users ?? []);
      }

      if (projectsResponse.error) {
        setError(projectsResponse.error.message);
        setProjects([]);
      } else {
        setProjects(projectsResponse.projects);
      }

      setLoading(false);
    };

    loadTasks();
  }, []);

  const taskUsers = useMemo(() => users, [users]);

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

  const closeEditor = () => {
    setEditingTask(null);
    setIsCreatingTask(false);
    setError('');
  };

  const saveTask = async () => {
    if (!editingTask && !isCreatingTask) return;
    const currentTask = editingTask;
    const title = editTitle.trim();
    const description = editDescription.trim();

    if (!title) {
      setError('Укажите название задачи.');
      return;
    }

    setError('');
    setLoading(true);

    if (isCreatingTask) {
      if (!editProjectId) {
        setError('Выберите проект для задачи.');
        setLoading(false);
        return;
      }

      const { task: newTask, error: createError } = await createTask({
        projectId: editProjectId,
        title,
        description,
        assignedTo: editAssignedTo,
        dueDate: editDueDate || null,
        status: editStatus,
        priority: editPriority as 'low' | 'medium' | 'high' | null,
      });

      if (createError || !newTask) {
        setError(createError?.message ?? 'Ошибка создания задачи');
        setLoading(false);
        return;
      }

      setTasks((current) => [
        {
          ...newTask,
          assignedToName: editAssignedTo ? users.find((user) => user.id === editAssignedTo)?.full_name ?? 'Не назначен' : 'Не назначен',
        },
        ...current,
      ]);
      closeEditor();
      setLoading(false);
      return;
    }

    if (!currentTask) return;
    const { error: updateError } = await updateTask(currentTask.id, {
      status: editStatus,
      assignedTo: editAssignedTo,
      priority: editPriority as 'low' | 'medium' | 'high' | null,
      dueDate: editDueDate || null,
      title,
      description,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setTasks((current) =>
      current.map((task) =>
        task.id === currentTask.id
          ? {
              ...task,
              status: editStatus,
              assignedTo: editAssignedTo,
              assignedToName: editAssignedTo ? users.find((user) => user.id === editAssignedTo)?.full_name ?? task.assignedToName : 'Не назначен',
              priority: editPriority as 'low' | 'medium' | 'high' | null,
              dueDate: editDueDate || null,
              title,
              description,
            }
          : task,
      ),
    );
    closeEditor();
    setLoading(false);
  };

  const removeTask = async (taskId: number) => {
    if (!confirm('Удалить задачу?')) return;
    setLoading(true);
    const { error: deleteError } = await deleteTask(taskId);
    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    setTasks((current) => current.filter((task) => task.id !== taskId));
    setLoading(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.kanban}>
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Канбан</h1>
                <p className="mt-3 text-slate-400">Управление задачами по статусам План, В работе, На проверке, Выполнено и Просрочено.</p>
              </div>
              <button
                type="button"
                onClick={openCreateTask}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Добавить задачу
              </button>
            </div>
          </section>

          {loading ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-300">Загрузка задач...</div>
          ) : error ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-red-400">{error}</div>
          ) : (
            <section className="grid gap-6 xl:grid-cols-5">
              {TASK_STATUSES.map((status) => (
                <div key={status} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-5">
                  <h2 className="text-lg font-semibold text-slate-100">{status}</h2>
                  <div className="mt-4 space-y-4">
                    {tasks
                      .filter((task) => task.status === status)
                      .map((task) => (
                        <article key={task.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-slate-100">{task.title}</h3>
                              <p className="mt-2 text-sm text-slate-400">{task.description}</p>
                              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">Исполнитель: {task.assignedToName}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(task)}
                                className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                onClick={() => removeTask(task.id)}
                                className="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-rose-500"
                              >
                                Удалить
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {editingTask || isCreatingTask ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{isCreatingTask ? 'Создать задачу' : 'Редактировать задачу'}</h2>
                  <p className="mt-1 text-sm text-slate-400">{isCreatingTask ? 'Новая задача' : editingTask?.title}</p>
                </div>
                <button type="button" onClick={closeEditor} className="text-slate-400 transition hover:text-white">
                  Закрыть
                </button>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Статус
                  <select
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-slate-950 text-slate-100">
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-300">
                  Проект
                  <select
                    value={editProjectId ?? ''}
                    onChange={(event) => setEditProjectId(event.target.value ? Number(event.target.value) : null)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    <option value="">Не выбран</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id} className="bg-slate-950 text-slate-100">
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-300">
                  Приоритет
                  <select
                    value={editPriority}
                    onChange={(event) => setEditPriority(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority} className="bg-slate-950 text-slate-100">
                        {priority === 'low' ? 'Низкий' : priority === 'medium' ? 'Средний' : 'Высокий'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Исполнитель
                  <select
                    value={editAssignedTo ?? ''}
                    onChange={(event) => setEditAssignedTo(event.target.value ? Number(event.target.value) : null)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    <option value="">Не назначен</option>
                    {taskUsers.map((user) => (
                      <option key={user.id} value={user.id} className="bg-slate-950 text-slate-100">
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-300">
                  Срок
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(event) => setEditDueDate(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  />
                </label>
              </div>

              <label className="mt-6 block text-sm text-slate-300">
                Название задачи
                <input
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>

              <label className="mt-6 block text-sm text-slate-300">
                Описание
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="mt-2 h-28 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>

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
                  onClick={saveTask}
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
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
