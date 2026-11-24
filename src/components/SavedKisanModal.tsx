import { FormEvent, useMemo, useState } from 'react';
import { Phone, Plus, Search, Trash2, UserCheck, X } from 'lucide-react';
import { SavedKisan, kisanDirectoryStorage } from '../services/kisanDirectoryStorage';

interface SavedKisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKisan: (kisan: SavedKisan) => void;
}

export function SavedKisanModal({
  isOpen,
  onClose,
  onSelectKisan,
}: SavedKisanModalProps) {
  const [kisans, setKisans] = useState<SavedKisan[]>(() =>
    kisanDirectoryStorage.getAll()
  );
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newVillage, setNewVillage] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kisans;
    return kisans.filter((k) =>
      `${k.name} ${k.phone} ${k.village}`.toLowerCase().includes(q)
    );
  }, [kisans, search]);

  if (!isOpen) return null;

  const refreshList = () => {
    setKisans(kisanDirectoryStorage.getAll());
  };

  const handleAddKisan = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    kisanDirectoryStorage.upsert({
      name: newName,
      phone: newPhone,
      village: newVillage,
    });
    setNewName('');
    setNewPhone('');
    setNewVillage('');
    setShowAdd(false);
    refreshList();
  };

  const handleRemove = (id: string) => {
    kisanDirectoryStorage.remove(id);
    refreshList();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kisan-directory-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-200 bg-gradient-to-r from-[#E6F7EA] to-[#FEF9E7] px-5 py-4">
          <div>
            <h3 id="kisan-directory-title" className="text-lg font-bold text-emerald-950">
              📒 सहेजे गए किसान (Kisan Directory)
            </h3>
            <p className="text-xs font-medium text-emerald-800 tabular-nums">
              कुल किसान: {kisans.length} · चुनने पर नाम और फोन नंबर अपने-आप भर जाएंगे
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-emerald-900 hover:bg-emerald-200/60"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search + Add Trigger */}
        <div className="border-b border-emerald-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-emerald-700"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="किसान का नाम, गाँव या फोन खोजें..."
                className="min-h-[44px] w-full rounded-xl border border-emerald-300 bg-[#F8FCF8] py-2 pr-3 pl-10 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#15803D] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#166534] whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{showAdd ? 'रद्द' : 'नया जोड़ें'}</span>
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={handleAddKisan}
              className="grid grid-cols-1 gap-2.5 rounded-2xl border border-emerald-200 bg-[#F3FCF5] p-3 sm:grid-cols-2"
            >
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="किसान का नाम *"
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="फोन नंबर"
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium tabular-nums"
              />
              <input
                type="text"
                value={newVillage}
                onChange={(e) => setNewVillage(e.target.value)}
                placeholder="गाँव (वैकल्पिक)"
                className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium"
              />
              <button
                type="submit"
                className="min-h-[42px] rounded-xl bg-[#15803D] px-4 text-sm font-bold text-white hover:bg-[#166534]"
              >
                किसान सेव करें
              </button>
            </form>
          )}
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-[#F8FCF8] p-8 text-center">
              <p className="text-sm font-bold text-slate-800">कोई सहेजा किसान नहीं मिला</p>
              <p className="mt-1 text-xs text-slate-600">
                ऊपर "नया जोड़ें" से किसान जोड़ें या नई एंट्री सेव करें।
              </p>
            </div>
          ) : (
            filtered.map((kisan) => (
              <div
                key={kisan.id}
                className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-emerald-200 bg-[#F3FCF5] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900">{kisan.name}</p>
                  <p className="text-xs font-medium text-slate-600 tabular-nums">
                    {kisan.phone || 'फोन नंबर नहीं'}
                    {kisan.village ? ` · गाँव: ${kisan.village}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {kisan.phone && (
                    <a
                      href={`tel:${kisan.phone}`}
                      aria-label={`${kisan.name} को कॉल करें`}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                    >
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>कॉल</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onSelectKisan(kisan);
                      onClose();
                    }}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#15803D] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#166534]"
                  >
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>चुनें</span>
                  </button>

                  {!kisan.id.startsWith('diary_') && (
                    <button
                      type="button"
                      onClick={() => handleRemove(kisan.id)}
                      aria-label={`${kisan.name} हटाएं`}
                      className="flex h-10 w-9 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
