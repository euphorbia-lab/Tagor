# Android

Tagor ships to Android as a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity/)
(TWA) built with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap): Chrome, chromeless,
opening tagor.app directly, with real
[Android App Links](https://developer.android.com/training/app-links) so a `tagor.app/e/…` link
opens the app instead of a browser tab.

This is not a rewrite. The web app is the app — nothing here forks any logic, and anything
deployed to Netlify is live in the Android build too.

## What's here

- [`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json) — the
  [Digital Asset Links](https://developers.google.com/digital-asset-links) file that lets Android
  verify this domain owns the app, which is what enables App Links. It has to be served publicly
  for that to work.
- [`public/sw.js`](public/sw.js) — a deliberately minimal service worker, used only so Chrome
  considers the site installable and so a dropped connection shows a branded page instead of the
  default browser error. It never caches `/api/`, `/e/`, `/m/` or `/nuevo` — those always hit the
  network live, same as on the web.
- [`android/twa-manifest.json`](android/twa-manifest.json) — the Bubblewrap build configuration:
  package id, colors, icons.

The generated Android project (Gradle files) and the signing key aren't committed — both are
build output, regenerable from `twa-manifest.json`, and the signing key in particular must never
be in version control.
