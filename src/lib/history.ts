// On-device event history — Tagor Android app only. A local list of events
// the visitor has created on this device, purely so they can find the
// view/manage links again. Nothing here ever reaches the server. Capped at
// the last 50 entries, newest first.

const STORAGE_KEY = 'tagor-history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  title: string;
  /** ISO start date/time of the event. */
  startAt: string;
  viewUrl: string;
  manageUrl: string;
  /** ISO timestamp of when this entry was saved. */
  createdAt: string;
}

function read(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage full or blocked — history is a convenience, drop silently */
  }
}

export function getHistory(): HistoryEntry[] {
  return read();
}

export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): void {
  const next: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  write([next, ...read()].slice(0, MAX_ENTRIES));
}

export function removeHistoryEntry(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function clearHistory(): void {
  write([]);
}
