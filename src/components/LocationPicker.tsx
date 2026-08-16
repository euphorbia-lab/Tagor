import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { searchAddress, type AddressResult } from '../lib/geo/search';

export type MapMode = 'none' | 'point' | 'area';

export interface LocationValue {
  mapMode: MapMode;
  lat: number | null;
  lng: number | null;
  areaRadius: number;
}

interface Props {
  lang: 'es' | 'en';
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}

const ACCENT = '#c8452f';
const DEFAULT_CENTER: [number, number] = [28.1, -15.43]; // Gran Canaria
const T = {
  es: {
    addMap: 'Añadir un mapa (opcional)',
    precise: 'Punto exacto',
    area: 'Zona aproximada',
    search: 'Buscar dirección o lugar',
    hint: 'Toca el mapa para colocar el punto.',
    hintArea: 'Toca el mapa para centrar la zona.',
    radius: 'Radio',
  },
  en: {
    addMap: 'Add a map (optional)',
    precise: 'Exact point',
    area: 'Approximate area',
    search: 'Search address or place',
    hint: 'Tap the map to place the point.',
    hintArea: 'Tap the map to center the area.',
    radius: 'Radius',
  },
};

export default function LocationPicker({ lang, value, onChange }: Props) {
  const t = T[lang];
  const enabled = value.mapMode !== 'none';

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced address search.
  useEffect(() => {
    if (!enabled || query.trim().length < 3) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchAddress(query, { lang, signal: ctrl.signal });
        setResults(r);
      } catch {
        /* aborted or network error; ignore */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(id);
    };
  }, [query, enabled, lang]);

  // Init / tear down the map when enabled toggles.
  useEffect(() => {
    if (!enabled || !mapEl.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !mapEl.current) return;
      LRef.current = L;
      const center: [number, number] =
        value.lat != null && value.lng != null ? [value.lat, value.lng] : DEFAULT_CENTER;

      const map = L.map(mapEl.current, { center, zoom: value.lat != null ? 15 : 11 });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', (e: any) => setPoint(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      if (value.lat != null && value.lng != null) draw(value.lat, value.lng);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Redraw when mode or radius changes.
  useEffect(() => {
    if (enabled && value.lat != null && value.lng != null) draw(value.lat, value.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.mapMode, value.areaRadius]);

  function draw(lat: number, lng: number) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    if (value.mapMode === 'area') {
      circleRef.current = L.circle([lat, lng], {
        radius: value.areaRadius,
        color: ACCENT,
        weight: 1,
        fillColor: ACCENT,
        fillOpacity: 0.15,
      }).addTo(map);
    } else {
      const icon = L.divIcon({
        className: 'tagor-pin',
        html: `<div style="background:${ACCENT};width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });
      markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
    }
  }

  function setPoint(lat: number, lng: number) {
    onChange({ ...value, lat, lng });
    draw(lat, lng);
  }

  function pickResult(r: AddressResult) {
    setQuery(r.label);
    setResults([]);
    if (mapRef.current) mapRef.current.setView([r.lat, r.lon], 16);
    setPoint(r.lat, r.lon);
  }

  function toggleEnabled(on: boolean) {
    onChange({ ...value, mapMode: on ? 'point' : 'none' });
  }

  function setMode(mode: MapMode) {
    onChange({ ...value, mapMode: mode });
  }

  return (
    <div className="lp">
      <label className="lp__toggle">
        <input type="checkbox" checked={enabled} onChange={(e) => toggleEnabled(e.target.checked)} />
        {t.addMap}
      </label>

      {enabled && (
        <div className="lp__body">
          <div className="lp__modes">
            <label>
              <input
                type="radio"
                name="mapmode"
                checked={value.mapMode === 'point'}
                onChange={() => setMode('point')}
              />
              {t.precise}
            </label>
            <label>
              <input
                type="radio"
                name="mapmode"
                checked={value.mapMode === 'area'}
                onChange={() => setMode('area')}
              />
              {t.area}
            </label>
          </div>

          <div className="lp__search">
            <input
              type="text"
              value={query}
              placeholder={t.search}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
            {searching && <span className="lp__spin">…</span>}
            {results.length > 0 && (
              <ul className="lp__results">
                {results.map((r, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => pickResult(r)}>
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div ref={mapEl} className="lp__map" />
          <p className="lp__hint">{value.mapMode === 'area' ? t.hintArea : t.hint}</p>

          {value.mapMode === 'area' && (
            <label className="lp__radius">
              {t.radius}: {value.areaRadius} m
              <input
                type="range"
                min={100}
                max={5000}
                step={50}
                value={value.areaRadius}
                onChange={(e) => onChange({ ...value, areaRadius: Number(e.target.value) })}
              />
            </label>
          )}
        </div>
      )}

      <style>{`
        .lp__toggle, .lp__modes label, .lp__radius {
          display: flex; align-items: center; gap: 8px; cursor: pointer;
        }
        .lp__toggle { font-weight: 600; }
        .lp__body { margin-top: 12px; display: grid; gap: 12px; }
        .lp__modes { display: flex; gap: 20px; }
        .lp__search { position: relative; }
        .lp__search input { width: 100%; }
        .lp__spin { position: absolute; right: 10px; top: 10px; color: var(--text-muted); }
        .lp__results {
          list-style: none; margin: 4px 0 0; padding: 4px;
          border: 1px solid var(--border); border-radius: var(--radius);
          background: var(--surface); position: absolute; z-index: 500; width: 100%;
          box-shadow: var(--shadow); max-height: 240px; overflow-y: auto;
        }
        .lp__results button {
          width: 100%; text-align: left; background: none; border: none;
          padding: 8px 10px; border-radius: 8px; color: var(--text); cursor: pointer; font-size: 14px;
        }
        .lp__results button:hover { background: var(--surface-2); }
        .lp__map {
          height: 240px; width: 100%; border-radius: var(--radius);
          overflow: hidden; border: 1px solid var(--border);
        }
        .lp__hint { margin: 0; font-size: 13px; color: var(--text-muted); }
        .lp__radius { flex-direction: column; align-items: flex-start; font-size: 14px; }
        .lp__radius input { width: 100%; }
      `}</style>
    </div>
  );
}
