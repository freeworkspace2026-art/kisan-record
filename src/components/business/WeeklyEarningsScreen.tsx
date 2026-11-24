import { FormEvent, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import type {
  CommodityRecord,
  CommodityType,
  PaymentRecord,
  PurchaseRecord,
  SaleRecord,
} from '../../types/business';
import {
  computeWeeklySummaries,
  formatINR,
  formatNumber,
} from '../../utils/businessMath';

interface WeeklyEarningsScreenProps {
  sales: SaleRecord[];
  purchases: PurchaseRecord[];
  payments: PaymentRecord[];
  commodities: CommodityRecord[];
  isSampleMode: boolean;
  onAddSale: (input: {
    commodity: CommodityType;
    buyerName: string;
    villageOrMarket: string;
    bags: number;
    weightKg: number;
    ratePerKg: number;
    receivedAmount: number;
    method: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
    date: string;
    notes: string;
  }) => Promise<void>;
}

export function WeeklyEarningsScreen({
  sales,
  purchases,
  payments,
  commodities,
  isSampleMode,
  onAddSale,
}: WeeklyEarningsScreenProps) {
  const weeks = computeWeeklySummaries(sales, purchases, payments, commodities);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    () => weeks[0]?.weekStart || ''
  );
  const [showAddSale, setShowAddSale] = useState(false);

  const [commodity, setCommodity] = useState<CommodityType>('onion');
  const [buyerName, setBuyerName] = useState('');
  const [market, setMarket] = useState('');
  const [bags, setBags] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [method, setMethod] = useState<'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const activeWeek =
    weeks.find((w) => w.weekStart === selectedWeekStart) || weeks[0];

  const maxBarValue = Math.max(
    1,
    ...weeks.map((w) => Math.max(w.salesTotal, w.purchasesTotal))
  );

  const handleSubmitSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) return;
    setSaving(true);
    try {
      const w = Number(weightKg) || 0;
      const r = Number(ratePerKg) || 0;
      await onAddSale({
        commodity,
        buyerName: buyerName.trim(),
        villageOrMarket: market.trim() || 'Mandi Market',
        bags: Number(bags) || 0,
        weightKg: w,
        ratePerKg: r,
        receivedAmount: Number(receivedAmount) || 0,
        method,
        date,
        notes: notes.trim(),
      });
      setBuyerName('');
      setMarket('');
      setBags('');
      setWeightKg('');
      setRatePerKg('');
      setReceivedAmount('');
      setNotes('');
      setShowAddSale(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Weekly Sales & Earnings</h2>
            <p className="mt-1 text-sm text-slate-600">
              Week-by-week sales revenue, purchase cost, cash flow, and net earnings from Onion & Garlic trading.
            </p>
          </div>
          {!isSampleMode && (
            <button
              type="button"
              onClick={() => setShowAddSale((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showAddSale ? 'Close Sale Form' : 'Log Weekly Sale'}</span>
            </button>
          )}
        </div>

        {/* Week Selector Pills */}
        {weeks.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {weeks.slice(0, 8).map((wk) => (
              <button
                key={wk.weekStart}
                type="button"
                onClick={() => setSelectedWeekStart(wk.weekStart)}
                className={`min-h-[38px] rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeWeek?.weekStart === wk.weekStart
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {wk.label}
              </button>
            ))}
          </div>
        )}

        {showAddSale && !isSampleMode && (
          <form onSubmit={handleSubmitSale} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value as CommodityType)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="onion">Onion (प्याज)</option>
              <option value="garlic">Garlic (लहसुन)</option>
            </select>
            <input
              type="text"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer / Trader Name *"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="Market / Mandi"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="number"
              value={bags}
              onChange={(e) => setBags(e.target.value)}
              placeholder="Bags"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Weight (kg)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={ratePerKg}
              onChange={(e) => setRatePerKg(e.target.value)}
              placeholder="Rate (INR / kg)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="number"
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              placeholder="Amount Received Now (INR)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <select
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque')
              }
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm sm:col-span-2"
            />
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Sale'}
            </button>
          </form>
        )}
      </div>

      {/* Selected Week KPI Summary */}
      {activeWeek && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Weekly Sales</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {formatINR(activeWeek.salesTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {activeWeek.saleCount} sale lot(s)
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Weekly Purchases</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {formatINR(activeWeek.purchasesTotal)}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {activeWeek.purchaseCount} purchase lot(s)
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Net Earnings (Sales - Purchases)</p>
            <p
              className={`mt-1.5 text-2xl font-bold font-mono-num ${
                activeWeek.netEarnings >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatINR(activeWeek.netEarnings)}
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              Cash In {formatINR(activeWeek.cashIn)} · Out {formatINR(activeWeek.cashOut)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Weekly Crop Volume</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 font-mono-num">
              {formatNumber(activeWeek.onionKg + activeWeek.garlicKg)} kg
            </p>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              Onion {formatNumber(activeWeek.onionKg)} kg · Garlic {formatNumber(activeWeek.garlicKg)} kg
            </p>
          </div>
        </div>
      )}

      {/* Weekly Comparison Bars + Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <h3 className="text-base font-bold text-slate-900">
            Week-by-Week Performance
          </h3>
        </div>

        <div className="mt-4 space-y-4">
          {weeks.map((wk) => {
            const salesPct = Math.round((wk.salesTotal / maxBarValue) * 100);
            const purPct = Math.round((wk.purchasesTotal / maxBarValue) * 100);
            return (
              <div key={wk.weekStart} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800">{wk.label}</span>
                  <span className="font-mono-num text-slate-600">
                    Sales {formatINR(wk.salesTotal)} · Purchases {formatINR(wk.purchasesTotal)} · Net{' '}
                    <strong className={wk.netEarnings >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {formatINR(wk.netEarnings)}
                    </strong>
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${salesPct}%` }}
                    />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${purPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
