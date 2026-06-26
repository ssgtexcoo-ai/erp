'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchEmployees, type EmployeeWithScore } from '@/lib/employeeService';

export default function EmployeePage() {
  const [employees, setEmployees] = useState<EmployeeWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeWithScore['role']>('all');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'name_asc'>('score_desc');

  useEffect(() => {
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

    loadEmployees();
  }, []);

  const roles = Array.from(new Set(employees.map((employee) => employee.role)));
  const normalizedQuery = query.trim().toLowerCase();

  const filteredEmployees = employees
    .filter((employee) => {
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
      const matchesQuery = !normalizedQuery || employee.name.toLowerCase().includes(normalizedQuery);
      return matchesRole && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'score_asc') return a.score - b.score;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ru');
      return b.score - a.score;
    });

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.employee}>
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <h1 className="text-3xl font-semibold">Дашборд сотрудника</h1>
            <p className="mt-3 text-slate-400">Рейтинг, личный прогресс, очки и задачи.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-300">
                Поиск
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Имя сотрудника"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                Роль
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | EmployeeWithScore['role'])}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="all">Все роли</option>
                  {roles.map((role) => (
                    <option key={role} value={role} className="bg-slate-950 text-slate-100">
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                Сортировка
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'score_desc' | 'score_asc' | 'name_asc')}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                >
                  <option value="score_desc">Сначала высокий рейтинг</option>
                  <option value="score_asc">Сначала низкий рейтинг</option>
                  <option value="name_asc">По имени (А-Я)</option>
                </select>
              </label>
            </div>
          </section>

          {loading ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-300">Загрузка сотрудников...</div>
          ) : error ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-red-400">{error}</div>
          ) : (
            <section className="grid gap-6 lg:grid-cols-2">
              {filteredEmployees.map((employee, index) => (
                <article key={employee.id} className="rounded-3xl border border-slate-700 bg-slate-900/80 p-6">
                  <h2 className="text-xl font-semibold text-slate-100">{employee.name}</h2>
                  <p className="mt-2 text-sm text-slate-400">Роль: {employee.role}</p>
                  <p className="mt-4 text-3xl font-semibold">{employee.score} очков</p>
                  <p className="mt-2 text-sm text-slate-400">Позиция в рейтинге: {index + 1}</p>
                </article>
              ))}
              {!filteredEmployees.length ? (
                <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-400">
                  По заданным фильтрам сотрудников не найдено.
                </div>
              ) : null}
            </section>
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
