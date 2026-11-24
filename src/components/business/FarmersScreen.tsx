import { FormEvent, useState } from 'react';
import { Phone, Plus, Search, Trash2, BookUser } from 'lucide-react';
import type { CommodityRecord, FarmerRecord, PurchaseRecord } from '../../types/business';
import { computeFarmerSummaries, formatINR, formatNumber } from '../../utils/businessMath';
import { useContactPicker } from '../../hooks/useContactPicker';

interface FarmersScreenProps {
  farmers: FarmerRecord[];
  purchases: PurchaseRecord[];
  commodities: CommodityRecord[];
  isSampleMode: boolean;
  onAddFarmer: (input: Partial<FarmerRecord>) => Promise<void>;
  onDeleteFarmer: (id: string) => Promise<void>;
}

export function FarmersScreen({
  farmers,
  purchases,
  commodities,
  isSampleMode,
  onAddFarmer,
  onDeleteFarmer,
}: FarmersScreenProps) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [primaryCrop, setPrimaryCrop] = useState<'onion' | 'garlic' | 'both'>('onion');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { contactNotice, pickContact, clearContactNotice } = useContactPicker();

  const summaries = computeFarmerSummaries(farmers, purchases, commodities).filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${item.farmer.name} ${item.farmer.village} ${item.farmer.phone}`
      .toLowerCase()
      .includes(q);
  });

  const handlePickFromContacts = async () => {
    const res = await pickContact();
    if (!res) return;
    if (res.name) setName(res.name);
    if (res.tel) setPhone(res.tel);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAddFarmer({ name: name.trim(), phone: phone.trim(), village: village.trim(), primaryCrop, notes: notes.trim() });
      setName('');
      setPhone('');
      setVillage('');
      setNotes('');
      clearContactNotice();
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
            <h2 className="text-xl font-bold text-slate-900">Farmer Information</h2>
            <p className="mt-1 text-sm text-slate-600 tabular-nums">
              Total Farmers: {farmers.length} · Automatically updated from voice recordings & legacy diary entries
            </p>
          </div>

          {!isSampleMode && (
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showAdd ? 'Close Form' : 'Add Farmer'}</span>
            </button>
          )}
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmer by name, village, or phone..."
            className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pr-4 pl-10 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
        </div>

        {showAdd && !isSampleMode && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">New Farmer Profile</p>
              <button
                type="button"
                onClick={() => void handlePickFromContacts()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                <BookUser className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Select from Phone Contacts</span>
              </button>
            </div>
            {contactNotice && (
              <p className="text-xs font-medium text-amber-800">{contactNotice}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Farmer Name *"
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
              />
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village"
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
              />
              <select
                value={primaryCrop}
                onChange={(e) => setPrimaryCrop(e.target.value as 'onion' | 'garlic' | 'both')}
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm"
              >
                <option value="onion">Onion (प्याज)</option>
                <option value="garlic">Garlic (लहसुन)</option>
                <option value="both">Both Onion & Garlic</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-3 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Farmer'}
              </button>
            </div>
          </form>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-base font-bold text-slate-900">No farmers found</p>
          <p className="mt-1 text-sm text-slate-600">
            Farmers are added automatically when you record deals or add them manually above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {summaries.map(({ farmer, totalBags, totalKg, totalPurchased, totalPaid, balanceDue }) => (
            <article key={farmer.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{farmer.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {farmer.village || 'Village not specified'} · Primary crop:{' '}
                    <span className="font-semibold capitalize text-slate-700">{farmer.primaryCrop}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {farmer.phone && (
                    <a
                      href={`tel:${farmer.phone}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 font-mono-num"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{farmer.phone}</span>
                    </a>
                  )}
                  {!isSampleMode && (
                    <button
                      type="button"
                      onClick={() => void onDeleteFarmer(farmer.id)}
                      aria-label={`Delete ${farmer.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div>
                  <p className="text-slate-500">Supplied</p>
                  <p className="mt-0.5 font-bold text-slate-900 font-mono-num">
                    {formatNumber(totalBags)} bags · {formatNumber(totalKg)} kg
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Total Value</p>
                  <p className="mt-0.5 font-bold text-slate-900 font-mono-num">
                    {formatINR(totalPurchased)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Balance Due</p>
                  <p
                    className={`mt-0.5 font-bold font-mono-num ${
                      balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {formatINR(balanceDue)}
                  </p>
                </div>
              </div>

              {farmer.notes && (
                <p className="mt-2.5 text-xs text-slate-600">{farmer.notes}</p>
              )}
              {totalPaid > 0 && (
                <p className="mt-1 text-xs text-slate-500 font-mono-num">
                  Paid so far: {formatINR(totalPaid)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
