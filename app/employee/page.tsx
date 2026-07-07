'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchEmployees, type EmployeeWithScore } from '@/lib/employeeService';
import { ROLE_NAMES } from '@/lib/constants';
import type { RoleName } from '@/lib/types';
import { useAuth } from '@/components/auth-context';

const INVITE_ROLES = [
  { id: 2, label: 'Менеджер' },
  { id: 3, label: 'Руководитель проекта' },
  { id: 4, label: 'Бухгалтер' },
  { id: 5, label: 'Снабжение' },
];

const RANK_COLORS = [
  'bg-[rgba(251,191,36,0.15)] text-amber-300',
  'bg-[rgba(148,163,184,0.12)] text-slate-300',
  'bg-[rgba(180,83,9,0.12)] text-orange-400',
];

const AVATAR_PALETTE = [
  'bg-violet-500/20 text-violet-300',
  'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20 text-rose-300',
  'bg-amber-500/20 text-amber-300',
  'bg-indigo-500/20 text-indigo-300',
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

const RANK_LABELS = ['🥇', '🥈', '🥉'];

export default function EmployeePage() {
  const { user, session } = useAuth();
  const [employees, setEmployees] = useState<EmployeeWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeWithScore['role']>('all');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'name_asc'>('score_desc');

  const [resetEmployee, setResetEmployee] = useState<EmployeeWithScore | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleResetPassword = async () => {
    if (!resetEmployee) return;
    setResetError(''); setResetSuccess('');
    if (resetPassword.length < 6) { setResetError('Минимум 6 символов'); return; }
    setResetLoading(true);
    const res = await fetch('/api/reset-employee-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ authId: resetEmployee.authId, password: resetPassword }),
    });
    const data = await res.json();
    setResetLoading(false);
    if (!res.ok) { setResetError(data.error ?? 'Ошибка'); return; }
    setResetSuccess(`Пароль для ${resetEmployee.name} обновлён`);
    setResetPassword('');
  };

  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeWithScore | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteEmployee = async () => {
    if (!deleteEmployee) return;
    setDeleteLoading(true);
    setDeleteError('');
    const res = await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ authId: deleteEmployee.authId, userId: deleteEmployee.id }),
    });
    const data = await res.json();
    setDeleteLoading(false);
    if (!res.ok) { setDeleteError(data.error ?? 'Ошибка'); return; }
    setDeleteEmployee(null);
    loadEmployees();
  };

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState(2);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const isDirector = user?.roleName === 'director';

  const loadEmployees = async () => {
    setLoading(true);
    const response = await fetchEmployees();
    if (response.error) {
      setError(response.error.message);
      setEmployees([]);
    } else {
      setEmployees(response.employees);
    }
    setLoading(false);
  };

  useEffect(() => { loadEmployees(); }, []);

  const handleInvite = async () => {
    setInviteError('');
    setInviteSuccess('');
    if (!inviteEmail || !inviteName || !invitePassword) { setInviteError('Заполните все поля'); return; }
    if (invitePassword.length < 6) { setInviteError('Пароль минимум 6 символов'); return; }
    setInviteLoading(true);
    const res = await fetch('/api/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
      body: JSON.stringify({ email: inviteEmail, fullName: inviteName, roleId: inviteRole, password: invitePassword }),
    });
    const data = await res.json();
    setInviteLoading(false);
    if (!res.ok) { setInviteError(data.error ?? 'Ошибка'); return; }
    setInviteSuccess(`Сотрудник ${inviteName} добавлен. Пароль: ${invitePassword}`);
    setInviteEmail(''); setInviteName(''); setInviteRole(2); setInvitePassword('');
    loadEmployees();
  };

  const roles = Array.from(new Set(employees.map((e) => e.role)));
  const normalizedQuery = query.trim().toLowerCase();

  const filteredEmployees = employees
    .filter((e) => {
      const matchesRole = roleFilter === 'all' || e.role === roleFilter;
      const matchesQuery = !normalizedQuery || e.name.toLowerCase().includes(normalizedQuery);
      return matchesRole && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'score_asc') return a.score - b.score;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ru');
      return b.score - a.score;
    });

  const maxScore = Math.max(...employees.map((e) => e.score), 1);

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.employee}>
      <main className="min-h-screen text-white px-3 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Header */}
          <section
            className="rounded-[24px] p-4 sm:p-8"
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Команда</p>
                <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em', color: 'var(--text-primary)' }}>Сотрудники</h1>
                <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Рейтинг, личный прогресс и очки результативности</p>
              </div>
              <div className="flex items-start gap-3">
                {isDirector && (
                  <button
                    onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(''); }}
                    className="rounded-2xl px-5 py-3 text-[14px] font-semibold transition-all duration-200 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}
                  >
                    + Пригласить
                  </button>
                )}
                <div
                  className="rounded-2xl px-5 py-3 text-center"
                  style={{ background: 'rgba(216,176,106,0.10)', border: '1px solid rgba(216,176,106,0.18)' }}
                >
                  <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(216,176,106,0.60)' }}>Сотрудников</p>
                  <p className="mt-1 text-[28px] font-bold" style={{ color: '#d8b06a', letterSpacing: '-0.04em' }}>{employees.length}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Поиск</p>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Имя сотрудника..."
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none transition-all duration-200"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <p className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Роль</p>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | EmployeeWithScore['role'])}
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none transition-all duration-200"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="all" className="bg-[#1c1c1e]">Все роли</option>
                  {roles.map((role) => (
                    <option key={role} value={role} className="bg-[#1c1c1e]">
                      {ROLE_NAMES[role as RoleName] ?? role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Сортировка</p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'score_desc' | 'score_asc' | 'name_asc')}
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none transition-all duration-200"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="score_desc" className="bg-[#1c1c1e]">Сначала высокий рейтинг</option>
                  <option value="score_asc" className="bg-[#1c1c1e]">Сначала низкий рейтинг</option>
                  <option value="name_asc" className="bg-[#1c1c1e]">По имени (А–Я)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Content */}
          {loading ? (
            <div
              className="rounded-[24px] p-8 text-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
              <p className="mt-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Загрузка сотрудников...</p>
            </div>
          ) : error ? (
            <div className="rounded-[24px] p-8 text-[#ff453a]" style={{ background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.20)' }}>{error}</div>
          ) : (
            <section className="grid gap-5 lg:grid-cols-2">
              {filteredEmployees.map((employee, index) => {
                const avatarClass = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
                const isTop3 = index < 3;
                const progressPct = Math.round((employee.score / maxScore) * 100);

                return (
                  <article
                    key={employee.id}
                    className="group rounded-[20px] p-6 transition-all duration-200 hover:scale-[1.01]"
                    style={{
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold overflow-hidden ${employee.avatarUrl ? '' : avatarClass}`}>
                        {employee.avatarUrl ? (
                          <img src={employee.avatarUrl} alt={employee.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(employee.name)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{employee.name}</h2>
                            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{ROLE_NAMES[employee.role as RoleName] ?? employee.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDirector && (
                              <>
                                <button
                                  onClick={() => { setResetEmployee(employee); setResetPassword(''); setResetError(''); setResetSuccess(''); }}
                                  className="rounded-[10px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                                >
                                  Пароль
                                </button>
                                <button
                                  onClick={() => { setDeleteEmployee(employee); setDeleteError(''); }}
                                  className="rounded-[10px] px-3 py-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                                  style={{ background: 'rgba(255,69,58,0.10)', color: '#ff453a' }}
                                >
                                  Удалить
                                </button>
                              </>
                            )}
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isTop3 ? RANK_COLORS[index] : ''}`}
                              style={!isTop3 ? { background: 'var(--bg-input)', color: 'var(--text-tertiary)' } : {}}
                            >
                              {isTop3 ? RANK_LABELS[index] : `#${index + 1}`}
                            </div>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Очки</p>
                            <p className="text-[14px] font-bold" style={{ color: '#d8b06a' }}>{employee.score.toLocaleString('ru-RU')}</p>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #d8b06a, #f1cd7f)' }}
                            />
                          </div>
                          <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{progressPct}% от максимального результата</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {!filteredEmployees.length ? (
                <div
                  className="col-span-2 rounded-[24px] p-8 text-center"
                  style={{ background: 'rgba(28,28,30,0.60)', border: '1px solid var(--bg-subtle)', color: 'var(--text-tertiary)' }}
                >
                  По заданным фильтрам сотрудников не найдено.
                </div>
              ) : null}
            </section>
          )}
        </div>
      </main>

      {/* Модал приглашения */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowInvite(false)}
        >
          <div
            className="w-full max-w-md rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 space-y-6"
            style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>Пригласить сотрудника</h2>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>На email придёт ссылка для входа</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="manager@samruq.kz"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Имя и фамилия</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Нурлан Сейткали"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Временный пароль</label>
                <input
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Роль</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(Number(e.target.value))}
                  className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {INVITE_ROLES.map((r) => (
                    <option key={r.id} value={r.id} className="bg-[#1c1c1e]">{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {inviteError && <p className="text-[13px] text-[#ff453a]">{inviteError}</p>}
            {inviteSuccess && <p className="text-[13px] text-[#30d158]">{inviteSuccess}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 rounded-[14px] py-3 text-[15px] font-medium"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              >
                Отмена
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex-1 rounded-[14px] py-3 text-[15px] font-semibold transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}
              >
                {inviteLoading ? 'Отправка...' : 'Пригласить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал сброса пароля */}
      {resetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }} onClick={() => setResetEmployee(null)}>
          <div className="w-full max-w-sm rounded-[20px] sm:rounded-[24px] p-4 sm:p-8 space-y-6" style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-[20px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>Сброс пароля</h2>
              <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{resetEmployee.name}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Новый пароль</label>
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            {resetError && <p className="text-[13px] text-[#ff453a]">{resetError}</p>}
            {resetSuccess && <p className="text-[13px] text-[#30d158]">{resetSuccess}</p>}
            <div className="flex gap-3">
              <button onClick={() => setResetEmployee(null)} className="flex-1 rounded-[14px] py-3 text-[14px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                Отмена
              </button>
              <button onClick={handleResetPassword} disabled={resetLoading || resetPassword.length < 6} className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #d8b06a, #f1cd7f)', color: '#000' }}>
                {resetLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал подтверждения удаления */}
      {deleteEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setDeleteEmployee(null)}>
          <div className="w-full max-w-sm rounded-[24px] p-7 space-y-5" style={{ background: 'var(--bg-modal)', border: '1px solid rgba(255,69,58,0.25)' }} onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-[20px] font-bold text-white" style={{ letterSpacing: '-0.03em' }}>Удалить сотрудника?</h2>
              <p className="mt-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-primary)' }}>{deleteEmployee.name}</span> потеряет доступ к системе. Это действие нельзя отменить.
              </p>
            </div>
            {deleteError && <p className="text-[13px] text-[#ff453a]">{deleteError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteEmployee(null)} className="flex-1 rounded-[14px] py-3 text-[14px] font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                Отмена
              </button>
              <button onClick={handleDeleteEmployee} disabled={deleteLoading} className="flex-1 rounded-[14px] py-3 text-[14px] font-semibold disabled:opacity-40" style={{ background: 'rgba(255,69,58,0.85)', color: 'var(--text-primary)' }}>
                {deleteLoading ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}