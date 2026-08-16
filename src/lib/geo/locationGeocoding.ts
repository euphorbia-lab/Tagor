import type { Island } from './islands';
import { ISLAND_CENTERS } from './islands';

export interface PhotonFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    country?: string;
    countrycode?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    district?: string;
    street?: string;
    housenumber?: string;
    name?: string;
    type?: string;
  };
}

export interface PhotonResponse {
  type: 'FeatureCollection';
  features: PhotonFeature[];
}

interface PreferredLocation {
  island?: Island;
  town?: string;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';
const CANARY_BOUNDS = {
  minLat: 27.5,
  maxLat: 29.5,
  minLng: -18.5,
  maxLng: -13.0,
};

const POI_TYPES = new Set([
  'museum',
  'tourism',
  'attraction',
  'monument',
  'historic',
  'amenity',
  'theatre',
  'cinema',
  'stadium',
  'university',
  'school',
  'hospital',
  'church',
]);

const PHOTON_SUPPORTED_LANGS = new Set(['default', 'de', 'en', 'fr']);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePhotonLanguage(): string {
  if (typeof navigator === 'undefined') return 'default';

  const primaryLanguage = (navigator.language || 'default').toLowerCase().split('-')[0];
  return PHOTON_SUPPORTED_LANGS.has(primaryLanguage) ? primaryLanguage : 'default';
}

export function normalizeLocationQuery(query: string): {
  raw: string;
  normalized: string;
  strategies: string[];
} {
  const raw = query.trim();
  const normalized = normalizeText(raw);

  const candidates = [
    raw,
    normalized,
    `${raw}, Canarias`,
    `${normalized} canarias`,
  ];

  const seen = new Set<string>();
  const strategies = candidates
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value) => {
      const key = normalizeText(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { raw, normalized, strategies };
}

export function isWithinCanaryBounds(lat: number, lng: number): boolean {
  return (
    lat >= CANARY_BOUNDS.minLat &&
    lat <= CANARY_BOUNDS.maxLat &&
    lng >= CANARY_BOUNDS.minLng &&
    lng <= CANARY_BOUNDS.maxLng
  );
}

export function mapToIslandFromProperties(
  properties: PhotonFeature['properties']
): Island | null {
  const state = properties.state?.toLowerCase() || '';
  const county = properties.county?.toLowerCase() || '';
  const city = properties.city?.toLowerCase() || '';
  const town = properties.town?.toLowerCase() || '';
  const village = properties.village?.toLowerCase() || '';

  const combined = `${state} ${county} ${city} ${town} ${village}`;

  if (combined.includes('gran canaria')) return 'Gran Canaria';
  if (combined.includes('tenerife')) return 'Tenerife';
  if (combined.includes('fuerteventura')) return 'Fuerteventura';
  if (combined.includes('lanzarote')) return 'Lanzarote';
  if (combined.includes('la palma') || combined.includes('san miguel de la palma')) return 'La Palma';
  if (combined.includes('la gomera') || combined.includes('gomera')) return 'La Gomera';
  if (combined.includes('hierro') || combined.includes('el hierro')) return 'El Hierro';

  return null;
}

export function detectIslandFromCoords(lat: number, lng: number): Island | null {
  if (!isWithinCanaryBounds(lat, lng)) return null;

  let closest: Island | null = null;
  let minDist = Infinity;

  for (const [island, [ilat, ilng]] of Object.entries(ISLAND_CENTERS)) {
    const dist = Math.sqrt((lat - ilat) ** 2 + (lng - ilng) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closest = island as Island;
    }
  }

  return minDist < 1.2 ? closest : null;
}

export function inferIsland(
  properties: PhotonFeature['properties'],
  lat: number,
  lng: number
): Island | null {
  return mapToIslandFromProperties(properties) || detectIslandFromCoords(lat, lng);
}

export function extractTown(properties: PhotonFeature['properties']): string {
  return properties.city || properties.town || properties.village || properties.county || 'Unknown';
}

export function buildDisplayName(properties: PhotonFeature['properties']): string {
  const parts: string[] = [];

  if (properties.name && properties.name !== properties.street) {
    parts.push(properties.name);
  }

  if (properties.street) {
    const streetAddress = properties.housenumber
      ? `${properties.street} ${properties.housenumber}`
      : properties.street;
    parts.push(streetAddress);
  }

  const locality = properties.city || properties.town || properties.village;
  if (locality) parts.push(locality);

  return parts.join(', ') || properties.name || 'Unknown location';
}

function rankPhotonFeature(
  feature: PhotonFeature,
  normalizedQuery: string,
  preferred?: PreferredLocation
): number {
  const [lng, lat] = feature.geometry.coordinates;
  const island = inferIsland(feature.properties, lat, lng);
  const name = normalizeText(feature.properties.name || '');
  const street = normalizeText(feature.properties.street || '');
  const town = normalizeText(extractTown(feature.properties));
  const display = normalizeText(buildDisplayName(feature.properties));
  const type = (feature.properties.type || '').toLowerCase();
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  let score = 0;

  if (name === normalizedQuery) score += 120;
  if (name.includes(normalizedQuery)) score += 80;
  if (display.includes(normalizedQuery)) score += 65;
  if (street.includes(normalizedQuery)) score += 45;
  if (town.includes(normalizedQuery)) score += 30;

  for (const token of queryTokens) {
    if (name.includes(token)) score += 14;
    if (street.includes(token)) score += 7;
    if (town.includes(token)) score += 6;
  }

  if (POI_TYPES.has(type)) score += 20;
  if (feature.properties.name && !feature.properties.housenumber) score += 10;

  if (preferred?.town) {
    const preferredTown = normalizeText(preferred.town);
    if (preferredTown && town === preferredTown) score += 25;
    else if (preferredTown && town.includes(preferredTown)) score += 15;
  }

  if (preferred?.island && island === preferred.island) score += 30;

  return score;
}

function dedupePhotonFeatures(features: PhotonFeature[]): PhotonFeature[] {
  const seen = new Set<string>();
  const unique: PhotonFeature[] = [];

  for (const feature of features) {
    const [lng, lat] = feature.geometry.coordinates;
    const key = [
      feature.properties.osm_type ?? '',
      feature.properties.osm_id ?? '',
      lat.toFixed(6),
      lng.toFixed(6),
      (feature.properties.name || '').toLowerCase(),
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(feature);
  }

  return unique;
}

async function requestPhotonFeatures(params: URLSearchParams): Promise<PhotonFeature[]> {
  const response = await fetch(`${PHOTON_URL}?${params.toString()}`);

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`PHOTON_HTTP_${response.status}`);
  }

  const data: PhotonResponse = await response.json();
  return data.features || [];
}

export async function fetchPhotonFeatures(query: string, limit = 30): Promise<PhotonFeature[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    lat: '28.4',
    lon: '-16.0',
    bbox: '-18.5,27.5,-13.0,29.5',
    lang: resolvePhotonLanguage(),
  });

  try {
    return await requestPhotonFeatures(params);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'PHOTON_HTTP_400') {
      throw error;
    }

    const fallbackParams = new URLSearchParams({
      q: query,
      limit: String(limit),
      lat: '28.4',
      lon: '-16.0',
      bbox: '-18.5,27.5,-13.0,29.5',
    });

    return requestPhotonFeatures(fallbackParams);
  }
}

export function filterCanaryPhotonFeatures(features: PhotonFeature[]): PhotonFeature[] {
  return features.filter((feature) => {
    const [lng, lat] = feature.geometry.coordinates;
    if (feature.properties.countrycode && feature.properties.countrycode !== 'ES') {
      return false;
    }

    if (!isWithinCanaryBounds(lat, lng)) return false;

    return inferIsland(feature.properties, lat, lng) !== null;
  });
}

export function rankAndSortPhotonFeatures(
  features: PhotonFeature[],
  normalizedQuery: string,
  preferred?: PreferredLocation
): PhotonFeature[] {
  return [...features].sort((a, b) => {
    const scoreB = rankPhotonFeature(b, normalizedQuery, preferred);
    const scoreA = rankPhotonFeature(a, normalizedQuery, preferred);
    return scoreB - scoreA;
  });
}

export async function searchPhotonCanary(
  query: string,
  normalizedQuery: string,
  preferred?: PreferredLocation
): Promise<{ raw: PhotonFeature[]; filtered: PhotonFeature[] }> {
  const { strategies } = normalizeLocationQuery(query);
  const allRaw: PhotonFeature[] = [];

  for (const strategy of strategies) {
    const features = await fetchPhotonFeatures(strategy, 30);
    allRaw.push(...features);
  }

  const deduped = dedupePhotonFeatures(allRaw);
  const filtered = rankAndSortPhotonFeatures(
    filterCanaryPhotonFeatures(deduped),
    normalizedQuery,
    preferred
  );

  return { raw: deduped, filtered };
}

function hasStrongNameMatch(feature: PhotonFeature, expectedName: string): boolean {
  const expected = normalizeText(expectedName);
  if (!expected) return true;

  const name = normalizeText(feature.properties.name || '');
  const display = normalizeText(buildDisplayName(feature.properties));

  if (name === expected || name.includes(expected) || display.includes(expected)) {
    return true;
  }

  const tokens = expected.split(' ').filter((token) => token.length > 2);
  if (tokens.length === 0) return false;

  const matchingTokens = tokens.filter((token) => name.includes(token) || display.includes(token)).length;
  return matchingTokens >= Math.max(2, Math.ceil(tokens.length * 0.6));
}

export async function findBestPhotonMatchForLocation(params: {
  name: string;
  town: string;
  island: Island;
}): Promise<PhotonFeature | null> {
  const queries = [
    `${params.name}, ${params.town}, ${params.island}, Canarias`,
    `${params.name}, ${params.island}`,
    params.name,
  ];

  const allRaw: PhotonFeature[] = [];
  for (const query of queries) {
    const features = await fetchPhotonFeatures(query, 20);
    allRaw.push(...features);
  }

  const deduped = dedupePhotonFeatures(allRaw);
  const filtered = rankAndSortPhotonFeatures(
    filterCanaryPhotonFeatures(deduped),
    normalizeText(params.name),
    {
      island: params.island,
      town: params.town,
    }
  );

  const bestMatch = filtered[0] ?? null;
  if (!bestMatch) return null;

  return hasStrongNameMatch(bestMatch, params.name) ? bestMatch : null;
}
