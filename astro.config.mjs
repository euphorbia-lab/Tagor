// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  // Used for canonical + Open Graph URLs. Change to your real domain.
  site: 'https://tagor.app',
  // Server output so per-event pages can render correct Open Graph meta tags
  // in real HTML for social scrapers (WhatsApp / Instagram / Telegram).
  // Static pages opt out per-file with `export const prerender = true`.
  output: 'server',
  adapter: netlify(),
  integrations: [react()],
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      // ES lives at the root (/), EN lives under /en.
      prefixDefaultLocale: false,
    },
  },
});
