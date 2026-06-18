import type { RoleName, LeadStatus } from './types';

export const ROLE_NAMES: Record<RoleName, string> = {
  director: 'Директор',
  manager: 'Менеджер',
  project_manager: 'Руководитель проекта',
  accountant: 'Бухгалтер',
  procurement: 'Снабжение',
};

export const LEAD_SOURCES = [
  'Instagram',
  'Facebook',
  'TikTok',
  'Google Ads',
  'Сайт',
  'WhatsApp',
  'Телефон',
  'Рекомендации',
] as const;

export const LEAD_STAGES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Новый лид' },
  { value: 'contacted', label: 'Первичный контакт' },
  { value: 'negotiation', label: 'Переговоры' },
  { value: 'proposal_sent', label: 'КП отправлено' },
  { value: 'agreement', label: 'Согласование' },
  { value: 'payment', label: 'Договор' },
  { value: 'production', label: 'Передано в производство' },
  { value: 'installation', label: 'Монтаж' },
  { value: 'handover', label: 'Сдача' },
  { value: 'signed', label: 'Документы подписаны' },
  { value: 'closed', label: 'Закрыто' },
];

export const STAGE_PROGRESS: Record<LeadStatus, number> = {
  new: 5,
  contacted: 10,
  negotiation: 25,
  proposal_sent: 35,
  agreement: 45,
  payment: 60,
  production: 75,
  installation: 90,
  handover: 95,
  signed: 100,
  closed: 100,
};

export const TASK_STATUSES = ['План', 'В работе', 'На проверке', 'Выполнено', 'Просрочено'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export const AUTO_ASSIGN_MODES = ['round_robin', 'load_balance', 'manual'] as const;
