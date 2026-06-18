import type { EmployeeSummary, Lead } from '@/lib/types';

export const AUTO_ASSIGN_MODES = ['round_robin', 'load_balance', 'manual'] as const;
export type AutoAssignMode = typeof AUTO_ASSIGN_MODES[number];

export function getLeadSlaStatus(createdAt: string) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - created) / 1000 / 60);

  if (minutes >= 30) return 'red';
  if (minutes >= 15) return 'yellow';
  return 'green';
}

export function getManagerLoad(leads: Lead[], managerId: number) {
  return leads.filter((lead) => lead.assignedTo === managerId).length;
}

export function getRoundRobinManager(managers: EmployeeSummary[], lastIndex: number) {
  if (!managers.length) return null;
  const nextIndex = (lastIndex + 1) % managers.length;
  return { manager: managers[nextIndex], nextIndex };
}

export function getLeastLoadedManager(leads: Lead[], managers: EmployeeSummary[]) {
  if (!managers.length) return null;
  const loads = managers.map((manager) => ({
    manager,
    load: getManagerLoad(leads, manager.id),
  }));
  return loads.reduce((prev, current) => (current.load < prev.load ? current : prev));
}

export function assignLeadBatch(
  leads: Lead[],
  managers: EmployeeSummary[],
  mode: AutoAssignMode,
  lastIndex: number,
) {
  const updatedLeads = leads.map((lead) => ({ ...lead, slaStatus: getLeadSlaStatus(lead.createdAt) }));
  let pointer = lastIndex;
  const result = updatedLeads.map((lead) => {
    if (lead.assignedTo) return lead;

    if (mode === 'manual') return lead;

    if (mode === 'round_robin') {
      const next = getRoundRobinManager(managers, pointer);
      if (!next) return lead;
      pointer = next.nextIndex;
      return { ...lead, assignedTo: next.manager.id };
    }

    if (mode === 'load_balance') {
      const leastLoaded = getLeastLoadedManager(updatedLeads, managers);
      if (!leastLoaded) return lead;
      return { ...lead, assignedTo: leastLoaded.manager.id };
    }

    return lead;
  });

  return { leads: result, lastIndex: pointer };
}
