import { supabase } from '@/lib/supabaseClient';
import type { RoleName } from '@/lib/types';

export interface EmployeeWithScore {
  id: number;
  name: string;
  role: RoleName;
  score: number;
}

export async function fetchEmployees() {
  const [{ data: users, error: usersError }, { data: scores, error: scoresError }] = await Promise.all([
    supabase.from('users').select('id, full_name, roles(name)'),
    supabase.from('employee_scores').select('user_id, score'),
  ]);

  if (usersError || scoresError) {
    return {
      employees: [] as EmployeeWithScore[],
      error: usersError || scoresError,
    };
  }

  const scoreByUser = new Map<number, number>();
  (scores ?? []).forEach((row: any) => {
    const userId = row.user_id;
    const existing = scoreByUser.get(userId) ?? 0;
    scoreByUser.set(userId, existing + Number(row.score));
  });

  const employees: EmployeeWithScore[] = (users ?? []).map((row: any) => ({
    id: row.id,
    name: row.full_name,
    role: (row.roles?.name ?? 'manager') as RoleName,
    score: scoreByUser.get(row.id) ?? 0,
  }));

  return { employees, error: null };
}
