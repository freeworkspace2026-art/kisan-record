import {
  Mic,
  FolderUp,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Wallet,
  Scale,
  TrendingUp,
} from 'lucide-react';
import type { BusinessDatabase, ScreenId } from '../../types/business';
import type { QueueStats } from '../../services/businessApi';
import {
  computeFarmerSummaries,
  computeWeeklySummaries,
  formatDateTime,
  formatINR,
  formatWeight,
} from '../../utils/businessMath';

interface HomeDashboardProps {
  db: BusinessDatabase;
  queue: QueueStats;
  isSampleMode: boolean;
  onNavigate: (screen: ScreenId) => void;
  onRetryAllFailed: () => void;
}

export function HomeDashboard({
  db,
  queue,
  isSampleMode,
  onNavigate,
  onRetryAllFailed,
}: HomeDashboardProps) {
  const weeklySummaries = computeWeeklySummaries(
    db.sales,
    db.purchases,
    db.payments,
    db.commodities
  );
  const currentWeek = weeklySummaries[0];

  const farmerSummaries = computeFarmerSummaries(
    db.farmers,
    db.purchases,
    db.commodities
  );
  const totalPendingFarmerDues = farmerSummaries.reduce(
    (sum, item) => sum + item.balanceDue,
    0
  );

  const totalOnionKg = db.commodities
    .filter((c) => c.commodity === 'onion')
    .reduce((sum, c) => sum + (c.weightKg || 0), 0);
  const totalGarlicKg = db.commodities
    .filter((c) => c.commodity === 'garlic')
    .reduce((sum, c) => sum + (c.weightKg || 0), 0);

  const recentNotes = db.notes.slice(0, 3);
  const recentRecordings = db.recordings.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Action Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Onion & Garlic Trade Command Center
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Record mandi deals by voice or import batch audio from Samsung My Files. AI extracts quantities, rates, farmers, and payments automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('record')}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
              <span>Record Audio</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('import')}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <FolderUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span>Import My Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('weekly')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>This Week Sales</span>
            <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono-num">
            {formatINR(currentWeek?.salesTotal || 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {currentWeek?.label || 'Current week'} · {currentWeek?.saleCount || 0} sales
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('weekly')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Weekly Net Margin</span>
            <Wallet className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          </div>
          <p
            className={`mt-2 text-2xl font-bold font-mono-num ${
              (currentWeek?.netEarnings || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatINR(currentWeek?.netEarnings || 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Purchases: {formatINR(currentWeek?.purchasesTotal || 0)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('commodities')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Onion & Garlic Volume</span>
            <Scale className="h-4 w-4 text-amber-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono-num">
            {formatWeight(totalOnionKg + totalGarlicKg)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Onion {Math.round(totalOnionKg)} kg · Garlic {Math.round(totalGarlicKg)} kg
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ledger')}
          className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition-colors hover:border-emerald-300"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Farmer Balance Due</span>
            <Clock className="h-4 w-4 text-rose-700" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono-num">
            {formatINR(totalPendingFarmerDues)}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {db.farmers.length} farmers · {db.villages.length} villages
          </p>
        </button>
      </div>

      {/* Automatic Processing Queue Status Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Automatic AI Processing Queue
            </h3>
            <p className="mt-0.5 text-sm text-slate-600 tabular-nums">
              {queue.active > 0
                ? `${queue.active} recording actively transcribing/extracting`
                : 'Queue idle'}
              {' · '}
              <span>{queue.queued} queued</span>
              {' · '}
              <span>{queue.completed} completed</span>
              {' · '}
              <span className={queue.failed > 0 ? 'font-semibold text-rose-700' : ''}>
                {queue.failed} failed
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {queue.failed > 0 && !isSampleMode && (
              <button
                type="button"
                onClick={onRetryAllFailed}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-rose-700 whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Retry All Failed ({queue.failed})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <span>Open Recording History</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Two-Column Split: Recent AI Business Notes & Recent Recordings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Recent AI Business Notes</h3>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="text-sm font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              View all ({db.notes.length})
            </button>
          </div>

          {recentNotes.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">
                No AI business notes yet. Record or import an audio note to generate structured insights automatically.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('record')}
                className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                <span>Record First Note</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentNotes.map((note) => (
                <li key={note.id} className="py-3.5 first:pt-3 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{note.title}</h4>
                    <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                      {formatDateTime(note.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                    {note.summary}
                  </p>
                  {note.extractedNumbers.length > 0 && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-800 tabular-nums">
                      Key numbers:{' '}
                      {note.extractedNumbers
                        .slice(0, 3)
                        .map((n) => `${n.label}: ${n.value} ${n.unit}`)
                        .join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Recent Audio Recordings</h3>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-sm font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              View all ({db.recordings.length})
            </button>
          </div>

          {recentRecordings.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">
                No audio recordings yet. Record live or import multiple voice files from Samsung My Files.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('import')}
                className="mt-3 inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <FolderUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                <span>Import Audio Files</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentRecordings.map((rec) => (
                <li key={rec.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-3 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{rec.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                      {rec.source === 'samsung-my-files' ? 'My Files Import' : 'Mic Recording'} ·{' '}
                      {formatDateTime(rec.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold">
                    {rec.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Done
                      </span>
                    )}
                    {(rec.status === 'queued' ||
                      rec.status === 'transcribing' ||
                      rec.status === 'extracting') && (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {rec.status}
                      </span>
                    )}
                    {rec.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <AlertCircle className="h-4 w-4" aria-hidden="true" />
                        Failed
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Quick Navigation Matrix to All Modules */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-bold text-slate-900">Quick Module Shortcuts</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { id: 'commodities' as ScreenId, label: 'Onion & Garlic', sub: `${db.commodities.length} deals` },
            { id: 'farmers' as ScreenId, label: 'Farmers', sub: `${db.farmers.length} profiles` },
            { id: 'villages' as ScreenId, label: 'Villages', sub: `${db.villages.length} areas` },
            { id: 'ledger' as ScreenId, label: 'Purchases & Pay', sub: `${db.purchases.length} bills` },
            { id: 'reports' as ScreenId, label: 'Search & Reports', sub: 'CSV & A4 Print' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{item.sub}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
