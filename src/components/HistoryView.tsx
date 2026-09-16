import { useEffect, useState } from 'react';
import { isNativeApp } from '../lib/platform';
import { getHistory, removeHistoryEntry, clearHistory, type HistoryEntry } from '../lib/history';

interface Props {
  lang: 'es' | 'en';
}

const T = {
  es: {
    empty: 'No hay eventos guardados todavía.',
    clearAll: 'Borrar todo',
    confirmClear: '¿Borrar todo el historial de este dispositivo?',
    confirmRemove: '¿Quitar este evento del historial?',
    remove: 'Quitar',
    open: 'Abrir evento',
    viewLabel: 'Enlace para compartir',
    manageLabel: 'Enlace privado de gestión',
    copy: 'Copiar',
    copied: 'Copiado',
    locale: 'es-ES',
  },
  en: {
    empty: 'No saved events yet.',
    clearAll: 'Clear all',
    confirmClear: 'Clear this device’s whole history?',
    confirmRemove: 'Remove this event from your history?',
    remove: 'Remove',
    open: 'Open event',
    viewLabel: 'Link to share',
    manageLabel: 'Private manage link',
    copy: 'Copy',
    copied: 'Copied',
    locale: 'en-GB',
  },
};

function LinkRow({ label, url, lang }: { label: string; url: string; lang: 'es' | 'en' }) {
  const t = T[lang];
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="hv-linkrow">
      <span className="hv-linklabel">{label}</span>
      <div className="hv-linkbox">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn" type="button" onClick={copy}>
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </div>
  );
}

export default function HistoryView({ lang }: Props) {
  const t = T[lang];
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      window.location.replace(lang === 'en' ? '/en/' : '/');
      return;
    }
    setEntries(getHistory());
  }, [lang]);

  function onRemove(id: string) {
    if (!confirm(t.confirmRemove)) return;
    removeHistoryEntry(id);
    setEntries(getHistory());
  }

  function onClearAll() {
    if (!confirm(t.confirmClear)) return;
    clearHistory();
    setEntries(getHistory());
  }

  if (entries === null) return null;

  if (entries.length === 0) {
    return (
      <p className="muted">{t.empty}</p>
    );
  }

  return (
    <div className="hv">
      <button className="btn hv-clearall" type="button" onClick={onClearAll}>
        {t.clearAll}
      </button>

      {entries.map((entry) => {
        const start = new Date(entry.startAt);
        const dateLabel = new Intl.DateTimeFormat(t.locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(start);

        return (
          <article key={entry.id} className="hv-entry">
            <header className="hv-entry__head">
              <div>
                <strong className="hv-entry__title">{entry.title}</strong>
                <p className="hv-entry__date muted">{dateLabel}</p>
              </div>
              <button className="btn hv-remove" type="button" onClick={() => onRemove(entry.id)}>
                {t.remove}
              </button>
            </header>

            <LinkRow label={t.viewLabel} url={entry.viewUrl} lang={lang} />
            <LinkRow label={t.manageLabel} url={entry.manageUrl} lang={lang} />

            <a className="btn hv-open" href={entry.viewUrl}>
              {t.open}
            </a>
          </article>
        );
      })}

      <style>{css}</style>
    </div>
  );
}

const css = `
  .hv { display: grid; gap: 20px; }
  .hv-clearall { justify-self: start; color: var(--accent); border-color: var(--accent); }
  .hv-entry { display: grid; gap: 10px; border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .hv-entry__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .hv-entry__title { font-size: 16px; }
  .hv-entry__date { margin: 2px 0 0; font-size: 13px; text-transform: capitalize; }
  .hv-remove { flex-shrink: 0; font-size: 13px; padding: 6px 10px; }
  .hv-linkrow { display: grid; gap: 6px; }
  .hv-linklabel { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
  .hv-linkbox { display: flex; gap: 8px; }
  .hv-linkbox input { flex: 1; font-family: ui-monospace, monospace; font-size: 13px; }
  .hv-open { justify-self: start; }
`;
