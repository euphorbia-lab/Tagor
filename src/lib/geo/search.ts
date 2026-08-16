// General address search via Photon (open-source OSM geocoder).
//
// Unlike the salvaged locationGeocoding.ts (which HARD-FILTERS to the Canary
// Islands), this is global: it biases results toward the Canaries but never
// discards anything, so an event anywhere in the world can still find its spot.

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Bias center: middle of the Canary Islands. Photon ranks nearby results higher
// without excluding far-away ones.
const BIAS_LAT = 28.3;
const BIAS_LON = -15.8;

export interface AddressResult {
  label: string;
  lat: number;
  lon: number;
}

function buildLabel(p: Record<string, unknown>): string {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const line1 = [str(p.name) || str(p.street), str(p.housenumber)].filter(Boolean).join(' ');
  const parts = [line1, str(p.city) || str(p.district), str(p.state), str(p.country)]
    .map((s) => s.trim())
    .filter(Boolean);
  // De-duplicate consecutive equal parts (e.g. name === city).
  return parts.filter((part, i) => i === 0 || part !== parts[i - 1]).join(', ');
}

/**
 * Search addresses/POIs worldwide, Canary-biased. Returns up to `limit` results.
 * `lang` picks Photon's localized names ('es' | 'en' | 'de' | 'fr' | 'default').
 */
export async function searchAddress(
  query: string,
  opts: { limit?: number; lang?: string; signal?: AbortSignal } = {}
): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    limit: String(opts.limit ?? 6),
    lat: String(BIAS_LAT),
    lon: String(BIAS_LON),
  });
  const lang = opts.lang;
  if (lang && ['de', 'en', 'fr', 'default'].includes(lang)) {
    params.set('lang', lang);
  }

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal: opts.signal });
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);

  const data = (await res.json()) as {
    features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: Record<string, unknown> }>;
  };

  const out: AddressResult[] = [];
  for (const f of data.features ?? []) {
    const coords = f.geometry?.coordinates;
    if (!coords) continue;
    const label = buildLabel(f.properties ?? {});
    if (!label) continue;
    out.push({ label, lat: coords[1], lon: coords[0] });
  }
  return out;
}
