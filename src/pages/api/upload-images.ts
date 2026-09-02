import type { APIRoute } from 'astro';
import { getServiceClient } from '../../lib/supabase';

export const prerender = false;

const BUCKET = 'event-images';
const MAX_IMAGES = 3;
/** Mirrors the bucket's file_size_limit and the client-side ceiling. */
const MAX_ENCRYPTED_CHARS = 1024 * 1024;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Replace an event's images. Authorised by the manage token, exactly like
 * update/delete: holding the token is what proves ownership.
 *
 * The bodies are ciphertext produced in the browser, so this route stores bytes
 * it cannot read, the same deal as the event payload itself.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: { manage_token?: string; images?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const token = typeof body.manage_token === 'string' ? body.manage_token.trim() : '';
  if (!token) return json({ error: 'Missing manage token.' }, 400);

  const images = Array.isArray(body.images) ? body.images : null;
  if (!images) return json({ error: 'Missing images.' }, 400);
  if (images.length > MAX_IMAGES) return json({ error: 'Too many images.' }, 400);
  if (!images.every((i) => typeof i === 'string' && i.length <= MAX_ENCRYPTED_CHARS)) {
    return json({ error: 'Image is too large.' }, 413);
  }

  const supabase = getServiceClient();

  const { data: row, error: findErr } = await supabase
    .from('events')
    .select('view_slug')
    .eq('manage_token', token)
    .maybeSingle();
  if (findErr) {
    console.error('image upload lookup failed:', findErr.message);
    return json({ error: 'Could not save images.' }, 500);
  }
  if (!row) return json({ error: 'Not found.' }, 404);

  const slug = row.view_slug as string;

  // Clear whatever is there, so an edit that removes an image really removes it.
  const { data: existing } = await supabase.storage.from(BUCKET).list(slug);
  if (existing && existing.length > 0) {
    await supabase.storage.from(BUCKET).remove(existing.map((f) => `${slug}/${f.name}`));
  }

  for (let i = 0; i < images.length; i++) {
    const bytes = new TextEncoder().encode(images[i] as string);
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(`${slug}/${i}.bin`, bytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      });
    if (upErr) {
      console.error('image upload failed:', upErr.message);
      return json({ error: 'Could not save images.' }, 500);
    }
  }

  const { error: countErr } = await supabase
    .from('events')
    .update({ image_count: images.length })
    .eq('manage_token', token);
  if (countErr) {
    console.error('image count update failed:', countErr.message);
    return json({ error: 'Could not save images.' }, 500);
  }

  return json({ ok: true, count: images.length }, 200);
};
