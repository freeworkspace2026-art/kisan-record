import { FormEvent, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import type { CommodityRecord, FarmerRecord, VillageRecord } from '../../types/business';
import { computeVillageSummaries, formatINR, formatNumber } from '../../utils/businessMath';

interface VillagesScreenProps {
  villages: VillageRecord[];
  farmers: FarmerRecord[];
  commodities: CommodityRecord[];
  isSampleMode: boolean;
  onAddVillage: (input: Partial<VillageRecord>) => Promise<void>;
}

export function VillagesScreen({
  villages,
  farmers,
  commodities,
  isSampleMode,
  onAddVillage,
}: VillagesScreenProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const summaries = computeVillageSummaries(villages, farmers, commodities);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAddVillage({ name: name.trim(), district: district.trim(), notes: notes.trim() });
      setName('');
      setDistrict('');
      setNotes('');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Village Information</h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              {villages.length} villages tracked · Aggregated Onion & Garlic supply by location
            </p>
          </div>
          {!isSampleMode && (
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showAdd ? 'Close Form' : 'Add Village'}</span>
            </button>
          )}
        </div>

        {showAdd && !isSampleMode && (
          <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Village Name *"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="District / Taluka"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Crop or transport notes"
              className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Village'}
            </button>
          </form>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <MapPin className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-base font-bold text-slate-900">No villages recorded yet</p>
          <p className="mt-1 text-sm text-slate-600">
            Villages are automatically created when recordings mention farmer locations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map(({ village, farmerCount, onionKg, garlicKg, totalValue, recordCount }) => (
            <article key={village.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{village.name}</h3>
                  <p className="text-xs text-slate-500">
                    {village.district ? `${village.district} District · ` : ''}
                    <span className="tabular-nums">{farmerCount} farmers</span>
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-800 tabular-nums">
                  {recordCount} deals
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <dt className="text-slate-500">Onion Volume</dt>
                  <dd className="mt-0.5 font-bold text-slate-900 font-mono-num">
                    {formatNumber(onionKg)} kg
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Garlic Volume</dt>
                  <dd className="mt-0.5 font-bold text-slate-900 font-mono-num">
                    {formatNumber(garlicKg)} kg
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Total Trade Value</dt>
                  <dd className="mt-0.5 text-sm font-bold text-emerald-700 font-mono-num">
                    {formatINR(totalValue)}
                  </dd>
                </div>
              </dl>

              {village.notes && (
                <p className="mt-3 text-xs text-slate-600">{village.notes}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
