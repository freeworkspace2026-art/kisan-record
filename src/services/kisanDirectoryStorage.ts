import { localDiaryRepository } from './diaryStorage';

export interface SavedKisan {
  id: string;
  name: string;
  phone: string;
  village: string;
  updatedAt: string;
}

const KISAN_STORAGE_KEY = 'meri_mandi_kisan_directory_v1';

function readDirectory(): SavedKisan[] {
  try {
    const raw = window.localStorage.getItem(KISAN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedKisan =>
        Boolean(item) && typeof item === 'object' && typeof item.name === 'string'
    );
  } catch {
    return [];
  }
}

function writeDirectory(list: SavedKisan[]): void {
  try {
    window.localStorage.setItem(KISAN_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

function makeKey(name: string, phone: string): string {
  return `${name.trim().toLowerCase()}__${phone.trim()}`;
}

export const kisanDirectoryStorage = {
  /**
   * Returns saved farmers merged with unique farmers already recorded in old diary entries,
   * preserving old diary data without modifying it.
   */
  getAll(): SavedKisan[] {
    const saved = readDirectory();
    const diaryEntries = localDiaryRepository.getAll();

    const byKey = new Map<string, SavedKisan>();

    for (const item of saved) {
      if (!item.name.trim()) continue;
      byKey.set(makeKey(item.name, item.phone), item);
    }

    for (const entry of diaryEntries) {
      const name = (entry.farmerName || '').trim();
      if (!name) continue;
      const phone = (entry.farmerPhone || '').trim();
      const key = makeKey(name, phone);
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: `diary_${entry.id}`,
          name,
          phone,
          village: (entry.village || '').trim(),
          updatedAt: entry.updatedAt || entry.createdAt,
        });
      }
    }

    return Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'hi-IN')
    );
  },

  upsert(input: { name: string; phone: string; village?: string }): SavedKisan | null {
    const name = input.name.trim();
    const phone = input.phone.trim();
    const village = (input.village || '').trim();
    if (!name) return null;

    const list = readDirectory();
    const key = makeKey(name, phone);
    const existingIdx = list.findIndex((item) => makeKey(item.name, item.phone) === key);

    const record: SavedKisan = {
      id: existingIdx >= 0 ? list[existingIdx].id : `kisan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      phone,
      village: village || (existingIdx >= 0 ? list[existingIdx].village : ''),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      list[existingIdx] = record;
    } else {
      list.unshift(record);
    }

    writeDirectory(list);
    return record;
  },

  remove(id: string): void {
    const list = readDirectory();
    const filtered = list.filter((item) => item.id !== id);
    writeDirectory(filtered);
  },
};
