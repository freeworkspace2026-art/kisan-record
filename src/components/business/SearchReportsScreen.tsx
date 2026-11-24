import { useState } from 'react';
import { Search, Printer, Download } from 'lucide-react';
import type { BusinessDatabase, CommodityType } from '../../types/business';
import {
  exportCommodityCsv,
  formatINR,
  formatNumber,
  searchAcrossDatabase,
} from '../../utils/businessMath';

interface SearchReportsScreenProps {
  db: BusinessDatabase;
}

export function SearchReportsScreen({ db }: SearchReportsScreenProps) {
  const [query, setQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState<'all' | CommodityType>('all');
  const [villageFilter, setVillageFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const searchResults = searchAcrossDatabase(db, query);

  const reportRecords = searchResults.commodities.filter((r) => {
    if (commodityFilter !== 'all' && r.commodity !== commodityFilter) return false;
    if (
      villageFilter &&
      r.village.trim().toLowerCase() !== villageFilter.trim().toLowerCase()
    ) {
      return false;
    }
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  const totalKg = reportRecords.reduce((s, r) => s + (r.weightKg || 0), 0);
  const totalSales = reportRecords
    .filter((r) => r.direction === 'sale')
    .reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalPurchases = reportRecords
    .filter((r) => r.direction === 'purchase')
    .reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Search & Report Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Search & Business Reports</h2>
            <p className="mt-1 text-sm text-slate-600">
              Search across transcripts, AI notes, farmers, villages, and generate A4 print or CSV commodity reports.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Print A4 Report</span>
            </button>
            <button
              type="button"
              onClick={() => exportCommodityCsv(reportRecords)}
              disabled={reportRecords.length === 0}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Export CSV ({reportRecords.length})</span>
            </button>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Global search across transcripts, AI notes, farmers, villages, onion/garlic deals, payments..."
            className="min-h-[46px] w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pr-4 pl-10 text-sm focus:border-emerald-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Report Filters */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            value={commodityFilter}
            onChange={(e) => setCommodityFilter(e.target.value as 'all' | CommodityType)}
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="all">All Commodities</option>
            <option value="onion">Onion Only</option>
            <option value="garlic">Garlic Only</option>
          </select>

          <select
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          >
            <option value="">All Villages</option>
            {db.villages.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm font-mono-num"
          />
        </div>
      </div>

      {/* Live Search Matches Summary */}
      {query.trim() !== '' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 print:hidden">
          <h3 className="text-sm font-bold text-slate-900">
            Search Matches for "{query}"
          </h3>
          <p className="mt-1 text-xs text-slate-600 tabular-nums">
            Recordings: {searchResults.recordings.length} · AI Notes: {searchResults.notes.length} · Commodities: {searchResults.commodities.length} · Farmers: {searchResults.farmers.length} · Villages: {searchResults.villages.length} · Payments: {searchResults.payments.length}
          </p>
        </div>
      )}

      {/* Printable & Interactive Report Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 print:border-none print:p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              My Business AI — Commodity Trade Report
            </h3>
            <p className="text-xs text-slate-500 tabular-nums">
              Generated {new Date().toLocaleDateString('en-IN')} · {reportRecords.length} matching records
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-mono-num">
            <div>
              <span className="text-slate-500">Total Weight: </span>
              <strong className="text-slate-900">{formatNumber(totalKg)} kg</strong>
            </div>
            <div>
              <span className="text-slate-500">Purchases: </span>
              <strong className="text-slate-900">{formatINR(totalPurchases)}</strong>
            </div>
            <div>
              <span className="text-slate-500">Sales: </span>
              <strong className="text-emerald-700">{formatINR(totalSales)}</strong>
            </div>
          </div>
        </div>

        {reportRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-600">
            No records match the current search and report filters.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Crop</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Farmer / Buyer</th>
                  <th className="px-3 py-2.5">Village</th>
                  <th className="px-3 py-2.5 text-right">Bags</th>
                  <th className="px-3 py-2.5 text-right">Weight (kg)</th>
                  <th className="px-3 py-2.5 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2.5 font-mono-num whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-2.5 font-semibold capitalize">{r.commodity}</td>
                    <td className="px-3 py-2.5 capitalize">{r.direction}</td>
                    <td className="px-3 py-2.5">
                      {r.direction === 'sale' ? r.buyerName || r.farmerName : r.farmerName}
                    </td>
                    <td className="px-3 py-2.5">{r.village || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{formatNumber(r.bags)}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{formatNumber(r.weightKg)}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num font-bold">
                      {formatINR(r.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
