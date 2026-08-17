import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import LocationPicker, { type LocationValue } from './LocationPicker';
import DateTimeField from './DateTimeField';

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

  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateResult | null>(null);
  const [qr, setQr] = useState('');
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

  // Build the QR once we have a result.
  useEffect(() => {
    if (result) {
      QRCode.toDataURL(result.viewUrl, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(''));
    }
  }, [result]);

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

    setSubmitting(true);
    try {
      const body = {
        title: title.trim(),
        start_at: toISO(start),
        end_at: end ? toISO(end) : null,
        all_day: allDay,
        location_text: locationText.trim(),
        map_mode: loc.mapMode,
        lat: loc.lat,
        lng: loc.lng,
        area_radius: loc.mapMode === 'area' ? loc.areaRadius : null,
        description: description.trim() || null,
        hosted_by: hostedBy.trim() || null,
        external_url: externalUrl.trim() || null,
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
        setResult(data as CreateResult);
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
    return (
      <div className="cf-done">
        <h1>{t.done}</h1>

        <p className="muted">{t.shareIntro}</p>
        <div className="cf-linkrow">
          <span className="cf-linklabel">{t.viewLabel}</span>
          <div className="cf-linkbox">
            <input readOnly value={result.viewUrl} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn" type="button" onClick={() => copy(result.viewUrl, 'view')}>
              {copied === 'view' ? t.copied : t.copy}
            </button>
          </div>
        </div>

        {qr && <img className="cf-qr" src={qr} alt="QR" width={200} height={200} />}

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
