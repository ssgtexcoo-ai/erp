'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchNotifications, type NotificationWithUser, updateNotificationStatus } from '@/lib/notificationService';
import { subscribeToTable } from '@/lib/realtimeService';

type NotificationFilter = 'all' | 'unread' | 'read';

const EVENT_ICON: Record<string, string> = {
  new_lead:     '📥',
  lead_assigned: '👤',
  deal_moved:   '💼',
  task_overdue: '⏰',
  overdue_task: '⏰',
  payment:      '💰',
  status_change: '🔄',
};

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
    return subscribeToTable('notifications', loadNotifications);
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
    const unread = notifications.filter((n) => !n.isRead);
    const results = await Promise.all(unread.map((n) => updateNotificationStatus(n.id, true)));
    const firstError = results.find((r) => r.error)?.error;

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
      <main className="min-h-screen text-white px-3 py-5 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Header */}
          <section
            className="rounded-[24px] p-4 sm:p-8"
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Система</p>
                <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em' }}>Уведомления</h1>
                <p className="mt-2 text-[14px]" style={{ color: 'var(--text-secondary)' }}>Новые лиды, просрочки, изменения статуса и оплата</p>
              </div>
              {unreadCount > 0 && (
                <div className="rounded-2xl px-5 py-3 text-center" style={{ background: 'rgba(216,176,106,0.10)', border: '1px solid rgba(216,176,106,0.18)' }}>
                  <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(216,176,106,0.60)' }}>Непрочитанных</p>
                  <p className="mt-1 text-[28px] font-bold" style={{ color: '#d8b06a', letterSpacing: '-0.04em' }}>{unreadCount}</p>
                </div>
              )}
            </div>
          </section>

          {/* Filter bar */}
          <section
            className="rounded-[24px] p-6"
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {(['all', 'unread', 'read'] as NotificationFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className="rounded-[12px] px-4 py-2 text-[13px] font-medium transition-all duration-150"
                    style={
                      filter === f
                        ? { background: '#d8b06a', color: '#000000' }
                        : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
                    }
                  >
                    {f === 'all' ? 'Все' : f === 'unread' ? 'Новые' : 'Прочитанные'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={saving || notifications.every((n) => n.isRead)}
                className="rounded-[12px] px-4 py-2 text-[13px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'rgba(52,199,89,0.14)', color: '#34c759' }}
              >
                Пометить все прочитанными
              </button>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center gap-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                <span className="h-4 w-4 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
                Загрузка уведомлений...
              </div>
            ) : error ? (
              <div className="mt-6 text-[14px]" style={{ color: '#ff453a' }}>{error}</div>
            ) : filteredNotifications.length === 0 ? (
              <div
                className="mt-6 rounded-2xl p-6 text-center text-[14px]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bg-input)', color: 'var(--text-tertiary)' }}
              >
                Нет уведомлений для отображения.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {filteredNotifications.map((notification) => {
                  const icon = EVENT_ICON[notification.eventType] ?? '🔔';
                  return (
                    <article
                      key={notification.id}
                      className="rounded-[16px] p-5 transition-all duration-150"
                      style={
                        notification.isRead
                          ? { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--bg-input)' }
                          : { background: 'rgba(216,176,106,0.06)', border: '1px solid rgba(216,176,106,0.14)' }
                      }
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 shrink-0 text-xl">{icon}</span>
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                              {notification.eventType.replace(/_/g, ' ')}
                            </p>
                            <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                              {notification.payload && typeof notification.payload === 'object' && Object.keys(notification.payload).length > 0
                                ? Object.entries(notification.payload)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(' · ')
                                : 'Нет дополнительной информации'}
                            </p>
                            <p className="mt-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                              {notification.userName || notification.userId}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-medium"
                            style={
                              notification.isRead
                                ? { background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }
                                : { background: 'rgba(216,176,106,0.14)', color: '#d8b06a' }
                            }
                          >
                            {notification.isRead ? 'Прочитано' : 'Новое'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleRead(notification)}
                            disabled={saving}
                            className="rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                          >
                            {notification.isRead ? 'Пометить как новое' : 'Пометить прочитанным'}
                          </button>
                        </div>
                      </div>

                      <p className="mt-3 text-[12px]" style={{ color: 'rgba(235,235,245,0.28)' }}>
                        {new Date(notification.createdAt).toLocaleString('ru-RU')}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </ProtectedPage>
  );
}