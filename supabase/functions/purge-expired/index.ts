// Daily cleanup: delete expired events, their encrypted images, and stale
// rate-limit rows.
//
// This is a function rather than plain SQL in pg_cron because Supabase blocks
// direct DELETE on storage tables (storage.protect_delete). Removing objects
// has to go through the Storage API, so the purge lives here and the cron job
// (see migrations/0007_purge_secret_from_vault.sql) just calls it.
//
// The anon key is enough to reach the function, so it also requires the
// PURGE_SECRET function secret in the x-purge-secret header. The cron job reads
// the same value from Vault ('purge_secret'). If PURGE_SECRET is unset, every
// call is refused.
//
// Deploy: supabase functions deploy purge-expired

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'event-images';

Deno.serve(async (req) => {
  const secret = Deno.env.get('PURGE_SECRET');
  if (!secret || req.headers.get('x-purge-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const report = { expiredEvents: 0, imagesRemoved: 0, orphanFolders: 0, createLogRows: 0 };

  // 1. Which events are past their expiry.
  const { data: expired, error: findErr } = await supabase
    .from('events')
    .select('view_slug')
    .lt('expires_at', new Date().toISOString());
  if (findErr) {
    return new Response(JSON.stringify({ error: findErr.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
  const expiredSlugs = (expired ?? []).map((e: { view_slug: string }) => e.view_slug);
  report.expiredEvents = expiredSlugs.length;

  // 2. Their images go first, so a failure here never leaves an image whose
  //    event row is already gone.
  for (const slug of expiredSlugs) {
    const { data: files } = await supabase.storage.from(BUCKET).list(slug);
    const paths = (files ?? []).map((f: { name: string }) => `${slug}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
      report.imagesRemoved += paths.length;
    }
  }

  // 3. Now the rows.
  if (expiredSlugs.length > 0) {
    await supabase.from('events').delete().in('view_slug', expiredSlugs);
  }

  // 4. Safety net: images whose event no longer exists at all. The event row is
  //    always inserted before its images are uploaded, so a folder with no row
  //    is genuinely orphaned, not a creation in progress.
  const { data: folders } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  for (const folder of folders ?? []) {
    const slug = (folder as { name: string }).name;
    const { data: row } = await supabase
      .from('events')
      .select('view_slug')
      .eq('view_slug', slug)
      .maybeSingle();
    if (row) continue;
    const { data: files } = await supabase.storage.from(BUCKET).list(slug);
    const paths = (files ?? []).map((f: { name: string }) => `${slug}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
      report.imagesRemoved += paths.length;
      report.orphanFolders += 1;
    }
  }

  // 5. Rate-limit log.
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('create_log')
    .delete({ count: 'exact' })
    .lt('created_at', twoDaysAgo);
  report.createLogRows = count ?? 0;

  return new Response(JSON.stringify(report), {
    headers: { 'content-type': 'application/json' },
  });
});
