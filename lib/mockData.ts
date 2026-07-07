import type { Project, Task, Deal, Lead, DocumentRecord, NotificationRecord } from '@/lib/types';

export const sampleLeads: Lead[] = [
  {
    id: 1,
    leadCode: 'L-1001',
    sourceId: 1,
    createdAt: '2026-06-17T09:14:00Z',
    assignedTo: 2,
    status: 'new',
    customerName: 'ТОО "СтройСити"',
    phone: '+7 707 123 45 67',
    email: 'client@stroycity.kz',
    comment: 'Запрос на строительство складского комплекса',
    slaStatus: 'green',
  },
  {
    id: 2,
    leadCode: 'L-1002',
    sourceId: 5,
    createdAt: '2026-06-16T14:23:00Z',
    assignedTo: 3,
    status: 'contacted',
    customerName: 'ИП Аман',
    phone: '+7 701 987 65 43',
    email: 'aman@example.com',
    comment: 'Интересуются монтажом офисного помещения',
    slaStatus: 'yellow',
  },
  {
    id: 3,
    leadCode: 'L-1003',
    sourceId: 8,
    createdAt: '2026-06-15T10:02:00Z',
    assignedTo: 2,
    status: 'negotiation',
    customerName: 'ТОО "Альянс Групп"',
    phone: '+7 701 456 78 90',
    email: 'info@alyans.kz',
    comment: 'Требуется КП и предварительный расчёт сроков',
    slaStatus: 'red',
  },
];

export const sampleDeals: Deal[] = [
  {
    id: 1,
    leadId: 1,
    customerName: 'ТОО "СтройСити"',
    amount: 12_500_000,
    stage: 'payment',
    progressPercent: 60,
    assignedTo: 2,
    createdAt: '2026-06-17T09:20:00Z',
    updatedAt: '2026-06-17T09:50:00Z',
  },
  {
    id: 2,
    leadId: 2,
    customerName: 'ИП Аман',
    amount: 4_900_000,
    stage: 'proposal_sent',
    progressPercent: 35,
    assignedTo: 3,
    createdAt: '2026-06-16T14:45:00Z',
    updatedAt: '2026-06-16T15:10:00Z',
  },
];

export const sampleProjects: Project[] = [
  {
    id: 1,
    dealId: 1,
    name: 'Складской корпус №7',
    clientName: 'ТОО "СтройСити"',
    budget: 12_500_000,
    responsibleId: 4,
    startDate: '2026-06-18',
    endDate: '2026-10-12',
    status: 'В работе',
    profitEstimate: 1_250_000,
  },
  {
    id: 2,
    dealId: 2,
    name: 'Монтаж офиса на Талгарской',
    clientName: 'ИП Аман',
    budget: 4_900_000,
    responsibleId: 4,
    startDate: '2026-07-01',
    endDate: '2026-08-20',
    status: 'План',
    profitEstimate: 490_000,
  },
];

export const sampleTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: 'Разработка проектной документации',
    description: 'Сбор техзадания, проектирование узлов',
    assignedTo: 4,
    dueDate: '2026-06-25',
    status: 'План',
    priority: 'high',
    createdAt: '2026-06-17T10:00:00Z',
    updatedAt: '2026-06-17T10:25:00Z',
  },
  {
    id: 2,
    projectId: 1,
    title: 'Закупка металлоконструкций',
    description: 'Запрос коммерческих предложений у поставщиков',
    assignedTo: 5,
    dueDate: '2026-06-30',
    status: 'В работе',
    priority: 'medium',
    createdAt: '2026-06-17T10:15:00Z',
    updatedAt: '2026-06-17T10:40:00Z',
  },
  {
    id: 3,
    projectId: 2,
    title: 'Проверка сметы и графика поставки',
    description: 'Согласование с бухгалтерией и снабжением',
    assignedTo: 4,
    dueDate: '2026-07-03',
    status: 'На проверке',
    priority: 'high',
    createdAt: '2026-06-17T11:05:00Z',
    updatedAt: '2026-06-17T11:35:00Z',
  },
];

export const sampleDocuments: DocumentRecord[] = [
  {
    id: 1,
    projectId: 1,
    dealId: 1,
    category: 'Договор',
    name: 'Договор поставки и монтажа.pdf',
    fileUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf-sample.pdf',
    uploadedBy: 4,
    uploadedAt: '2026-06-17T11:00:00Z',
  },
  {
    id: 2,
    projectId: 1,
    dealId: 1,
    category: 'Чертеж',
    name: 'Схема фундамента.pdf',
    fileUrl: 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf-sample.pdf',
    uploadedBy: 5,
    uploadedAt: '2026-06-17T11:20:00Z',
  },
];

export const sampleNotifications: NotificationRecord[] = [
  {
    id: 1,
    userId: 2,
    eventType: 'new_lead',
    payload: { leadCode: 'L-1004', customerName: 'ТОО "Импульс"' },
    isRead: false,
    createdAt: '2026-06-17T12:00:00Z',
  },
  {
    id: 2,
    userId: 4,
    eventType: 'overdue_task',
    payload: { taskTitle: 'Закупка материалов', projectName: 'Складской корпус №7' },
    isRead: true,
    createdAt: '2026-06-16T19:30:00Z',
  },
];

export const sampleEmployees = [
  { id: 2, name: 'Нурлан', role: 'manager', score: 1280 },
  { id: 3, name: 'Аружан', role: 'manager', score: 420 },
  { id: 4, name: 'Жанат', role: 'project_manager', score: 940 },
  { id: 5, name: 'Саят', role: 'procurement', score: 760 },
];

export const taskStatuses = ['План', 'В работе', 'На проверке', 'Выполнено', 'Просрочено'] as const;
