// Core shared types for AOTS3 Cell Saga. Everything persisted must be plain serializable data.

export type HeroId = 'goku' | 'gohan' | 'vegeta' | 'piccolo' | 'trunks' | 'krillin' | 'tien';
export const HERO_IDS: readonly HeroId[] = ['goku', 'gohan', 'vegeta', 'piccolo', 'trunks', 'krillin', 'tien'];
export type FormId = 'base' | 'ssj' | 'ssj2' | 'ascended' | 'ultra';
export type Element = 'phys' | 'ki';
export type Team = 'ally' | 'enemy';
export type GuardGrade = 'perfect' | 'good' | 'none';
export type Difficulty = 'easy' | 'normal';

export interface Stats {
  hp: number;
  ki: number;
  atk: number;
  def: number;
  spd: number;
}

export type StatusKind =
  | 'stun' | 'blind' | 'seal'
  | 'atkUp' | 'atkDown' | 'defUp' | 'defDown' | 'spdUp' | 'spdDown'
  | 'regen' | 'evade' | 'counter' | 'reflect' | 'cover' | 'heavyGuard' | 'barrier'
  | 'sparking' | 'mine' | 'marked' | 'endure' | 'focus' | 'accUp' | 'critUp'
  | 'multiform' | 'drain' | 'absorbLock' | 'adapted' | 'virus' | 'vulnerable' | 'storedBeam' | 'absorbing' | 'shielded' | 'exposed';

export interface StatusApply {
  kind: StatusKind;
  /** chance 0-1 (default 1) */
  chance?: number;
  turns: number;
  /** magnitude: fraction for buffs/debuffs, absorb amount for barrier, dmg mult for mine, evade charges etc. */
  power?: number;
}

export interface StatusInstance {
  kind: StatusKind;
  turns: number;
  power: number;
  /** actor uid that applied it (cover/absorbLock/mine) */
  source?: string;
  meta?: string;
  /** applied during the owner's own turn: skips the tick at the end of that same turn so the full duration is kept */
  fresh?: boolean;
}

export type TargetMode = 'enemy' | 'allEnemies' | 'randomEnemies' | 'ally' | 'allAllies' | 'self' | 'anyAlly';
export type SkillKind = 'attack' | 'support' | 'heal' | 'debuff' | 'stance' | 'special';
export type ClipId = 'melee' | 'blast' | 'beam' | 'barrage' | 'buff' | 'guard' | 'sword' | 'disc' | 'flare' | 'charge' | 'teleport' | 'heal' | 'special';

export interface SkillRequires {
  form?: FormId | FormId[];
  flag?: string;
  hpBelow?: number;
  /** blocked from the loadout & normal use; only a story scene may trigger it */
  storyOnly?: boolean;
}

export interface SkillDef {
  id: string;
  hero: HeroId | 'android16';
  name: string;
  desc: string;
  kind: SkillKind;
  target: TargetMode;
  element: Element;
  ki: number;
  /** fraction of max HP paid */
  hpCost?: number;
  rageCost?: number;
  /** per-hit damage multipliers */
  hits: number[];
  pierce?: number;
  acc?: number;
  crit?: number;
  /** damage fraction dealt to non-target enemies */
  splash?: number;
  lifesteal?: number;
  apply?: StatusApply[];
  self?: StatusApply[];
  /** heals as fraction of max HP */
  healPct?: number;
  kiRestore?: number;
  kiDrain?: number;
  chargeTurns?: number;
  /** can target KO'd allies (revive) */
  revive?: number;
  battleLimit?: number;
  unlock: number;
  requires?: SkillRequires;
  role: string;
  tradeoff: string;
  rageGain?: number;
  /** extra tags the engine interprets */
  tags?: string[];
  vfx: string;
  clip: ClipId;
  sfx: string;
}

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  color: string;
  role: string;
  hpBase: number; hpGrow: number;
  kiBase: number; kiGrow: number;
  atkBase: number; atkGrow: number;
  defBase: number; defGrow: number;
  spdBase: number; spdGrow: number;
  rageArt: { name: string; desc: string };
  defaultLoadout: string[];
}

export interface FormDef {
  id: FormId;
  name: string;
  atk: number; def: number; spd: number;
  acc: number;
  /** fraction of max ki consumed at the start of each own turn */
  upkeep: number;
  /** ki to enter */
  entryKi: number;
  note: string;
}

export interface EnemyMove {
  id: string;
  name: string;
  /** damage multipliers per hit against heroes */
  hits: number[];
  element: Element;
  target: 'one' | 'all' | 'lowestHp' | 'highestRage' | 'random' | 'lastAttacker' | 'highestKi';
  telegraph?: string;
  /** heavy moves announce for a turn first */
  charge?: number;
  apply?: StatusApply[];
  pierce?: number;
  special?: 'drain' | 'absorbGrab' | 'selfBarrier' | 'regen' | 'counterStance' | 'teleportStance' | 'copy' | 'summon' | 'absorbEnergyStance' | 'selfDestruct' | 'shieldRotate' | 'kiDrain' | 'protect' | 'rocket' | 'solarBeam';
  power?: number;
  weight?: number;
  /** only when this predicate string holds: 'hp<0.5' | 'round>2' | 'round%3' | 'alone' | 'ally>1' */
  when?: string;
  cooldown?: number;
  sfx?: string;
  vfx?: string;
}

export interface EnemyPhase {
  /** hp fraction at/below which the phase triggers (once) */
  at: number;
  /** transform into this enemy def (restores hpFrac of new max HP) */
  becomes?: string;
  hpFrac?: number;
  text: string;
  moves?: string[];
}

export interface EnemyDef {
  id: string;
  name: string;
  /** art actor id */
  actor: string;
  /** multipliers relative to an average hero of the stage's power level */
  hpx: number; atkx: number; defx: number; spdx: number;
  moves: EnemyMove[];
  /** absorbs element dmg as healing while the 'absorbing' status is up */
  absorbs?: 'ki';
  /** resist to status 0-1 */
  statusResist?: number;
  boss?: boolean;
  /** actions per round (default 1) */
  acts?: number;
  /** never runs out of Ki */
  unlimitedKi?: boolean;
  /** learns repeated tactics (-25% to a technique after the third use by the same hero) */
  adapts?: boolean;
  family: string;
  drops?: { item: string; chance: number }[];
  phases?: EnemyPhase[];
  /** limited self regen as fraction of max hp every N rounds */
  regen?: { pct: number; every: number };
  note?: string;
}

export type ObjectiveMode = 'win' | 'threshold' | 'survive' | 'finisher' | 'protect';

export interface StageDef {
  id: string;
  chapter: number;
  name: string;
  map: string;
  mode: ObjectiveMode;
  /** enemy spawn ids */
  enemies: string[];
  /** later waves spawn when previous wave is dead */
  waves?: string[][];
  /** enemy power level (an average hero of this level) */
  p: number;
  team: (HeroId | 'android16')[];
  /** level the guest/forced heroes are normalised to when not in story roster */
  threshold?: number;
  rounds?: number;
  noRewards?: boolean;
  canFlee?: boolean;
  backdrop: string;
  music: string;
  /** forced forms per hero for this battle */
  forms?: Partial<Record<HeroId, FormId>>;
  /** hero fighters start with these Ki/hp fractions rather than hub-recovered values */
  protect?: { name: string; hp: number; actor: string };
  /** bonus rounds-based finisher availability */
  finisherAfter?: number;
  result: { survived?: string; repelled?: string; timeBought?: string };
  /** flags set only on success */
  flags: string[];
  /** per-hero XP reward on success (story XP for noRewards stages) */
  xp: number;
  zeni: number;
  /** start enemy HP at this fraction */
  enemyHpFrac?: number;
  /** ordinary battles only */
  tutorial?: string;
  hint: string;
}

export type ItemKind = 'consumable' | 'accessory' | 'key';
export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  desc: string;
  price: number;
  sell: number;
  heal?: number;
  healPct?: number;
  ki?: number;
  kiPct?: number;
  revivePct?: number;
  cure?: StatusKind[];
  buff?: StatusApply;
  battle: boolean;
  field: boolean;
  /** accessory stat mods (fractions for pct) */
  mods?: Partial<{ atk: number; def: number; spd: number; hp: number; ki: number; rageGain: number; guardAssist: number; drainResist: number; crit: number }>;
  max: number;
}

export interface ComboDef {
  id: string;
  name: string;
  members: HeroId[];
  kiCost: number; // each
  hits: number[];
  element: Element;
  target: 'enemy' | 'allEnemies';
  unlockFlag?: string;
  unlockLevel: number;
  apply?: StatusApply[];
  desc: string;
  vfx: string;
}

/* ------------------------------------------------------------------ battle runtime */

export interface Fighter {
  uid: string;
  team: Team;
  /** hero id or enemy def id */
  defId: string;
  name: string;
  actor: string;
  isHero: boolean;
  level: number;
  hp: number; maxHp: number;
  ki: number; maxKi: number;
  rage: number;
  atk: number; def: number; spd: number;
  form: FormId;
  statuses: StatusInstance[];
  defending: boolean;
  sparkingTurns: number;
  /** skills in the 4 slots (heroes) */
  loadout: string[];
  /** queued charged skill */
  charging?: { skillId: string; targetUid?: string; turnsLeft: number };
  alive: boolean;
  guest?: boolean;
  boss?: boolean;
  noRewards?: boolean;
  phaseIdx: number;
  /** AI memory */
  cooldowns: Record<string, number>;
  used: Record<string, number>;
  lastAttackerUid?: string;
  actedThisRound: boolean;
  accuracyMod: number;
  isProtectee?: boolean;
  adaptCount: Record<string, number>;
  rageStreakDefend: number;
  rageMod: number;
  critMod: number;
  drainResist: number;
  /** power level the fighter was built at (enemy phase rebuilds) */
  p: number;
}

export type BattleEvent =
  | { t: 'log'; text: string }
  | { t: 'announce'; uid: string; text: string }
  | { t: 'telegraph'; uid: string; text: string; targetUid?: string }
  | { t: 'hit'; attacker: string; target: string; dmg: number; crit: boolean; hitIndex: number; hits: number; element: Element; guard: GuardGrade; vfx: string; miss?: boolean; absorbed?: boolean; countered?: boolean }
  | { t: 'miss'; attacker: string; target: string; reason: string }
  | { t: 'heal'; uid: string; amount: number }
  | { t: 'ki'; uid: string; amount: number }
  | { t: 'status'; uid: string; kind: StatusKind; on: boolean }
  | { t: 'ko'; uid: string }
  | { t: 'revive'; uid: string }
  | { t: 'rage'; uid: string; amount: number; why: string }
  | { t: 'form'; uid: string; form: FormId }
  | { t: 'phase'; uid: string; text: string; becomes?: string }
  | { t: 'turn'; uid: string }
  | { t: 'round'; round: number }
  | { t: 'clip'; uid: string; clip: ClipId; vfx: string; sfx: string; skillId?: string; targetUid?: string }
  | { t: 'snap'; uid: string; hp: number; maxHp: number; ki: number; maxKi: number; rage: number; alive: boolean; form: FormId; actor: string; name: string; sparking: number; charging: boolean }
  | { t: 'end'; outcome: 'victory' | 'defeat' | 'fled'; reason: string };

export type BattleAction =
  | { kind: 'attack'; targetUid: string }
  | { kind: 'skill'; skillId: string; targetUid?: string }
  | { kind: 'defend' }
  | { kind: 'item'; itemId: string; targetUid: string }
  | { kind: 'flee' }
  | { kind: 'rage'; targetUid?: string }
  | { kind: 'sparking' }
  | { kind: 'form'; form: FormId | 'base' }
  | { kind: 'combo'; comboId: string; targetUid?: string }
  | { kind: 'finisher' };

export interface PendingHit {
  attackerUid: string;
  targetUid: string;
  hitIndex: number;
  hits: number;
  label: string;
  /** whether this impact can be guarded at all */
  guardable: boolean;
}

export type BattlePhase = 'input' | 'guard' | 'ended';
