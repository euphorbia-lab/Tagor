# Tagor 2.0 - Spec

> A dead-simple way to announce **one event** and share it as a link + QR.
> No accounts. No public list. Link-only. Auto-deletes. Open source.

## Positioning

Tagor **announces a decision**; it does not help a group make one.

- **any1.free** asks a *question* - "when is everyone free?" (availability poll, "who's coming", "what's the plan"). Nothing is decided yet.
- **Tagor** gives the *answer* - the event already exists: this is the what, when, and where. Come.

Every collaborative/scheduling feature (RSVP, availability, "who's coming", "what's the plan") is **off-concept** and deliberately excluded. This keeps the page inherently calmer and simpler than a coordination tool.

Borrowed from any1.free: minimalism, excellent dark/light modes, the **What / Where / When** triad as the page spine, clean date treatment, map under Where/When.

Our edge: **transparency as a feature.** Because we're open source and accountless, privacy is *shown*, not just claimed - a plain "How this works" line (link-only, no tracking, auto-deletes, here's the code).

## Core principles

1. **No accounts, ever.** Creator gets a secret *manage* link; the public gets a *view* link + QR.
2. **No public list / no discovery.** Unguessable slugs, `noindex`. You can only reach an event if you have its link.
3. **Ephemeral.** Events auto-delete ~30 days after the event date (event date + grace, not creation date).
4. **Minimal + pretty.** One clean column, lots of whitespace, first-class dark/light.
5. **ES first, EN toggle.**
6. **Open source, MIT**, with a tasteful "support hosting" (donations) link. License and donations are independent.

## Event model (fields)

| Field | Required | Notes |
|---|---|---|
| **Title** | ✅ | The "What." Hero of the page. |
| **Start date & time** | ✅ | The "When." All-day toggle; optional end. |
| **End date & time** | optional | |
| **Location (free text)** | ✅ | The "Where." Always free text. "Pico del Cuervo" (a nickname) is valid - no address required. |
| **Map** | optional | Off by default. If enabled, creator **explicitly** picks: **precise point** *or* **approximate area**. Nobody is pushed to publish an exact address. |
| **Description** | optional | Free text. Collapsible "more details." Price, if any, lives here. |
| **Hosted by** | optional | Free-text host/organizer line (e.g. "La Cueva Collective"). Humanizes the invite. |
| **External link** | optional | One generic "more info"/tickets/group-chat URL. Not a ticketing system. |
| **Cover image** | ❌ (v1) | No uploads in v1, and no decorative header graphic. The page opens plain: the title sits clean on the background. Uploads may come later. |

**Explicitly dropped:** categories, structured price types, RSVP / who's coming, availability grid, bookmarks, reports, admin, recommended events, ticketing.

## Event page layout (one column)

1. **Title** (big, plain, no decorative header)
2. **When** - date & time, prominent
3. **Where** - location text; optional map (precise point or area) using the salvaged map component. A full-width maps button sits under the map in both modes: "Cómo llegar" (directions) for a precise point, "Abrir en el mapa" (open in maps app) for an area.
4. **Description** - collapsible
5. **Hosted by** (if set)
6. Actions: **Add to calendar** · **More info** (if link set)
8. Footer: minimal "How this works" transparency line + link to repo

## Architecture

- **Front end:** fresh, lightweight static site (framework TBD - Astro or plain Vite). Hosted on **Netlify** (user has paid plan).
- **Backend:** **Supabase** (Postgres + RLS). Static page → `supabase-js` → DB locked by row-level security.
- **OG meta:** a **serverless function** (Netlify Function or Supabase Edge Function) renders per-event Open Graph tags as real HTML for social scrapers. **Non-negotiable** - client-side OG tags (the old app's mistake) produce blank previews when links are pasted into WhatsApp/IG/Telegram, which defeats the whole product.
- **Geocoding:** **Photon** (`photon.komoot.io`, open-source OSM) with the Canary tuning carried over from the old `locationGeocoding.ts`.
- **Maps:** **Leaflet + free CartoDB tiles**, carried over from the old `EventLocationMap.tsx`.

## Security / anti-abuse (accountless)

1. **Row Level Security** - anon may INSERT an event and SELECT exactly one event by its secret slug; never list/dump the table; never read the manage token. Foundation.
2. **Unguessable slugs** - 16+ random chars for both view and manage URLs. No sequential IDs.
3. **Cloudflare Turnstile** on create - privacy-friendly bot check; biggest anti-spam lever for an accountless form.
4. **Rate limiting** - cap creates per IP/hour via edge function.
5. **Hard input validation** - max field lengths, max payload size, server-side date/coord checks.
6. **Auto-expiry** - self-clears junk; limits blast radius.

## Salvaged from the old repo (do not rebuild)

- `src/lib/locationGeocoding.ts` - Photon geocoder + Canary tuning (bounds, multi-strategy queries, POI ranking, island resolution).
- `src/components/events/EventLocationMap.tsx` - Leaflet map + native maps deep-linking (Apple/Google/web).
- Add-to-calendar URL builder + native share logic (from old `EventDetail.tsx`).
- `src/i18n/` - i18next es/en setup.
- `date-fns` locale-aware formatting.

## Open decisions (not yet locked)

- Static framework: **Astro** vs **plain Vite**.
- OG function host: **Netlify Function** vs **Supabase Edge Function**.
- Manage-link security: secret link only vs secret link **+ optional PIN**.
- Donations channel: GitHub Sponsors / Ko-fi / Buy Me a Coffee.
- Exact expiry window + grace period.
- Repo name / license headers.
