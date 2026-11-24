import { useMemo, useState } from 'react';
import { History, Phone, Search, UserCheck, X } from 'lucide-react';
import { RecentKisan, recentKisanStorage } from '../services/recentKisanStorage';

interface RecentKisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectKisan: (kisan: RecentKisan) => void;
}

export function RecentKisanModal({
  isOpen,
  onClose,
  onSelectKisan,
}: RecentKisanModalProps) {
  const [search, setSearch] = useState('');
  const recentList = useMemo(() => (isOpen ? recentKisanStorage.getAll() : []), [isOpen]);
  const filtered = useMemo(
    () => recentKisanStorage.filter(recentList, search),
    [recentList, search]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recent-kisan-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-200 bg-gradient-to-r from-[#E6F7EA] to-[#FEF9E7] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-emerald-800 shrink-0" aria-hidden="true" />
            <div>
              <h3 id="recent-kisan-title" className="text-lg font-bold text-emerald-950">
                Recent Kisan
              </h3>
              <p className="text-xs font-medium text-emerald-800 tabular-nums">
                हाल के किसान ({recentList.length}/20)
              </p>
            </div>
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

        {/* Search */}
        {recentList.length > 0 && (
          <div className="border-b border-emerald-100 p-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-emerald-700"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="किसान का नाम या फोन नंबर खोजें..."
                className="min-h-[44px] w-full rounded-xl border border-emerald-300 bg-[#F8FCF8] py-2 pr-3 pl-10 text-sm font-medium text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* List / Empty State */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {recentList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-[#F8FCF8] p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No recent farmers yet. Save a diary entry to see farmers here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-800">
                "{search}" से कोई किसान नहीं मिला।
              </p>
            </div>
          ) : (
            filtered.map((kisan) => (
              <button
                key={kisan.id}
                type="button"
                onClick={() => {
                  onSelectKisan(kisan);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-[#F3FCF5] px-4 py-3 text-left transition-colors hover:bg-emerald-100/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900">
                    {kisan.farmerName}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-600">
                    🏡 {kisan.village || 'गाँव दर्ज नहीं'}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-900 tabular-nums">
                    <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>{kisan.farmerPhone || 'फोन नंबर नहीं'}</span>
                  </p>
                </div>

                <span className="inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-xl bg-[#15803D] px-3 py-1.5 text-xs font-bold text-white">
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>चुनें</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
