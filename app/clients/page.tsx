'use client';

import { useEffect, useRef, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import {
  fetchClients, fetchContacts, createClient, updateClient, deleteClient,
  createContact, updateContact, deleteContact,
  type Client, type Contact,
} from '@/lib/clientService';
import { exportClientsToExcel } from '@/lib/exportService';
import { PAGE_ACCESS } from '@/lib/permissions';

// ─── helpers ─────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#d8b06a','#0a84ff','#30d158','#bf5af2','#ff9f0a','#ff453a'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: `${color}22`,
      border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700,
      color, flexShrink: 0, letterSpacing: 0,
    }}>
      {initials(name) || '?'}
    </div>
  );
}

// ─── Field input ──────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 5 }}>
        {label}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-2)',
          borderRadius: 10, padding: '9px 13px', color: 'var(--text-primary)',
          fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
        onFocus={e => (e.target.style.borderColor = '#d8b06a')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}
      />
    </div>
  );
}

// ─── Client form modal ────────────────────────────────────────────────────────
function ClientModal({ initial, onSave, onClose }: {
  initial?: Client | null;
  onSave: (data: { name: string; phone: string; email: string; address: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', address: initial?.address ?? '' });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-[22px] p-6" style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {initial ? 'Редактировать клиента' : 'Новый клиент'}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="НАЗВАНИЕ *" value={form.name} onChange={f('name')} placeholder="ООО «Компания»" />
          <Field label="ТЕЛЕФОН" value={form.phone} onChange={f('phone')} placeholder="+7 777 000 00 00" />
          <Field label="EMAIL" type="email" value={form.email} onChange={f('email')} placeholder="info@company.kz" />
          <Field label="АДРЕС" value={form.address} onChange={f('address')} placeholder="Алматы, ул. Абая 1" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-[12px] py-2.5 text-[13px] font-medium"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
              Отмена
            </button>
            <button type="submit" disabled={saving || !form.name.trim()}
              className="flex-[2] rounded-[12px] py-2.5 text-[13px] font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d8b06a,#f1cd7f)', color: '#000' }}>
              {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Contact form modal ───────────────────────────────────────────────────────
function ContactModal({ initial, onSave, onClose }: {
  initial?: Contact | null;
  onSave: (data: { fullName: string; role: string; phone: string; email: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ fullName: initial?.fullName ?? '', role: initial?.role ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '' });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-[22px] p-6" style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            {initial ? 'Редактировать контакт' : 'Новый контакт'}
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="ФИО *" value={form.fullName} onChange={f('fullName')} placeholder="Иван Петров" />
          <Field label="ДОЛЖНОСТЬ" value={form.role} onChange={f('role')} placeholder="Директор" />
          <Field label="ТЕЛЕФОН" value={form.phone} onChange={f('phone')} placeholder="+7 777 000 00 00" />
          <Field label="EMAIL" type="email" value={form.email} onChange={f('email')} placeholder="ivan@company.kz" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-[12px] py-2.5 text-[13px] font-medium"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
              Отмена
            </button>
            <button type="submit" disabled={saving || !form.fullName.trim()}
              className="flex-[2] rounded-[12px] py-2.5 text-[13px] font-bold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d8b06a,#f1cd7f)', color: '#000' }}>
              {saving ? 'Сохранение...' : initial ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [clientModal, setClientModal] = useState<{ open: boolean; editing: Client | null }>({ open: false, editing: null });
  const [contactModal, setContactModal] = useState<{ open: boolean; editing: Contact | null }>({ open: false, editing: null });
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'client' | 'contact'; id: number; name: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { clients: data } = await fetchClients();
    setClients(data);
    setLoading(false);
  }

  async function loadContacts(clientId: number) {
    setContactsLoading(true);
    const { contacts: data } = await fetchContacts(clientId);
    setContacts(data);
    setContactsLoading(false);
  }

  function selectClient(c: Client) {
    setSelected(c);
    loadContacts(c.id);
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleSaveClient(form: { name: string; phone: string; email: string; address: string }) {
    if (clientModal.editing) {
      await updateClient(clientModal.editing.id, form);
    } else {
      await createClient(form);
    }
    setClientModal({ open: false, editing: null });
    const prev = selected?.id;
    await load();
    if (prev) {
      setClients(c => {
        const found = c.find(x => x.id === prev);
        if (found) { setSelected(found); }
        return c;
      });
    }
  }

  async function handleSaveContact(form: { fullName: string; role: string; phone: string; email: string }) {
    if (!selected) return;
    if (contactModal.editing) {
      await updateContact(contactModal.editing.id, form);
    } else {
      await createContact({ clientId: selected.id, ...form });
    }
    setContactModal({ open: false, editing: null });
    loadContacts(selected.id);
    load();
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'client') {
      await deleteClient(confirmDelete.id);
      if (selected?.id === confirmDelete.id) { setSelected(null); setContacts([]); }
      await load();
    } else {
      await deleteContact(confirmDelete.id);
      if (selected) loadContacts(selected.id);
    }
    setConfirmDelete(null);
  }

  // sync selected after reload
  useEffect(() => {
    if (!selected) return;
    const fresh = clients.find(c => c.id === selected.id);
    if (fresh) setSelected(fresh);
  }, [clients]);

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-page)' }}>

      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between px-4 sm:px-8 py-4"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-2)' }}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>База данных</p>
          <h1 className="text-[20px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Клиенты</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportClientsToExcel(clients)}
            disabled={clients.length === 0}
            className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 disabled:opacity-40"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#30d158'; e.currentTarget.style.color = '#30d158'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Excel
          </button>
          <button type="button" onClick={() => setClientModal({ open: true, editing: null })}
            className="flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-85"
            style={{ background: 'linear-gradient(135deg,#d8b06a,#f1cd7f)', color: '#000' }}>
            <span className="text-[17px] font-light leading-none">+</span>
            Новый клиент
          </button>
        </div>
      </header>

      {/* ── Body: split panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: client list */}
        <div className="flex w-[320px] shrink-0 flex-col" style={{ borderRight: '1px solid var(--border-2)' }}>

          {/* Search */}
          <div className="shrink-0 px-4 py-3" style={{ borderBottom: '1px solid var(--border-2)' }}>
            <div className="flex items-center gap-2 rounded-[10px] px-3 py-2"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-2)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4 shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск клиентов..."
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }} />
              {search && (
                <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>

          {/* Count */}
          <div className="shrink-0 px-4 py-2">
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {loading ? '...' : `${filtered.length} клиент${filtered.length === 1 ? '' : filtered.length < 5 ? 'а' : 'ов'}`}
            </span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loading ? (
              <div className="space-y-2 px-2 pt-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="animate-pulse rounded-[14px] p-4" style={{ background: 'var(--bg-card)' }}>
                    <div className="h-4 w-3/4 rounded" style={{ background: 'var(--bg-input)' }} />
                    <div className="mt-2 h-3 w-1/2 rounded" style={{ background: 'var(--bg-input)' }} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 pt-8 text-center">
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  {search ? 'Ничего не найдено' : 'Нет клиентов'}
                </p>
                {!search && (
                  <button type="button" onClick={() => setClientModal({ open: true, editing: null })}
                    className="mt-3 text-[12px] font-medium hover:opacity-70" style={{ color: '#d8b06a', background: 'none', border: 'none', cursor: 'pointer' }}>
                    + Добавить первого клиента
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                {filtered.map(c => (
                  <button key={c.id} type="button" onClick={() => selectClient(c)}
                    className="w-full rounded-[14px] p-4 text-left transition-all duration-100"
                    style={{
                      background: selected?.id === c.id ? 'rgba(216,176,106,0.12)' : 'transparent',
                      border: selected?.id === c.id ? '1px solid rgba(216,176,106,0.3)' : '1px solid transparent',
                      outline: 'none',
                    }}
                    onMouseEnter={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (selected?.id !== c.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{c.name}</p>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {c.contactCount > 0 ? `${c.contactCount} контакт${c.contactCount < 5 ? 'а' : 'ов'}` : 'Нет контактов'}
                          {c.leadCount > 0 && ` · ${c.leadCount} лид${c.leadCount < 5 ? 'а' : 'ов'}`}
                        </p>
                      </div>
                    </div>
                    {c.phone && (
                      <p className="mt-2 truncate text-[11px]" style={{ color: 'var(--text-tertiary)' }}>📞 {c.phone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: client detail */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="text-5xl opacity-20">🏢</div>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Выберите клиента</p>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>или создайте нового</p>
              <button type="button" onClick={() => setClientModal({ open: true, editing: null })}
                className="mt-2 rounded-[12px] px-5 py-2.5 text-[13px] font-semibold"
                style={{ background: 'linear-gradient(135deg,#d8b06a,#f1cd7f)', color: '#000' }}>
                + Новый клиент
              </button>
            </div>
          ) : (
            <div className="max-w-2xl px-4 sm:px-8 py-5 sm:py-7">

              {/* Client header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar name={selected.name} size={52} />
                  <div>
                    <h2 className="text-[22px] font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {selected.name}
                    </h2>
                    <div className="mt-1 flex items-center gap-3 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{selected.contactCount} контакт{selected.contactCount === 1 ? '' : selected.contactCount < 5 ? 'а' : 'ов'}</span>
                      {selected.leadCount > 0 && <><span style={{ opacity: 0.4 }}>·</span><span>{selected.leadCount} лид{selected.leadCount === 1 ? '' : selected.leadCount < 5 ? 'а' : 'ов'}</span></>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setClientModal({ open: true, editing: selected })}
                    className="rounded-[10px] px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-70"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
                    Редактировать
                  </button>
                  <button type="button" onClick={() => setConfirmDelete({ type: 'client', id: selected.id, name: selected.name })}
                    className="rounded-[10px] px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.2)' }}>
                    Удалить
                  </button>
                </div>
              </div>

              {/* Info cards */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                {[
                  { icon: '📞', label: 'Телефон', value: selected.phone },
                  { icon: '📧', label: 'Email',   value: selected.email },
                  { icon: '📍', label: 'Адрес',   value: selected.address },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="rounded-[14px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{f.icon} {f.label}</p>
                    <p className="text-[13px] font-medium break-all" style={{ color: 'var(--text-primary)' }}>{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Contacts section */}
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Контакты
                  {contacts.length > 0 && (
                    <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: 'rgba(216,176,106,0.15)', color: '#d8b06a' }}>
                      {contacts.length}
                    </span>
                  )}
                </h3>
                <button type="button" onClick={() => setContactModal({ open: true, editing: null })}
                  className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-70"
                  style={{ background: 'rgba(216,176,106,0.12)', color: '#d8b06a', border: '1px solid rgba(216,176,106,0.2)' }}>
                  <span className="text-[15px] font-light leading-none">+</span>
                  Добавить
                </button>
              </div>

              {contactsLoading ? (
                <div className="space-y-2">
                  {[1,2].map(i => (
                    <div key={i} className="animate-pulse rounded-[14px] p-4 h-16" style={{ background: 'var(--bg-card)' }} />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="rounded-[18px] py-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет контактов</p>
                  <button type="button" onClick={() => setContactModal({ open: true, editing: null })}
                    className="mt-2 text-[12px] font-medium hover:opacity-70" style={{ color: '#d8b06a', background: 'none', border: 'none', cursor: 'pointer' }}>
                    + Добавить первый контакт
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map(ct => (
                    <div key={ct.id} className="group flex items-center gap-4 rounded-[16px] p-4"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <Avatar name={ct.fullName} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>{ct.fullName}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {ct.role && <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--bg-input)' }}>{ct.role}</span>}
                          {ct.phone && <span>📞 {ct.phone}</span>}
                          {ct.email && <span>📧 {ct.email}</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={() => setContactModal({ open: true, editing: ct })}
                          className="rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium"
                          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
                          Изменить
                        </button>
                        <button type="button" onClick={() => setConfirmDelete({ type: 'contact', id: ct.id, name: ct.fullName })}
                          className="rounded-[8px] px-2.5 py-1.5 text-[11px] font-medium"
                          style={{ background: 'rgba(255,69,58,0.08)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.15)' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {clientModal.open && (
        <ClientModal initial={clientModal.editing} onSave={handleSaveClient} onClose={() => setClientModal({ open: false, editing: null })} />
      )}
      {contactModal.open && (
        <ContactModal initial={contactModal.editing} onSave={handleSaveContact} onClose={() => setContactModal({ open: false, editing: null })} />
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-[20px] p-6 text-center" style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}>
            <div className="mb-3 text-4xl">⚠️</div>
            <h3 className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Удалить {confirmDelete.type === 'client' ? 'клиента' : 'контакт'}?</h3>
            <p className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>«{confirmDelete.name}» будет удалён без возможности восстановления.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-[12px] py-2.5 text-[13px] font-medium"
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-2)' }}>
                Отмена
              </button>
              <button type="button" onClick={handleDeleteConfirmed}
                className="flex-1 rounded-[12px] py-2.5 text-[13px] font-bold"
                style={{ background: 'rgba(255,69,58,0.15)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.3)' }}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.clients}>
      <ClientsPage />
    </ProtectedPage>
  );
}
