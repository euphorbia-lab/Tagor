// Self-contained Canary Islands geo data for Tagor.
// Salvaged/consolidated from the original Tagor app (constants.ts + islandCenters.ts).

export const ISLANDS = [
  'Gran Canaria',
  'Tenerife',
  'Fuerteventura',
  'Lanzarote',
  'La Palma',
  'La Gomera',
  'El Hierro',
] as const;

export type Island = (typeof ISLANDS)[number];

/** Bounding box for the Canary Islands, used to filter Photon geocoder results. */
export const CANARY_BOUNDS = {
  minLat: 27.5,
  maxLat: 29.5,
  minLng: -18.5,
  maxLng: -13.0,
};

/** Geographic center of each island - fallback when no precise geocode is available. */
export const ISLAND_CENTERS: Record<Island, [number, number]> = {
  'Gran Canaria': [28.1235, -15.4363],
  Tenerife: [28.4636, -16.2518],
  Fuerteventura: [28.3587, -14.0537],
  Lanzarote: [28.963, -13.5477],
  'La Palma': [28.6835, -17.7642],
  'La Gomera': [28.0916, -17.1133],
  'El Hierro': [27.8063, -17.9158],
};

/** Approximate centers for major towns - more precise than island centers. */
export const TOWN_CENTERS: Record<string, [number, number]> = {
  // Gran Canaria
  'Las Palmas de Gran Canaria': [28.1235, -15.4363],
  Telde: [27.9944, -15.4189],
  'Santa Lucía de Tirajana': [27.9117, -15.5403],
  'San Bartolomé de Tirajana': [27.9255, -15.573],
  Arucas: [28.1199, -15.5232],
  Agüimes: [27.9044, -15.4455],
  Ingenio: [27.9167, -15.4333],
  Gáldar: [28.1456, -15.65],
  Mogán: [27.8864, -15.7242],
  Maspalomas: [27.7606, -15.5863],
  Vecindario: [27.8405, -15.4378],
  Teror: [28.0594, -15.5489],
  Valsequillo: [27.9833, -15.5],
  Firgas: [28.1078, -15.5556],
  Moya: [28.1072, -15.5833],
  Tejeda: [27.9939, -15.6136],
  'San Mateo': [28.0167, -15.5333],
  Valleseco: [28.05, -15.5833],
  Agaete: [28.1, -15.7],
  Artenara: [28.0225, -15.6461],
  'San Nicolás': [27.9833, -15.7833],

  // Tenerife
  'Santa Cruz de Tenerife': [28.4636, -16.2518],
  'San Cristóbal de La Laguna': [28.4853, -16.3167],
  Arona: [28.0994, -16.6808],
  Adeje: [28.1225, -16.7261],
  'La Orotava': [28.3906, -16.5231],
  'Granadilla de Abona': [28.1181, -16.5753],
  'Los Realejos': [28.3706, -16.5892],
  'Puerto de la Cruz': [28.4136, -16.545],
  Tacoronte: [28.4761, -16.4106],
  Candelaria: [28.3544, -16.3722],
  Güímar: [28.3117, -16.4108],
  'Icod de los Vinos': [28.3689, -16.7172],
  'El Rosario': [28.4333, -16.3],
  'San Miguel de Abona': [28.0967, -16.6156],
  'Santiago del Teide': [28.2944, -16.8117],
  'Los Silos': [28.3747, -16.8158],
  'Buenavista del Norte': [28.3753, -16.8608],
  Garachico: [28.3722, -16.7639],
  Vilaflor: [28.1581, -16.6364],

  // Fuerteventura
  'Puerto del Rosario': [28.5, -13.8631],
  'La Oliva': [28.6097, -13.9278],
  Corralejo: [28.7306, -13.8672],
  Pájara: [28.35, -14.1069],
  Tuineje: [28.3264, -14.0475],
  Antigua: [28.4178, -14.0136],
  Betancuria: [28.425, -14.0558],
  'Gran Tarajal': [28.2139, -14.0197],
  'Morro Jable': [28.0506, -14.3517],
  'Caleta de Fuste': [28.3947, -13.8647],

  // Lanzarote
  Arrecife: [28.963, -13.5477],
  Teguise: [29.0575, -13.5614],
  'San Bartolomé': [28.9833, -13.6167],
  Tías: [28.95, -13.65],
  Yaiza: [28.9564, -13.7642],
  Tinajo: [29.0667, -13.6833],
  Haría: [29.1453, -13.4983],
  'Costa Teguise': [28.9986, -13.4989],
  'Puerto del Carmen': [28.9222, -13.6639],
  'Playa Blanca': [28.8606, -13.8278],

  // La Palma
  'Santa Cruz de La Palma': [28.6835, -17.7642],
  'Los Llanos de Aridane': [28.6583, -17.9167],
  'El Paso': [28.65, -17.8833],
  'Breña Alta': [28.65, -17.7833],
  'Breña Baja': [28.6333, -17.7667],
  'Villa de Mazo': [28.6, -17.7833],
  Fuencaliente: [28.4833, -17.8333],
  Tazacorte: [28.6333, -17.95],
  Tijarafe: [28.6833, -17.95],

  // La Gomera
  'San Sebastián de La Gomera': [28.0916, -17.1133],
  'Valle Gran Rey': [28.0917, -17.3333],
  Vallehermoso: [28.1833, -17.2667],
  Hermigua: [28.1667, -17.1833],
  Agulo: [28.1833, -17.1833],
  Alajeró: [28.0667, -17.2333],

  // El Hierro
  Valverde: [27.8063, -17.9158],
  Frontera: [27.75, -18.0],
  'El Pinar': [27.7, -17.9833],
  'La Restinga': [27.6417, -17.9833],
};

/**
 * Resolve coordinates for a location with a fallback chain:
 * exact town → partial town match → island center → Canary Islands center.
 */
export function getLocationCoordinates(island: string, town: string): [number, number] {
  if (TOWN_CENTERS[town]) return TOWN_CENTERS[town];

  const townLower = town.toLowerCase();
  for (const [key, coords] of Object.entries(TOWN_CENTERS)) {
    if (key.toLowerCase().includes(townLower) || townLower.includes(key.toLowerCase())) {
      return coords;
    }
  }

  if (ISLAND_CENTERS[island as Island]) return ISLAND_CENTERS[island as Island];

  return [28.3, -15.8];
}
