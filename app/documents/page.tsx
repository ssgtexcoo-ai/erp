'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchDocuments, updateDocument, createDocument, deleteDocument, type DocumentFetchResult, type DocumentWithDetails } from '@/lib/documentService';

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
    setEditCategoryId(categories.find((category) => category.name === document.categoryName)?.id ?? null);
    setEditProjectId(projects.find((project) => project.name === document.projectName)?.id ?? null);
    setEditUploadedBy(users.find((user) => user.id === document.uploadedBy)?.id ?? null);
  };

  const openAddDocument = () => {
    setEditingDocument(null);
    setIsAddingDocument(true);
    setEditName('');
    setEditFileUrl('');
    setEditCategoryId(null);
    setEditProjectId(null);
    setEditUploadedBy(null);
    setError('');
  };

  const closeEditDocument = () => {
    setEditingDocument(null);
    setIsAddingDocument(false);
    setError('');
  };

  const saveDocument = async () => {
    if (!editingDocument && !isAddingDocument) return;
    const name = editName.trim();
    const fileUrl = editFileUrl.trim();

    if (!name) {
      setError('Укажите название документа.');
      return;
    }

    if (!fileUrl) {
      setError('Укажите ссылку на файл.');
      return;
    }

    setError('');
    setLoading(true);

    if (isAddingDocument) {
      const { document: newDocument, error: createError } = await createDocument({
        name,
        fileUrl,
        categoryId: editCategoryId,
        projectId: editProjectId,
        uploadedBy: editUploadedBy,
      });

      if (createError || !newDocument) {
        setError(createError?.message ?? 'Ошибка создания документа');
        setLoading(false);
        return;
      }

      setDocuments((current) => [
        {
          ...newDocument,
          categoryName: categories.find((category) => category.id === editCategoryId)?.name,
          projectName: projects.find((project) => project.id === editProjectId)?.name,
          uploadedByName: users.find((user) => user.id === editUploadedBy)?.full_name,
        },
        ...current,
      ]);
      closeEditDocument();
      setLoading(false);
      return;
    }

    const { error: updateError } = await updateDocument(editingDocument.id, {
      name,
      fileUrl,
      categoryId: editCategoryId,
      projectId: editProjectId,
      uploadedBy: editUploadedBy,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDocuments((current) =>
      current.map((document) =>
        document.id === editingDocument.id
          ? {
              ...document,
              name,
              fileUrl,
              categoryName: categories.find((category) => category.id === editCategoryId)?.name,
              projectName: projects.find((project) => project.id === editProjectId)?.name,
              uploadedByName: users.find((user) => user.id === editUploadedBy)?.full_name,
            }
          : document,
      ),
    );
    closeEditDocument();
    setLoading(false);
  };

  const removeDocument = async (documentId: number) => {
    if (!confirm('Удалить документ?')) return;
    setLoading(true);
    const { error: deleteError } = await deleteDocument(documentId);
    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    setDocuments((current) => current.filter((document) => document.id !== documentId));
    setError('');
    setLoading(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.documents}>
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Документы</h1>
                <p className="mt-3 text-slate-400">Хранение КП, договоров, актов, чертежей и фотографий по объектам.</p>
              </div>
              <button
                type="button"
                onClick={openAddDocument}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Добавить документ
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
            <h2 className="text-xl font-semibold">Последние документы</h2>
            {loading ? (
              <div className="mt-6 text-slate-300">Загрузка документов...</div>
            ) : error ? (
              <div className="mt-6 text-red-400">{error}</div>
            ) : (
              <div className="mt-6 grid gap-4">
                {documents.map((document) => (
                  <article key={document.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">{document.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">Категория: {document.categoryName || document.category}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <a href={document.fileUrl} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400">
                          Открыть
                        </a>
                        <button
                          type="button"
                          onClick={() => openEditDocument(document)}
                          className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDocument(document.id)}
                          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-rose-500"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span>Проект: {document.projectName || document.projectId}</span>
                      <span>Добавлен: {new Date(document.uploadedAt).toLocaleDateString('ru-RU')}</span>
                      <span>Загрузил: {document.uploadedByName || document.uploadedBy}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {editingDocument || isAddingDocument ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {isAddingDocument ? 'Создать документ' : 'Редактировать документ'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">{isAddingDocument ? 'Новый документ' : editingDocument?.name}</p>
                </div>
                <button type="button" onClick={closeEditDocument} className="text-slate-400 transition hover:text-white">
                  Закрыть
                </button>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300">
                  Название
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-300">
                  Ссылка на файл
                  <input
                    value={editFileUrl}
                    onChange={(event) => setEditFileUrl(event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <label className="space-y-2 text-sm text-slate-300">
                  Категория
                  <select
                    value={editCategoryId ?? ''}
                    onChange={(event) => setEditCategoryId(event.target.value ? Number(event.target.value) : null)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    <option value="">Не выбрано</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id} className="bg-slate-950 text-slate-100">
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-300">
                  Проект
                  <select
                    value={editProjectId ?? ''}
                    onChange={(event) => setEditProjectId(event.target.value ? Number(event.target.value) : null)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    <option value="">Не выбрано</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id} className="bg-slate-950 text-slate-100">
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-300">
                  Загрузил
                  <select
                    value={editUploadedBy ?? ''}
                    onChange={(event) => setEditUploadedBy(event.target.value ? Number(event.target.value) : null)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                  >
                    <option value="">Не выбран</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id} className="bg-slate-950 text-slate-100">
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditDocument}
                  className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
                >
                  Отменить
                </button>
                <button
                  type="button"
                  onClick={saveDocument}
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                >
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
