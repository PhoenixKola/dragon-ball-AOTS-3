import { useSyncExternalStore } from 'react';
import type { BattleAction, BattleEvent, FormId, GuardGrade, HeroId, StatusKind } from '../types';
import type { GameState } from '../systems/gameState';
import type { RewardSummary } from '../systems/progression';
import type { SlotInfo, SlotId } from '../systems/save';

/* ------------------------------------------------------------------ persisted settings (separate from saves) */
export interface Settings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  battleSpeed: 1 | 1.5 | 2;
  guardMode: 'standard' | 'relaxed' | 'assist';
  reducedMotion: boolean;
  screenShake: number;
  showTutorials: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  master: 0.8, music: 0.6, sfx: 0.8, muted: false, textSpeed: 'normal', battleSpeed: 1, guardMode: 'standard', reducedMotion: false, screenShake: 1, showTutorials: true,
};
export const SETTINGS_KEY = 'aots3.cell.settings.v1';

/* ------------------------------------------------------------------ view models */
export interface DialogueView {
  id: number;
  who: string;
  name: string;
  actor: string;
  color: string;
  text: string;
  mood?: string;
}
export interface ChoiceView {
  id: number;
  prompt: string;
  choices: string[];
}
export interface CardView {
  id: number;
  text: string;
  sub?: string;
}
export interface Toast {
  id: number;
  text: string;
}

export interface FighterView {
  uid: string;
  team: 'ally' | 'enemy';
  defId: string;
  name: string;
  actor: string;
  hp: number;
  maxHp: number;
  ki: number;
  maxKi: number;
  rage: number;
  level: number;
  form: FormId;
  statuses: { kind: StatusKind; turns: number; power: number }[];
  alive: boolean;
  sparking: number;
  charging: boolean;
  isHero: boolean;
  boss: boolean;
  guest: boolean;
  isProtectee: boolean;
}

export interface SkillOption {
  id: string;
  name: string;
  desc: string;
  ki: number;
  hpCost?: number;
  rageCost?: number;
  ok: boolean;
  reason?: string;
  /** 'enemy' | 'ally' | 'anyAlly' | 'none' */
  target: 'enemy' | 'ally' | 'anyAlly' | 'none';
  role: string;
  tradeoff: string;
  icon: string;
}
export interface ItemOption {
  id: string;
  name: string;
  desc: string;
  count: number;
  /** ally targets are always required */
  revive: boolean;
}
export interface ComboOption {
  id: string;
  name: string;
  desc: string;
  ok: boolean;
  reason?: string;
  target: 'enemy' | 'none';
  members: string[];
}
export interface FormOption {
  form: FormId | 'base';
  name: string;
  note: string;
  ok: boolean;
  reason?: string;
}

export interface Commands {
  actorUid: string;
  actorName: string;
  skills: SkillOption[];
  items: ItemOption[];
  combos: ComboOption[];
  forms: FormOption[];
  rage: { ok: boolean; reason?: string; name: string; desc: string; target: 'enemy' | 'none' };
  sparking: { ok: boolean; reason?: string };
  flee: { ok: boolean; reason?: string };
  finisher: { ok: boolean; reason?: string; visible: boolean };
  enemyTargets: string[];
  allyTargets: string[];
  deadAllyTargets: string[];
}

export interface GuardCue {
  /** unique id per hit */
  id: number;
  targetUid: string;
  attackerUid: string;
  label: string;
  /** engine-time ms (battle clock) */
  openAt: number;
  impactAt: number;
  closeAt: number;
  /** guard key slot (1..3) of the targeted hero */
  slot: number;
  hitIndex: number;
  hits: number;
}

export interface BattleView {
  stageId: string;
  stageName: string;
  kind: 'story' | 'side' | 'random' | 'sim';
  hint: string;
  mode: string;
  round: number;
  roundsGoal?: number;
  fighters: FighterView[];
  /** 'anim' = events are playing, 'input' = choose a command, 'guard' = guard cue open, 'ended' = result overlay */
  phase: 'anim' | 'input' | 'guard' | 'ended';
  currentUid: string | null;
  turnOrder: string[];
  log: string[];
  guard: GuardCue | null;
  commands: Commands | null;
  paused: boolean;
  banner: string | null;
  /** uid of the fighter the command cursor is on (BattleScene draws a marker over it) */
  targetHint?: string | null;
  tutorial: string | null;
  battleClock: number;
  outcome: null | { outcome: 'victory' | 'defeat' | 'fled'; reason: string };
}

export interface RewardView {
  stageName: string;
  summary: RewardSummary;
  kind: 'story' | 'side' | 'random' | 'sim';
  names: Record<string, string>;
}

export type Overlay = null | 'menu' | 'shop' | 'travel' | 'save' | 'help' | 'options' | 'confirm' | 'rewards' | 'defeat' | 'credits' | 'newgame';

export interface UISnapshot {
  version: number;
  screen: 'boot' | 'title' | 'world' | 'battle' | 'cutscene';
  overlay: Overlay;
  /** a script is running: world input is blocked and menus cannot open */
  scriptActive: boolean;
  dialogue: DialogueView | null;
  choice: ChoiceView | null;
  card: CardView | null;
  caption: string | null;
  toasts: Toast[];
  settings: Settings;
  battle: BattleView | null;
  rewards: RewardView | null;
  confirm: { title: string; body: string; yes: string; no: string } | null;
  shop: { shopId: string; name: string } | null;
  travel: { options: { map: string; label: string; hint: string }[] } | null;
  defeat: { stageName: string; canLoad: boolean } | null;
  hudMap: string;
  hudObjective: { text: string; where: string };
  hasSave: boolean;
  slots: SlotInfo[];
  /** latest game state (read-only for components; mutate only through Session actions) */
  game: GameState | null;
  assetsReady: boolean;
  /** a map/save is being loaded: the world HUD stays hidden behind a loading veil */
  loading: boolean;
  fullscreen: boolean;
  /** world prompt like "E: Talk" */
  prompt: string | null;
  note: string | null;
}

/** Everything the React UI may call. Implemented by app/session.ts. */
export interface SessionApi {
  /* lifecycle */
  newGame(difficulty: 'easy' | 'normal'): void;
  continueGame(): void;
  loadSlot(slot: SlotId): boolean;
  saveSlot(slot: SlotId): { ok: boolean; error?: string };
  deleteSlot(slot: SlotId): void;
  exportSlot(slot: SlotId): void;
  importFile(slot: SlotId, text: string): { ok: boolean; error?: string };
  toTitle(): void;
  refreshSlots(): void;
  /* overlays */
  openMenu(): void;
  closeOverlay(): void;
  openOverlay(o: Exclude<Overlay, null>): void;
  confirm(title: string, body: string, yes?: string, no?: string): Promise<boolean>;
  /** answer the open Confirm dialog (overlay === 'confirm') */
  resolveConfirm(v: boolean): void;
  /* dialogue */
  advanceDialogue(): void;
  skipDialogue(): void;
  chooseOption(i: number): void;
  /* settings */
  updateSettings(p: Partial<Settings>): void;
  toggleFullscreen(): void;
  /* menu actions (all validated against rules in systems/progression.ts) */
  setParty(heroes: HeroId[]): { ok: boolean; reason?: string };
  setLoadout(hero: HeroId, slot: number, skillId: string | null): { ok: boolean; reason?: string };
  equip(hero: HeroId, slot: number, itemId: string | null): { ok: boolean; reason?: string };
  train(hero: HeroId, stat: 'hp' | 'ki' | 'atk' | 'def' | 'spd'): { ok: boolean; reason?: string };
  refundTraining(hero: HeroId): number;
  useItem(itemId: string, hero: HeroId): { ok: boolean; reason?: string };
  buy(shopId: string, itemId: string, qty: number): { ok: boolean; reason?: string };
  sell(itemId: string, qty: number): { ok: boolean; reason?: string };
  closeShop(): void;
  chooseTravel(i: number | null): void;
  setDifficulty(d: 'easy' | 'normal'): void;
  /* rewards/defeat */
  dismissRewards(): void;
  defeatChoice(c: 'retry' | 'load'): void;
  /* battle */
  battleSubmit(action: BattleAction): { ok: boolean; reason?: string };
  /** a Guard key or button was pressed for the hero in this slot (1..3) */
  battleGuard(slot: number): void;
  battlePause(paused: boolean): void;
  dismissBattleTutorial(): void;
  skipBattleAnimations(): void;
  /** unlock audio + play a ui sound */
  ui(sound: 'move' | 'confirm' | 'cancel' | 'error'): void;
}

/* ------------------------------------------------------------------ tiny external store */
type Listener = () => void;
export class Store<T> {
  private listeners = new Set<Listener>();
  constructor(private snap: T) {}
  get = (): T => this.snap;
  set(next: T) {
    this.snap = next;
    this.listeners.forEach((l) => l());
  }
  patch(p: Partial<T>) {
    this.set({ ...this.snap, ...p });
  }
  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  };
}

export function emptySnapshot(): UISnapshot {
  return {
    version: 0, screen: 'boot', overlay: null, scriptActive: false, dialogue: null, choice: null, card: null, caption: null, toasts: [], settings: { ...DEFAULT_SETTINGS },
    battle: null, rewards: null, confirm: null, shop: null, travel: null, defeat: null, hudMap: '', hudObjective: { text: '', where: '' }, hasSave: false, slots: [], game: null,
    assetsReady: false, loading: false, fullscreen: false, prompt: null, note: null,
  };
}

export const uiStore = new Store<UISnapshot>(emptySnapshot());
export const useUI = (): UISnapshot => useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);

/** set by Session at startup so components can import a stable handle */
export let api: SessionApi = new Proxy({} as SessionApi, {
  get() {
    throw new Error('Session not initialised');
  },
});
export function bindApi(a: SessionApi) {
  api = a;
}

export type { BattleEvent, GuardGrade };
