# Tagor

**Announce one event. Share it as a link + QR. That's it.**

No accounts. No public list. No app to install. You create an event, get a private
link (and a QR), share it wherever you like, and anyone who opens it sees a clean,
minimal event page with the when, the where, and a map. Events auto-delete after
they're over. Fully open source.

> Tagor **announces a decision** - it doesn't help a group make one. If you need
> "when is everyone free?", that's a different tool. Tagor is for when the event
> already exists and you just want to share it, beautifully and privately.

## Principles

- **No accounts, ever.** The creator gets a secret *manage* link; everyone else gets a *view* link + QR.
- **No discovery.** Unguessable slugs, `noindex`. The only way to an event is its link.
- **Ephemeral.** Events auto-delete ~30 days after the event date.
- **Minimal + pretty.** One calm column, first-class dark/light modes.
- **Español primero**, English toggle.
- **Transparent by design.** Open source, no tracking - and we *show* it, not just say it.

## Stack

- **[Astro](https://astro.build)** - static-first, server-renders per-event Open Graph
  meta so shared links get proper previews. Interactive bits (map, create form) are React islands.
- **[Supabase](https://supabase.com)** - Postgres + Row Level Security. The whole "backend."
- **[Leaflet](https://leafletjs.com) + free CartoDB tiles** - the map.
- **[Photon](https://photon.komoot.io)** (open-source OSM geocoder) with Canary-Islands tuning - address search.
- **[Netlify](https://netlify.com)** - hosting.
- **[Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)** - privacy-friendly bot check.

See [SPEC.md](./SPEC.md) for the full product spec and data model.

## Status

🚧 In progress. Working: Supabase schema (locked-down RLS + get_event), the
event page reading real data with server-rendered OG meta, the create endpoint
(Turnstile + rate limit + insert), and the create form (fields, map picker with
address search, QR on success). Next: the manage page (edit/delete) and expiry
cleanup, then deploy.

## Development

```bash
npm install
cp .env.example .env   # fill in Supabase + Turnstile keys
npm run dev
```

## Project layout

```
src/
  layouts/        Base HTML shell (dark/light, meta tags)
  pages/          Astro routes (ES at /, EN under /en)
    index.astro       Landing
    nuevo.astro       Create an event
    e/[slug].astro    Event view (SSR - renders OG meta)
    m/[token].astro   Manage an event (secret link)
  components/      React islands (EventMap, ...)
  lib/geo/         Photon geocoder + Canary island data (salvaged)
  i18n/            es / en strings
  styles/          global tokens (light + dark)
```

## Salvaged from the original Tagor

Carried over (and cleaned) from the first version:

- `src/lib/geo/locationGeocoding.ts` - Photon geocoder + Canary tuning (bounds, multi-strategy queries, POI ranking).
- `src/lib/geo/islands.ts` - island/town centers and fallback resolution.
- `src/components/EventMap.tsx` - Leaflet preview + native maps deep-linking (Apple / Google / web).

## Support

Tagor is free and open source (MIT). If it's useful to you, you can support the hosting:

- GitHub Sponsors: _TODO_
- Ko-fi: _TODO_

## License

[MIT](./LICENSE) - do what you like, just keep the notice. Donations are welcome but never required.
