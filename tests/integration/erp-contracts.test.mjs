import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../../', import.meta.url);

async function read(relativePath) {
  const fileUrl = new URL(relativePath, ROOT);
  return readFile(fileUrl, 'utf8');
}

test('DB schema contains core ERP tables', async () => {
  const schema = await read('db/schema.sql');
  const requiredTables = [
    'create table leads',
    'create table deals',
    'create table projects',
    'create table tasks',
    'create table documents',
    'create table notifications',
  ];

  for (const tableDef of requiredTables) {
    assert.ok(schema.includes(tableDef), `Missing table definition: ${tableDef}`);
  }
});

test('Core services expose CRUD operations', async () => {
  const checks = [
    {
      file: 'lib/leadService.ts',
      snippets: ['export async function fetchLeads', 'export async function createLead', 'export async function updateLead', 'export async function deleteLead'],
    },
    {
      file: 'lib/dealService.ts',
      snippets: ['export async function fetchDeals', 'export async function createDeal', 'export async function updateDeal', 'export async function deleteDeal'],
    },
    {
      file: 'lib/projectService.ts',
      snippets: ['export async function fetchProjects', 'export async function createProject', 'export async function updateProject', 'export async function deleteProject'],
    },
    {
      file: 'lib/taskService.ts',
      snippets: ['export async function fetchTasks', 'export async function createTask', 'export async function updateTask', 'export async function deleteTask'],
    },
    {
      file: 'lib/documentService.ts',
      snippets: ['export async function fetchDocuments', 'export async function createDocument', 'export async function updateDocument', 'export async function deleteDocument'],
    },
  ];

  for (const check of checks) {
    const content = await read(check.file);
    for (const snippet of check.snippets) {
      assert.ok(content.includes(snippet), `Missing contract in ${check.file}: ${snippet}`);
    }
  }
});

test('Protected routes and key UI actions exist', async () => {
  const routes = await read('lib/permissions.ts');
  const requiredRoutes = ['dashboard', 'leads', 'deals', 'projects', 'kanban', 'gantt', 'documents', 'notifications', 'employee'];

  for (const route of requiredRoutes) {
    assert.ok(routes.includes(`${route}:`), `Missing PAGE_ACCESS key: ${route}`);
  }

  const dealsPage = await read('app/deals/page.tsx');
  const projectsPage = await read('app/projects/page.tsx');
  const kanbanPage = await read('app/kanban/page.tsx');

  assert.ok(dealsPage.includes('Добавить сделку'), 'Deals page should provide create action');
  assert.ok(projectsPage.includes('Добавить объект'), 'Projects page should provide create action');
  assert.ok(kanbanPage.includes('Добавить задачу'), 'Kanban page should provide create action');
});
