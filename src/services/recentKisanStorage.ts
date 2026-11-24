import { normalizeDevanagariDigits } from '../utils/formatters';

export const RECENT_KISAN_STORAGE_KEY = 'recentKisan';
export const MAX_RECENT_KISAN = 20;

export interface RecentKisan {
  id: string;
  farmerName: string;
  village: string;
  farmerPhone: string;
  normalizedPhone: string;
  lastUsedAt: string;
}

/**
 * Normalizes a phone number into digits for reliable duplicate detection.
 * Strips spaces, dashes, +, and leading country/trunk prefixes (91 / 0) for 10-digit Indian numbers.
 */
export function normalizePhoneIdentity(phone: string): string {
  const ascii = normalizeDevanagariDigits(phone || '');
  const digits = ascii.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

function normalizeNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function readRecentKisanList(): RecentKisan[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KISAN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentKisan =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof item.farmerName === 'string' &&
          item.farmerName.trim().length > 0
      )
      .sort(
        (a, b) =>
          new Date(b.lastUsedAt || 0).getTime() - new Date(a.lastUsedAt || 0).getTime()
      )
      .slice(0, MAX_RECENT_KISAN);
  } catch {
    return [];
  }
}

function writeRecentKisanList(list: RecentKisan[]): void {
  try {
    window.localStorage.setItem(
      RECENT_KISAN_STORAGE_KEY,
      JSON.stringify(list.slice(0, MAX_RECENT_KISAN))
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export const recentKisanStorage = {
  getAll(): RecentKisan[] {
    return readRecentKisanList();
  },

  record(input: {
    farmerName: string;
    village: string;
    farmerPhone: string;
  }): RecentKisan[] {
    const farmerName = (input.farmerName || '').trim();
    const village = (input.village || '').trim();
    const farmerPhone = (input.farmerPhone || '').trim();
    if (!farmerName) return readRecentKisanList();

    const normalizedPhone = normalizePhoneIdentity(farmerPhone);
    const normalizedName = normalizeNameKey(farmerName);
    const current = readRecentKisanList();

    // Prevent duplicates: use normalized phone as primary identity when available;
    // otherwise match by normalized farmer name when phone is absent.
    const existing = current.find((item) => {
      if (normalizedPhone && item.normalizedPhone) {
        return item.normalizedPhone === normalizedPhone;
      }
      if (!normalizedPhone && !item.normalizedPhone) {
        return normalizeNameKey(item.farmerName) === normalizedName;
      }
      return false;
    });

    const filtered = current.filter((item) => {
      if (normalizedPhone && item.normalizedPhone) {
        return item.normalizedPhone !== normalizedPhone;
      }
      if (!normalizedPhone && !item.normalizedPhone) {
        return normalizeNameKey(item.farmerName) !== normalizedName;
      }
      return true;
    });

    const updatedItem: RecentKisan = {
      id: existing?.id || `rk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      farmerName,
      village: village || existing?.village || '',
      farmerPhone,
      normalizedPhone,
      lastUsedAt: new Date().toISOString(),
    };

    const nextList = [updatedItem, ...filtered].slice(0, MAX_RECENT_KISAN);
    writeRecentKisanList(nextList);
    return nextList;
  },

  filter(list: RecentKisan[], query: string): RecentKisan[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return list;

    const queryDigits = normalizeDevanagariDigits(trimmed).replace(/\D/g, '');

    return list.filter((item) => {
      const nameMatch = item.farmerName.toLowerCase().includes(trimmed);
      const rawPhoneMatch = item.farmerPhone.toLowerCase().includes(trimmed);
      const digitPhoneMatch =
        queryDigits.length > 0 &&
        (item.normalizedPhone.includes(queryDigits) ||
          normalizeDevanagariDigits(item.farmerPhone).replace(/\D/g, '').includes(queryDigits));
      return nameMatch || rawPhoneMatch || digitPhoneMatch;
    });
  },
};
