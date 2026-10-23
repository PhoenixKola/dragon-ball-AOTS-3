import type { MapDef } from '../types/script';
import { MAPS_A } from './maps/mapsA';
import { MAPS_B } from './maps/mapsB';
import { MAPS_C } from './maps/mapsC';

export const MAP_LIST: MapDef[] = [...MAPS_A, ...MAPS_B, ...MAPS_C];
export const MAPS: Record<string, MapDef> = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));
export const MAP_IDS = MAP_LIST.map((m) => m.id);

/** destinations of the Capsule Flyer, in travel-menu order, with their unlock conditions */
export const TRAVEL_DESTINATIONS: { map: string; x: number; y: number; label: string; when: string; hint: string }[] = [
  { map: 'capsule_corp', x: 20, y: 17, label: 'Capsule Corporation', when: 'done:P02', hint: 'Home base.' },
  { map: 'south_city', x: 3, y: 15, label: 'South City', when: 'done:P02', hint: 'Shops and shelters.' },
  { map: 'rocky_outskirts', x: 3, y: 20, label: 'Rocky Outskirts', when: 'done:A01', hint: 'Canyon highway.' },
  { map: 'mountain_lab', x: 22, y: 25, label: 'Mountain Lab', when: 'done:A04', hint: 'Dr. Gero\'s hideout.' },
  { map: 'gingertown', x: 2, y: 16, label: 'Ginger Town', when: 'done:A08', hint: 'Where people vanished.' },
  { map: 'android_island', x: 3, y: 14, label: 'Island Highway', when: 'done:C03', hint: 'Coast road.' },
  { map: 'lookout', x: 16, y: 16, label: 'Kami\'s Lookout', when: 'done:C01', hint: 'Above the clouds.' },
  { map: 'cell_games_approach', x: 5, y: 13, label: 'Cell Games Approach', when: 'done:R02', hint: 'The road to the tournament.' },
];
