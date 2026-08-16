import type { APIRoute } from 'astro';
import { getServiceClient } from '../../lib/supabase';
import { validateCreateInput, computeExpiry, type CreateEventInput } from '../../lib/event';

export const prerender = false;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Update an event by its secret manage token. The token is the authorization.
export const POST: APIRoute = async ({ request }) => {
  let raw: CreateEventInput & { manage_token?: string };
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const token = typeof raw.manage_token === 'string' ? raw.manage_token.trim() : '';
  if (!token) return json({ error: 'Missing manage token.' }, 400);

  const result = validateCreateInput(raw);
  if (!result.ok) return json({ error: result.error }, 400);
  const ev = result.value;

  const supabase = getServiceClient();

  const { data: row, error: findErr } = await supabase
    .from('events')
    .select('view_slug')
    .eq('manage_token', token)
    .maybeSingle();
  if (findErr) {
    console.error('update lookup failed:', findErr.message);
    return json({ error: 'Could not update.' }, 500);
  }
  if (!row) return json({ error: 'Not found.' }, 404);

  const expires_at = computeExpiry(ev.start_at, ev.end_at).toISOString();

  const { error } = await supabase
    .from('events')
    .update({
      title: ev.title,
      start_at: ev.start_at,
      end_at: ev.end_at,
      all_day: ev.all_day,
      location_text: ev.location_text,
      map_mode: ev.map_mode,
      lat: ev.lat,
      lng: ev.lng,
      area_radius: ev.area_radius,
      description: ev.description,
      hosted_by: ev.hosted_by,
      external_url: ev.external_url,
      lang: ev.lang,
      expires_at,
    })
    .eq('manage_token', token);
  if (error) {
    console.error('update failed:', error.message);
    return json({ error: 'Could not update the event.' }, 500);
  }

  const base = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;
  return json({ ok: true, viewUrl: `${base}/e/${row.view_slug}` }, 200);
};
