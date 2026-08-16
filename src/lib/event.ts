// Shared event shapes + validation, used by the event page and the create API.

export type MapMode = 'none' | 'point' | 'area';

/** Public event fields returned by the get_event RPC (no slug/token/pin). */
export interface PublicEvent {
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location_text: string;
  map_mode: MapMode;
  lat: number | null;
  lng: number | null;
  area_radius: number | null;
  description: string | null;
  hosted_by: string | null;
  external_url: string | null;
  lang: string;
}

/** Grace period kept after an event before it auto-deletes. */
export const EXPIRY_GRACE_DAYS = 14;

/** Expiry = (end or start) + grace. */
export function computeExpiry(startISO: string, endISO?: string | null): Date {
  const base = new Date(endISO || startISO);
  return new Date(base.getTime() + EXPIRY_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

export interface CreateEventInput {
  title: string;
  start_at: string;
  end_at?: string | null;
  all_day?: boolean;
  location_text: string;
  map_mode?: MapMode;
  lat?: number | null;
  lng?: number | null;
  area_radius?: number | null;
  description?: string | null;
  hosted_by?: string | null;
  external_url?: string | null;
  lang?: string;
}

export interface ValidatedEvent {
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location_text: string;
  map_mode: MapMode;
  lat: number | null;
  lng: number | null;
  area_radius: number | null;
  description: string | null;
  hosted_by: string | null;
  external_url: string | null;
  lang: string;
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

/**
 * Validate + normalize raw create input. Returns { ok, value } or { ok:false, error }.
 * Mirrors the DB CHECK constraints so bad input is rejected before it hits Postgres.
 */
export function validateCreateInput(
  raw: CreateEventInput
): { ok: true; value: ValidatedEvent } | { ok: false; error: string } {
  const title = trimOrNull(raw.title, LIMITS.title);
  if (!title) return { ok: false, error: 'Title is required.' };

  const location_text = trimOrNull(raw.location_text, LIMITS.location_text);
  if (!location_text) return { ok: false, error: 'Location is required.' };

  if (!isValidDate(raw.start_at)) return { ok: false, error: 'Start date/time is invalid.' };
  const end_at = raw.end_at && isValidDate(raw.end_at) ? raw.end_at : null;
  if (end_at && new Date(end_at) < new Date(raw.start_at)) {
    return { ok: false, error: 'End is before start.' };
  }

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

  const lang = raw.lang === 'en' ? 'en' : 'es';

  return {
    ok: true,
    value: {
      title,
      start_at: raw.start_at,
      end_at,
      all_day: Boolean(raw.all_day),
      location_text,
      map_mode,
      lat,
      lng,
      area_radius,
      description: trimOrNull(raw.description, LIMITS.description),
      hosted_by: trimOrNull(raw.hosted_by, LIMITS.hosted_by),
      external_url,
      lang,
    },
  };
}
