// Shared event shapes + validation.
//
// Event content is end-to-end encrypted. The browser validates and encrypts
// `EventContent` into an opaque `payload`; the server validates only what it
// can still see, which is the scheduling metadata plus the payload's size.

export type MapMode = 'none' | 'point' | 'area';

/** Encrypted client-side. The server never sees any of this. */
export interface EventContent {
  title: string;
  location_text: string;
  map_mode: MapMode;
  lat: number | null;
  lng: number | null;
  area_radius: number | null;
  description: string | null;
  hosted_by: string | null;
  external_url: string | null;
}

/**
 * Plaintext by design: the purge job needs the dates to know when to delete a
 * row, and the page shell needs the language before decryption has happened.
 */
export interface EventMeta {
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  lang: string;
}

/** What get_event returns: the opaque blob plus the readable metadata. */
export interface StoredEvent extends EventMeta {
  payload: string;
  /** How many encrypted images live in storage for this event. */
  image_count: number;
}

/** Grace period kept after an event before it auto-deletes. */
export const EXPIRY_GRACE_DAYS = 14;

/** Ceiling on the encrypted blob, mirrored by a CHECK constraint in the DB. */
export const MAX_PAYLOAD_CHARS = 32768;

/** Expiry = (end or start) + grace. */
export function computeExpiry(startISO: string, endISO?: string | null): Date {
  const base = new Date(endISO || startISO);
  return new Date(base.getTime() + EXPIRY_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

const LIMITS = {
  title: 200,
  location_text: 300,
  description: 5000,
  hosted_by: 120,
  external_url: 500,
};

function trimOrNull(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

export interface RawMeta {
  start_at?: unknown;
  end_at?: unknown;
  all_day?: unknown;
  lang?: unknown;
  payload?: unknown;
}

/**
 * Server-side validation. Everything the API can still check now that content
 * is opaque: the dates it stores and sorts on, the language, and the blob size.
 */
export function validateMeta(
  raw: RawMeta
): { ok: true; value: EventMeta & { payload: string } } | { ok: false; error: string } {
  const payload = typeof raw.payload === 'string' ? raw.payload.trim() : '';
  if (!payload) return { ok: false, error: 'Missing event payload.' };
  if (payload.length > MAX_PAYLOAD_CHARS) return { ok: false, error: 'Event is too large.' };

  if (!isValidDate(raw.start_at)) return { ok: false, error: 'Start date/time is invalid.' };
  const start_at = raw.start_at;

  const end_at = isValidDate(raw.end_at) ? raw.end_at : null;
  if (end_at && new Date(end_at) < new Date(start_at)) {
    return { ok: false, error: 'End is before start.' };
  }

  return {
    ok: true,
    value: {
      payload,
      start_at,
      end_at,
      all_day: Boolean(raw.all_day),
      lang: raw.lang === 'en' ? 'en' : 'es',
    },
  };
}

export interface RawContent extends Partial<EventContent> {}

/**
 * Client-side validation, run in the browser before encrypting. This is the
 * only place content rules are enforced now, since the server cannot read it.
 */
export function validateContent(
  raw: RawContent
): { ok: true; value: EventContent } | { ok: false; error: string } {
  const title = trimOrNull(raw.title, LIMITS.title);
  if (!title) return { ok: false, error: 'Title is required.' };

  const location_text = trimOrNull(raw.location_text, LIMITS.location_text);
  if (!location_text) return { ok: false, error: 'Location is required.' };

  const map_mode: MapMode =
    raw.map_mode === 'point' || raw.map_mode === 'area' ? raw.map_mode : 'none';

  let lat: number | null = null;
  let lng: number | null = null;
  let area_radius: number | null = null;

  if (map_mode !== 'none') {
    lat = typeof raw.lat === 'number' ? raw.lat : NaN;
    lng = typeof raw.lng === 'number' ? raw.lng : NaN;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return { ok: false, error: 'Latitude is invalid.' };
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { ok: false, error: 'Longitude is invalid.' };
    }
    if (map_mode === 'area') {
      const r = typeof raw.area_radius === 'number' ? raw.area_radius : 500;
      area_radius = Math.min(20000, Math.max(50, Math.round(r)));
    }
  }

  const external_url = trimOrNull(raw.external_url, LIMITS.external_url);
  if (external_url && !/^https?:\/\//i.test(external_url)) {
    return { ok: false, error: 'External link must start with http(s)://' };
  }

  return {
    ok: true,
    value: {
      title,
      location_text,
      map_mode,
      lat,
      lng,
      area_radius,
      description: trimOrNull(raw.description, LIMITS.description),
      hosted_by: trimOrNull(raw.hosted_by, LIMITS.hosted_by),
      external_url,
    },
  };
}
