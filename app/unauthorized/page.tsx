import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/90 p-12 text-center shadow-2xl shadow-slate-950/30">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-400">Доступ запрещён</p>
        <h1 className="mt-4 text-4xl font-semibold">У вас нет права на просмотр этой страницы</h1>
        <p className="mt-4 text-slate-400">Обратитесь к администратору или войдите под другой ролью.</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
