export type MusicKey =
  | 'title' | 'hub' | 'tension' | 'mystery' | 'androidBoss' | 'training' | 'cellGames' | 'perfectCell'
  | 'awakening' | 'finalBeam' | 'victory' | 'credits' | 'battle' | 'bossBattle' | 'sacrifice' | 'lab'
  | 'island' | 'lookout' | 'chamber' | 'city' | 'wasteland' | 'epilogue';

export type SfxKey =
  | 'ui-move' | 'ui-confirm' | 'ui-cancel' | 'ui-error' | 'step' | 'chest' | 'heal' | 'levelup'
  | 'guard-perfect' | 'guard-good' | 'guard-miss' | 'hit-melee' | 'hit-energy' | 'hit-crit' | 'beam'
  | 'absorb' | 'charge' | 'transform' | 'hurt' | 'ko' | 'boss-in' | 'item' | 'flee' | 'quest' | 'save'
  | 'door' | 'teleport' | 'explosion' | 'victory' | 'defeat' | 'lightning' | 'telegraph' | 'cell-hiss'
  | 'dialogue-blip' | 'sparking' | 'rage-ready';

export const MUSIC_KEYS: readonly MusicKey[] = [
  'title', 'hub', 'tension', 'mystery', 'androidBoss', 'training', 'cellGames', 'perfectCell', 'awakening',
  'finalBeam', 'victory', 'credits', 'battle', 'bossBattle', 'sacrifice', 'lab', 'island', 'lookout',
  'chamber', 'city', 'wasteland', 'epilogue',
];

export const SFX_KEYS: readonly SfxKey[] = [
  'ui-move', 'ui-confirm', 'ui-cancel', 'ui-error', 'step', 'chest', 'heal', 'levelup', 'guard-perfect',
  'guard-good', 'guard-miss', 'hit-melee', 'hit-energy', 'hit-crit', 'beam', 'absorb', 'charge', 'transform',
  'hurt', 'ko', 'boss-in', 'item', 'flee', 'quest', 'save', 'door', 'teleport', 'explosion', 'victory',
  'defeat', 'lightning', 'telegraph', 'cell-hiss', 'dialogue-blip', 'sparking', 'rage-ready',
];

export interface AudioSettings { master: number; music: number; sfx: number; muted: boolean }

export type MusicVoice = 'pad' | 'bass' | 'lead' | 'arp' | 'kick' | 'snare' | 'hat' | 'tom' | 'crash';
export interface NoteEvent { t: number; d: number; f: number; v: MusicVoice; g: number }
export interface TrackDef {
  key: MusicKey;
  bpm: number;
  bars: number;
  /** loop length in seconds */
  seconds: number;
  loop: boolean;
  events: NoteEvent[];
  mood: string;
}

export type SfxLayer =
  | { kind: 'tone'; wave: OscillatorType; f0: number; f1: number; dur: number; gain: number; delay?: number; detune?: number; attack?: number; lp?: number }
  | { kind: 'noise'; filter: BiquadFilterType; f0: number; f1: number; q?: number; dur: number; gain: number; delay?: number; attack?: number };
export interface SfxDef { gain: number; layers: SfxLayer[] }
