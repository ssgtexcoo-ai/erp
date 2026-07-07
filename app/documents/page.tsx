'use client';

import { useEffect, useRef, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import {
  fetchDocuments,
  updateDocument,
  createDocument,
  deleteDocument,
  type DocumentFetchResult,
  type DocumentWithDetails,
} from '@/lib/documentService';

const INPUT_CLS =
  'w-full rounded-[14px] px-4 py-3 text-[15px] text-white outline-none transition-all duration-200 placeholder:text-[rgba(235,235,245,0.25)]';

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Ошибка загрузки' }));
    throw new Error(error ?? 'Ошибка загрузки файла');
  }
  const { url } = await res.json();
  return url as string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [categories, setCategories] = useState<DocumentFetchResult['categories']>([]);
  const [projects, setProjects] = useState<DocumentFetchResult['projects']>([]);
  const [users, setUsers] = useState<DocumentFetchResult['users']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingDocument, setEditingDocument] = useState<DocumentWithDetails | null>(null);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [editUploadedBy, setEditUploadedBy] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      const response = await fetchDocuments();
      if (response.error) {
        setError(response.error.message);
        setDocuments([]);
        setCategories([]);
        setProjects([]);
        setUsers([]);
      } else {
        setDocuments(response.documents);
        setCategories(response.categories);
        setProjects(response.projects);
        setUsers(response.users);
      }
      setLoading(false);
    };

    loadDocuments();
  }, []);

  const openEditDocument = (document: DocumentWithDetails) => {
    setEditingDocument(document);
    setIsAddingDocument(false);
    setEditName(document.name);
    setEditFileUrl(document.fileUrl);
    setEditCategoryId(categories.find((c) => c.name === document.categoryName)?.id ?? null);
    setEditProjectId(projects.find((p) => p.name === document.projectName)?.id ?? null);
    setEditUploadedBy(users.find((u) => u.id === document.uploadedBy)?.id ?? null);
  };

  const openAddDocument = () => {
    setEditingDocument(null);
    setIsAddingDocument(true);
    setEditName('');
    setEditFileUrl('');
    setEditCategoryId(null);
    setEditProjectId(null);
    setEditUploadedBy(null);
    setUploadMode('file');
    setUploadFileName('');
    setError('');
  };

  const closeEditDocument = () => {
    setEditingDocument(null);
    setIsAddingDocument(false);
    setError('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadFile(file);
      setEditFileUrl(url);
      setUploadFileName(file.name);
      if (!editName) setEditName(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const saveDocument = async () => {
    if (!editingDocument && !isAddingDocument) return;
    const currentDocument = editingDocument;
    const name = editName.trim();
    const fileUrl = editFileUrl.trim();

    if (!name) { setError('Укажите название документа.'); return; }
    if (!fileUrl) { setError('Выберите файл или укажите ссылку.'); return; }

    setError('');
    setLoading(true);

    if (isAddingDocument) {
      const { document: newDocument, error: createError } = await createDocument({
        name, fileUrl, categoryId: editCategoryId, projectId: editProjectId, uploadedBy: editUploadedBy,
      });

      if (createError || !newDocument) {
        setError(createError?.message ?? 'Ошибка создания документа');
        setLoading(false);
        return;
      }

      setDocuments((current) => [
        {
          ...newDocument,
          categoryName: categories.find((c) => c.id === editCategoryId)?.name,
          projectName: projects.find((p) => p.id === editProjectId)?.name,
          uploadedByName: users.find((u) => u.id === editUploadedBy)?.full_name,
        },
        ...current,
      ]);
      closeEditDocument();
      setLoading(false);
      return;
    }

    if (!currentDocument) return;
    const { error: updateError } = await updateDocument(currentDocument.id, {
      name, fileUrl, categoryId: editCategoryId, projectId: editProjectId, uploadedBy: editUploadedBy,
    });

    if (updateError) { setError(updateError.message); setLoading(false); return; }

    setDocuments((current) =>
      current.map((d) =>
        d.id === currentDocument.id
          ? {
              ...d, name, fileUrl,
              categoryName: categories.find((c) => c.id === editCategoryId)?.name,
              projectName: projects.find((p) => p.id === editProjectId)?.name,
              uploadedByName: users.find((u) => u.id === editUploadedBy)?.full_name,
            }
          : d,
      ),
    );
    closeEditDocument();
    setLoading(false);
  };

  const removeDocument = async (documentId: number) => {
    setLoading(true);
    const { error: deleteError } = await deleteDocument(documentId);
    if (deleteError) { setError(deleteError.message); setLoading(false); return; }
    setDocuments((current) => current.filter((d) => d.id !== documentId));
    setConfirmDeleteId(null);
    setError('');
    setLoading(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.documents}>
      <main className="min-h-screen text-white px-3 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-8">

          {/* Header */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)' }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Документация</p>
                <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em' }}>Документы</h1>
                <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>КП, договоры, акты, чертежи и фотографии по объектам</p>
              </div>
              <button type="button" onClick={openAddDocument} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
                + Добавить документ
              </button>
            </div>
          </section>

          {/* Document list */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold" style={{ letterSpacing: '-0.03em' }}>Все документы</h2>
              <span className="rounded-full px-3 py-1 text-[12px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                {documents.length} файлов
              </span>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
                Загрузка документов...
              </div>
            ) : error ? (
              <div className="mt-6 text-[14px]" style={{ color: '#ff453a' }}>{error}</div>
            ) : (
              <div className="mt-6 space-y-4">
                {documents.map((document) => (
                  <article key={document.id} className="rounded-[16px] p-5 transition-all duration-200 hover:scale-[1.005]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--bg-subtle)' }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'rgba(216,176,106,0.10)' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" style={{ color: '#d8b06a' }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{document.name}</h3>
                          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>{document.categoryName || document.category || 'Без категории'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a href={document.fileUrl} target="_blank" rel="noreferrer" className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a' }}>
                          Открыть
                        </a>
                        <button type="button" onClick={() => openEditDocument(document)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                          Изменить
                        </button>
                        {confirmDeleteId === document.id ? (
                          <>
                            <button type="button" onClick={() => removeDocument(document.id)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium" style={{ background: 'rgba(255,69,58,0.22)', color: '#ff453a' }}>Да</button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>Нет</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setConfirmDeleteId(document.id)} className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150" style={{ background: 'rgba(255,69,58,0.10)', color: '#ff453a' }}>
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>Объект: {document.projectName || document.projectId || '—'}</span>
                      <span>Добавлен: {new Date(document.uploadedAt).toLocaleDateString('ru-RU')}</span>
                      <span>Загрузил: {document.uploadedByName || document.uploadedBy || '—'}</span>
                    </div>
                  </article>
                ))}

                {!documents.length && !loading ? (
                  <div className="rounded-[16px] p-8 text-center text-[14px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                    Документов пока нет. Нажмите «Добавить документ».
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        {/* Modal */}
        {editingDocument || isAddingDocument ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[20px] sm:rounded-[28px] p-4 sm:p-8 shadow-2xl" style={{ background: 'rgba(28,28,30,0.96)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[24px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {isAddingDocument ? 'Добавить документ' : 'Редактировать документ'}
                  </h2>
                  <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>{isAddingDocument ? 'Новый документ' : editingDocument?.name}</p>
                </div>
                <button type="button" onClick={closeEditDocument} className="rounded-[10px] p-2 transition-all duration-150" style={{ color: 'var(--text-secondary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <label className="block space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Название
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }} />
                </label>

                {/* File / URL toggle */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Файл</p>
                    <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      {(['file', 'url'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setUploadMode(m)}
                          className="px-4 py-1.5 text-[12px] font-medium transition-all"
                          style={{
                            background: uploadMode === m ? 'rgba(216,176,106,0.18)' : 'var(--bg-hover)',
                            color: uploadMode === m ? '#d8b06a' : 'var(--text-secondary)',
                          }}
                        >
                          {m === 'file' ? 'Загрузить' : 'Ссылка'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {uploadMode === 'file' ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.svg,.zip,.rar"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex w-full items-center justify-center gap-3 rounded-[14px] py-4 text-[14px] font-medium transition-all duration-150"
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '2px dashed rgba(255,255,255,0.15)',
                          color: uploading ? '#d8b06a' : 'var(--text-secondary)',
                        }}
                      >
                        {uploading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'rgba(255,255,255,0.15)', borderTopColor: '#d8b06a' }} />
                            Загрузка...
                          </>
                        ) : uploadFileName ? (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" style={{ color: '#d8b06a' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span style={{ color: '#d8b06a' }}>{uploadFileName}</span>
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            Выберите файл (PDF, Word, Excel, фото до 50 МБ)
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <input
                      value={editFileUrl}
                      onChange={(e) => setEditFileUrl(e.target.value)}
                      placeholder="https://..."
                      className={INPUT_CLS}
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                    />
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Категория
                  <select value={editCategoryId ?? ''} onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не выбрано</option>
                    {categories.map((c) => <option key={c.id} value={c.id} className="bg-[#1c1c1e]">{c.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Проект
                  <select value={editProjectId ?? ''} onChange={(e) => setEditProjectId(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не выбрано</option>
                    {projects.map((p) => <option key={p.id} value={p.id} className="bg-[#1c1c1e]">{p.name}</option>)}
                  </select>
                </label>
                <label className="space-y-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  Загрузил
                  <select value={editUploadedBy ?? ''} onChange={(e) => setEditUploadedBy(e.target.value ? Number(e.target.value) : null)} className={INPUT_CLS} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <option value="" className="bg-[#1c1c1e]">Не выбран</option>
                    {users.map((u) => <option key={u.id} value={u.id} className="bg-[#1c1c1e]">{u.full_name}</option>)}
                  </select>
                </label>
              </div>

              {error ? <p className="mt-4 text-[13px]" style={{ color: '#ff453a' }}>{error}</p> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEditDocument} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Отменить
                </button>
                <button type="button" onClick={saveDocument} className="rounded-[14px] px-5 py-3 text-[14px] font-semibold transition-all duration-150 hover:opacity-90" style={{ background: '#d8b06a', color: '#000000' }}>
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </ProtectedPage>
  );
}