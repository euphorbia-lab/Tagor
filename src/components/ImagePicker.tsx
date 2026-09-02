import { useEffect, useRef, useState } from 'react';
import { MAX_IMAGES, ACCEPTED_TYPES, compressImage } from '../lib/images';

export interface PickedImage {
  /** Compressed, EXIF-free bytes, ready to encrypt on submit. */
  bytes: Uint8Array<ArrayBuffer>;
  /** Object URL for the thumbnail. Revoked when removed or unmounted. */
  url: string;
}

interface Props {
  lang: 'es' | 'en';
  value: PickedImage[];
  onChange: (images: PickedImage[]) => void;
}

const T = {
  es: {
    label: 'Fotos (opcional, máx. 3)',
    add: 'Añadir foto',
    remove: 'Quitar',
    working: 'Preparando…',
    note: 'Se cifran igual que el resto del evento, y se les quitan los datos de ubicación de la cámara.',
    errType: 'Ese formato no vale. Usa JPG, PNG, WebP o GIF.',
    errLarge: 'Esa imagen es demasiado grande.',
    errGeneric: 'No se pudo preparar la imagen.',
  },
  en: {
    label: 'Photos (optional, max 3)',
    add: 'Add photo',
    remove: 'Remove',
    working: 'Preparing…',
    note: 'Encrypted like the rest of the event, with the camera location data stripped out.',
    errType: 'That format will not work. Use JPG, PNG, WebP or GIF.',
    errLarge: 'That image is too big.',
    errGeneric: 'Could not prepare that image.',
  },
};

export default function ImagePicker({ lang, value, onChange }: Props) {
  const t = T[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Revoke any thumbnails still alive when this unmounts.
  const liveUrls = useRef<string[]>([]);
  liveUrls.current = value.map((v) => v.url);
  useEffect(() => {
    return () => {
      for (const url of liveUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // let the same file be picked again after removal
    if (files.length === 0) return;

    setError('');
    setBusy(true);
    const room = MAX_IMAGES - value.length;
    const next: PickedImage[] = [];
    try {
      for (const file of files.slice(0, room)) {
        const bytes = await compressImage(file);
        next.push({
          bytes,
          url: URL.createObjectURL(new Blob([bytes], { type: 'image/webp' })),
        });
      }
      onChange([...value, ...next]);
    } catch (err) {
      for (const n of next) URL.revokeObjectURL(n.url);
      const code = err instanceof Error ? err.message : '';
      setError(code === 'unsupported-type' ? t.errType : code === 'too-large' ? t.errLarge : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    URL.revokeObjectURL(value[i].url);
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="ip">
      <span className="ip__label">{t.label}</span>

      {value.length > 0 && (
        <ul className="ip__grid">
          {value.map((img, i) => (
            <li key={img.url} className="ip__item">
              <img src={img.url} alt="" />
              <button type="button" className="ip__remove" onClick={() => remove(i)}>
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length < MAX_IMAGES && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            onChange={onFiles}
            hidden
          />
          <button
            type="button"
            className="btn ip__add"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? t.working : t.add}
          </button>
        </>
      )}

      <p className="ip__note">{t.note}</p>
      {error && <p className="ip__error">{error}</p>}

      <style>{`
        .ip { display: grid; gap: 8px; }
        .ip__label { font-weight: 600; font-size: 14px; }
        .ip__grid { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
        .ip__item { display: grid; gap: 4px; justify-items: center; }
        .ip__item img {
          width: 96px; height: 96px; object-fit: cover;
          border-radius: var(--radius-sm); border: 1px solid var(--border);
        }
        .ip__remove {
          background: none; border: none; padding: 0; cursor: pointer;
          color: var(--text-muted); font-size: 12px; text-decoration: underline;
        }
        .ip__add { justify-self: start; }
        .ip__note { margin: 0; font-size: 13px; color: var(--text-muted); }
        .ip__error { margin: 0; color: var(--accent); font-weight: 600; }
      `}</style>
    </div>
  );
}
