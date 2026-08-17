# Tagor

**Announce one event. Share it as a link + QR. That's it.**

No accounts, no public list, no app. Create an event, get a private link and a QR,
share them anywhere, and whoever opens it sees a clean page with the when, the where,
and a map. Events auto-delete after they happen. Fully open source.

> Tagor announces a decision; it doesn't help a group make one. If you need "when is
> everyone free?", that's a different tool.

## What makes it private & secure

- **No accounts.** The creator gets a secret *manage* link; everyone else gets a *view* link + QR.
- **No discovery.** Unguessable slugs and `noindex` — the only way to an event is its link.
- **Clients can't touch the database.** Row Level Security blocks all direct table access.
  Reads go through one narrow function (`get_event(slug)`) that never returns the manage
  token; writes happen server-side only.
- **Bot + abuse protection.** Cloudflare Turnstile and a per-IP rate limit on creation
  (the rate limiter stores only a salted hash of the IP, never the address).
- **Ephemeral.** Events delete themselves about 14 days after they happen.
- **No cookies**, only anonymous aggregate analytics.

Where to verify this yourself: the database rules live in [`supabase/migrations/`](./supabase/migrations),
the server endpoints in [`src/pages/api/`](./src/pages/api), and the plain-language version
is on the in-app `/legal` page.

## Stack

- **Astro** — site and server-rendered pages (per-event Open Graph meta for link previews).
- **Supabase** — Postgres + Row Level Security.
- **Leaflet + CartoDB tiles** — map.
- **Photon** — address search (OpenStreetMap, Canary-tuned).
- **Netlify** — hosting.
- **Cloudflare Turnstile** — bot check.

Full product spec and data model: [SPEC.md](./SPEC.md).

## Development

```bash
npm install
cp .env.example .env   # fill in Supabase + Turnstile keys
npm run dev
```

## Project layout

```
src/
  layouts/     Base HTML shell (dark/light, meta tags)
  pages/       Routes (ES at /, EN under /en); api/ = server endpoints
  components/   React islands (form, map picker, ...)
  lib/geo/     Photon geocoder + Canary island data
  i18n/        es / en strings
  styles/      global tokens
supabase/migrations/   database schema, RLS, and cleanup job
```

## Support

Free and open source (MIT). If it's useful, you can support the hosting:

- GitHub Sponsors: _TODO_
- Ko-fi: _TODO_

## License

[MIT](./LICENSE).
