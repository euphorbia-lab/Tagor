import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  viewUrl: string;
  title: string;
  dateLabel: string;
  lang: 'es' | 'en';
}

const T = {
  es: {
    intro: 'Comparte este enlace o el QR:',
    share: 'Compartir',
    dlCard: 'Descargar imagen',
    dlQr: 'Descargar QR',
    copy: 'Copiar',
    copied: 'Copiado',
  },
  en: {
    intro: 'Share this link or the QR:',
    share: 'Share',
    dlCard: 'Download image',
    dlQr: 'Download QR',
    copy: 'Copy',
    copied: 'Copied',
  },
};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxW) lines[maxLines - 1] = last.replace(/\s\S+$/, '') + '…';
  }
  return lines;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'tagor.app';
  }
}

function download(blobOrUrl: Blob | string, name: string) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ShareActions({ viewUrl, title, dateLabel, lang }: Props) {
  const t = T[lang];
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(viewUrl, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(''));
  }, [viewUrl]);

  const shareText = `${title} · ${dateLabel}`;

  async function shareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: viewUrl });
        return;
      } catch {
        return; // user cancelled
      }
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

  // Branded share card: logo + title + date + QR, as one PNG.
  async function buildCard(): Promise<Blob> {
    const W = 720;
    const H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#faf6f0';
    ctx.fillRect(0, 0, W, H);

    try {
      await Promise.all([
        (document as any).fonts?.load("700 46px 'Bricolage Grotesque Variable'"),
        (document as any).fonts?.load("500 26px 'Hanken Grotesk Variable'"),
      ]);
    } catch {
      /* fonts fall back */
    }

    // Logo
    try {
      const logo = await loadImg('/logo.png');
      const lw = 300;
      const lh = (lw * logo.height) / logo.width;
      ctx.drawImage(logo, (W - lw) / 2, 70, lw, lh);
    } catch {
      /* skip logo if it fails */
    }

    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#1a1a18';
    ctx.font = "700 46px 'Bricolage Grotesque Variable', sans-serif";
    const titleTop = 300;
    const lines = wrapLines(ctx, title, W - 120, 3);
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, titleTop + i * 54));
    const afterTitle = titleTop + lines.length * 54 + 8;

    // Date
    ctx.fillStyle = '#63676a';
    ctx.font = "500 26px 'Hanken Grotesk Variable', sans-serif";
    ctx.fillText(dateLabel, W / 2, afterTitle);

    // QR on a white rounded panel
    const qrUrl = await QRCode.toDataURL(viewUrl, { margin: 1, width: 700 });
    const qrImg = await loadImg(qrUrl);
    const qs = 360;
    const qx = (W - qs) / 2;
    const qy = 500;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qx - 22, qy - 22, qs + 44, qs + 44, 22);
    ctx.fill();
    ctx.drawImage(qrImg, qx, qy, qs, qs);

    // Footer domain
    ctx.fillStyle = '#c8452f';
    ctx.font = "700 26px 'Hanken Grotesk Variable', sans-serif";
    ctx.fillText(hostOf(viewUrl), W / 2, 928);

    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/png'));
  }

  async function shareOrDownloadCard() {
    setBusy(true);
    try {
      const blob = await buildCard();
      const file = new File([blob], 'tagor-evento.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: any) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: shareText, url: viewUrl });
          return;
        } catch {
          return;
        }
      }
      download(blob, 'tagor-evento.png');
    } finally {
      setBusy(false);
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
        <button className="btn" type="button" onClick={shareOrDownloadCard} disabled={busy}>
          {t.dlCard}
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
