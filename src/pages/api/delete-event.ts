import type { APIRoute } from 'astro';
import { getServiceClient } from '../../lib/supabase';

export const prerender = false;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Delete an event by its secret manage token. The token is the authorization:
// only someone holding the private manage link can delete.
export const POST: APIRoute = async ({ request }) => {
  let body: { manage_token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const token = typeof body.manage_token === 'string' ? body.manage_token.trim() : '';
  if (!token) return json({ error: 'Missing manage token.' }, 400);

  const supabase = getServiceClient();

  const { data: row, error: findErr } = await supabase
    .from('events')
    .select('id')
    .eq('manage_token', token)
    .maybeSingle();
  if (findErr) {
    console.error('delete lookup failed:', findErr.message);
    return json({ error: 'Could not delete.' }, 500);
  }
  if (!row) return json({ error: 'Not found.' }, 404);

  const { error: delErr } = await supabase.from('events').delete().eq('manage_token', token);
  if (delErr) {
    console.error('delete failed:', delErr.message);
    return json({ error: 'Could not delete.' }, 500);
  }

  return json({ ok: true }, 200);
};
