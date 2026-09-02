// Shared basemap config for every Leaflet map in the app.
//
// We used CARTO's light_all/dark_all until they moved their free basemaps
// behind an API key and started stamping "API KEY REQUIRED" across the tiles.
// Standard OSM tiles need no key. There is no dark OSM style, so dark mode is
// produced by filtering the tile layer in CSS, which also lets us land on a
// soft charcoal instead of the near-black CARTO dark style.

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
export const TILE_MAX_ZOOM = 19;

/**
 * Applied to the tile pane only, never the whole map, so pins and radius
 * circles keep their real brand colour.
 *
 * Tuned by measuring mean tile brightness: CARTO's dark_all averaged 12/255,
 * which is what made the old map read as a black hole. These values land
 * around 40/255, a charcoal that still shows roads and labels.
 */
export const DARK_TILE_FILTER =
  'invert(1) hue-rotate(180deg) brightness(1.3) contrast(0.7) saturate(0.5)';

/** Current theme, honouring the manual toggle before the OS preference. */
export function isDarkTheme(): boolean {
  if (typeof document === 'undefined') return false;
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** CSS applying the dark filter to a map's tiles when the theme is dark. */
export function tilePaneCss(scope: string): string {
  return `
    ${scope} .leaflet-tile-pane { filter: none; }
    :root[data-theme='dark'] ${scope} .leaflet-tile-pane { filter: ${DARK_TILE_FILTER}; }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme='light']) ${scope} .leaflet-tile-pane { filter: ${DARK_TILE_FILTER}; }
    }
  `;
}
