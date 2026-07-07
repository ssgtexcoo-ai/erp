'use client';

import { useEffect, useState } from 'react';
import { ProtectedPage } from '@/components/protected-page';
import { PAGE_ACCESS } from '@/lib/permissions';
import { fetchAnalytics, type AnalyticsData, type MonthlyRevenue, type ManagerStat } from '@/lib/analyticsService';
import { UserAvatar } from '@/components/user-avatar';

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₸`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ₸`;
  return `${n} ₸`;
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────
function BarChart({ data }: { data: MonthlyRevenue[] }) {
  const max = Math.max(...data.map(d => d.amount), 1);
  const W = 600;
  const H = 180;
  const PAD = { t: 16, r: 16, b: 40, l: 56 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const barW = Math.floor(chartW / data.length * 0.55);
  const gap  = chartW / data.length;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ y: chartH - t * chartH + PAD.t, val: max * t }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={PAD.l - 8} y={t.y + 4} textAnchor="end" fontSize="10" fill="var(--text-tertiary)">
            {t.val >= 1_000_000 ? `${(t.val / 1_000_000).toFixed(1)}M` : t.val >= 1_000 ? `${Math.round(t.val / 1_000)}K` : Math.round(t.val)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barH = d.amount > 0 ? Math.max((d.amount / max) * chartH, 4) : 2;
        const x = PAD.l + gap * i + (gap - barW) / 2;
        const y = PAD.t + chartH - barH;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH} rx="4"
              fill="url(#barGrad)"
            />
            {d.amount > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
                {fmtMoney(d.amount)}
              </text>
            )}
            <text x={x + barW / 2} y={PAD.t + chartH + 16} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)">
              {d.month}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8b06a" stopOpacity="1" />
          <stop offset="100%" stopColor="#bf8f4e" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Funnel Bar ─────────────────────────────────────────────────────────────
function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="relative h-7 flex-1 rounded-md overflow-hidden" style={{ background: 'var(--bg-input)' }}>
        <div
          className="h-full rounded-md transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold" style={{ color: '#fff', mixBlendMode: 'normal' }}>
          {value.toLocaleString('ru-RU')}
        </span>
      </div>
      <span className="w-10 shrink-0 text-xs font-medium text-right" style={{ color: 'var(--text-tertiary)' }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ── Manager row ────────────────────────────────────────────────────────────
function ManagerRow({ manager, rank, maxAmount }: { manager: ManagerStat; rank: number; maxAmount: number }) {
  const pct = maxAmount > 0 ? (manager.totalAmount / maxAmount) * 100 : 0;
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-5 text-sm text-center">{medals[rank] ?? `${rank + 1}`}</span>
      <UserAvatar name={manager.name} avatarUrl={manager.avatarUrl} size={32} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{manager.name}</span>
          <span className="text-xs font-semibold ml-2 shrink-0" style={{ color: '#d8b06a' }}>{fmtMoney(manager.totalAmount)}</span>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: '#d8b06a' }} />
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{manager.dealsCount} сделок</div>
        {manager.wonCount > 0 && (
          <div className="text-xs" style={{ color: '#30d158' }}>{manager.wonCount} выиграно</div>
        )}
      </div>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{sub}</span>}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics().then(({ data: d, error: e }) => {
      if (e) setError(e.message);
      else setData(d);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: '#d8b06a' }} />
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>{error || 'Нет данных'}</div>;
  }

  const totalRevenue = data.monthlyRevenue.reduce((s, m) => s + m.amount, 0);
  const totalDealsCount = data.monthlyRevenue.reduce((s, m) => s + m.count, 0);
  const maxManager = data.managers[0]?.totalAmount ?? 1;
  const funnelMax = data.funnel.totalLeads;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Аналитика</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Последние 6 месяцев</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Общая выручка" value={fmtMoney(totalRevenue)} sub={`${totalDealsCount} сделок`} color="#d8b06a" />
        <KpiCard label="Конверсия лид → сделка" value={`${data.funnel.conversionLeadToDeal}%`} sub={`${data.funnel.totalLeads} лидов`} color="#0a84ff" />
        <KpiCard label="Средний цикл сделки" value={data.avgDealCycleDays > 0 ? `${data.avgDealCycleDays} дн` : '—'} sub="от создания до закрытия" color="#bf5af2" />
        <KpiCard label="Выигранных сделок" value={`${data.funnel.wonDeals}`} sub={`${data.funnel.conversionDealToWon}% от всех`} color="#30d158" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Revenue chart */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Сделки по месяцам (₸)</h2>
          <BarChart data={data.monthlyRevenue} />
        </div>

        {/* Funnel */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Воронка конверсии</h2>
          <div className="space-y-2.5 mt-2">
            <FunnelBar label="Всего лидов" value={data.funnel.totalLeads} max={funnelMax} color="#bf5af2" />
            <FunnelBar label="Квалифицированы" value={data.funnel.qualifiedLeads} max={funnelMax} color="#0a84ff" />
            <FunnelBar label="Стали сделками" value={data.funnel.totalDeals} max={funnelMax} color="#ff9f0a" />
            <FunnelBar label="Выиграно" value={data.funnel.wonDeals} max={funnelMax} color="#30d158" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-input)' }}>
              <div className="text-lg font-bold" style={{ color: '#0a84ff' }}>{data.funnel.conversionLeadToDeal}%</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Лид → Сделка</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-input)' }}>
              <div className="text-lg font-bold" style={{ color: '#30d158' }}>{data.funnel.conversionDealToWon}%</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Сделка → Победа</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top managers */}
      {data.managers.length > 0 && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Топ менеджеров по выручке</h2>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {data.managers.map((m, i) => (
              <ManagerRow key={m.userId} manager={m} rank={i} maxAmount={maxManager} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedPage allowedRoles={PAGE_ACCESS.analytics}>
      <AnalyticsContent />
    </ProtectedPage>
  );
}
