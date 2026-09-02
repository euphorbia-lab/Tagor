import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, TILE_MAX_ZOOM, tilePaneCss } from '../lib/mapTiles';

export type MapMode = 'point' | 'area';

interface EventMapProps {
  lat: number;
  lng: number;
  /** 'point' shows an exact pin + directions; 'area' shows a soft radius, no exact address. */
  mode: MapMode;
  title: string;
  /** Radius in meters for 'area' mode. */
  areaRadius?: number;
  /** Page language for the action button label. Defaults to 'es'. */
  lang?: string;
}

const ACCENT = '#c8452f';

const LABELS = {
  es: { directions: 'Cómo llegar', openMaps: 'Abrir en el mapa' },
  en: { directions: 'Get directions', openMaps: 'Open in maps' },
} as const;

/**
 * Static (non-interactive) map preview using Leaflet + free CartoDB tiles.
 * Salvaged and simplified from the original Tagor EventLocationMap.
 */
export default function EventMap({ lat, lng, mode, title, areaRadius = 500, lang = 'es' }: EventMapProps) {
  const labels = lang === 'en' ? LABELS.en : LABELS.es;
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const container = elRef.current;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    import('leaflet').then((L) => {
      if (!container.isConnected) return;

      // In 'area' mode, zoom out a touch so the radius reads as "around here".
      const zoom = mode === 'area' ? 13 : 15;

      const map = L.map(container, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        keyboard: false,
        attributionControl: true,
      });

      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: TILE_MAX_ZOOM,
      }).addTo(map);

      if (mode === 'area') {
        L.circle([lat, lng], {
          radius: areaRadius,
          color: ACCENT,
          weight: 1,
          fillColor: ACCENT,
          fillOpacity: 0.15,
        }).addTo(map);
      } else {
        const icon = L.divIcon({
          className: 'tagor-marker',
          html: `<div style="background:${ACCENT};width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 26],
        });
        L.marker([lat, lng], { icon, title }).addTo(map);
      }

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 150);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, mode, areaRadius, title]);

  // Turn-by-turn directions to an exact spot (precise-point mode).
  const openDirections = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      window.location.href = `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
    } else if (/android/.test(ua)) {
      window.location.href = `google.navigation:q=${lat},${lng}`;
      setTimeout(() => {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
      }, 800);
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  // Open the location in the user's maps app without directions (approximate-area mode).
  const openInMaps = () => {
    const ua = navigator.userAgent.toLowerCase();
    const label = encodeURIComponent(title);
    if (/iphone|ipad|ipod/.test(ua)) {
      window.location.href = `maps://maps.apple.com/?ll=${lat},${lng}&q=${label}`;
    } else if (/android/.test(ua)) {
      window.location.href = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
      setTimeout(() => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
      }, 800);
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
  };

  const isPoint = mode === 'point';

  return (
    <div className="tagor-map">
      <div ref={elRef} className="tagor-map__canvas" />
      <button
        type="button"
        className="btn tagor-map__btn"
        onClick={isPoint ? openDirections : openInMaps}
      >
        {isPoint ? labels.directions : labels.openMaps}
      </button>
      <style>{`
        .tagor-map { margin-top: 12px; }
        .tagor-map__canvas {
          height: 200px;
          width: 100%;
          border-radius: var(--radius, 14px);
          overflow: hidden;
          border: 1px solid var(--border, #e6e3dc);
          margin-bottom: 12px;
        }
        .tagor-map__btn { width: 100%; }
        .tagor-map .leaflet-container { background: var(--surface-2, #f3f1ec); }
        ${tilePaneCss('.tagor-map')}
      `}</style>
    </div>
  );
}
