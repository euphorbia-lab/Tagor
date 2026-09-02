// Strings for the marketing pages (home, create page title). ES is the
// default; EN is the toggle.
//
// Event, manage and form strings deliberately live next to their components
// instead of here: each is a self-contained React island with its own es/en
// pair, and splitting them across two places made it easy to miss one.

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'es';

export const ui = {
  es: {
    'site.tagline': 'Crea un evento. Comparte un enlace. Ya está.',
    // Also used as the meta description and in the structured data, so it is
    // kept under ~160 characters to survive in search results.
    'site.description':
      'Sin cuentas ni listas públicas. El evento se cifra en tu navegador, comparte el enlace o el QR, y se borra solo cuando pasa.',
    'nav.create': 'Crear evento',
    'how.1': 'Nadie encuentra tu evento sin el enlace.',
    'how.2': 'Se cifra en tu navegador: ni nosotros podemos leerlo.',
    'how.3': 'Sin cuentas, sin cookies, sin trackeo.',
    'how.4': 'Hasta 3 fotos, sin los datos de ubicación de la cámara.',
    'how.5': 'Se borra solo, unos 14 días después del evento.',
    'create.title': 'Crear un evento',
  },
  en: {
    'site.tagline': 'Make an event. Share one link. Done.',
    'site.description':
      'No accounts, no public lists. Your event is encrypted in your browser, share the link or the QR, and it deletes itself once it is over.',
    'nav.create': 'Create event',
    'how.1': 'No one finds your event without the link.',
    'how.2': 'Encrypted in your browser, so not even we can read it.',
    'how.3': 'No accounts, no cookies, no tracking.',
    'how.4': 'Up to 3 photos, with the camera location data stripped out.',
    'how.5': 'Deletes itself about 14 days after the event.',
    'create.title': 'Create an event',
  },
} as const;

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)['es']): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
