// General address search via Photon (open-source OSM geocoder). Worldwide, with
// no location bias: Photon ranks results by its own importance score.

const PHOTON_URL = 'https://photon.komoot.io/api/';

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
 * Search addresses/POIs worldwide. Returns up to `limit` results.
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
