import { FormEvent, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CommodityRecord, CommodityType, TradeDirection } from '../../types/business';
import { formatINR, formatNumber, formatWeight } from '../../utils/businessMath';

interface OnionGarlicScreenProps {
  records: CommodityRecord[];
  isSampleMode: boolean;
  onAddRecord: (input: Partial<CommodityRecord>) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

export function OnionGarlicScreen({
  records,
  isSampleMode,
  onAddRecord,
  onDeleteRecord,
}: OnionGarlicScreenProps) {
  const [commodityFilter, setCommodityFilter] = useState<'all' | CommodityType>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | TradeDirection>('all');
  const [showAdd, setShowAdd] = useState(false);

  const [commodity, setCommodity] = useState<CommodityType>('onion');
  const [direction, setDirection] = useState<TradeDirection>('purchase');
  const [variety, setVariety] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [bags, setBags] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = records.filter((r) => {
    if (commodityFilter !== 'all' && r.commodity !== commodityFilter) return false;
    if (directionFilter !== 'all' && r.direction !== directionFilter) return false;
    return true;
  });

  const onionKg = records
    .filter((r) => r.commodity === 'onion')
    .reduce((s, r) => s + (r.weightKg || 0), 0);
  const garlicKg = records
    .filter((r) => r.commodity === 'garlic')
    .reduce((s, r) => s + (r.weightKg || 0), 0);
  const totalValue = filtered.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const w = Number(weightKg) || 0;
      const rate = Number(ratePerKg) || 0;
      await onAddRecord({
        commodity,
        direction,
        variety,
        farmerName: direction === 'purchase' ? farmerName : '',
        buyerName: direction === 'sale' ? buyerName : '',
        village,
        phone,
        bags: Number(bags) || 0,
        weightKg: w,
        ratePerKg: rate,
        totalAmount: Math.round(w * rate),
        notes,
        date: new Date().toISOString().slice(0, 10),
      });
      setVariety('');
      setFarmerName('');
      setBuyerName('');
      setVillage('');
      setPhone('');
      setBags('');
      setWeightKg('');
      setRatePerKg('');
      setNotes('');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Onion & Garlic Records</h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Onion: {formatWeight(onionKg)} · Garlic: {formatWeight(garlicKg)} · Filtered Value:{' '}
              <strong className="text-slate-900">{formatINR(totalValue)}</strong>
            </p>
          </div>
          {!isSampleMode && (
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showAdd ? 'Close Form' : 'Add Commodity Deal'}</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: 'All Crops' },
                { id: 'onion', label: 'Onion (प्याज)' },
                { id: 'garlic', label: 'Garlic (लहसुन)' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCommodityFilter(t.id)}
                className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  commodityFilter === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: 'All Types' },
                { id: 'purchase', label: 'Purchases' },
                { id: 'sale', label: 'Sales' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDirectionFilter(t.id)}
                className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  directionFilter === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Add Form */}
        {showAdd && !isSampleMode && (
          <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value as CommodityType)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="onion">Onion (प्याज)</option>
              <option value="garlic">Garlic (लहसुन)</option>
            </select>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as TradeDirection)}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            >
              <option value="purchase">Purchase from Farmer</option>
              <option value="sale">Sale to Buyer</option>
            </select>
            <input
              type="text"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="Variety (e.g. Red Nashik / Desi)"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            {direction === 'purchase' ? (
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                placeholder="Farmer Name"
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
              />
            ) : (
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Buyer / Trader Name"
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
              />
            )}
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Village / Market"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone Number"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="number"
              value={bags}
              onChange={(e) => setBags(e.target.value)}
              placeholder="Bags / Kattas"
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
              {saving ? 'Saving...' : 'Save Deal'}
            </button>
          </form>
        )}
      </div>

      {/* Table / Responsive Rows */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-base font-bold text-slate-900">No Onion or Garlic records found</p>
          <p className="mt-1 text-sm text-slate-600">
            Deals extracted from voice notes or added manually appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Crop & Type</th>
                  <th className="px-4 py-3">Party & Village</th>
                  <th className="px-4 py-3 text-right">Bags</th>
                  <th className="px-4 py-3 text-right">Weight (kg)</th>
                  <th className="px-4 py-3 text-right">Rate/kg</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  {!isSampleMode && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono-num whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">
                        {r.commodity === 'onion' ? 'Onion (प्याज)' : 'Garlic (लहसुन)'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.direction === 'sale' ? 'Sale' : 'Purchase'}
                        {r.variety ? ` · ${r.variety}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {r.direction === 'sale' ? r.buyerName || r.farmerName || 'Buyer' : r.farmerName || 'Farmer'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.village || '—'}
                        {r.phone ? ` · ${r.phone}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-800">
                      {formatNumber(r.bags)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-semibold text-slate-900">
                      {formatNumber(r.weightKg)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num text-slate-700">
                      {r.ratePerKg > 0 ? formatINR(r.ratePerKg) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-num font-bold text-emerald-800">
                      {r.totalAmount > 0 ? formatINR(r.totalAmount) : '—'}
                    </td>
                    {!isSampleMode && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => void onDeleteRecord(r.id)}
                          aria-label="Delete commodity record"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
