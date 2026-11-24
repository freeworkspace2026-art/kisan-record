import type {
  BusinessDatabase,
  CommodityRecord,
  FarmerRecord,
  PaymentRecord,
  PurchaseRecord,
  SaleRecord,
  VillageRecord,
} from '../types/business';

export function formatINR(value: number): string {
  const num = Number.isFinite(value) ? Math.round(value) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value: number): string {
  const num = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(num);
}

export function formatWeight(kg: number): string {
  if (!kg || kg <= 0) return '0 kg';
  const qtl = kg / 100;
  return `${formatNumber(kg)} kg (${qtl.toFixed(1)} Qtl)`;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getWeekStartKey(dateStr: string): string {
  const d = new Date(dateStr || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diffToMon);
  return monday.toISOString().slice(0, 10);
}

export function formatWeekLabel(weekStartIso: string): string {
  const start = new Date(`${weekStartIso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return weekStartIso;
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export interface WeeklySummary {
  weekStart: string;
  label: string;
  salesTotal: number;
  purchasesTotal: number;
  netEarnings: number;
  cashIn: number;
  cashOut: number;
  onionKg: number;
  garlicKg: number;
  saleCount: number;
  purchaseCount: number;
}

export function computeWeeklySummaries(
  sales: SaleRecord[],
  purchases: PurchaseRecord[],
  payments: PaymentRecord[],
  commodities: CommodityRecord[]
): WeeklySummary[] {
  const map = new Map<string, WeeklySummary>();

  const ensureWeek = (dateStr: string): WeeklySummary => {
    const key = getWeekStartKey(dateStr);
    let item = map.get(key);
    if (!item) {
      item = {
        weekStart: key,
        label: formatWeekLabel(key),
        salesTotal: 0,
        purchasesTotal: 0,
        netEarnings: 0,
        cashIn: 0,
        cashOut: 0,
        onionKg: 0,
        garlicKg: 0,
        saleCount: 0,
        purchaseCount: 0,
      };
      map.set(key, item);
    }
    return item;
  };

  // Always include current week
  ensureWeek(new Date().toISOString().slice(0, 10));

  for (const s of sales) {
    const wk = ensureWeek(s.date || s.createdAt);
    wk.salesTotal += Number(s.totalAmount) || 0;
    wk.saleCount += 1;
    if (s.commodity === 'onion') wk.onionKg += Number(s.weightKg) || 0;
    else wk.garlicKg += Number(s.weightKg) || 0;
  }

  for (const p of purchases) {
    const wk = ensureWeek(p.date || p.createdAt);
    wk.purchasesTotal += Number(p.totalAmount) || 0;
    wk.purchaseCount += 1;
    if (p.commodity === 'onion') wk.onionKg += Number(p.weightKg) || 0;
    else wk.garlicKg += Number(p.weightKg) || 0;
  }

  for (const pay of payments) {
    const wk = ensureWeek(pay.date || pay.createdAt);
    if (pay.direction === 'incoming') wk.cashIn += Number(pay.amount) || 0;
    else wk.cashOut += Number(pay.amount) || 0;
  }

  // Also include any commodity records that weren't created via purchase/sale records directly
  if (sales.length === 0 && purchases.length === 0) {
    for (const c of commodities) {
      const wk = ensureWeek(c.date || c.createdAt);
      if (c.direction === 'sale') wk.salesTotal += Number(c.totalAmount) || 0;
      else wk.purchasesTotal += Number(c.totalAmount) || 0;
      if (c.commodity === 'onion') wk.onionKg += Number(c.weightKg) || 0;
      else wk.garlicKg += Number(c.weightKg) || 0;
    }
  }

  const list = Array.from(map.values()).map((wk) => ({
    ...wk,
    netEarnings: wk.salesTotal - wk.purchasesTotal,
  }));

  return list.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export interface FarmerSummary {
  farmer: FarmerRecord;
  totalBags: number;
  totalKg: number;
  totalPurchased: number;
  totalPaid: number;
  balanceDue: number;
  dealCount: number;
}

export function computeFarmerSummaries(
  farmers: FarmerRecord[],
  purchases: PurchaseRecord[],
  commodities: CommodityRecord[]
): FarmerSummary[] {
  return farmers.map((farmer) => {
    const nameLower = farmer.name.trim().toLowerCase();
    const matchedPurchases = purchases.filter(
      (p) =>
        p.farmerId === farmer.id ||
        p.farmerName.trim().toLowerCase() === nameLower
    );
    const matchedCommodities = commodities.filter(
      (c) =>
        c.direction === 'purchase' &&
        c.farmerName.trim().toLowerCase() === nameLower
    );

    const totalPurchased = matchedPurchases.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalPaid = matchedPurchases.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const balanceDue = Math.max(0, totalPurchased - totalPaid);

    const totalBags =
      matchedPurchases.length > 0
        ? matchedPurchases.reduce((s, p) => s + (p.bags || 0), 0)
        : matchedCommodities.reduce((s, c) => s + (c.bags || 0), 0);

    const totalKg =
      matchedPurchases.length > 0
        ? matchedPurchases.reduce((s, p) => s + (p.weightKg || 0), 0)
        : matchedCommodities.reduce((s, c) => s + (c.weightKg || 0), 0);

    return {
      farmer,
      totalBags,
      totalKg,
      totalPurchased,
      totalPaid,
      balanceDue,
      dealCount: Math.max(matchedPurchases.length, matchedCommodities.length),
    };
  });
}

export interface VillageSummary {
  village: VillageRecord;
  farmerCount: number;
  onionKg: number;
  garlicKg: number;
  totalValue: number;
  recordCount: number;
}

export function computeVillageSummaries(
  villages: VillageRecord[],
  farmers: FarmerRecord[],
  commodities: CommodityRecord[]
): VillageSummary[] {
  return villages.map((village) => {
    const vLower = village.name.trim().toLowerCase();
    const vFarmers = farmers.filter(
      (f) => f.village.trim().toLowerCase() === vLower
    );
    const vCommodities = commodities.filter(
      (c) => c.village.trim().toLowerCase() === vLower
    );

    const onionKg = vCommodities
      .filter((c) => c.commodity === 'onion')
      .reduce((s, c) => s + (c.weightKg || 0), 0);
    const garlicKg = vCommodities
      .filter((c) => c.commodity === 'garlic')
      .reduce((s, c) => s + (c.weightKg || 0), 0);
    const totalValue = vCommodities.reduce((s, c) => s + (c.totalAmount || 0), 0);

    return {
      village,
      farmerCount: vFarmers.length,
      onionKg,
      garlicKg,
      totalValue,
      recordCount: vCommodities.length,
    };
  });
}

export function exportCommodityCsv(records: CommodityRecord[], filename = 'my-business-ai-report.csv') {
  const headers = [
    'Date',
    'Commodity',
    'Type',
    'Variety',
    'Farmer/Buyer',
    'Village/Market',
    'Phone',
    'Bags',
    'Weight (kg)',
    'Rate (INR/kg)',
    'Total Amount (INR)',
    'Notes',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = records.map((r) => [
    r.date,
    r.commodity.toUpperCase(),
    r.direction.toUpperCase(),
    r.variety,
    r.direction === 'sale' ? r.buyerName || r.farmerName : r.farmerName,
    r.village,
    r.phone,
    r.bags,
    r.weightKg,
    r.ratePerKg,
    r.totalAmount,
    r.notes,
  ]);

  const csvContent =
    [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function searchAcrossDatabase(db: BusinessDatabase, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      recordings: db.recordings,
      notes: db.notes,
      commodities: db.commodities,
      farmers: db.farmers,
      villages: db.villages,
      purchases: db.purchases,
      payments: db.payments,
    };
  }

  return {
    recordings: db.recordings.filter((r) =>
      `${r.title} ${r.fileName} ${r.transcript}`.toLowerCase().includes(q)
    ),
    notes: db.notes.filter((n) =>
      `${n.title} ${n.summary} ${n.actionItems.join(' ')}`.toLowerCase().includes(q)
    ),
    commodities: db.commodities.filter((c) =>
      `${c.commodity} ${c.variety} ${c.farmerName} ${c.buyerName || ''} ${c.village} ${c.phone} ${c.notes}`
        .toLowerCase()
        .includes(q)
    ),
    farmers: db.farmers.filter((f) =>
      `${f.name} ${f.phone} ${f.village} ${f.primaryCrop} ${f.notes}`
        .toLowerCase()
        .includes(q)
    ),
    villages: db.villages.filter((v) =>
      `${v.name} ${v.district} ${v.notes}`.toLowerCase().includes(q)
    ),
    purchases: db.purchases.filter((p) =>
      `${p.commodity} ${p.farmerName} ${p.village} ${p.variety} ${p.status} ${p.notes}`
        .toLowerCase()
        .includes(q)
    ),
    payments: db.payments.filter((p) =>
      `${p.partyName} ${p.method} ${p.reference} ${p.notes}`.toLowerCase().includes(q)
    ),
  };
}
