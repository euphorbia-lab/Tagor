import { useEffect, useRef, useState } from 'react';

interface Props {
  /** Blob URLs of already-decrypted photos. */
  urls: string[];
  lang: 'es' | 'en';
}

const T = {
  es: {
    open: 'Ampliar foto',
    close: 'Cerrar',
    prev: 'Anterior',
    next: 'Siguiente',
    of: 'de',
    photo: 'Foto',
  },
  en: {
    open: 'Expand photo',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    of: 'of',
    photo: 'Photo',
  },
};

/**
 * Photos in a fixed-height strip so they cost the same vertical space whether
 * there is one or three, which keeps the description near the top of the page.
 * More than one becomes a swipeable carousel. Tapping any photo opens it full
 * size, since the strip crops to keep that height predictable.
 */
export default function PhotoGallery({ urls, lang }: Props) {
  const t = T[lang];
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const many = urls.length > 1;

  const step = (delta: number) =>
    setExpanded((i) => (i === null ? i : (i + delta + urls.length) % urls.length));

  // Swipe between photos while expanded. `swiped` stops the gesture from also
  // registering as a backdrop tap, which would close the lightbox mid-swipe.
  const touchX = useRef<number | null>(null);
  const swiped = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
    swiped.current = false;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const from = touchX.current;
    touchX.current = null;
    if (from === null || !many) return;
    const dx = e.changedTouches[0].clientX - from;
    if (Math.abs(dx) < 40) return;
    swiped.current = true;
    step(dx < 0 ? 1 : -1);
  }

  function onBackdropClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    setExpanded(null);
  }

  // Track which slide is centred, for the dots.
  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(urls.length - 1, i)));
  }

  function goTo(i: number) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  // Keyboard control for the lightbox, plus locking the page behind it.
  useEffect(() => {
    if (expanded === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded, urls.length]);

  if (urls.length === 0) return null;

  return (
    <div className="pg">
      <ul
        className="pg__track"
        ref={trackRef}
        onScroll={many ? onScroll : undefined}
        data-many={many ? 'true' : 'false'}
      >
        {urls.map((src, i) => (
          <li key={src} className="pg__slide">
            <button
              type="button"
              className="pg__shot"
              onClick={() => setExpanded(i)}
              aria-label={`${t.open} (${t.photo} ${i + 1} ${t.of} ${urls.length})`}
            >
              <img src={src} alt="" />
            </button>
          </li>
        ))}
      </ul>

      {many && (
        <div className="pg__dots">
          {urls.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`pg__dot${i === active ? ' is-on' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`${t.photo} ${i + 1} ${t.of} ${urls.length}`}
              aria-current={i === active}
            />
          ))}
        </div>
      )}

      {expanded !== null && (
        <div
          className="pg__lightbox"
          role="dialog"
          aria-modal="true"
          onClick={onBackdropClick}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <img src={urls[expanded]} alt="" onClick={(e) => e.stopPropagation()} />

          <button
            type="button"
            className="pg__close"
            onClick={() => setExpanded(null)}
            aria-label={t.close}
          >
            ✕
          </button>

          {many && (
            <>
              <button
                type="button"
                className="pg__nav pg__nav--prev"
                aria-label={t.prev}
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="pg__nav pg__nav--next"
                aria-label={t.next}
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
              >
                ›
              </button>
              <span className="pg__count">
                {expanded + 1} {t.of} {urls.length}
              </span>
            </>
          )}
        </div>
      )}

      <style>{`
        .pg { margin: 0 0 8px; }

        .pg__track {
          list-style: none; margin: 0; padding: 0;
          display: grid; grid-auto-flow: column; grid-auto-columns: 100%;
          overflow-x: auto; overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory;
          border-radius: var(--radius); border: 1px solid var(--border);
          scrollbar-width: none;
        }
        .pg__track::-webkit-scrollbar { display: none; }
        .pg__track[data-many='false'] { overflow-x: hidden; }

        .pg__slide { scroll-snap-align: center; }

        .pg__shot {
          display: block; width: 100%; padding: 0; border: none;
          background: var(--surface-2); cursor: zoom-in;
        }
        .pg__shot img {
          display: block; width: 100%; height: 240px; object-fit: cover;
        }

        .pg__dots { display: flex; justify-content: center; gap: 6px; margin-top: 8px; }
        .pg__dot {
          width: 7px; height: 7px; padding: 0; border-radius: 50%;
          border: none; background: var(--border); cursor: pointer;
        }
        .pg__dot.is-on { background: var(--accent); }

        /* Above Leaflet, whose own panes and controls climb to z-index 1000.
           At 100 the map drew straight over the expanded photo. */
        .pg__lightbox {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0, 0, 0, 0.94);
          display: flex; align-items: center; justify-content: center;
          padding: 16px; cursor: zoom-out;
          touch-action: pan-y;
        }
        .pg__lightbox img {
          max-width: 100%; max-height: 100%;
          object-fit: contain; cursor: default;
          user-select: none; -webkit-user-drag: none;
        }
        .pg__close, .pg__nav {
          position: absolute; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          border: none; color: #fff; cursor: pointer;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(2px);
          border-radius: 50%;
        }
        .pg__close {
          top: 12px; right: 12px;
          width: 40px; height: 40px; font-size: 20px; line-height: 1;
        }
        /* Big enough to hit with a thumb, and legible over a bright photo. */
        .pg__nav {
          top: 50%; transform: translateY(-50%);
          width: 48px; height: 48px; font-size: 32px; line-height: 1;
          padding-bottom: 4px;
        }
        .pg__nav--prev { left: 10px; }
        .pg__nav--next { right: 10px; }
        .pg__count {
          position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
          color: #fff; font-size: 13px; opacity: 0.85;
          background: rgba(0, 0, 0, 0.45); padding: 4px 10px; border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
