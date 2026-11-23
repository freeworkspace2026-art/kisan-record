import { useState } from 'react';
import {
  Search,
  Printer,
  ImageDown,
  Pencil,
  Trash2,
  X,
  Phone,
  PlusCircle,
} from 'lucide-react';
import { MandiEntry } from '../types/diary';
import {
  filterDiaryEntries,
  formatHindiDateTime,
  formatShortCreatedDate,
} from '../utils/formatters';
import { downloadDiaryAsImage } from '../utils/exportImage';

interface DiaryListProps {
  entries: MandiEntry[];
  onEdit: (entry: MandiEntry) => void;
  onRequestDelete: (entry: MandiEntry) => void;
  onGoToNewEntry: () => void;
}

const CARD_PASTEL_STYLES = [
  {
    card: 'bg-[#F2FCF5] border-emerald-200',
    header: 'bg-[#DCFCE7]/80 border-emerald-200',
    num: 'bg-emerald-700 text-white',
  },
  {
    card: 'bg-[#FFFDF0] border-amber-200',
    header: 'bg-[#FEF3C7]/80 border-amber-200',
    num: 'bg-amber-700 text-white',
  },
  {
    card: 'bg-[#F0F9FF] border-sky-200',
    header: 'bg-[#E0F2FE]/80 border-sky-200',
    num: 'bg-sky-700 text-white',
  },
  {
    card: 'bg-[#FFF7F2] border-orange-200',
    header: 'bg-[#FFEDD5]/80 border-orange-200',
    num: 'bg-orange-700 text-white',
  },
];

export function DiaryList({
  entries,
  onEdit,
  onRequestDelete,
  onGoToNewEntry,
}: DiaryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filteredEntries = filterDiaryEntries(entries, searchQuery);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (filteredEntries.length === 0 || isExportingImage) return;
    setIsExportingImage(true);
    setExportNotice(null);
    try {
      await downloadDiaryAsImage(filteredEntries);
      setExportNotice('डायरी की इमेज (meri-mandi-dairy.png) डाउनलोड हो गई है।');
    } catch {
      setExportNotice('इमेज बनाने में समस्या आई। कृपया फिर से कोशिश करें।');
    } finally {
      setIsExportingImage(false);
    }
  };

  return (
    <div>
      {/* Interactive Screen View (hidden during A4 print) */}
      <section aria-label="मेरी डायरी सूची" className="space-y-5 print:hidden">
        {/* Top Summary + Search + Print/Download Toolbar */}
        <div className="rounded-3xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-emerald-950 sm:text-2xl">
                📒 मेरी डायरी (बही-खाता)
              </h2>
              <p className="mt-1 text-base font-medium text-emerald-800 tabular-nums">
                कुल सेव एंट्री: <span className="font-bold text-emerald-950">{entries.length}</span>
                {searchQuery.trim() !== '' && (
                  <span>
                    {' '}
                    · खोज के नतीजे:{' '}
                    <span className="font-bold text-emerald-950">{filteredEntries.length}</span>
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                disabled={filteredEntries.length === 0}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-base font-bold text-emerald-950 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial whitespace-nowrap"
              >
                <Printer className="h-5 w-5" aria-hidden="true" />
                <span>प्रिंट / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={filteredEntries.length === 0 || isExportingImage}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial whitespace-nowrap"
              >
                <ImageDown className="h-5 w-5" aria-hidden="true" />
                <span>{isExportingImage ? 'इमेज बन रही है...' : 'इमेज डाउनलोड'}</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="mt-4">
            <label htmlFor="diary-search" className="sr-only">
              डायरी में खोजें
            </label>
            <div className="relative flex items-center">
              <Search
                className="pointer-events-none absolute left-4 h-5 w-5 text-emerald-700"
                aria-hidden="true"
              />
              <input
                id="diary-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="किसान, गाँव, ड्राइवर, गाड़ी नंबर या फोन नंबर से खोजें..."
                className="min-h-[52px] w-full rounded-2xl border border-emerald-300 bg-[#F8FCF8] py-3 pr-12 pl-12 text-base font-medium text-slate-900 placeholder:text-slate-500 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="खोज साफ़ करें"
                  className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {exportNotice && (
            <div
              role="status"
              className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-950"
            >
              <span>✅ {exportNotice}</span>
              <button
                type="button"
                onClick={() => setExportNotice(null)}
                aria-label="बंद करें"
                className="rounded-lg p-1 hover:bg-emerald-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Empty States */}
        {entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-white px-6 py-12 text-center shadow-xs">
            <p className="text-4xl" aria-hidden="true">
              📒
            </p>
            <h3 className="mt-3 text-xl font-bold text-slate-900">
              अभी डायरी में कोई एंट्री नहीं है
            </h3>
            <p className="mx-auto mt-1.5 max-w-md text-base text-slate-600">
              पहली एंट्री लिखने या बोलकर भरने के लिए नीचे दिया बटन दबाएं।
            </p>
            <button
              type="button"
              onClick={onGoToNewEntry}
              className="mt-5 inline-flex min-h-[50px] items-center gap-2 rounded-2xl bg-[#15803D] px-6 py-3 text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#166534]"
            >
              <PlusCircle className="h-5 w-5" aria-hidden="true" />
              <span>नई एंट्री लिखें</span>
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-white px-6 py-10 text-center">
            <p className="text-3xl" aria-hidden="true">
              🔍
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              "{searchQuery}" से कोई एंट्री नहीं मिली
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              कृपया किसान का नाम, गाँव, ड्राइवर, गाड़ी नंबर या फोन नंबर जांचें।
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 min-h-[44px] rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100"
            >
              सभी एंट्री देखें
            </button>
          </div>
        ) : (
          /* Register Cards Grid */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredEntries.map((entry, idx) => {
              const style = CARD_PASTEL_STYLES[idx % CARD_PASTEL_STYLES.length];
              const createdLabel = formatShortCreatedDate(entry.createdAt);

              return (
                <article
                  key={entry.id}
                  className={`flex flex-col justify-between overflow-hidden rounded-3xl border shadow-xs ${style.card}`}
                >
                  <div>
                    {/* Register Row Header */}
                    <div
                      className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5 ${style.header}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex h-8 min-w-[36px] items-center justify-center rounded-lg px-2.5 text-sm font-bold tabular-nums ${style.num}`}
                        >
                          #{idx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                          {entry.farmerName || 'किसान'}
                        </h3>
                      </div>
                      {createdLabel && (
                        <span className="text-xs font-semibold text-slate-600 tabular-nums">
                          लिखा गया: {createdLabel}
                        </span>
                      )}
                    </div>

                    {/* All 8 Fields Clearly Displayed */}
                    <dl className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:gap-3.5 sm:p-5">
                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          👨‍🌾 किसान का नाम
                        </dt>
                        <dd className="mt-0.5 text-base font-bold text-slate-900 break-words">
                          {entry.farmerName || '—'}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">🏡 गाँव</dt>
                        <dd className="mt-0.5 text-base font-bold text-slate-900 break-words">
                          {entry.village || '—'}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          📦 कितने कटे / नग
                        </dt>
                        <dd className="mt-0.5 text-base font-bold text-emerald-900 tabular-nums break-words">
                          {entry.quantity || '—'}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          🚚 ड्राइवर का नाम
                        </dt>
                        <dd className="mt-0.5 text-base font-bold text-slate-900 break-words">
                          {entry.driverName || '—'}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          🔢 गाड़ी नंबर
                        </dt>
                        <dd className="mt-0.5 text-base font-bold tracking-wide text-slate-900 tabular-nums break-words">
                          {entry.vehicleNumber || '—'}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          🕒 गाड़ी निकलने की तारीख और समय
                        </dt>
                        <dd className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums sm:text-base">
                          {formatHindiDateTime(entry.departureDateTime)}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          📞 किसान का फोन नंबर
                        </dt>
                        <dd className="mt-0.5 text-base font-bold text-slate-900 tabular-nums">
                          {entry.farmerPhone ? (
                            <a
                              href={`tel:${entry.farmerPhone}`}
                              className="inline-flex items-center gap-1.5 text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                            >
                              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span>{entry.farmerPhone}</span>
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>

                      <div className="rounded-xl bg-white/80 px-3.5 py-2.5 border border-black/5">
                        <dt className="text-xs font-semibold text-slate-600">
                          📱 ड्राइवर का फोन नंबर
                        </dt>
                        <dd className="mt-0.5 text-base font-bold text-slate-900 tabular-nums">
                          {entry.driverPhone ? (
                            <a
                              href={`tel:${entry.driverPhone}`}
                              className="inline-flex items-center gap-1.5 text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                            >
                              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                              <span>{entry.driverPhone}</span>
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Card Actions */}
                  <div className="grid grid-cols-2 gap-3 border-t border-black/10 bg-white/60 px-4 py-3 sm:px-5">
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-base font-bold text-emerald-900 transition-colors hover:bg-emerald-50 active:scale-[0.98]"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      <span>बदलें</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(entry)}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-base font-bold text-rose-700 transition-colors hover:bg-rose-50 active:scale-[0.98]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>हटाएं</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Dedicated A4 Print Register View (Visible ONLY when printing) */}
      <section className="hidden print:block" aria-label="प्रिंट रजिस्टर">
        <div className="border-b-2 border-emerald-800 pb-3 mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-950">
              मेरी मंडी डायरी — डिजिटल बही-खाता
            </h1>
            <p className="text-sm text-slate-700 mt-0.5">
              प्रिंट तारीख:{' '}
              {new Intl.DateTimeFormat('hi-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </p>
          </div>
          <div className="text-right text-sm font-bold text-emerald-950 tabular-nums">
            कुल एंट्री: {filteredEntries.length}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="text-base text-slate-700">प्रिंट करने के लिए कोई एंट्री उपलब्ध नहीं है।</p>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-emerald-100 text-emerald-950">
                <th className="border border-emerald-700 px-2 py-2 font-bold">क्र.</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">किसान का नाम</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">गाँव</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">कटे / नग</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">ड्राइवर का नाम</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">गाड़ी नंबर</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">किसान फोन</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">ड्राइवर फोन</th>
                <th className="border border-emerald-700 px-2 py-2 font-bold">गाड़ी निकलने का समय</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`print-break-avoid ${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/40'}`}
                >
                  <td className="border border-slate-400 px-2 py-2 font-bold tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-400 px-2 py-2 font-semibold">
                    {entry.farmerName || '—'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2">{entry.village || '—'}</td>
                  <td className="border border-slate-400 px-2 py-2 font-semibold tabular-nums">
                    {entry.quantity || '—'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2">
                    {entry.driverName || '—'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2 font-semibold tabular-nums">
                    {entry.vehicleNumber || '—'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2 tabular-nums">
                    {entry.farmerPhone || '—'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2 tabular-nums">
                    {entry.driverPhone || '—'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2 tabular-nums">
                    {formatHindiDateTime(entry.departureDateTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
