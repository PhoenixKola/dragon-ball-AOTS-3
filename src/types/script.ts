import type { FormId, HeroId } from './index';

/** Declarative story script steps, executed by systems/storyRuntime.ts against a ScriptHost. */
export type Step =
  | { t: 'say'; who: string; text: string; mood?: string }
  | { t: 'card'; text: string; sub?: string }
  | { t: 'set'; flag: string }
  | { t: 'clear'; flag: string }
  | { t: 'give'; item: string; n?: number }
  | { t: 'take'; item: string; n?: number }
  | { t: 'zeni'; n: number }
  | { t: 'xp'; n: number; heroes?: HeroId[] }
  | { t: 'join'; hero: HeroId }
  | { t: 'leave'; hero: HeroId }
  | { t: 'warp'; map: string; x: number; y: number; facing?: 'up' | 'down' | 'left' | 'right' }
  | { t: 'cutscene'; id: string }
  | { t: 'if'; cond: string; then: Step[]; else?: Step[] }
  | { t: 'quest'; id: string; op: 'start' | 'progress' | 'complete'; key?: string; n?: number }
  | { t: 'heal'; full?: boolean }
  | { t: 'music'; key: string }
  | { t: 'ask'; prompt: string; choices: { label: string; steps: Step[] }[] }
  | { t: 'once'; id: string; steps: Step[] }
  | { t: 'battle'; stage: string }
  | { t: 'learn'; hero: HeroId; note: string }
  | { t: 'hide'; entity: string }
  | { t: 'sfx'; key: string }
  | { t: 'autosave' };

export interface CutActor {
  id: string;
  actor: string;
  /** 0..1 stage coordinates */
  x: number;
  y: number;
  facing?: 'left' | 'right';
  scale?: number;
  state?: string;
}

export type CutStep =
  | { t: 'show'; id: string; actor: string; x: number; y: number; facing?: 'left' | 'right'; scale?: number; state?: string }
  | { t: 'hide'; id: string }
  | { t: 'move'; id: string; x: number; y: number; ms: number }
  | { t: 'pose'; id: string; state: string }
  | { t: 'form'; id: string; actor: string }
  | { t: 'say'; who: string; text: string }
  | { t: 'vfx'; vfx: string; x: number; y: number; scale?: number; ms?: number; facing?: 'left' | 'right' }
  | { t: 'flash'; color?: string; ms?: number }
  | { t: 'shake'; ms?: number; amount?: number }
  | { t: 'fade'; to: 'black' | 'clear'; ms?: number }
  | { t: 'wait'; ms: number }
  | { t: 'sfx'; key: string }
  | { t: 'music'; key: string }
  | { t: 'card'; text: string; sub?: string }
  | { t: 'backdrop'; map: string }
  | { t: 'caption'; text: string };

export interface CutsceneDef {
  id: string;
  title: string;
  backdrop: string;
  music: string;
  steps: CutStep[];
  /** true if the painted art for this sequence is missing (placeholder choreography) */
  provisionalArt: boolean;
}

export type Cond = string;

export type EntityBase = { id: string; x: number; y: number; when?: Cond };
export interface NpcEntity extends EntityBase {
  kind: 'npc';
  name: string;
  /** actor art id (npc or hero or enemy) */
  actor: string;
  facing?: 'up' | 'down' | 'left' | 'right';
  /** script run on interact */
  script?: Step[];
  /** triggers the mandatory story beat with this id when interacted */
  story?: string;
  wander?: number;
  marker?: boolean;
}
export interface FoeEntity extends EntityBase {
  kind: 'foe';
  name: string;
  actor: string;
  story?: string;
  /** non-story optional foe: runs this fight id and then script */
  fight?: { stage: string };
  script?: Step[];
  patrol?: { dx: number; dy: number };
  /** radius (px) at which the foe notices the player and starts the fight */
  aggro?: number;
}
export interface ExitEntity extends EntityBase {
  kind: 'exit';
  w: number;
  h: number;
  to: { map: string; x: number; y: number; facing?: 'up' | 'down' | 'left' | 'right' };
  lockedText?: string;
  /** exit is active only when this condition holds */
  requires?: Cond;
}
export interface ChestEntity extends EntityBase {
  kind: 'chest';
  item?: string;
  n?: number;
  zeni?: number;
  script?: Step[];
}
export interface ZoneEntity extends EntityBase {
  kind: 'zone';
  w: number;
  h: number;
  story?: string;
  script?: Step[];
  once?: boolean;
  /** player must press interact inside the zone instead of auto-triggering */
  manual?: boolean;
}
export interface PointEntity extends EntityBase {
  kind: 'save' | 'heal' | 'travel' | 'sign' | 'shop' | 'lever' | 'door' | 'terminal' | 'pickup';
  text?: string;
  shop?: string;
  item?: string;
  n?: number;
  script?: Step[];
  /** tiles blocked while the condition `closedWhen` holds (doors) */
  w?: number;
  h?: number;
  closedWhen?: Cond;
  label?: string;
}
export type Entity = NpcEntity | FoeEntity | ExitEntity | ChestEntity | ZoneEntity | PointEntity;

export interface MapProp {
  prop: string;
  /** footprint top-left in tiles */
  x: number;
  y: number;
  /** footprint size in tiles */
  fw: number;
  fh: number;
  solid: boolean;
}

export interface MapDef {
  id: string;
  name: string;
  width: number;
  height: number;
  /** rows of tile classes: . floor, , floor2, = path, # wall(solid), ~ water(solid), : edge */
  tiles: string[];
  props: MapProp[];
  entities: Entity[];
  spawn: { x: number; y: number };
  music: string;
  encounters?: string;
  encounterRate?: number;
  weather?: 'none' | 'rain' | 'ash' | 'dust' | 'mist';
  light?: string;
  region: string;
}

export type { FormId };
