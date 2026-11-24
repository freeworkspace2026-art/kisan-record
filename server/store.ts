import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AiBusinessNote,
  BusinessDatabase,
  CommodityRecord,
  FarmerRecord,
  PaymentRecord,
  PurchaseRecord,
  RecordingItem,
  SaleRecord,
  VillageRecord,
} from '../src/types/business.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
export const AUDIO_DIR = path.join(DATA_DIR, 'audio');
const DB_PATH = path.join(DATA_DIR, 'business-db.json');

const EMPTY_DB: BusinessDatabase = {
  recordings: [],
  notes: [],
  commodities: [],
  farmers: [],
  villages: [],
  purchases: [],
  payments: [],
  sales: [],
};

function ensureDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

export function makeId(prefix: string): string {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let memoryCache: BusinessDatabase | null = null;

export function loadDatabase(): BusinessDatabase {
  ensureDirs();
  if (memoryCache) return memoryCache;

  if (!fs.existsSync(DB_PATH)) {
    memoryCache = structuredClone(EMPTY_DB);
    saveDatabase(memoryCache);
    return memoryCache;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<BusinessDatabase>;
    memoryCache = {
      recordings: Array.isArray(parsed.recordings) ? parsed.recordings : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      commodities: Array.isArray(parsed.commodities) ? parsed.commodities : [],
      farmers: Array.isArray(parsed.farmers) ? parsed.farmers : [],
      villages: Array.isArray(parsed.villages) ? parsed.villages : [],
      purchases: Array.isArray(parsed.purchases) ? parsed.purchases : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
    };
    return memoryCache;
  } catch {
    memoryCache = structuredClone(EMPTY_DB);
    return memoryCache;
  }
}

export function saveDatabase(db: BusinessDatabase): void {
  ensureDirs();
  memoryCache = db;
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

export function upsertVillage(
  db: BusinessDatabase,
  input: { name: string; district?: string; notes?: string }
): VillageRecord | null {
  const cleanName = input.name.trim();
  if (!cleanName) return null;

  const existing = db.villages.find(
    (v) => v.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    if (input.district && !existing.district) {
      existing.district = input.district.trim();
    }
    if (input.notes && !existing.notes.includes(input.notes.trim())) {
      existing.notes = existing.notes
        ? `${existing.notes}; ${input.notes.trim()}`
        : input.notes.trim();
    }
    return existing;
  }

  const created: VillageRecord = {
    id: makeId('vil'),
    name: cleanName,
    district: (input.district || '').trim(),
    notes: (input.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };
  db.villages.unshift(created);
  return created;
}

export function upsertFarmer(
  db: BusinessDatabase,
  input: {
    name: string;
    phone?: string;
    village?: string;
    primaryCrop?: 'onion' | 'garlic' | 'both';
    notes?: string;
    legacyDiaryId?: string;
  }
): FarmerRecord | null {
  const cleanName = input.name.trim();
  if (!cleanName) return null;

  if (input.village?.trim()) {
    upsertVillage(db, { name: input.village.trim() });
  }

  const existing = db.farmers.find((f) => {
    if (input.legacyDiaryId && f.legacyDiaryId === input.legacyDiaryId) return true;
    const sameName = f.name.trim().toLowerCase() === cleanName.toLowerCase();
    const sameVillage =
      !input.village?.trim() ||
      !f.village.trim() ||
      f.village.trim().toLowerCase() === input.village.trim().toLowerCase();
    return sameName && sameVillage;
  });

  if (existing) {
    if (input.phone?.trim() && !existing.phone) {
      existing.phone = input.phone.trim();
    }
    if (input.village?.trim() && !existing.village) {
      existing.village = input.village.trim();
    }
    if (input.primaryCrop && existing.primaryCrop !== input.primaryCrop) {
      existing.primaryCrop = 'both';
    }
    if (input.notes?.trim() && !existing.notes.includes(input.notes.trim())) {
      existing.notes = existing.notes
        ? `${existing.notes}\n${input.notes.trim()}`
        : input.notes.trim();
    }
    return existing;
  }

  const created: FarmerRecord = {
    id: makeId('frm'),
    name: cleanName,
    phone: (input.phone || '').trim(),
    village: (input.village || '').trim(),
    primaryCrop: input.primaryCrop || 'onion',
    notes: (input.notes || '').trim(),
    legacyDiaryId: input.legacyDiaryId,
    createdAt: new Date().toISOString(),
  };
  db.farmers.unshift(created);
  return created;
}

export function addRecording(item: RecordingItem): RecordingItem {
  const db = loadDatabase();
  db.recordings.unshift(item);
  saveDatabase(db);
  return item;
}

export function updateRecording(
  id: string,
  updater: (rec: RecordingItem) => void
): RecordingItem | null {
  const db = loadDatabase();
  const rec = db.recordings.find((r) => r.id === id);
  if (!rec) return null;
  updater(rec);
  saveDatabase(db);
  return rec;
}

export function addAiNote(note: AiBusinessNote): AiBusinessNote {
  const db = loadDatabase();
  db.notes.unshift(note);
  saveDatabase(db);
  return note;
}

export function addCommodityRecord(record: CommodityRecord): CommodityRecord {
  const db = loadDatabase();
  db.commodities.unshift(record);
  saveDatabase(db);
  return record;
}

export function addPurchaseRecord(purchase: PurchaseRecord): PurchaseRecord {
  const db = loadDatabase();
  db.purchases.unshift(purchase);
  saveDatabase(db);
  return purchase;
}

export function addSaleRecord(sale: SaleRecord): SaleRecord {
  const db = loadDatabase();
  db.sales.unshift(sale);
  saveDatabase(db);
  return sale;
}

export function addPaymentRecord(payment: PaymentRecord): PaymentRecord {
  const db = loadDatabase();
  db.payments.unshift(payment);

  if (payment.purchaseId && payment.direction === 'outgoing') {
    const purchase = db.purchases.find((p) => p.id === payment.purchaseId);
    if (purchase) {
      purchase.paidAmount = Math.min(
        purchase.totalAmount,
        purchase.paidAmount + payment.amount
      );
      purchase.status =
        purchase.paidAmount >= purchase.totalAmount
          ? 'paid'
          : purchase.paidAmount > 0
            ? 'partial'
            : 'pending';
    }
  }

  saveDatabase(db);
  return payment;
}
