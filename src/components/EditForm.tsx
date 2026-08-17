import { useState } from 'react';
import LocationPicker, { type LocationValue } from './LocationPicker';
import DateTimeField from './DateTimeField';

interface InitialEvent {
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location_text: string;
  map_mode: 'none' | 'point' | 'area';
  lat: number | null;
  lng: number | null;
  area_radius: number | null;
  description: string | null;
  hosted_by: string | null;
  external_url: string | null;
}

interface Props {
  lang: 'es' | 'en';
  manageToken: string;
  initial: InitialEvent;
}

const T = {
  es: {
    title: 'Título',
    start: 'Empieza',
    end: 'Termina (opcional)',
    time: 'Hora',
    allDay: 'Todo el día',
    location: 'Lugar',
    locationPh: 'Puede ser un nombre, no hace falta dirección',
    description: 'Descripción (opcional)',
    hostedBy: 'Organiza (opcional)',
    link: 'Enlace (opcional)',
    save: 'Guardar cambios',
    saving: 'Guardando…',
    saved: 'Cambios guardados.',
    reqTitle: 'Pon un título.',
    reqStart: 'Pon una fecha de inicio.',
    reqLoc: 'Pon un lugar.',
    error: 'No se pudo guardar. Inténtalo de nuevo.',
  },
  en: {
    title: 'Title',
    start: 'Starts',
    end: 'Ends (optional)',
    time: 'Time',
    allDay: 'All day',
    location: 'Place',
    locationPh: 'Can be a nickname, no address needed',
    description: 'Description (optional)',
    hostedBy: 'Hosted by (optional)',
    link: 'Link (optional)',
    save: 'Save changes',
    saving: 'Saving…',
    saved: 'Changes saved.',
    reqTitle: 'Add a title.',
    reqStart: 'Add a start date.',
    reqLoc: 'Add a place.',
    error: 'Could not save. Please try again.',
  },
};

// ISO -> "YYYY-MM-DDTHH:MM" in local time (for datetime-local inputs).
function toLocalInput(iso: string, dateOnly = false): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return dateOnly ? date : `${date}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function EditForm({ lang, manageToken, initial }: Props) {
  const t = T[lang];

  const [title, setTitle] = useState(initial.title);
  const [allDay, setAllDay] = useState(initial.all_day);
  const [start, setStart] = useState(toLocalInput(initial.start_at, initial.all_day));
  const [end, setEnd] = useState(initial.end_at ? toLocalInput(initial.end_at) : '');
  const [locationText, setLocationText] = useState(initial.location_text);
  const [loc, setLoc] = useState<LocationValue>({
    mapMode: initial.map_mode,
    lat: initial.lat,
    lng: initial.lng,
    areaRadius: initial.area_radius ?? 500,
  });
  const [description, setDescription] = useState(initial.description ?? '');
  const [hostedBy, setHostedBy] = useState(initial.hosted_by ?? '');
  const [externalUrl, setExternalUrl] = useState(initial.external_url ?? '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function toISO(local: string): string {
    const withTime = local.includes('T') ? local : `${local}T12:00:00`;
    return new Date(withTime).toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!title.trim()) return setError(t.reqTitle);
    if (!start) return setError(t.reqStart);
    if (!locationText.trim()) return setError(t.reqLoc);

    setSaving(true);
    try {
      const body = {
        manage_token: manageToken,
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
      };
      const res = await fetch('/api/update-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError(t.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="cf" onSubmit={onSubmit} noValidate>
      <label className="cf-field">
        <span>{t.title}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </label>

      <DateTimeField label={t.start} value={start} onChange={setStart} dateOnly={allDay} timeLabel={t.time} />

      <label className="cf-check">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        {t.allDay}
      </label>

      {!allDay && <DateTimeField label={t.end} value={end} onChange={setEnd} timeLabel={t.time} />}

      <label className="cf-field">
        <span>{t.location}</span>
        <input
          value={locationText}
          onChange={(e) => setLocationText(e.target.value)}
          placeholder={t.locationPh}
          maxLength={300}
        />
      </label>

      <LocationPicker lang={lang} value={loc} onChange={setLoc} />

      <label className="cf-field">
        <span>{t.description}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={5000}
        />
      </label>

      <label className="cf-field">
        <span>{t.hostedBy}</span>
        <input value={hostedBy} onChange={(e) => setHostedBy(e.target.value)} maxLength={120} />
      </label>

      <label className="cf-field">
        <span>{t.link}</span>
        <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} maxLength={500} />
      </label>

      {error && <p className="cf-error">{error}</p>}
      {saved && <p className="cf-saved">{t.saved}</p>}

      <button className="btn btn--primary cf-submit" type="submit" disabled={saving}>
        {saving ? t.saving : t.save}
      </button>

      <style>{`
        .cf { display: grid; gap: 18px; }
        .cf-field { display: grid; gap: 6px; }
        .cf-field > span { font-weight: 600; font-size: 14px; }
        .cf-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .cf-error { color: var(--accent); margin: 0; font-weight: 600; }
        .cf-saved { color: var(--accent); margin: 0; font-weight: 600; }
        .cf-submit { justify-self: start; }
      `}</style>
    </form>
  );
}
