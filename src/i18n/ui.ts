// Minimal i18n dictionary for Tagor. ES is the default; EN is the toggle.
// Grows as pages are built. Keep keys flat and obvious.

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'es';

export const ui = {
  es: {
    'site.tagline': 'Crea un evento. Comparte un enlace. Ya está.',
    'site.description':
      'Sin cuentas, sin listas públicas. Crea un evento, comparte el enlace o el QR, y se abre en una página limpia con mapa. Se borra solo cuando pasa.',
    'nav.create': 'Crear evento',
    'how.title': 'Cómo funciona',
    'how.1': 'Solo con enlace: nadie encuentra tu evento sin él.',
    'how.2': 'Sin cuentas y sin seguimiento.',
    'how.3': 'Se borra solo cuando el evento termina.',
    'how.4': 'Código abierto: puedes verlo entero.',
    'event.when': 'Cuándo',
    'event.where': 'Dónde',
    'event.details': 'Más detalles',
    'event.hostedBy': 'Organiza',
    'event.addToCalendar': 'Añadir al calendario',
    'event.directions': 'Cómo llegar',
    'event.moreInfo': 'Más información',
    'create.title': 'Crear un evento',
    'create.soon': 'El formulario de creación llega pronto.',
  },
  en: {
    'site.tagline': 'Make an event. Share one link. Done.',
    'site.description':
      'No accounts, no public lists. Create an event, share the link or QR, and it opens as a clean page with a map. It deletes itself once it is over.',
    'nav.create': 'Create event',
    'how.title': 'How it works',
    'how.1': 'Link-only: no one finds your event without it.',
    'how.2': 'No accounts, no tracking.',
    'how.3': 'Deletes itself once the event is over.',
    'how.4': 'Open source: you can read the whole thing.',
    'event.when': 'When',
    'event.where': 'Where',
    'event.details': 'More details',
    'event.hostedBy': 'Hosted by',
    'event.addToCalendar': 'Add to calendar',
    'event.directions': 'Get directions',
    'event.moreInfo': 'More info',
    'create.title': 'Create an event',
    'create.soon': 'The create form is coming soon.',
  },
} as const;

export function useTranslations(lang: Lang) {
  return function t(key: keyof (typeof ui)['es']): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}
