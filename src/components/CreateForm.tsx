import { useEffect, useRef, useState } from 'react';
import LocationPicker, { type LocationValue } from './LocationPicker';
import DateTimeField from './DateTimeField';
import ShareActions from './ShareActions';
import ImagePicker, { type PickedImage } from './ImagePicker';
import { generateKey, exportKey, encryptJson } from '../lib/crypto';
import { validateContent } from '../lib/event';
import { encryptImage } from '../lib/images';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

interface Props {
  lang: 'es' | 'en';
  siteKey: string;
  siteUrl: string;
}

const T = {
  es: {
    title: 'Título',
    titlePh: '¿Qué es el evento?',
    start: 'Empieza',
    end: 'Termina (opcional)',
    time: 'Hora',
    allDay: 'Todo el día',
    location: 'Lugar',
    locationPh: 'Puede ser un nombre, no hace falta dirección',
    description: 'Descripción (opcional)',
    hostedBy: 'Organiza (opcional)',
    link: 'Enlace (opcional)',
    linkPh: 'https://…',
    submit: 'Crear evento',
    submitting: 'Creando…',
    reqTitle: 'Pon un título.',
    reqStart: 'Pon una fecha de inicio.',
    reqLoc: 'Pon un lugar.',
    reqBot: 'Completa la verificación anti-robots.',
    done: '¡Listo!',
    shareIntro: 'Comparte este enlace o el QR:',
    manageIntro: 'Guarda este enlace privado para editar o borrar el evento. Es la única forma, no se puede recuperar.',
    copy: 'Copiar',
    copied: 'Copiado',
    open: 'Abrir evento',
    viewLabel: 'Enlace para compartir',
    manageLabel: 'Enlace privado de gestión',
    error: 'Algo salió mal. Inténtalo de nuevo.',
  },
  en: {
    title: 'Title',
    titlePh: 'What is the event?',
    start: 'Starts',
    end: 'Ends (optional)',
    time: 'Time',
    allDay: 'All day',
    location: 'Place',
    locationPh: 'Can be a nickname, no address needed',
    description: 'Description (optional)',
    hostedBy: 'Hosted by (optional)',
    link: 'Link (optional)',
    linkPh: 'https://…',
    submit: 'Create event',
    submitting: 'Creating…',
    reqTitle: 'Add a title.',
    reqStart: 'Add a start date.',
    reqLoc: 'Add a place.',
    reqBot: 'Complete the bot check.',
    done: 'Done!',
    shareIntro: 'Share this link or the QR:',
    manageIntro: 'Save this private link to edit or delete the event. It is the only way, and it cannot be recovered.',
    copy: 'Copy',
    copied: 'Copied',
    open: 'Open event',
    viewLabel: 'Link to share',
    manageLabel: 'Private manage link',
    error: 'Something went wrong. Please try again.',
  },
};

interface CreateResult {
  viewUrl: string;
  manageUrl: string;
}

export default function CreateForm({ lang, siteKey, siteUrl }: Props) {
  const t = T[lang];

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [loc, setLoc] = useState<LocationValue>({
    mapMode: 'none',
    lat: null,
    lng: null,
    areaRadius: 500,
  });
  const [description, setDescription] = useState('');
  const [hostedBy, setHostedBy] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);

  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState<'view' | 'manage' | null>(null);

  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Load + render the Turnstile widget.
  useEffect(() => {
    const render = () => {
      if (window.turnstile && widgetEl.current && !widgetId.current) {
        widgetId.current = window.turnstile.render(widgetEl.current, {
          sitekey: siteKey,
          callback: (tok: string) => setToken(tok),
          'error-callback': () => setToken(''),
          'expired-callback': () => setToken(''),
        });
      }
    };
    const id = 'cf-turnstile-script';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    } else {
      render();
    }
  }, [siteKey]);

  function toISO(local: string): string {
    // "YYYY-MM-DDTHH:MM" local, or "YYYY-MM-DD" for all-day (anchor at midday
    // so timezone offsets never shift the calendar day).
    const withTime = local.includes('T') ? local : `${local}T12:00:00`;
    return new Date(withTime).toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError(t.reqTitle);
    if (!start) return setError(t.reqStart);
    if (!locationText.trim()) return setError(t.reqLoc);
    if (!token) return setError(t.reqBot);

    // Content rules are enforced here, because the server cannot read the
    // event once it is encrypted.
    const content = validateContent({
      title,
      location_text: locationText,
      map_mode: loc.mapMode,
      lat: loc.lat,
      lng: loc.lng,
      area_radius: loc.mapMode === 'area' ? loc.areaRadius : null,
      description,
      hosted_by: hostedBy,
      external_url: externalUrl,
    });
    if (!content.ok) return setError(content.error);

    setSubmitting(true);
    try {
      // Encrypt in the browser. The key stays here and goes into the link
      // fragment below; the server only ever receives the blob.
      const key = await generateKey();
      const keyStr = await exportKey(key);
      const payload = await encryptJson(content.value, key);

      const body = {
        payload,
        start_at: toISO(start),
        end_at: end ? toISO(end) : null,
        all_day: allDay,
        lang,
        turnstileToken: token,
      };
      const res = await fetch('/api/create-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.error);
        window.turnstile?.reset(widgetId.current ?? undefined);
        setToken('');
      } else {
        // Images are a second call: the event has to exist before its blobs
        // can be filed under its slug. A failure here loses the photos, not
        // the event, so the link still works.
        if (images.length > 0) {
          try {
            const encrypted = await Promise.all(
              images.map((img) => encryptImage(img.bytes, key))
            );
            const manageToken = data.manageUrl.split('/m/')[1] ?? '';
            await fetch('/api/upload-images', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ manage_token: manageToken, images: encrypted }),
            });
          } catch {
            /* keep the event; the photos just did not make it */
          }
        }
        setResult({
          viewUrl: `${data.viewUrl}#${keyStr}`,
          manageUrl: `${data.manageUrl}#${keyStr}`,
        });
      }
    } catch {
      setError(t.error);
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(text: string, which: 'view' | 'manage') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  if (result) {
    const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(toISO(start)));
    return (
      <div className="cf-done">
        <h1>{t.done}</h1>

        <ShareActions viewUrl={result.viewUrl} title={title.trim()} dateLabel={dateLabel} lang={lang} />

        <div className="cf-manage">
          <span className="cf-linklabel">{t.manageLabel}</span>
          <p className="cf-warn">{t.manageIntro}</p>
          <div className="cf-linkbox">
            <input readOnly value={result.manageUrl} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn" type="button" onClick={() => copy(result.manageUrl, 'manage')}>
              {copied === 'manage' ? t.copied : t.copy}
            </button>
          </div>
        </div>

        <a className="btn btn--primary cf-open" href={result.viewUrl}>
          {t.open}
        </a>

        <style>{cssDone}</style>
      </div>
    );
  }

  return (
    <form className="cf" onSubmit={onSubmit} noValidate>
      <label className="cf-field">
        <span>{t.title}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePh} maxLength={200} />
      </label>

      <DateTimeField label={t.start} value={start} onChange={setStart} dateOnly={allDay} timeLabel={t.time} />

      <label className="cf-check">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        {t.allDay}
      </label>

      {!allDay && <DateTimeField label={t.end} value={end} onChange={setEnd} timeLabel={t.time} />}

      <label className="cf-field">
        <span>{t.location}</span>
        <input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder={t.locationPh} maxLength={300} />
      </label>

      <LocationPicker lang={lang} value={loc} onChange={setLoc} />

      <label className="cf-field">
        <span>{t.description}</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={5000} />
      </label>

      <label className="cf-field">
        <span>{t.hostedBy}</span>
        <input value={hostedBy} onChange={(e) => setHostedBy(e.target.value)} maxLength={120} />
      </label>

      <label className="cf-field">
        <span>{t.link}</span>
        <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder={t.linkPh} maxLength={500} />
      </label>

      <ImagePicker lang={lang} value={images} onChange={setImages} />

      <div ref={widgetEl} className="cf-turnstile-widget" />

      {error && <p className="cf-error">{error}</p>}

      <button className="btn btn--primary cf-submit" type="submit" disabled={submitting}>
        {submitting ? t.submitting : t.submit}
      </button>

      <style>{cssForm}</style>
    </form>
  );
}

const cssForm = `
  .cf { display: grid; gap: 18px; }
  .cf-field { display: grid; gap: 6px; }
  .cf-field > span { font-weight: 600; font-size: 14px; }
  .cf-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .cf-turnstile-widget { min-height: 65px; }
  .cf-error { color: var(--accent); margin: 0; font-weight: 600; }
  .cf-submit { justify-self: start; }
`;

const cssDone = `
  .cf-done { display: grid; gap: 16px; }
  .cf-done h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0; }
  .cf-linklabel { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
  .cf-linkrow { display: grid; gap: 6px; }
  .cf-linkbox { display: flex; gap: 8px; }
  .cf-linkbox input { flex: 1; font-family: ui-monospace, monospace; font-size: 13px; }
  .cf-qr { justify-self: center; border-radius: 12px; border: 1px solid var(--border); background: #fff; padding: 8px; }
  .cf-manage { display: grid; gap: 6px; border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; background: var(--surface-2); }
  .cf-warn { margin: 0; font-size: 14px; color: var(--text); }
  .cf-open { justify-self: start; }
`;
