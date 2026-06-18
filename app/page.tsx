import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

export default function HomePage() {
  const cards = [
    { title: 'Лиды', href: '/leads', description: 'Учёт лидов, источников и SLA для менеджеров.' },
    { title: 'Сделки', href: '/deals', description: 'Воронка продаж и прогресс по этапам.' },
    { title: 'Объекты', href: '/projects', description: 'Управление строительными проектами и этапами.' },
    { title: 'Канбан', href: '/kanban', description: 'Задачи в статусах План, В работе, На проверке, Выполнено.' },
    { title: 'Гант', href: '/gantt', description: 'Планирование этапов, сроки и критический путь.' },
    { title: 'Документы', href: '/documents', description: 'Хранение договоров, счетов, актов и чертежей.' },
  ];

  return (
    <main className="min-h-screen px-6 py-10 text-[var(--samruq-text)]">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-[rgba(241,205,127,0.10)] bg-[rgba(17,24,39,0.86)] p-8 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <BrandLogo />
          <h1 className="mt-6 text-4xl font-semibold">Единая платформа для продаж и строительства</h1>
          <p className="mt-4 max-w-2xl text-[#cbd5e1]">
            Дашборд, CRM, канбан, гант, документы и мотивация сотрудников — всё в одном окне.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="rounded-3xl border border-[rgba(241,205,127,0.10)] bg-[rgba(17,24,39,0.82)] p-6 shadow-lg shadow-black/25 transition hover:border-[rgba(241,205,127,0.22)] hover:bg-[rgba(24,34,53,0.94)]"
            >
              <h2 className="text-xl font-semibold text-[var(--samruq-gold-strong)]">{card.title}</h2>
              <p className="mt-3 text-[#cbd5e1]">{card.description}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-3xl border border-[rgba(241,205,127,0.10)] bg-[rgba(17,24,39,0.86)] p-8 shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-semibold">Следующие шаги</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-[#cbd5e1]">
            <li>Настроить Supabase проект и окружение.</li>
            <li>Добавить модель ролей и авторизации.</li>
            <li>Реализовать распределение лидов и SLA.</li>
            <li>Построить дашборды директора и сотрудника.</li>
          </ol>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/login" className="inline-flex items-center justify-center rounded-2xl bg-[var(--samruq-gold)] px-5 py-3 text-sm font-semibold text-[#0f172a] transition hover:bg-[var(--samruq-gold-strong)]">
              Макет логина
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-2xl border border-[rgba(241,205,127,0.10)] bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm font-semibold text-[var(--samruq-text)] transition hover:border-[rgba(241,205,127,0.22)] hover:bg-[rgba(241,205,127,0.08)]">
              Дашборд директора
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

