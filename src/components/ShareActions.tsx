import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  viewUrl: string;
  title: string;
  dateLabel: string;
  lang: 'es' | 'en';
}

const T = {
  es: { intro: 'Comparte este enlace o el QR:', share: 'Compartir', dlQr: 'Descargar QR', copy: 'Copiar', copied: 'Copiado' },
  en: { intro: 'Share this link or the QR:', share: 'Share', dlQr: 'Download QR', copy: 'Copy', copied: 'Copied' },
};

function download(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function ShareActions({ viewUrl, title, dateLabel, lang }: Props) {
  const t = T[lang];
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(viewUrl, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(''));
  }, [viewUrl]);

  const shareText = `${title} · ${dateLabel}`;

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: viewUrl });
      } catch {
        /* cancelled */
      }
      return;
    }
    copyLink();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(viewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function downloadQr() {
    const url = await QRCode.toDataURL(viewUrl, { margin: 2, width: 700 });
    download(url, 'tagor-qr.png');
  }

  return (
    <div className="sa">
      <p className="muted sa__intro">{t.intro}</p>

      {qr && <img className="sa__qr" src={qr} alt="QR" width={200} height={200} />}

      <div className="sa__row">
        <button className="btn btn--primary" type="button" onClick={shareLink}>
          {t.share}
        </button>
        <button className="btn" type="button" onClick={downloadQr}>
          {t.dlQr}
        </button>
      </div>

      <div className="sa__link">
        <input readOnly value={viewUrl} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn" type="button" onClick={copyLink}>
          {copied ? t.copied : t.copy}
        </button>
      </div>

      <style>{`
        .sa { display: grid; gap: 14px; }
        .sa__intro { margin: 0; }
        .sa__qr { justify-self: center; border-radius: 10px; border: 1px solid var(--border); background: #fff; padding: 8px; }
        .sa__row { display: flex; flex-wrap: wrap; gap: 8px; }
        .sa__link { display: flex; gap: 8px; }
        .sa__link input { flex: 1; font-family: ui-monospace, monospace; font-size: 13px; }
      `}</style>
    </div>
  );
}
