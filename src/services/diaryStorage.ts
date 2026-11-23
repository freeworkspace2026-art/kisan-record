import { MandiEntry, MandiEntryInput } from '../types/diary';

const STORAGE_KEY = 'meri_mandi_dairy_entries_v1';

/**
 * Storage interface structured so localStorage can be swapped
 * for a Supabase adapter later without changing UI components.
 */
export interface DiaryRepository {
  getAll(): MandiEntry[];
  create(input: MandiEntryInput): MandiEntry;
  update(id: string, input: MandiEntryInput): MandiEntry | null;
  remove(id: string): boolean;
}

function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mandi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readFromStorage(): MandiEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is MandiEntry =>
        Boolean(item) && typeof item === 'object' && typeof item.id === 'string'
    );
  } catch {
    return [];
  }
}

function writeToStorage(entries: MandiEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export const localDiaryRepository: DiaryRepository = {
  getAll(): MandiEntry[] {
    const entries = readFromStorage();
    return entries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  create(input: MandiEntryInput): MandiEntry {
    const entries = readFromStorage();
    const newEntry: MandiEntry = {
      ...input,
      id: generateUniqueId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...entries];
    writeToStorage(updated);
    return newEntry;
  },

  update(id: string, input: MandiEntryInput): MandiEntry | null {
    const entries = readFromStorage();
    const index = entries.findIndex((entry) => entry.id === id);
    if (index === -1) return null;

    const updatedEntry: MandiEntry = {
      ...entries[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    entries[index] = updatedEntry;
    writeToStorage(entries);
    return updatedEntry;
  },

  remove(id: string): boolean {
    const entries = readFromStorage();
    const filtered = entries.filter((entry) => entry.id !== id);
    if (filtered.length === entries.length) return false;
    writeToStorage(filtered);
    return true;
  },
};
