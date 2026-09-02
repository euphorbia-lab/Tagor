import type { APIRoute } from 'astro';
import { getServiceClient } from '../../lib/supabase';
import { validateMeta, computeExpiry, type RawMeta } from '../../lib/event';
import { newViewSlug, newManageToken } from '../../lib/ids';

export const prerender = false;

const CREATE_LIMIT_PER_HOUR = 10;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Verify a Cloudflare Turnstile token server-side.
async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// Salted SHA-256 of the IP, so the rate-limit log never stores raw addresses.
async function hashIp(ip: string): Promise<string> {
  const salt = import.meta.env.RATE_LIMIT_SALT ?? '';
  const enc = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let raw: RawMeta & { turnstileToken?: string };
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  // 1. Bot check.
  const token = typeof raw.turnstileToken === 'string' ? raw.turnstileToken : '';
  if (!token || !(await verifyTurnstile(token, clientAddress ?? null))) {
    return json({ error: 'Bot check failed. Please retry.' }, 403);
  }

  // 2. Validate what we can still see. The event's content arrives already
  //    encrypted, so only the metadata and the blob's size are checkable here.
  const result = validateMeta(raw);
  if (!result.ok) return json({ error: result.error }, 400);
  const ev = result.value;

  const supabase = getServiceClient();

  // 3. Per-IP hourly rate limit (best-effort; skipped if IP is unavailable).
  let ipHash: string | null = null;
  if (clientAddress) {
    ipHash = await hashIp(clientAddress);
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: rlErr } = await supabase
      .from('create_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    if (!rlErr && (count ?? 0) >= CREATE_LIMIT_PER_HOUR) {
      return json({ error: 'Too many events created from here. Try again later.' }, 429);
    }
  }

  // 4. Generate ids + expiry, then insert with the service role.
  const view_slug = newViewSlug();
  const manage_token = newManageToken();
  const expires_at = computeExpiry(ev.start_at, ev.end_at).toISOString();

  const { error } = await supabase.from('events').insert({
    view_slug,
    manage_token,
    payload: ev.payload,
    start_at: ev.start_at,
    end_at: ev.end_at,
    all_day: ev.all_day,
    lang: ev.lang,
    expires_at,
  });
  if (error) {
    console.error('event insert failed:', error.message);
    return json({ error: 'Could not create the event. Please try again.' }, 500);
  }

  if (ipHash) {
    await supabase.from('create_log').insert({ ip_hash: ipHash });
  }

  // These URLs are deliberately keyless. The browser appends the decryption
  // key as a '#' fragment, which is the part the server must never receive.
  const base = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;
  return json(
    {
      viewUrl: `${base}/e/${view_slug}`,
      manageUrl: `${base}/m/${manage_token}`,
    },
    200
  );
};
