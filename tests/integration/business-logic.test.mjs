import test from 'node:test';
import assert from 'node:assert/strict';

// --- Permissions logic (mirrored from lib/permissions.ts) ---

const PAGE_ACCESS = {
  dashboard: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
  leads: ['director', 'manager'],
  deals: ['director', 'manager'],
  projects: ['director', 'project_manager', 'procurement'],
  kanban: ['director', 'project_manager', 'procurement'],
  gantt: ['director', 'project_manager'],
  documents: ['director', 'accountant', 'project_manager'],
  notifications: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
  employee: ['director', 'manager', 'project_manager', 'accountant', 'procurement'],
};

function canAccessPage(role, page) {
  const allowed = PAGE_ACCESS[page];
  return allowed ? allowed.includes(role) : false;
}

test('Permissions: director can access all pages', () => {
  for (const page of Object.keys(PAGE_ACCESS)) {
    assert.ok(canAccessPage('director', page), `director should access ${page}`);
  }
});

test('Permissions: manager cannot access gantt', () => {
  assert.equal(canAccessPage('manager', 'gantt'), false);
});

test('Permissions: accountant cannot access leads or deals', () => {
  assert.equal(canAccessPage('accountant', 'leads'), false);
  assert.equal(canAccessPage('accountant', 'deals'), false);
});

test('Permissions: project_manager can access gantt, kanban, projects', () => {
  assert.ok(canAccessPage('project_manager', 'gantt'));
  assert.ok(canAccessPage('project_manager', 'kanban'));
  assert.ok(canAccessPage('project_manager', 'projects'));
});

test('Permissions: unknown page returns false', () => {
  assert.equal(canAccessPage('director', 'nonexistent'), false);
});

// --- Lead SLA logic (mirrored from lib/leadAssignment.ts) ---

function getLeadSlaStatus(createdAt) {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - created) / 1000 / 60);
  if (minutes >= 30) return 'red';
  if (minutes >= 15) return 'yellow';
  return 'green';
}

function getManagerLoad(leads, managerId) {
  return leads.filter((lead) => lead.assignedTo === managerId).length;
}

function getRoundRobinManager(managers, lastIndex) {
  if (!managers.length) return null;
  const nextIndex = (lastIndex + 1) % managers.length;
  return { manager: managers[nextIndex], nextIndex };
}

function getLeastLoadedManager(leads, managers) {
  if (!managers.length) return null;
  const loads = managers.map((manager) => ({
    manager,
    load: getManagerLoad(leads, manager.id),
  }));
  return loads.reduce((prev, current) => (current.load < prev.load ? current : prev));
}

test('SLA: fresh lead is green', () => {
  const freshLead = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  assert.equal(getLeadSlaStatus(freshLead), 'green');
});

test('SLA: 20-minute-old lead is yellow', () => {
  const oldLead = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  assert.equal(getLeadSlaStatus(oldLead), 'yellow');
});

test('SLA: 45-minute-old lead is red', () => {
  const veryOldLead = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  assert.equal(getLeadSlaStatus(veryOldLead), 'red');
});

test('Round-robin: cycles through managers', () => {
  const managers = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const first = getRoundRobinManager(managers, 2);
  assert.equal(first.nextIndex, 0);
  assert.equal(first.manager.id, 1);

  const second = getRoundRobinManager(managers, first.nextIndex);
  assert.equal(second.manager.id, 2);
});

test('Round-robin: returns null for empty managers', () => {
  assert.equal(getRoundRobinManager([], 0), null);
});

test('Load balance: picks least-loaded manager', () => {
  const leads = [
    { assignedTo: 1 },
    { assignedTo: 1 },
    { assignedTo: 2 },
  ];
  const managers = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const result = getLeastLoadedManager(leads, managers);
  assert.equal(result.manager.id, 3, 'Manager 3 has 0 leads and should be chosen');
});

// --- Deal SLA days calculation (mirrored from app/deals/page.tsx) ---

function getDaysInStage(updatedAt) {
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24)));
}

function getSlaBorderClass(days) {
  if (days > 7) return 'border-rose-500/70';
  if (days >= 4) return 'border-yellow-500/60';
  return 'border-slate-700/60';
}

test('Deal SLA: fresh deal has no warning border', () => {
  const now = new Date().toISOString();
  const days = getDaysInStage(now);
  assert.equal(getSlaBorderClass(days), 'border-slate-700/60');
});

test('Deal SLA: 5-day-old deal has yellow border', () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const days = getDaysInStage(fiveDaysAgo);
  assert.equal(getSlaBorderClass(days), 'border-yellow-500/60');
});

test('Deal SLA: 10-day-old deal has red border', () => {
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const days = getDaysInStage(tenDaysAgo);
  assert.equal(getSlaBorderClass(days), 'border-rose-500/70');
});

test('getDaysInStage: never returns negative', () => {
  const futureDate = new Date(Date.now() + 1000000).toISOString();
  assert.ok(getDaysInStage(futureDate) >= 0);
});

// --- Gantt offset calculation (mirrored from app/gantt/page.tsx) ---

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function getOffsetPercent(date, bounds) {
  if (!date) return 0;
  const total = bounds.end.getTime() - bounds.start.getTime();
  if (total <= 0) return 0;
  return clamp(((date.getTime() - bounds.start.getTime()) / total) * 100, 0, 100);
}

test('Gantt: start date gives 0% offset', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-31');
  assert.equal(getOffsetPercent(start, { start, end }), 0);
});

test('Gantt: end date gives 100% offset', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-31');
  assert.equal(getOffsetPercent(end, { start, end }), 100);
});

test('Gantt: midpoint is approximately 50%', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-31');
  const mid = new Date('2024-01-16');
  const offset = getOffsetPercent(mid, { start, end });
  assert.ok(offset > 45 && offset < 55, `Mid offset should be ~50%, got ${offset}`);
});

test('Gantt: out-of-range date is clamped to 0–100', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-01-31');
  const before = new Date('2023-12-01');
  const after = new Date('2024-03-01');
  assert.equal(getOffsetPercent(before, { start, end }), 0);
  assert.equal(getOffsetPercent(after, { start, end }), 100);
});
