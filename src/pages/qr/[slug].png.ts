import type { APIRoute } from 'astro';
import QRCode from 'qrcode';

// Server-generated QR PNG for an event's view URL. Used as the og:image so link
// previews (WhatsApp, socials) show the scannable QR.
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response('Not found', { status: 404 });

  const base = import.meta.env.PUBLIC_SITE_URL || 'https://tagor.app';
  const url = `${base}/e/${slug}`;

  try {
    const buf = await QRCode.toBuffer(url, {
      width: 640,
      margin: 3,
      color: { dark: '#1a1a18', light: '#ffffff' },
    });
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch {
    return new Response('error', { status: 500 });
  }
};
