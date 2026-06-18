'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchNotifications, type NotificationWithUser, updateNotificationStatus } from '@/lib/notificationService';

type NotificationFilter = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      const response = await fetchNotifications();
      if (response.error) {
        setError(response.error.message);
        setNotifications([]);
      } else {
        setNotifications(response.notifications);
      }
      setLoading(false);
    };

    loadNotifications();
  }, []);

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'read') return notification.isRead;
    return true;
  });

  const handleToggleRead = async (notification: NotificationWithUser) => {
    setSaving(true);
    const response = await updateNotificationStatus(notification.id, !notification.isRead);
    if (response.error) {
      setError(response.error.message);
    } else {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, isRead: !item.isRead } : item,
        ),
      );
    }
    setSaving(false);
  };

  const handleMarkAllRead = async () => {
    setSaving(true);
    const unreadNotifications = notifications.filter((notification) => !notification.isRead);
    const results = await Promise.all(unreadNotifications.map((notification) => updateNotificationStatus(notification.id, true)));
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) {
      setError(firstError.message);
      setSaving(false);
      return;
    }

    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setSaving(false);
  };

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.notifications}>
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="rounded-3xl border border-slate-700 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/20">
            <h1 className="text-3xl font-semibold">Уведомления</h1>
            <p className="mt-3 text-slate-400">Все важные события: новый лид, просрочка, изменение статуса и оплата.</p>
          </section>

          <section className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Последние уведомления</h2>
                <p className="mt-2 text-sm text-slate-400">Фильтруйте и помечайте уведомления прочитанными.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${filter === 'all' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Все
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unread')}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${filter === 'unread' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Новые
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('read')}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${filter === 'read' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  Прочитанные
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={saving || notifications.every((notification) => notification.isRead)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  Пометить все прочитанными
                </button>
              </div>
            </div>

            {loading ? (
              <div className="mt-6 text-slate-300">Загрузка уведомлений...</div>
            ) : error ? (
              <div className="mt-6 text-red-400">{error}</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/80 p-8 text-slate-400">
                Нет уведомлений для отображения.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredNotifications.map((notification) => (
                  <article key={notification.id} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{notification.eventType.replace('_', ' ')}</p>
                        <p className="mt-2 text-sm text-slate-400 break-words">
                          {notification.payload && typeof notification.payload === 'object' && Object.keys(notification.payload).length > 0
                            ? Object.entries(notification.payload)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(' · ')
                            : 'Нет дополнительной информации'}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">Пользователь: {notification.userName || notification.userId}</p>
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:items-end">
                        <span className={`rounded-full px-3 py-1 text-sm ${notification.isRead ? 'bg-slate-800 text-slate-300' : 'bg-sky-500 text-slate-950'}`}>
                          {notification.isRead ? 'Прочитано' : 'Новое'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleRead(notification)}
                          disabled={saving}
                          className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                        >
                          {notification.isRead ? 'Пометить как новое' : 'Пометить прочитанным'}
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString('ru-RU')}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}
