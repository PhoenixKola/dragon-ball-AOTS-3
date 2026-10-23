/** Contract between tools/build_art.py (generator) and the runtime (AssetRegistry). */
export type ArtQuality = 'genuine' | 'derived' | 'procedural_fallback';
export type Facing = 'left' | 'right' | 'front' | 'back';

export interface FrameRef {
  /** path relative to the site root, e.g. "assets/heroes/goku-base/battle/idle.png" */
  path: string;
  w: number;
  h: number;
  /** visible-pixel bounding box inside the PNG [x, y, w, h] */
  bbox: [number, number, number, number];
  /** feet anchor in PNG pixel coordinates (bottom-centre of visible pixels) */
  feet: [number, number];
  quality: ArtQuality;
  facing: Facing;
  /** non-transparent pixel count; must be > 0 */
  visible: number;
  note?: string;
}

export type BattleState = 'idle' | 'attack' | 'guard' | 'charge' | 'special' | 'hurt' | 'victory' | 'ko';
export type EnemyState = 'idle' | 'attack' | 'guard' | 'charge' | 'beam' | 'special' | 'hurt' | 'ko';
export type Direction = 'down' | 'left' | 'right' | 'up';

export interface ActorArt {
  id: string;
  kind: 'hero' | 'enemy' | 'npc';
  displayName: string;
  /** natural battle facing of the stored frames */
  facing: Facing;
  /** on-screen height in px at 720p battle for this actor */
  displayHeight: number;
  battle: Partial<Record<BattleState | EnemyState, FrameRef>>;
  overworld?: Partial<Record<Direction, { idle: FrameRef; walk: FrameRef[] }>>;
  portrait?: FrameRef;
  /** on-screen height in px on the overworld (default by kind: hero 54, npc 52, enemy 70) */
  owHeight?: number;
  approved: boolean;
  /** true when the whole actor is a labelled fallback/derived provisional */
  provisional: boolean;
  /** which fallback chain id was used (documented in MISSING_OR_PROVISIONAL_ART.md) */
  fallbackReason?: string;
  provenance: string;
}

export interface WorldArt {
  mapId: string;
  /** opaque battle backdrop(s) */
  backdrops: FrameRef[];
  /** tile textures (square, tileSize px) keyed by semantic class */
  tileSize: number;
  tiles: Partial<Record<'floor' | 'floor2' | 'path' | 'wall' | 'water' | 'edge', string>>;
  /** decorative props with footprint in tiles */
  props: Record<string, { path: string; w: number; h: number; footW: number; footH: number; solid: boolean }>;
  quality: ArtQuality;
  note: string;
}

export interface VfxArt {
  id: string;
  frames: FrameRef[];
  fps: number;
  loop: boolean;
  /** semantic family: beam, ball, slash, burst, aura, status, impact, absorb, teleport */
  family: string;
  quality: ArtQuality;
  note: string;
}

export interface ArtRegistry {
  version: 1;
  generatedAt: string;
  actors: Record<string, ActorArt>;
  worlds: Record<string, WorldArt>;
  vfx: Record<string, VfxArt>;
  skillIcons: Record<string, string>;
  itemIcons: Record<string, string>;
  uiFrames: Record<string, string>;
  /** compact UI glyphs: cmd-attack, cmd-skills, cmd-defend, cmd-items, cmd-combo, cmd-rage, cmd-sparking, cmd-form, cmd-flee, cmd-finisher, cursor-target, cursor-arrow, status-<StatusKind> ... */
  uiIcons?: Record<string, string>;
  /** world objects drawn on maps: chest-closed, chest-open, save, heal, shop (feet = ground contact, drawn bottom-anchored at the entity tile) */
  objects?: Record<string, FrameRef & { displayHeight: number }>;
  /** opaque full-screen title illustration, path relative to site root */
  title?: { path: string; w: number; h: number };
}
