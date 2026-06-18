export type RoleName =
  | 'director'
  | 'manager'
  | 'project_manager'
  | 'accountant'
  | 'procurement';

export interface Role {
  id: number;
  name: RoleName;
  description: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  roleId: number;
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile extends User {
  roleName: RoleName;
}

export interface EmployeeSummary {
  id: number;
  name: string;
  role: RoleName;
  score: number;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'negotiation'
  | 'proposal_sent'
  | 'agreement'
  | 'payment'
  | 'production'
  | 'installation'
  | 'handover'
  | 'signed'
  | 'closed';

export interface Lead {
  id: number;
  leadCode: string;
  sourceId: number;
  createdAt: string;
  assignedTo: number | null;
  status: LeadStatus;
  customerName: string;
  phone: string;
  email: string;
  comment: string;
  slaStatus: 'green' | 'yellow' | 'red';
}

export interface Deal {
  id: number;
  leadId: number;
  customerName: string;
  amount: number;
  stage: LeadStatus;
  progressPercent: number;
  assignedTo: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  dealId: number;
  name: string;
  clientName: string;
  budget: number;
  responsibleId: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  profitEstimate: number | null;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  assignedTo: number | null;
  dueDate: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high' | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: number;
  projectId: number | null;
  dealId: number | null;
  category: string;
  name: string;
  fileUrl: string;
  uploadedBy: number | null;
  uploadedAt: string;
}

export interface NotificationRecord {
  id: number;
  userId: number;
  eventType: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface EmployeeScore {
  id: number;
  userId: number;
  event: string;
  score: number;
  createdAt: string;
}
