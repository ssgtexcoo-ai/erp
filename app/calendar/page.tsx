'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchCalendarEvents, type CalendarEvent } from '@/lib/calendarService';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const TYPE_LABEL: Record<string, string> = {
  task: 'Задача',
  project_start: 'Начало объекта',
  project_end: 'Конец объекта',
  stage_start: 'Начало этапа',
  stage_end: 'Конец этапа',
};

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month - 1, 1);
  // Monday=0 offset
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month - 1, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const EVENT_LEGEND = [
  { type: 'task', label: 'Задача', color: '#bf5af2' },
  { type: 'project_start', label: 'Начало объекта', color: '#0a84ff' },
  { type: 'project_end', label: 'Конец объекта', color: '#d8b06a' },
  { type: 'stage_start', label: 'Начало этапа', color: '#5ac8fa' },
  { type: 'stage_end', label: 'Конец этапа', color: '#ff9f0a' },
];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const { events: ev } = await fetchCalendarEvents(y, m);
    setEvents(ev);
    setLoading(false);
  }, []);

  useEffect(() => { load(year, month); }, [year, month, load]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); setSelectedDay(null); };

  const grid = buildGrid(year, month);
  const todayStr = toYMD(today);

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!eventsByDay.has(ev.date)) eventsByDay.set(ev.date, []);
    eventsByDay.get(ev.date)!.push(ev);
  }

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.calendar}>
      <main className="min-h-screen px-3 py-5 sm:px-6 sm:py-10" style={{ color: 'var(--text-primary)' }}>
        <div className="mx-auto max-w-[1200px] space-y-6">

          {/* Header */}
          <section className="rounded-[24px] p-4 sm:p-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Планирование</p>
                <h1 className="mt-1 text-[30px] font-bold" style={{ letterSpacing: '-0.04em' }}>Календарь</h1>
                <p className="mt-1 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                  {events.length > 0 ? `${events.length} событий в этом месяце` : 'Событий нет'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div className="min-w-[160px] text-center">
                  <span className="text-[17px] font-bold" style={{ letterSpacing: '-0.02em' }}>{MONTHS_RU[month - 1]} {year}</span>
                </div>
                <button type="button" onClick={nextMonth} className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <button type="button" onClick={goToday} className="rounded-[10px] px-4 py-2 text-[13px] font-semibold transition-all" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d8b06a'; e.currentTarget.style.color = '#d8b06a'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  Сегодня
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3">
              {EVENT_LEGEND.map((l) => (
                <div key={l.type} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Calendar grid */}
          <section className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Weekday headers */}
            <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
              {WEEKDAYS.map((d, i) => (
                <div key={d} className="py-3 text-center text-[12px] font-semibold uppercase tracking-wider" style={{ color: i >= 5 ? '#ff453a' : 'var(--text-tertiary)' }}>
                  {d}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {grid.map((date, idx) => {
                  const ymd = date ? toYMD(date) : null;
                  const dayEvents = ymd ? (eventsByDay.get(ymd) ?? []) : [];
                  const isToday = ymd === todayStr;
                  const isSelected = ymd === selectedDay;
                  const isWeekend = idx % 7 >= 5;
                  const hasMore = dayEvents.length > 3;
                  const visible = dayEvents.slice(0, 3);

                  return (
                    <div
                      key={idx}
                      onClick={() => ymd && dayEvents.length > 0 && setSelectedDay(isSelected ? null : ymd)}
                      className="min-h-[110px] p-2 transition-colors"
                      style={{
                        borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                        borderBottom: idx < grid.length - 7 ? '1px solid var(--border)' : 'none',
                        background: isSelected ? 'rgba(216,176,106,0.06)' : date ? 'transparent' : 'rgba(0,0,0,0.12)',
                        cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                      }}
                    >
                      {date && (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold"
                              style={{
                                background: isToday ? '#d8b06a' : 'transparent',
                                color: isToday ? '#000' : isWeekend ? '#ff453a' : 'var(--text-primary)',
                              }}
                            >
                              {date.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            {visible.map((ev, i) => (
                              <div
                                key={`${ev.type}-${ev.id}-${i}`}
                                className="flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium truncate"
                                style={{ background: `${ev.color}20`, color: ev.color }}
                              >
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ev.color }} />
                                <span className="truncate">{ev.title}</span>
                              </div>
                            ))}
                            {hasMore && (
                              <div className="px-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                +{dayEvents.length - 3} ещё
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Day detail popup */}
        {selectedDay && selectedEvents.length > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            onClick={() => setSelectedDay(null)}
          >
            <div
              className="w-full max-w-sm rounded-[24px] p-6 shadow-2xl"
              style={{ background: 'var(--bg-modal)', border: '1px solid var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long' })}
                  </p>
                  <h3 className="text-[20px] font-bold" style={{ letterSpacing: '-0.03em' }}>
                    {new Date(selectedDay + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </h3>
                </div>
                <button type="button" onClick={() => setSelectedDay(null)} className="rounded-[10px] p-2" style={{ color: 'var(--text-tertiary)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-5 w-5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="space-y-2">
                {selectedEvents.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-[14px] p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <span className="mt-0.5 h-3 w-3 shrink-0 rounded-full" style={{ background: ev.color }} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{ev.title}</p>
                      <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{TYPE_LABEL[ev.type] ?? ev.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </ProtectedPage>
  );
}
