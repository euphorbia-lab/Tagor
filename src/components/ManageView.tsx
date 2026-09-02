import { useEffect, useState } from 'react';
import EditForm from './EditForm';
import ShareActions from './ShareActions';
import { importKey, decryptJson, keyFromHash } from '../lib/crypto';
import type { EventContent } from '../lib/event';

interface Props {
  payload: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  lang: 'es' | 'en';
  manageToken: string;
  /** Keyless share URL; the key is re-appended in the browser. */
  viewUrl: string;
}

const T = {
  es: {
    open: 'Abrir evento',
    editTitle: 'Editar',
    dangerTitle: 'Borrar',
    dangerBody: 'Esto borra el evento para siempre. No se puede deshacer.',
    del: 'Borrar evento',
    confirm: '¿Borrar este evento para siempre?',
    deleting: 'Borrando…',
    deleted: 'Evento borrado.',
    delError: 'No se pudo borrar. Inténtalo de nuevo.',
    loading: 'Descifrando…',
    noKeyTitle: 'Falta la clave del enlace',
    noKeyBody:
      'Este enlace de gestión no incluye su clave, así que el evento no se puede descifrar ni editar. Copia el enlace completo, incluida la parte que empieza por «#».',
    badKeyTitle: 'No se pudo abrir el evento',
    badKeyBody: 'La clave de este enlace no es válida para este evento.',
    locale: 'es-ES',
  },
  en: {
    open: 'Open event',
    editTitle: 'Edit',
    dangerTitle: 'Delete',
    dangerBody: 'This permanently deletes the event. It cannot be undone.',
    del: 'Delete event',
    confirm: 'Delete this event permanently?',
    deleting: 'Deleting…',
    deleted: 'Event deleted.',
    delError: 'Could not delete. Try again.',
    loading: 'Decrypting…',
    noKeyTitle: 'The link is missing its key',
    noKeyBody:
      'This manage link does not include its key, so the event cannot be decrypted or edited. Copy the whole link, including the part starting with "#".',
    badKeyTitle: 'Could not open this event',
    badKeyBody: 'The key in this link is not valid for this event.',
    locale: 'en-GB',
  },
};

type State =
  | { status: 'loading' }
  | { status: 'nokey' }
  | { status: 'badkey' }
  | { status: 'ok'; content: EventContent; key: CryptoKey; keyStr: string };

export default function ManageView({
  payload,
  start_at,
  end_at,
  all_day,
  lang,
  manageToken,
  viewUrl,
}: Props) {
  const t = T[lang];
  const [state, setState] = useState<State>({ status: 'loading' });
  const [delMsg, setDelMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

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
        if (!cancelled) setState({ status: 'ok', content, key, keyStr });
      } catch {
        if (!cancelled) setState({ status: 'badkey' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload]);

  async function onDelete() {
    if (!confirm(t.confirm)) return;
    setDeleting(true);
    setDelMsg('');
    try {
      const res = await fetch('/api/delete-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ manage_token: manageToken }),
      });
      if (res.ok) {
        setDeleted(true);
        setDelMsg(t.deleted);
      } else {
        setDelMsg(t.delError);
      }
    } catch {
      setDelMsg(t.delError);
    } finally {
      setDeleting(false);
    }
  }

  if (state.status === 'loading') return <p className="mv-muted">{t.loading}</p>;

  if (state.status === 'nokey' || state.status === 'badkey') {
    const isNoKey = state.status === 'nokey';
    return (
      <div className="mv-fail">
        <h2>{isNoKey ? t.noKeyTitle : t.badKeyTitle}</h2>
        <p className="mv-muted">{isNoKey ? t.noKeyBody : t.badKeyBody}</p>
        <style>{css}</style>
      </div>
    );
  }

  const ev = state.content;
  const shareUrl = `${viewUrl}#${state.keyStr}`;
  const start = new Date(start_at);
  const whenLabel =
    new Intl.DateTimeFormat(t.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(
      start
    ) +
    (all_day
      ? ''
      : ' · ' +
        new Intl.DateTimeFormat(t.locale, { hour: '2-digit', minute: '2-digit' }).format(start));

  return (
    <div>
      <p className="mv-summary mv-muted">
        <strong className="mv-summary__title">{ev.title}</strong>
        <br />
        <span style={{ textTransform: 'capitalize' }}>{whenLabel}</span>
        <br />
        {ev.location_text}
      </p>

      <div className="mv-share">
        <ShareActions viewUrl={shareUrl} title={ev.title} dateLabel={whenLabel} lang={lang} />
      </div>

      <a className="btn mv-open" href={shareUrl}>
        {t.open}
      </a>

      <section className="mv-edit">
        <h2>{t.editTitle}</h2>
        <EditForm
          lang={lang}
          manageToken={manageToken}
          cryptoKey={state.key}
          initial={{ ...ev, start_at, end_at, all_day }}
        />
      </section>

      <section className="mv-danger">
        <h2>{t.dangerTitle}</h2>
        <p className="mv-muted">{t.dangerBody}</p>
        {!deleted && (
          <button className="btn mv-danger__btn" type="button" onClick={onDelete} disabled={deleting}>
            {deleting ? t.deleting : t.del}
          </button>
        )}
        {delMsg && <p className="mv-delmsg">{delMsg}</p>}
      </section>

      <style>{css}</style>
    </div>
  );
}

const css = `
  .mv-muted { color: var(--text-muted); }
  .mv-summary { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; margin-bottom: 28px; }
  .mv-summary__title { color: var(--text); font-size: 17px; }
  .mv-share { margin-bottom: 24px; }
  .mv-open { margin-bottom: 40px; }
  .mv-edit { border-top: 1px solid var(--border); padding-top: 24px; margin-bottom: 40px; }
  .mv-edit h2 { font-size: 16px; margin: 0 0 16px; }
  .mv-danger { border-top: 1px solid var(--border); padding-top: 24px; }
  .mv-danger h2 { font-size: 16px; margin: 0 0 6px; }
  .mv-danger__btn { color: var(--accent); border-color: var(--accent); }
  .mv-delmsg { font-weight: 600; margin: 10px 0 0; color: var(--accent); }
  .mv-fail h2 { font-size: 20px; margin: 0 0 10px; }
`;
