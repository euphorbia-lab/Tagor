# Tagor for Android

Tagor ships to Play as a Trusted Web Activity (TWA) via
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) — Chrome, chromeless, opening
`tagor.app` with a real Android App Links entry (`tagor.app/e/…` links open the app instead
of a browser tab). It is not a rewrite: the site itself is the app, so any change deployed
to Netlify is live in the Android app too. Nothing in this repo is a fork of app logic.

Package name: **`tagor.app.euphorbia`** — permanent, already registered in Play Console.

## What's already in the repo

- [`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json) — Digital Asset
  Links file. The `sha256_cert_fingerprints` entry is a placeholder until step 4 below.
- [`public/sw.js`](public/sw.js) — a deliberately minimal service worker: caches only the
  static shell (icons, manifest, an offline page), and explicitly passes through
  `/api/*`, `/e/*`, `/m/*` and `/nuevo` untouched. It exists purely so Chrome considers the
  site installable and so a dropped connection shows a branded page instead of Chrome's
  default error screen — not for offline use of event pages.
- [`public/site.webmanifest`](public/site.webmanifest) — added `id`, `scope`, `orientation`,
  and a "Crear evento" shortcut.
- [`src/layouts/BaseLayout.astro`](src/layouts/BaseLayout.astro) — registers the service
  worker, production builds only.
- [`android/twa-manifest.json`](android/twa-manifest.json) — the Bubblewrap config: package
  id, colors, icons, the signing key path/alias. This is the source of truth for the Android
  project; everything Bubblewrap generates from it is gitignored (regenerable, and the
  signing key must never be committed).

## What you run locally

Bubblewrap needs Java (JDK 17) and will offer to download the Android SDK on first run —
that part is interactive no matter what.

### 1. Generate the upload keystore (once, if you haven't already)

```bash
cd android
keytool -genkeypair -v -keystore tagor-upload.keystore -alias tagor -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a keystore password and your name/org. **Save both the file and the password in
a password manager.** Losing this keystore before Play has recorded your app-signing key
means you can never update the app again under this package name.

### 2. Initialize the Bubblewrap project

```bash
npm run android:init
```

This prompts through each field, pre-filled from `https://tagor.app/site.webmanifest`.
Where a prompt doesn't match [`android/twa-manifest.json`](android/twa-manifest.json)
(package id, colors, icon URLs, the shortcut), paste in the value from that file instead of
accepting the manifest-derived default — it's the one that's actually been reviewed. When it
asks for a signing key, point it at `tagor-upload.keystore` / alias `tagor` from step 1.

### 3. Build the signed release

```bash
npm run android:build
```

Produces `android/app-release-signed.apk` (for local install/testing) and
`android/app-release-bundle.aab` (what you upload to Play).

### 4. Upload to Play Console → get the real fingerprint

1. Play Console → your app → Testing → Internal testing → Create release → upload the
   `.aab`.
2. After the first successful upload: Setup → App integrity (or Release → Setup → App
   signing) → copy the **SHA-256 certificate fingerprint** shown there. That's Google's
   re-signing key (Play App Signing), not your upload key — it's the one `assetlinks.json`
   needs.
3. Paste that fingerprint into
   [`public/.well-known/assetlinks.json`](public/.well-known/assetlinks.json), replacing the
   placeholder. Commit and push — it goes live with the next Netlify deploy.
4. Verify it: https://developers.google.com/digital-asset-links/tools/generator — enter
   `tagor.app` and package `tagor.app.euphorbia`, confirm it matches.

### 5. Test on a device

Add testers' emails under the Internal testing track, share the opt-in link, install from
there (not the raw APK — that path skips the Play App Signing key, so App Links
verification will fail). Confirm:

- Opening a `tagor.app/e/…` link (e.g. from a chat app) opens Tagor directly, no browser
  chrome, no address bar.
- The link's `#`-fragment (the decryption key) survives into the app and the event decrypts
  — this is the one thing worth checking carefully, since a dropped fragment would make
  every shared link unreadable.
- Share sheet from an event page opens the real Android share sheet.
- "Download QR" on an event page actually saves the image.
- Killing network mid-navigation shows `offline.html`, not a raw Chrome error.

### Later updates

Bump `appVersionCode` (and `appVersionName`) in `android/twa-manifest.json`, then
`npm run android:build` again and upload the new `.aab`. The web app itself needs no
rebuild step here — it's already live.
