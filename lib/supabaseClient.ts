import { createClient, type Session } from '@supabase/supabase-js';
import { LEAD_SOURCES } from '@/lib/constants';
import { sampleDeals, sampleDocuments, sampleEmployees, sampleLeads, sampleNotifications, sampleProjects, sampleTasks } from '@/lib/mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isDemoMode =
	!supabaseUrl ||
	!supabaseAnonKey ||
	supabaseUrl.includes('your-project-ref') ||
	supabaseAnonKey.includes('your-anon-key');

type DemoRecord = Record<string, any>;
type DemoTableName =
	| 'roles'
	| 'users'
	| 'lead_sources'
	| 'leads'
	| 'deal_stages'
	| 'deals'
	| 'projects'
	| 'project_stages'
	| 'tasks'
	| 'document_categories'
	| 'documents'
	| 'notifications'
	| 'employee_scores'
	| 'activity_logs'
	| 'company_settings';

type SelectOptions = { count?: 'exact'; head?: boolean };
type OrderOptions = { ascending?: boolean };
type Filter = { type: 'eq' | 'neq' | 'in' | 'lt' | 'lte' | 'gte' | 'gt' | 'ilike' | 'not_is_null' | 'or'; column: string; value: unknown };

interface DemoSessionUser {
	id: string;
	email: string;
	role: 'authenticated';
	aud: 'authenticated';
	app_metadata: Record<string, unknown>;
	user_metadata: Record<string, unknown>;
	created_at: string;
}

interface DemoAuthUserRow {
	id: number;
	auth_id: string;
	email: string;
	full_name: string;
	role_id: number;
	is_active: boolean;
	created_at: string;
	roles: { name: string };
}

interface DemoState {
	roles: DemoRecord[];
	users: DemoAuthUserRow[];
	lead_sources: DemoRecord[];
	leads: DemoRecord[];
	deal_stages: DemoRecord[];
	deals: DemoRecord[];
	projects: DemoRecord[];
	project_stages: DemoRecord[];
	tasks: DemoRecord[];
	document_categories: DemoRecord[];
	documents: DemoRecord[];
	notifications: DemoRecord[];
	employee_scores: DemoRecord[];
	activity_logs: DemoRecord[];
	company_settings: DemoRecord[];
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function nowIso() {
	return new Date().toISOString();
}

const demoUsers: DemoAuthUserRow[] = [
	{
		id: 1,
		auth_id: 'demo-director',
		email: 'director@samruq.kz',
		full_name: 'Директор Samruq',
		role_id: 1,
		is_active: true,
		created_at: '2026-06-17T08:00:00Z',
		roles: { name: 'director' },
	},
	{
		id: 2,
		auth_id: 'demo-manager-1',
		email: 'manager1@samruq.kz',
		full_name: 'Менеджер Нурлан',
		role_id: 2,
		is_active: true,
		created_at: '2026-06-17T08:10:00Z',
		roles: { name: 'manager' },
	},
	{
		id: 3,
		auth_id: 'demo-manager-2',
		email: 'manager2@samruq.kz',
		full_name: 'Менеджер Аружан',
		role_id: 2,
		is_active: true,
		created_at: '2026-06-17T08:20:00Z',
		roles: { name: 'manager' },
	},
	{
		id: 4,
		auth_id: 'demo-project-manager',
		email: 'projectmgr@samruq.kz',
		full_name: 'Руководитель проекта Жанат',
		role_id: 3,
		is_active: true,
		created_at: '2026-06-17T08:30:00Z',
		roles: { name: 'project_manager' },
	},
	{
		id: 5,
		auth_id: 'demo-accountant',
		email: 'accountant@samruq.kz',
		full_name: 'Бухгалтер Алина',
		role_id: 4,
		is_active: true,
		created_at: '2026-06-17T08:40:00Z',
		roles: { name: 'accountant' },
	},
	{
		id: 6,
		auth_id: 'demo-procurement',
		email: 'procurement@samruq.kz',
		full_name: 'Снабжение Саят',
		role_id: 5,
		is_active: true,
		created_at: '2026-06-17T08:50:00Z',
		roles: { name: 'procurement' },
	},
];

const demoDealStages = [
	{ id: 1, name: 'Новый', progress_percent: 5, order_index: 1 },
	{ id: 2, name: 'КП отправлено', progress_percent: 35, order_index: 2 },
	{ id: 3, name: 'Договор', progress_percent: 45, order_index: 3 },
	{ id: 4, name: 'Оплата', progress_percent: 60, order_index: 4 },
	{ id: 5, name: 'Производство', progress_percent: 75, order_index: 5 },
	{ id: 6, name: 'Монтаж', progress_percent: 90, order_index: 6 },
	{ id: 7, name: 'Завершено', progress_percent: 100, order_index: 7 },
];

const demoDocumentCategories = [
	{ id: 1, name: 'Договор' },
	{ id: 2, name: 'Чертеж' },
	{ id: 3, name: 'Акт' },
	{ id: 4, name: 'Фото' },
];

function buildDemoState(): DemoState {
	const leadStageByName = new Map([
		['new', 1],
		['contacted', 1],
		['negotiation', 2],
		['proposal_sent', 2],
		['agreement', 3],
		['payment', 4],
		['production', 5],
		['installation', 6],
		['handover', 7],
		['signed', 7],
		['closed', 7],
	]);

	const leadSources = LEAD_SOURCES.map((name, index) => ({ id: index + 1, name }));
	const projectStatusMap: Record<string, string> = { 'План': 'planning', 'В работе': 'active', 'На проверке': 'on_hold' };

	const leads = sampleLeads.map((lead) => ({
		id: lead.id,
		lead_code: lead.leadCode,
		source_id: lead.sourceId,
		client_id: null,
		created_at: lead.createdAt,
		assigned_to: lead.assignedTo,
		status: lead.status,
		customer_name: lead.customerName,
		phone: lead.phone,
		email: lead.email,
		comment: lead.comment,
		sla_status: lead.slaStatus,
	}));

	const deals = sampleDeals.map((deal) => ({
		id: deal.id,
		lead_id: deal.leadId,
		client_id: null,
		customer_name: deal.customerName,
		amount: deal.amount,
		stage_id: leadStageByName.get(deal.stage) ?? 2,
		progress_percent: deal.progressPercent,
		assigned_to: deal.assignedTo,
		created_at: deal.createdAt,
		updated_at: deal.updatedAt,
	}));

	const projects = sampleProjects.map((project) => ({
		id: project.id,
		deal_id: project.dealId,
		name: project.name,
		client_name: project.clientName,
		budget: project.budget,
		responsible_id: project.responsibleId,
		start_date: project.startDate,
		end_date: project.endDate,
		status: projectStatusMap[project.status] ?? project.status.toLowerCase(),
		profit_estimate: project.profitEstimate,
	}));

	const projectStages = [
		{ id: 1, project_id: 1, name: 'Проектирование', status: 'Выполнено', start_date: '2026-06-18', end_date: '2026-06-20', progress_percent: 100 },
		{ id: 2, project_id: 1, name: 'Подготовка площадки', status: 'В работе', start_date: '2026-06-21', end_date: '2026-07-05', progress_percent: 55 },
		{ id: 3, project_id: 1, name: 'Монтаж', status: 'План', start_date: '2026-07-06', end_date: '2026-10-12', progress_percent: 0 },
		{ id: 4, project_id: 2, name: 'Согласование', status: 'Выполнено', start_date: '2026-06-30', end_date: '2026-07-01', progress_percent: 100 },
		{ id: 5, project_id: 2, name: 'Монтаж', status: 'В работе', start_date: '2026-07-02', end_date: '2026-08-20', progress_percent: 40 },
	];

	const tasks = sampleTasks.map((task) => ({
		id: task.id,
		project_id: task.projectId,
		title: task.title,
		description: task.description,
		assigned_to: task.assignedTo,
		due_date: task.dueDate,
		status: task.status,
		priority: task.priority,
		created_at: task.createdAt,
		updated_at: task.updatedAt,
	}));

	const documents = sampleDocuments.map((document, index) => ({
		id: document.id,
		project_id: document.projectId,
		deal_id: document.dealId,
		category_id: index + 1,
		name: document.name,
		file_url: document.fileUrl,
		uploaded_by: document.uploadedBy,
		uploaded_at: document.uploadedAt,
	}));

	const notifications = sampleNotifications.map((notification) => ({
		id: notification.id,
		user_id: notification.userId,
		event_type: notification.eventType,
		payload: notification.payload,
		is_read: notification.isRead,
		created_at: notification.createdAt,
	}));

	const employeeScores = sampleEmployees.map((employee, index) => ({
		id: index + 1,
		user_id: employee.id,
		event: 'demo_score',
		score: employee.score,
		created_at: nowIso(),
	}));

	return {
		roles: [
			{ id: 1, name: 'director', description: 'Полный доступ для директора' },
			{ id: 2, name: 'manager', description: 'Доступ к своим лидам и сделкам' },
			{ id: 3, name: 'project_manager', description: 'Управление всеми проектами и задачами' },
			{ id: 4, name: 'accountant', description: 'Работа с договорными и финансовыми документами' },
			{ id: 5, name: 'procurement', description: 'Управление закупками и поставщиками' },
		],
		users: clone(demoUsers),
		lead_sources: leadSources,
		leads,
		deal_stages: clone(demoDealStages),
		deals,
		projects,
		project_stages: projectStages,
		tasks,
		document_categories: clone(demoDocumentCategories),
		documents,
		notifications,
		employee_scores: employeeScores,
		activity_logs: [
			{ id: 1, user_id: 1, action: 'created_deal', entity: 'deal', entity_id: 1, payload: { name: 'ТОО Самрук' }, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
			{ id: 2, user_id: 2, action: 'moved_deal', entity: 'deal', entity_id: 1, payload: { from: 'Новая', to: 'Переговоры' }, created_at: new Date(Date.now() - 86400000).toISOString() },
			{ id: 3, user_id: 1, action: 'created_lead', entity: 'lead', entity_id: 1, payload: { name: 'Арман Сейткали' }, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
			{ id: 4, user_id: 2, action: 'completed_task', entity: 'task', entity_id: 1, payload: { title: 'Подготовить КП' }, created_at: new Date(Date.now() - 3600000).toISOString() },
		],
		company_settings: [
			{ id: 1, company_name: 'SAMRUQ Qurylys', company_phone: '+7 777 123 45 67', company_address: 'г. Алматы, ул. Достык 123' },
		],
	};
}

const demoState = buildDemoState();

const demoSessionUser = {
	id: demoState.users[0].auth_id,
	email: demoState.users[0].email,
	role: 'authenticated' as const,
	aud: 'authenticated' as const,
	app_metadata: {},
	user_metadata: {},
	created_at: demoState.users[0].created_at,
};

let currentDemoSession: Session | null = {
	access_token: 'demo-access-token',
	token_type: 'bearer',
	expires_in: 24 * 60 * 60,
	expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
	refresh_token: 'demo-refresh-token',
	provider_token: null,
	provider_refresh_token: null,
	user: demoSessionUser as any,
} as Session;

const authListeners = new Set<(event: string, session: Session | null) => void>();

function notifyAuth(event: string, session: Session | null) {
	authListeners.forEach((listener) => {
		void listener(event, session);
	});
}

function getTableRows(table: DemoTableName): DemoRecord[] {
	return demoState[table] as DemoRecord[];
}

function setTableRows(table: DemoTableName, rows: DemoRecord[]) {
	(demoState[table] as DemoRecord[]) = rows;
}

function nextId(table: DemoTableName) {
	const rows = getTableRows(table);
	return rows.reduce((max, row) => Math.max(max, Number(row.id ?? 0)), 0) + 1;
}

function matchesFilters(row: DemoRecord, filters: Filter[]): boolean {
	return filters.every((filter): boolean => {
		const value = row[filter.column];
		if (filter.type === 'eq') return value === filter.value;
		if (filter.type === 'neq') return value !== filter.value;
		if (filter.type === 'in') return Array.isArray(filter.value) && filter.value.includes(value);
		if (filter.type === 'lt') return value != null && value < (filter.value as string | number);
		if (filter.type === 'lte') return value != null && value <= (filter.value as string | number);
		if (filter.type === 'gte') return value != null && value >= (filter.value as string | number);
		if (filter.type === 'gt') return value != null && value > (filter.value as string | number);
		if (filter.type === 'ilike') {
			const pattern = String(filter.value ?? '').replace(/%/g, '');
			return String(value ?? '').toLowerCase().includes(pattern.toLowerCase());
		}
		if (filter.type === 'not_is_null') return value != null;
		if (filter.type === 'or') {
			const subFilters = filter.value as Filter[];
			return subFilters.some((sub): boolean => matchesFilters(row, [sub]));
		}
		return true;
	});
}

function orderRows(rows: DemoRecord[], column?: string, ascending = true) {
	if (!column) return rows;
	return [...rows].sort((left, right) => {
		const leftValue = left[column];
		const rightValue = right[column];
		if (leftValue == null && rightValue == null) return 0;
		if (leftValue == null) return ascending ? -1 : 1;
		if (rightValue == null) return ascending ? 1 : -1;
		const leftComparable = typeof leftValue === 'number' ? leftValue : String(leftValue);
		const rightComparable = typeof rightValue === 'number' ? rightValue : String(rightValue);
		if (leftComparable < rightComparable) return ascending ? -1 : 1;
		if (leftComparable > rightComparable) return ascending ? 1 : -1;
		return 0;
	});
}

function applyInsertDefaults(table: DemoTableName, input: DemoRecord) {
	const timestamp = nowIso();

	if (table === 'leads') {
		return {
			id: nextId(table),
			lead_code: input.lead_code ?? `L-${Date.now()}`,
			source_id: input.source_id ?? null,
			client_id: input.client_id ?? null,
			created_at: input.created_at ?? timestamp,
			assigned_to: input.assigned_to ?? null,
			status: input.status ?? 'new',
			customer_name: input.customer_name ?? '',
			phone: input.phone ?? '',
			email: input.email ?? '',
			comment: input.comment ?? '',
			sla_status: input.sla_status ?? 'green',
		};
	}

	if (table === 'deals') {
		return {
			id: nextId(table),
			lead_id: input.lead_id ?? null,
			client_id: input.client_id ?? null,
			customer_name: input.customer_name ?? '',
			amount: input.amount ?? 0,
			stage_id: input.stage_id ?? null,
			progress_percent: input.progress_percent ?? 0,
			assigned_to: input.assigned_to ?? null,
			created_at: input.created_at ?? timestamp,
			updated_at: input.updated_at ?? timestamp,
		};
	}

	if (table === 'projects') {
		return {
			id: nextId(table),
			deal_id: input.deal_id ?? null,
			name: input.name ?? '',
			client_name: input.client_name ?? '',
			budget: input.budget ?? 0,
			responsible_id: input.responsible_id ?? null,
			start_date: input.start_date ?? null,
			end_date: input.end_date ?? null,
			status: input.status ?? 'planning',
			profit_estimate: input.profit_estimate ?? null,
		};
	}

	if (table === 'tasks') {
		return {
			id: nextId(table),
			project_id: input.project_id ?? null,
			title: input.title ?? '',
			description: input.description ?? '',
			assigned_to: input.assigned_to ?? null,
			due_date: input.due_date ?? null,
			status: input.status ?? 'План',
			priority: input.priority ?? null,
			created_at: input.created_at ?? timestamp,
			updated_at: input.updated_at ?? timestamp,
		};
	}

	if (table === 'documents') {
		return {
			id: nextId(table),
			project_id: input.project_id ?? null,
			deal_id: input.deal_id ?? null,
			category_id: input.category_id ?? null,
			name: input.name ?? '',
			file_url: input.file_url ?? '',
			uploaded_by: input.uploaded_by ?? null,
			uploaded_at: input.uploaded_at ?? timestamp,
		};
	}

	if (table === 'notifications') {
		return {
			id: nextId(table),
			user_id: input.user_id ?? null,
			event_type: input.event_type ?? '',
			payload: input.payload ?? {},
			is_read: input.is_read ?? false,
			created_at: input.created_at ?? timestamp,
		};
	}

	if (table === 'employee_scores') {
		return {
			id: nextId(table),
			user_id: input.user_id ?? null,
			event: input.event ?? '',
			score: input.score ?? 0,
			created_at: input.created_at ?? timestamp,
		};
	}

	return { id: nextId(table), ...input };
}

function getDemoRows(table: DemoTableName, filters: Filter[], orderBy?: { column: string; ascending: boolean }) {
	let rows = getTableRows(table).filter((row) => matchesFilters(row, filters));
	if (orderBy) rows = orderRows(rows, orderBy.column, orderBy.ascending);
	return rows;
}

class DemoQueryBuilder {
	private filters: Filter[] = [];

	private orderBy: { column: string; ascending: boolean } | null = null;

	private action: 'select' | 'insert' | 'update' | 'delete' = 'select';

	private payload: DemoRecord | DemoRecord[] | null = null;

	private selectOptions: SelectOptions = {};

	private singleMode = false;

	private isMutation = false;

	constructor(private readonly table: DemoTableName) {}

	select(_columns = '*', options: SelectOptions = {}) {
		if (!this.isMutation) {
			this.action = 'select';
		}
		this.selectOptions = options;
		return this;
	}

	insert(values: DemoRecord | DemoRecord[]) {
		this.action = 'insert';
		this.payload = values;
		this.isMutation = true;
		return this;
	}

	update(values: DemoRecord) {
		this.action = 'update';
		this.payload = values;
		this.isMutation = true;
		return this;
	}

	delete() {
		this.action = 'delete';
		this.isMutation = true;
		return this;
	}

	eq(column: string, value: unknown) {
		this.filters.push({ type: 'eq', column, value });
		return this;
	}

	neq(column: string, value: unknown) {
		this.filters.push({ type: 'neq', column, value });
		return this;
	}

	in(column: string, values: unknown[]) {
		this.filters.push({ type: 'in', column, value: values });
		return this;
	}

	lt(column: string, value: unknown) {
		this.filters.push({ type: 'lt', column, value });
		return this;
	}

	lte(column: string, value: unknown) {
		this.filters.push({ type: 'lte', column, value });
		return this;
	}

	gte(column: string, value: unknown) {
		this.filters.push({ type: 'gte', column, value });
		return this;
	}

	gt(column: string, value: unknown) {
		this.filters.push({ type: 'gt', column, value });
		return this;
	}

	ilike(column: string, pattern: string) {
		this.filters.push({ type: 'ilike', column, value: pattern });
		return this;
	}

	or(query: string) {
		// Parse PostgREST or() string like "col1.ilike.%x%,col2.ilike.%x%"
		const subFilters: Filter[] = query.split(',').map((part) => {
			const [col, op, ...rest] = part.trim().split('.');
			const val = rest.join('.');
			return { type: (op ?? 'eq') as Filter['type'], column: col ?? '', value: val };
		});
		this.filters.push({ type: 'or', column: '', value: subFilters });
		return this;
	}

	not(column: string, operator: string, _value: unknown) {
		if (operator === 'is') {
			this.filters.push({ type: 'not_is_null', column, value: null });
		}
		return this;
	}

	limit(_count: number) {
		return this;
	}

	range(_from: number, _to: number) {
		return this;
	}

	order(column: string, options: OrderOptions = {}) {
		this.orderBy = { column, ascending: options.ascending ?? true };
		return this;
	}

	single() {
		this.singleMode = true;
		return this;
	}

	then<TResult1 = any, TResult2 = never>(
		onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	) {
		return this.execute().then(onfulfilled, onrejected);
	}

	private async execute() {
		try {
			if (this.action === 'select') {
				const rows = getDemoRows(this.table, this.filters, this.orderBy ?? undefined);
				if (this.selectOptions.head && this.selectOptions.count === 'exact') {
					return { data: null, count: rows.length, error: null };
				}

				return { data: this.singleMode ? rows[0] ?? null : clone(rows), count: rows.length, error: null };
			}

			if (this.action === 'insert') {
				const payloadRows = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
				const insertedRows = payloadRows.map((row) => applyInsertDefaults(this.table, row));
				setTableRows(this.table, [...getTableRows(this.table), ...insertedRows]);
				return { data: this.singleMode ? clone(insertedRows[0] ?? null) : clone(insertedRows), error: null };
			}

			if (this.action === 'update') {
				const updates = (this.payload ?? {}) as DemoRecord;
				const rows = getTableRows(this.table);
				const updatedRows: DemoRecord[] = [];
				const nextRows = rows.map((row) => {
					if (!matchesFilters(row, this.filters)) return row;
					const updated = { ...row, ...updates };
					if ('updated_at' in updated) updated.updated_at = nowIso();
					updatedRows.push(updated);
					return updated;
				});
				setTableRows(this.table, nextRows);
				return { data: this.singleMode ? clone(updatedRows[0] ?? null) : clone(updatedRows), error: null };
			}

			if (this.action === 'delete') {
				const rows = getTableRows(this.table);
				const remainingRows = rows.filter((row) => !matchesFilters(row, this.filters));
				setTableRows(this.table, remainingRows);
				return { data: null, error: null };
			}

			return { data: null, error: null };
		} catch (error) {
			return { data: null, error: error instanceof Error ? error : new Error('Demo query failed') };
		}
	}
}

function createDemoSupabase() {
	return {
		auth: {
			async getSession() {
				return { data: { session: currentDemoSession }, error: null };
			},
			async signInWithOtp({ email }: { email: string }) {
				const matchedUser = demoState.users.find((user) => user.email === email) ?? demoState.users[0];
				currentDemoSession = {
					access_token: `demo-access-${matchedUser.id}`,
					token_type: 'bearer',
					expires_in: 24 * 60 * 60,
					expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
					refresh_token: `demo-refresh-${matchedUser.id}`,
					provider_token: null,
					provider_refresh_token: null,
					user: {
						id: matchedUser.auth_id,
						email: matchedUser.email,
						role: 'authenticated',
						aud: 'authenticated',
						app_metadata: {},
						user_metadata: {},
						created_at: matchedUser.created_at,
					} as any,
				} as Session;
				notifyAuth('SIGNED_IN', currentDemoSession);
				return { data: { session: currentDemoSession }, error: null };
			},
			async signOut() {
				currentDemoSession = null;
				notifyAuth('SIGNED_OUT', null);
				return { error: null };
			},
			onAuthStateChange(callback: (event: string, session: Session | null) => void) {
				authListeners.add(callback);
				return {
					data: {
						subscription: {
							unsubscribe() {
								authListeners.delete(callback);
							},
						},
					},
				};
			},
		},
		from(table: string) {
			return new DemoQueryBuilder(table as DemoTableName);
		},
	};
}

const realSupabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'demo-anon-key');

export const supabase: any = isDemoMode ? createDemoSupabase() : realSupabase;
