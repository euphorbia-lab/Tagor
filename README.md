<img width="150" height="87" alt="logo" src="https://github.com/user-attachments/assets/93f13231-d12a-42b4-bbb5-8e582806f152" />

[![CI](https://github.com/euphorbia-lab/Tagor/actions/workflows/ci.yml/badge.svg)](https://github.com/euphorbia-lab/Tagor/actions/workflows/ci.yml)

**Create an event. Share one link. That's it.**

No accounts, no public list, nothing to install. You make an event, you get a private link
and a QR, you share them wherever you like. Whoever opens the link sees a clean page with
the when, the where, a map and your photos. The event deletes itself two weeks after it
ends.

The event is encrypted in your browser before it is sent, and the key travels in the link
itself. The server stores something it cannot read.

> Tagor announces a decision: what event, when, where, details. It does not help a group make one. If you need
> "when is everyone free?" or a calendar with local events, that is a different tool.

<img width="200" height="500" alt="event-creation-tagor-2" src="https://github.com/user-attachments/assets/ea0d30a8-def6-4bb1-a0aa-b285a692884d" /> <img width="200" height="500" alt="event-created-1" src="https://github.com/user-attachments/assets/89835abc-3b25-4bed-a4bc-2cbeb8656e77" /> <img width="200" height="500" alt="event-created-functions" src="https://github.com/user-attachments/assets/65b9b992-f6d3-41b8-a08c-6732db88b46b" />


## Tagor stays away from

The event already exists by the time Tagor is involved. This is the what, the when and the
where.

So there is no RSVP, no "who's coming", no availability grid, no comments, no categories,
no ticketing, no recommendations, no admin panel and no feed. These are not missing
features waiting for a version 2. They are excluded on purpose, because each one turns a
page you glance at into a thing you have to keep checking. Requests to add them will
usually get a no, and that is the point.

## How the privacy works in Tagor.app

**The key never reaches the server.** When you create an event, your browser generates an
AES-GCM key, encrypts the title, place, description, coordinates and photos, and sends only
the ciphertext. The key is put in the part of the link after the `#`. Browsers never send
that part in a request, so it cannot appear in our logs, our database or our backups.

**What remains visible.** The start and end dates, the all-day flag, the language, the
slug, the manage token, and how many photos there are. The dates have to stay readable
because the job that deletes expired events needs to know when they expired. Everything a
reader would care about is not readable by us.

**What that costs.** Lose the link and the event is gone for good, including for us. Link
previews in chat apps show a generic card and the date, never the title, because the server
has nothing to put there. The event page needs JavaScript.

**Photos.** Encrypted with the same key. Before encryption the browser re-encodes each
photo through a canvas, which drops the metadata cameras attach, including GPS
coordinates. They are stored in a public bucket, which is fine: without the key the bytes
are noise.

**Everything else.** Unguessable slugs and `noindex`, so there is no discovery and no
public list. Row Level Security blocks all direct database access from clients; reads go
through one narrow function that never returns the manage token, and writes happen
server-side only. Cloudflare Turnstile plus a per-IP rate limit on creation, and the rate
limiter stores only a salted hash of the IP, never the address. No cookies, only anonymous
aggregate visit counts (Netlify). The Android app keeps a list of the events you created on
that phone, and that list never leaves it.

**Deletion is real deletion.** Deleting an event removes its photos through the Storage
API first, then hard-deletes the row. Expiry does the same on a daily job. Nothing is
marked hidden and left behind.

These claims can be verified in this repo: the crypto is about
sixty lines in [`src/lib/crypto.ts`](./src/lib/crypto.ts), the server endpoints are in
[`src/pages/api/`](./src/pages/api), the SQL that enforces the database rules is in
[`supabase/migrations/`](./supabase/migrations), and the cleanup job is in
[`supabase/functions/`](./supabase/functions). The plain-language version is on the in-app
`/legal` page.

## Stack

- **Astro** for the site and the server-rendered shells.
- **Supabase** for Postgres, Row Level Security, file storage and the scheduled cleanup.
- **Leaflet** with OpenStreetMap tiles for the map. Dark mode is a CSS filter, since there
  is no dark OSM style.
- **Photon** for address search.
- **Netlify** for hosting.
- **Cloudflare Turnstile** for the bot check.
- **Trusted Web Activity** for the optional Android app, which is the same site in a
  Chrome shell. See [ANDROID.md](./ANDROID.md).

## Development

```bash
npm install
cp .env.example .env   # fill in Supabase + Turnstile keys
npm run dev
```

## Project layout

```
src/
  lib/crypto.ts        encrypt and decrypt, key to and from the URL fragment
  lib/images.ts        resize, re-encode (drops EXIF), encrypt
  lib/event.ts         shared types; what the server validates vs the browser
  pages/               routes. ES at /, EN under /en
  pages/e/[slug]       the event page: a shell that decrypts in the browser
  pages/m/[token]      the manage page, reached only with the secret link
  pages/api/           create, update, delete, upload images
  components/          React islands: forms, map, gallery, share
  i18n/                strings for the home and create pages
supabase/
  migrations/          schema, RLS, and the scheduled purge
  functions/           the purge job, which deletes storage as well as rows
```

Three notes that are easy to trip over. Event and form strings live next to their components rather than in i18n/, because each island is self-contained and splitting them made it easy to miss one. The purge runs as a function rather than plain SQL because Supabase blocks direct deletion from storage tables, so a SQL-only job would delete rows and silently orphan every photo; it only runs when called with the PURGE_SECRET, which the cron job reads from Supabase Vault. And the language redirect from / to /en/ happens in the browser, not on the server, so the home pages stay static and the Spanish one stays indexed.

## Support

Made in the Canary Islands, for anywhere. Free and open source (MIT). Found a security problem? See [SECURITY.md](./SECURITY.md).


## License

[MIT](./LICENSE).
