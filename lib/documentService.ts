import { supabase } from '@/lib/supabaseClient';
import type { DocumentRecord } from '@/lib/types';

export interface DocumentWithDetails extends DocumentRecord {
  categoryName?: string;
  projectName?: string;
  uploadedByName?: string;
}

export interface DocumentMeta {
  id: number;
  name: string;
}

export interface DocumentFetchResult {
  documents: DocumentWithDetails[];
  categories: DocumentMeta[];
  projects: DocumentMeta[];
  users: Array<{ id: number; full_name: string }>;
  error: Error | null;
}

export async function fetchDocuments(): Promise<DocumentFetchResult> {
  const [{ data: documents, error: documentsError }, { data: categories, error: categoriesError }, { data: projects, error: projectsError }, { data: users, error: usersError }] =
    await Promise.all([
      supabase.from('documents').select('*').order('uploaded_at', { ascending: false }),
      supabase.from('document_categories').select('id, name'),
      supabase.from('projects').select('id, name'),
      supabase.from('users').select('id, full_name'),
    ]);

  if (documentsError || categoriesError || projectsError || usersError) {
    return {
      documents: [] as DocumentWithDetails[],
      categories: [] as DocumentMeta[],
      projects: [] as DocumentMeta[],
      users: [] as Array<{ id: number; full_name: string }>,
      error: documentsError || categoriesError || projectsError || usersError,
    };
  }

  const categoryMap = new Map<number, string>();
  ((categories ?? []) as Array<{ id: number; name: string }>).forEach((c) => categoryMap.set(c.id, c.name));
  const projectMap = new Map<number, string>();
  ((projects ?? []) as Array<{ id: number; name: string }>).forEach((p) => projectMap.set(p.id, p.name));
  const userMap = new Map<number, string>();
  ((users ?? []) as Array<{ id: number; full_name: string }>).forEach((u) => userMap.set(u.id, u.full_name));

  const enrichedDocuments: DocumentWithDetails[] = (documents ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    dealId: row.deal_id,
    category: row.category_id ? categoryMap.get(row.category_id) ?? `#${row.category_id}` : 'Не указано',
    name: row.name,
    fileUrl: row.file_url,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    categoryName: row.category_id ? categoryMap.get(row.category_id) : undefined,
    projectName: row.project_id ? projectMap.get(row.project_id) : undefined,
    uploadedByName: row.uploaded_by ? userMap.get(row.uploaded_by) : undefined,
  }));

  return { documents: enrichedDocuments, categories: categories ?? [], projects: projects ?? [], users: users ?? [], error: null };
}

export async function updateDocument(
  documentId: number,
  updates: Partial<{
    name: string;
    fileUrl: string;
    projectId: number | null;
    categoryId: number | null;
    uploadedBy: number | null;
  }>,
) {
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.fileUrl !== undefined) payload.file_url = updates.fileUrl;
  if (updates.projectId !== undefined) payload.project_id = updates.projectId;
  if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
  if (updates.uploadedBy !== undefined) payload.uploaded_by = updates.uploadedBy;

  const { error } = await supabase.from('documents').update(payload).eq('id', documentId);

  return { error };
}

export async function createDocument(
  data: {
    name: string;
    fileUrl: string;
    projectId: number | null;
    categoryId: number | null;
    uploadedBy: number | null;
  },
) {
  const payload: Record<string, unknown> = {
    name: data.name,
    file_url: data.fileUrl,
    project_id: data.projectId,
    category_id: data.categoryId,
    uploaded_by: data.uploadedBy,
  };

  const { data: insertedDocument, error } = await supabase
    .from('documents')
    .insert(payload)
    .select()
    .single();

  if (!insertedDocument) {
    return { document: null as DocumentRecord | null, error };
  }

  const row = insertedDocument as any;
  return {
    document: {
      id: row.id,
      projectId: row.project_id,
      dealId: row.deal_id,
      category: row.category_id ? String(row.category_id) : '',
      name: row.name,
      fileUrl: row.file_url,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
    },
    error,
  };
}

export async function deleteDocument(documentId: number) {
  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  return { error };
}
