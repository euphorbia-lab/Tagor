import { useEffect, useState } from 'react';
import EventMap from './EventMap';
import ShareActions from './ShareActions';
import { buildGoogleCalendarUrl } from '../lib/calendar';
import { importKey, decryptJson, keyFromHash } from '../lib/crypto';
import { decryptImageToUrl } from '../lib/images';
import type { EventContent } from '../lib/event';

interface Props {
  /** Opaque ciphertext from the database. */
  payload: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  lang: 'es' | 'en';
  /** Keyless URL of this page; the key is re-appended for sharing. */
  viewUrl: string;
  /** How many encrypted images to fetch from storage. */
  imageCount: number;
  /** Public base URL of the image bucket. */
  imageBase: string;
}

const T = {
  es: {
    when: 'Cuándo',
    where: 'Dónde',
    details: 'Más detalles',
    hostedBy: 'Organiza',
    addCal: 'Añadir al calendario',
    more: 'Más información',
    allDay: 'Todo el día',
    share: 'Compartir',
    locale: 'es-ES',
    loading: 'Descifrando…',
    noKeyTitle: 'Falta la clave del enlace',
    noKeyBody:
      'Este evento está cifrado y el enlace no incluye la clave. Copia el enlace completo, incluida la parte que empieza por «#».',
    badKeyTitle: 'No se pudo abrir el evento',
    badKeyBody: 'La clave del enlace no es válida para este evento.',
  },
  en: {
    when: 'When',
    where: 'Where',
    details: 'More details',
    hostedBy: 'Hosted by',
    addCal: 'Add to calendar',
    more: 'More info',
    allDay: 'All day',
    share: 'Share',
    locale: 'en-GB',
    loading: 'Decrypting…',
    noKeyTitle: 'The link is missing its key',
    noKeyBody:
      'This event is encrypted and the link does not include its key. Copy the whole link, including the part starting with "#".',
    badKeyTitle: 'Could not open this event',
    badKeyBody: 'The key in this link is not valid for this event.',
  },
};

type State =
  | { status: 'loading' }
  | { status: 'nokey' }
  | { status: 'badkey' }
  | { status: 'ok'; content: EventContent; keyStr: string };

export default function EventView({
  payload,
  start_at,
  end_at,
  all_day,
  lang,
  viewUrl,
  imageCount,
  imageBase,
}: Props) {
  const t = T[lang];
  const [state, setState] = useState<State>({ status: 'loading' });
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const keyStr = keyFromHash();
      if (!keyStr) {
        if (!cancelled) setState({ status: 'nokey' });
        return;
      }
      try {
        const key = await importKey(keyStr);
        const content = await decryptJson<EventContent>(payload, key);
        if (!cancelled) setState({ status: 'ok', content, keyStr });
      } catch {
        if (!cancelled) setState({ status: 'badkey' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  // The server sent a generic <title>; fill in the real one once we have it.
  useEffect(() => {
    if (state.status === 'ok') document.title = `${state.content.title} · Tagor`;
  }, [state]);

  // Photos are separate blobs, fetched and decrypted once the key is known.
  // A failed or corrupt image is skipped rather than breaking the page.
  useEffect(() => {
    if (state.status !== 'ok' || imageCount < 1) return;
    let cancelled = false;
    const made: string[] = [];
    (async () => {
      const key = await importKey(state.keyStr);
      for (let i = 0; i < imageCount; i++) {
        try {
          const res = await fetch(`${imageBase}/${i}.bin`);
          if (!res.ok) continue;
          const url = await decryptImageToUrl(await res.text(), key);
          made.push(url);
          if (!cancelled) setPhotos((p) => [...p, url]);
        } catch {
          /* skip this one */
        }
      }
    })();
    return () => {
      cancelled = true;
      for (const url of made) URL.revokeObjectURL(url);
    };
  }, [state, imageCount, imageBase]);

  const start = new Date(start_at);
  const dateLabel = new Intl.DateTimeFormat(t.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(start);
  const timeLabel = all_day
    ? t.allDay
    : new Intl.DateTimeFormat(t.locale, { hour: '2-digit', minute: '2-digit' }).format(start);

  if (state.status === 'loading') {
    return <p className="ev-muted">{t.loading}</p>;
  }

  if (state.status === 'nokey' || state.status === 'badkey') {
    const isNoKey = state.status === 'nokey';
    return (
      <div className="ev-fail">
        <h1>{isNoKey ? t.noKeyTitle : t.badKeyTitle}</h1>
        <p className="ev-muted">{isNoKey ? t.noKeyBody : t.badKeyBody}</p>
        <style>{css}</style>
      </div>
    );
  }

  const ev = state.content;
  const shareUrl = `${viewUrl}#${state.keyStr}`;
  const calendarUrl = buildGoogleCalendarUrl({
    title: ev.title,
    startISO: start_at,
    endISO: end_at ?? undefined,
    details: ev.description ?? '',
    location: ev.location_text,
  });

  return (
    <div>
      <h1 className="ev-title">{ev.title}</h1>

      <section className="ev-block">
        <h2 className="ev-label">{t.when}</h2>
        <p className="ev-big" style={{ textTransform: 'capitalize' }}>
          {dateLabel}
        </p>
        <p className="ev-muted">{timeLabel}</p>
      </section>

      <section className="ev-block">
        <h2 className="ev-label">{t.where}</h2>
        <p className="ev-big">{ev.location_text}</p>
        {ev.map_mode !== 'none' && ev.lat != null && ev.lng != null && (
          <EventMap
            lat={ev.lat}
            lng={ev.lng}
            mode={ev.map_mode}
            areaRadius={ev.area_radius ?? 500}
            title={ev.title}
            lang={lang}
          />
        )}
      </section>

      {photos.length > 0 && (
        <section className="ev-block">
          <ul className="ev-photos">
            {photos.map((src) => (
              <li key={src}>
                <img src={src} alt="" loading="lazy" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {ev.description && (
        <section className="ev-block">
          <h2 className="ev-label">{t.details}</h2>
          <p className="ev-body">{ev.description}</p>
        </section>
      )}

      {ev.hosted_by && (
        <p className="ev-muted ev-host">
          {t.hostedBy} · <strong>{ev.hosted_by}</strong>
        </p>
      )}

      <div className="ev-actions">
        <a className="btn btn--primary" href={calendarUrl} target="_blank" rel="noopener">
          {t.addCal}
        </a>
        {ev.external_url && (
          <a className="btn" href={ev.external_url} target="_blank" rel="noopener noreferrer">
            {t.more}
          </a>
        )}
      </div>

      <section className="ev-block">
        <h2 className="ev-label">{t.share}</h2>
        <ShareActions viewUrl={shareUrl} title={ev.title} dateLabel={dateLabel} lang={lang} />
      </section>

      <style>{css}</style>
    </div>
  );
}

const css = `
  .ev-title { font-size: clamp(26px, 6vw, 36px); line-height: 1.12; letter-spacing: -0.02em; margin: 8px 0 36px; font-family: var(--font-display); font-weight: 700; }
  .ev-block { margin-bottom: 32px; }
  .ev-label { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 0 0 6px; font-family: var(--font-body); font-weight: 600; }
  .ev-big { font-size: 19px; font-weight: 600; margin: 0 0 2px; }
  .ev-body { white-space: pre-wrap; margin: 0; }
  .ev-muted { color: var(--text-muted); }
  .ev-host { margin: 0 0 24px; }
  .ev-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 48px; }
  .ev-fail h1 { font-size: 24px; letter-spacing: -0.02em; margin: 8px 0 12px; }
  .ev-photos { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .ev-photos img {
    width: 100%; height: auto; display: block;
    border-radius: var(--radius); border: 1px solid var(--border);
  }
`;
