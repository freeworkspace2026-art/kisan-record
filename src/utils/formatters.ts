import { MandiEntry } from '../types/diary';

/**
 * Formats an ISO or datetime-local string into a friendly Hindi date and time.
 */
export function formatHindiDateTime(value: string): string {
  if (!value) return 'तारीख तय नहीं';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  try {
    return new Intl.DateTimeFormat('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString('hi-IN');
  }
}

export function formatShortCreatedDate(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  try {
    return new Intl.DateTimeFormat('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * Converts Devanagari numerals (०-९) to standard ASCII digits (0-9).
 */
export function normalizeDevanagariDigits(text: string): string {
  const devanagariDigits = '०१२३४५६७८९';
  return text.replace(/[०-९]/g, (char) => {
    const idx = devanagariDigits.indexOf(char);
    return idx !== -1 ? String(idx) : char;
  });
}

/**
 * Returns default datetime-local value (current local time rounded to next 15 min or current minute).
 */
export function getDefaultDateTimeLocal(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  const local = new Date(now.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

/**
 * Filters entries by farmer name, village, driver name, vehicle number,
 * farmer phone number, and driver phone number.
 */
export function filterDiaryEntries(entries: MandiEntry[], query: string): MandiEntry[] {
  const trimmed = normalizeDevanagariDigits(query.trim().toLowerCase());
  if (!trimmed) return entries;

  return entries.filter((entry) => {
    const searchable = [
      entry.farmerName,
      entry.village,
      entry.driverName,
      entry.vehicleNumber,
      entry.farmerPhone,
      entry.driverPhone,
    ]
      .join(' ')
      .toLowerCase();

    return normalizeDevanagariDigits(searchable).includes(trimmed);
  });
}
