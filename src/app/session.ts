import Phaser from 'phaser';
import { CUTSCENES } from '../data/cutscenes';
import { HEROES } from '../data/heroes';
import { MAPS } from '../data/maps';
import { speakerOf } from '../data/speakers';
import { Battle, type BattleSetup } from '../engine/combat/engine';
import { BattleDirector, type DirectorHost } from '../engine/combat/director';
import { audio } from '../engine/audio';
import { heroActorId } from '../engine/assets';
import { BattleScene } from '../engine/scenes/BattleScene';
import { CutsceneScene } from '../engine/scenes/CutsceneScene';
import { WorldScene } from '../engine/scenes/WorldScene';
import { WorldSim, type WorldEvent } from '../engine/world/sim';
import { chooseAction } from '../engine/combat/policy';
import { dirTo, nextGoal, standPoint } from '../engine/world/navigator';
import type { GameState } from '../systems/gameState';
import { newGameState, validateParty } from '../systems/gameState';
import { input } from '../systems/input';
import * as P from '../systems/progression';
import { SaveManager, type SlotId, type StorageLike } from '../systems/save';
import type { BattleAction, HeroId, StageDef } from '../types';
import { GameController, type BattleKind, type ControllerHost } from './controller';
import {
  DEFAULT_SETTINGS, SETTINGS_KEY, bindApi, uiStore, type BattleView, type Overlay, type SessionApi, type Settings, type UISnapshot,
} from './store';

function safeStorage(): StorageLike {
  try {
    const s = window.localStorage;
    const k = '__aots3_probe';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  }
}

let toastId = 1;
let dlgId = 1;

export class Session implements SessionApi, ControllerHost {
  game!: Phaser.Game;
  state: GameState | null = null;
  sim: WorldSim | null = null;
  controller: GameController | null = null;
  saves: SaveManager;
  private store: StorageLike;
  private world!: WorldScene;
  private dialogueResolve: (() => void) | null = null;
  private choiceResolve: ((i: number) => void) | null = null;
  private cardResolve: (() => void) | null = null;
  private confirmResolve: ((v: boolean) => void) | null = null;
  private shopResolve: (() => void) | null = null;
  private travelResolve: ((i: number | null) => void) | null = null;
  private saveResolve: (() => void) | null = null;
  private rewardsResolve: (() => void) | null = null;
  private defeatResolve: ((c: 'retry' | 'load') => void) | null = null;
  private tutorialResolve: (() => void) | null = null;
  private actionResolve: ((a: BattleAction) => void) | null = null;
  private director: BattleDirector | null = null;
  private battleScene: BattleScene | null = null;
  private tutorialsSeen = new Set<string>();
  private skipRun = false;
  private pendingLoad = false;
  private scriptDepth = 0;
  /** test-only hook: disables ONLY random encounters */
  encountersEnabled = true;

  constructor() {
    this.store = safeStorage();
    this.saves = new SaveManager(this.store);
    bindApi(this);
    uiStore.patch({ settings: this.loadSettings() });
    this.applyAudio();
  }

  /* ------------------------------------------------------------------ boot */
  async start(parent: HTMLElement): Promise<void> {
    audio.installUnlockListeners();
    input.attach();
    input.push((a) => this.onAction(a));
    document.addEventListener('fullscreenchange', () => {
      uiStore.patch({ fullscreen: !!document.fullscreenElement });
      this.game?.scale.refresh();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        audio.suspend();
        if (this.director && !this.director.paused) this.battlePause(true);
      } else audio.resume();
    });
    const world = new WorldScene();
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 1280,
      height: 720,
      backgroundColor: '#05070d',
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      input: { keyboard: false, gamepad: false },
      audio: { noAudio: true },
      scene: [world, new BattleScene(), new CutsceneScene()],
      disableContextMenu: true,
    });
    this.world = world;
    await new Promise<void>((res) => this.game.events.once(Phaser.Core.Events.READY, () => res()));
    for (let i = 0; i < 100 && !world.sys?.isActive(); i++) await new Promise((r) => setTimeout(r, 30));
    this.game.scene.stop('Battle');
    this.game.scene.stop('Cutscene');
    this.refreshSlots();
    uiStore.patch({ screen: 'title', assetsReady: true });
    // title music intent: plays as soon as a legitimate user gesture unlocks the AudioContext (pointer/key), never before
    audio.playMusic('title');
    this.installDebugHooks();
  }

  private installDebugHooks() {
    const g = window as unknown as Record<string, unknown>;
    g.__AOTS__ = {
      snapshot: () => uiStore.get(),
      state: () => this.state,
      sim: () => (this.sim ? { map: this.sim.map.id, x: this.sim.px, y: this.sim.py, facing: this.sim.facing } : null),
      setEncounters: (on: boolean) => {
        this.encountersEnabled = on;
        if (this.sim) this.sim.encountersEnabled = on;
      },
      worldDebug: () => this.world.debugState(),
      battleDebug: () => this.battleScene?.debugState() ?? null,
      battle: () => this.director?.battle ?? null,
      objective: () => this.controller?.objective(),
      audio: () => ({ status: audio.status(), music: audio.currentMusic(), live: audio.liveTracks(), settings: audio.getSettings() }),
      busy: () => this.scriptDepth > 0 || !!this.controller?.busy,
      goal: () => (this.state && this.sim ? nextGoal(this.state, this.sim) : null),
      dirTo: (x: number, y: number) => (this.sim ? dirTo(this.sim, x, y) : null),
      standPoint: (id: string) => {
        const e = this.sim?.map.entities.find((x) => x.id === id);
        return e && this.sim ? standPoint(this.sim, e) : null;
      },
      entity: (id: string) => {
        const e = this.sim?.map.entities.find((x) => x.id === id);
        return e && this.sim ? { ...e, active: this.sim.entityActive(e) } : null;
      },
      interactTarget: () => this.sim?.interactTarget()?.id ?? null,
      advice: () => {
        const b = this.director?.battle;
        return b && b.phase === 'input' && b.current ? chooseAction(b, b.current) : null;
      },
      submit: (a: BattleAction) => this.battleSubmit(a),
      settings: (p: Partial<Settings>) => this.updateSettings(p),
      save: (slot: 0 | 1 | 2) => this.saveSlot(slot),
      cutDebug: () => ({ ...(this.game.scene.getScene('Cutscene') as CutsceneScene).debug, ...(this.game.scene.getScene('Cutscene') as CutsceneScene).clockInfo() }),
      fps: () => Math.round(this.game.loop.actualFps),
      /** e2e: run a chain of dialogue lines through the real say()/advance path */
      testDialogue: async (lines: string[]) => {
        for (let i = 0; i < lines.length; i++) await this.say(i % 2 ? 'trunks' : 'piccolo', lines[i]);
        this.scriptEnd();
      },
    };
  }

  /* ------------------------------------------------------------------ settings & audio */
  private loadSettings(): Settings {
    try {
      const raw = this.store.getItem(SETTINGS_KEY);
      if (raw) {
        const o = JSON.parse(raw) as Partial<Settings>;
        const s = { ...DEFAULT_SETTINGS };
        for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) if (typeof o[k] === typeof DEFAULT_SETTINGS[k]) (s as Record<string, unknown>)[k] = o[k];
        s.master = clamp01(s.master);
        s.music = clamp01(s.music);
        s.sfx = clamp01(s.sfx);
        s.screenShake = clamp01(s.screenShake);
        if (![1, 1.5, 2].includes(s.battleSpeed)) s.battleSpeed = 1;
        return s;
      }
    } catch {
      /* corrupt settings fall back to defaults */
    }
    return { ...DEFAULT_SETTINGS };
  }
  updateSettings(p: Partial<Settings>) {
    const s = { ...uiStore.get().settings, ...p };
    uiStore.patch({ settings: s });
    try {
      this.store.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* storage may be unavailable */
    }
    this.applyAudio();
    this.battleScene?.setOptions({ reducedMotion: s.reducedMotion, shake: s.screenShake, battleSpeed: s.battleSpeed });
  }
  private applyAudio() {
    const s = uiStore.get().settings;
    audio.setSettings({ master: s.master, music: s.music, sfx: s.sfx, muted: s.muted });
  }
  toggleFullscreen() {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen();
    } catch {
      /* fullscreen can be refused */
    }
  }
  ui(sound: 'move' | 'confirm' | 'cancel' | 'error') {
    audio.unlock();
    audio.sfx(`ui-${sound}` as never);
  }

  /* ------------------------------------------------------------------ lifecycle */
  private async begin(state: GameState, fromLoad: boolean) {
    this.state = state;
    validateParty(state);
    this.sim = new WorldSim(state);
    this.sim.encountersEnabled = this.encountersEnabled;
    this.controller = new GameController(state, this.sim, this);
    uiStore.patch({ game: state, overlay: null, dialogue: null, choice: null, card: null, caption: null, rewards: null, battle: null, scriptActive: false, screen: 'world', loading: true });
    this.game.scene.wake('World');
    this.world.bridge = {
      sim: this.sim,
      blocked: () => this.worldBlocked(),
      reducedMotion: () => uiStore.get().settings.reducedMotion,
      onEvents: (evs) => this.onWorldEvents(evs),
      onPrompt: (t) => {
        if (uiStore.get().prompt !== t) uiStore.patch({ prompt: t });
      },
      tick: (dt) => {
        input.pollPad(performance.now());
        if (this.state && uiStore.get().screen === 'world') this.state.stats.playMs += dt;
      },
    };
    try {
      await this.world.loadMap(state, this.sim);
      audio.playMusic(MAPS[state.mapId].music as never);
      this.stateChanged();
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    } finally {
      uiStore.patch({ loading: false });
    }
    void fromLoad;
  }
  private worldBlocked(): boolean {
    const u = uiStore.get();
    return u.screen !== 'world' || u.overlay !== null || u.scriptActive || !!u.dialogue || !!u.choice || !!u.card || (this.controller?.busy ?? false);
  }

  newGame(difficulty: 'easy' | 'normal') {
    audio.unlock();
    void this.begin(newGameState(difficulty), false);
  }
  continueGame() {
    const l = this.saves.latest();
    if (l) void this.begin(l.state, true);
  }
  loadSlot(slot: SlotId): boolean {
    const r = this.saves.load(slot);
    if (!r.state) {
      this.toast(r.info.status === 'corrupt' ? 'That save is corrupted and could not be loaded.' : 'Empty slot.');
      return false;
    }
    if (r.info.status === 'recovered') this.toast('The save was damaged; the backup copy was restored.');
    audio.unlock();
    void this.begin(r.state, true);
    return true;
  }
  saveSlot(slot: SlotId) {
    if (!this.state) return { ok: false, error: 'No game in progress' };
    const r = this.saves.save(slot, this.state);
    this.refreshSlots();
    this.toast(r.ok ? 'Game saved.' : `Save failed: ${r.error}`);
    if (r.ok) audio.sfx('save');
    return r;
  }
  deleteSlot(slot: SlotId) {
    this.saves.delete(slot);
    this.refreshSlots();
  }
  exportSlot(slot: SlotId) {
    const text = this.saves.exportText(slot);
    if (!text) {
      this.toast('Nothing to export.');
      return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = this.saves.exportFilename(slot);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  importFile(slot: SlotId, text: string) {
    const r = this.saves.importText(slot, text);
    this.refreshSlots();
    this.toast(r.ok ? 'Save imported.' : `Import failed: ${r.error}`);
    return r;
  }
  toTitle() {
    this.state = null;
    this.sim = null;
    this.controller = null;
    this.refreshSlots();
    uiStore.patch({ screen: 'title', overlay: null, game: null, dialogue: null, choice: null, battle: null });
    audio.playMusic('title');
  }
  refreshSlots() {
    const slots = this.saves.list();
    uiStore.patch({ slots, hasSave: slots.some((s) => s.status === 'ok' || s.status === 'recovered') });
  }

  /* ------------------------------------------------------------------ overlays */
  openMenu() {
    if (!this.state || this.worldBlocked()) return;
    this.stateChanged();
    audio.sfx('ui-confirm');
    uiStore.patch({ overlay: 'menu' });
  }
  openOverlay(o: Exclude<Overlay, null>) {
    uiStore.patch({ overlay: o });
  }
  closeOverlay() {
    const o = uiStore.get().overlay;
    uiStore.patch({ overlay: null });
    if (o === 'save' && this.saveResolve) {
      const r = this.saveResolve;
      this.saveResolve = null;
      r();
    }
  }
  confirm(title: string, body: string, yes = 'Yes', no = 'No'): Promise<boolean> {
    return new Promise((res) => {
      this.confirmResolve = res;
      uiStore.patch({ overlay: 'confirm', confirm: { title, body, yes, no } });
    });
  }
  /** called by the Confirm dialog buttons via chooseConfirm (exposed on api for the UI) */
  resolveConfirm(v: boolean) {
    uiStore.patch({ overlay: null, confirm: null });
    const r = this.confirmResolve;
    this.confirmResolve = null;
    r?.(v);
  }

  /* ------------------------------------------------------------------ dialogue (ScriptHost) */
  say(who: string, text: string, mood?: string): Promise<void> {
    this.scriptBegin();
    const sp = speakerOf(who);
    if (this.skipRun) return Promise.resolve();
    return new Promise((res) => {
      this.dialogueResolve = () => res();
      uiStore.patch({ dialogue: { id: dlgId++, who, name: sp.name, actor: sp.actor, color: sp.color, text, mood } });
    });
  }
  advanceDialogue() {
    const r = this.dialogueResolve;
    if (!r) return; // idempotent: a second advance in the same tick must not skip a line
    this.dialogueResolve = null;
    const old = uiStore.get().dialogue?.id;
    r();
    // keep the box mounted across consecutive lines (the next say() patches synchronously in the script's microtask chain);
    // only clear it if no new line replaced it by the next macrotask
    setTimeout(() => {
      if (!this.dialogueResolve && uiStore.get().dialogue?.id === old) uiStore.patch({ dialogue: null });
    }, 0);
  }
  skipDialogue() {
    this.skipRun = true;
    this.advanceDialogue();
  }
  card(text: string, sub?: string): Promise<void> {
    this.scriptBegin();
    return new Promise((res) => {
      this.cardResolve = res;
      uiStore.patch({ card: { id: dlgId++, text, sub } });
      setTimeout(() => this.endCard(), this.skipRun ? 50 : 2600);
    });
  }
  private endCard() {
    const r = this.cardResolve;
    this.cardResolve = null;
    uiStore.patch({ card: null });
    r?.();
  }
  ask(prompt: string, choices: string[]): Promise<number> {
    this.scriptBegin();
    return new Promise((res) => {
      this.choiceResolve = res;
      uiStore.patch({ choice: { id: dlgId++, prompt, choices } });
    });
  }
  chooseOption(i: number) {
    const r = this.choiceResolve;
    this.choiceResolve = null;
    uiStore.patch({ choice: null });
    this.skipRun = false;
    r?.(i);
  }
  private scriptBegin() {
    if (this.scriptDepth === 0) uiStore.patch({ scriptActive: true });
    this.scriptDepth = Math.max(1, this.scriptDepth);
  }
  private scriptEnd() {
    this.scriptDepth = 0;
    this.skipRun = false;
    uiStore.patch({ scriptActive: false });
  }

  async cutscene(id: string): Promise<void> {
    const def = CUTSCENES[id];
    if (!def) return;
    this.scriptBegin();
    this.game.scene.sleep('World');
    uiStore.patch({ screen: 'cutscene' });
    this.game.scene.start('Cutscene');
    const scene = this.game.scene.getScene('Cutscene') as CutsceneScene;
    await this.sceneReady(() => scene.isReady);
    await scene.play(def, {
      say: (w, t) => this.say(w, t),
      card: (t, s) => this.card(t, s),
      caption: (t) => uiStore.patch({ caption: t }),
      music: (k) => audio.playMusic(k as never),
      reducedMotion: () => uiStore.get().settings.reducedMotion,
      skip: () => this.skipRun,
    });
    this.game.scene.stop('Cutscene');
    this.game.scene.wake('World');
    uiStore.patch({ screen: 'world', caption: null });
    if (this.state) audio.playMusic(MAPS[this.state.mapId].music as never);
  }

  private async sceneReady(ok: () => boolean): Promise<void> {
    for (let i = 0; i < 400 && !ok(); i++) await new Promise<void>((r) => setTimeout(r, 15));
    if (!ok()) throw new Error('scene failed to start');
  }

  /* ------------------------------------------------------------------ misc ScriptHost */
  async warp(): Promise<void> {
    /* handled by warpTo */
  }
  async warpTo(map: string, _x: number, _y: number, _f: unknown, apply: () => void): Promise<void> {
    const cam = this.world.cameras.main;
    if (!uiStore.get().settings.reducedMotion) await new Promise<void>((r) => {
      cam.fadeOut(220, 0, 0, 0);
      cam.once('camerafadeoutcomplete', () => r());
    });
    apply();
    await this.world.loadMap(this.state!, this.sim!);
    if (!uiStore.get().settings.reducedMotion) cam.fadeIn(260, 0, 0, 0);
    else cam.resetFX();
    audio.sfx('door');
    audio.playMusic(MAPS[map].music as never);
    this.stateChanged();
  }
  music(key: string) {
    audio.playMusic(key as never);
  }
  sfx(key: string) {
    audio.sfx(key as never);
  }
  toast(text: string) {
    const id = toastId++;
    uiStore.patch({ toasts: [...uiStore.get().toasts, { id, text }].slice(-4) });
    setTimeout(() => uiStore.patch({ toasts: uiStore.get().toasts.filter((t) => t.id !== id) }), 3200);
  }
  autosave() {
    if (!this.state) return;
    const r = this.saves.save('auto', this.state);
    this.refreshSlots();
    if (r.ok) this.toast('Autosaved.');
  }
  hideEntity() {
    /* visibility is derived from state.opened */
  }
  async battle(): Promise<never> {
    throw new Error('battle is routed through the controller');
  }

  /* ------------------------------------------------------------------ world events */
  private onWorldEvents(events: WorldEvent[]) {
    for (const ev of events) {
      if (ev.type === 'step') continue;
      void this.runEvent(ev);
      return;
    }
  }
  private async runEvent(ev: WorldEvent) {
    const c = this.controller;
    if (!c || c.busy) return;
    uiStore.patch({ scriptActive: true });
    this.scriptDepth = 1;
    try {
      await c.handle(ev);
    } catch (e) {
      console.error(e);
      this.toast('Something went wrong; the event was cancelled.');
    } finally {
      this.scriptEnd();
      this.stateChanged();
    }
    if (this.pendingLoad) {
      this.pendingLoad = false;
      this.continueGame();
    }
  }

  stateChanged() {
    const s = this.state;
    if (!s) return;
    const obj = this.controller?.objective() ?? { text: '', where: '' };
    uiStore.patch({ game: { ...s }, hudMap: MAPS[s.mapId]?.name ?? '', hudObjective: obj });
  }

  /* ------------------------------------------------------------------ input routing */
  private onAction(a: import('../systems/input').Action): boolean {
    const u = uiStore.get();
    audio.unlock();
    if (a === 'fullscreen') {
      this.toggleFullscreen();
      return true;
    }
    if (u.screen === 'battle') {
      if (a === 'guard1' || a === 'guard2' || a === 'guard3') {
        this.battleGuard(a === 'guard1' ? 1 : a === 'guard2' ? 2 : 3);
        return true;
      }
      if (a === 'pause') {
        this.battlePause(!(this.director?.paused ?? false));
        return true;
      }
      return false;
    }
    if (u.dialogue && a === 'confirm') {
      this.advanceDialogue();
      return true;
    }
    if (u.dialogue && a === 'skip') {
      this.skipDialogue();
      return true;
    }
    if (u.screen === 'world' && !u.overlay && !u.scriptActive && !u.dialogue && !u.choice) {
      if (a === 'confirm' && this.sim && this.controller && !this.controller.busy) {
        const ev = this.sim.interact();
        if (ev) void this.runEvent(ev);
        return true;
      }
      if (a === 'menu') {
        this.openMenu();
        return true;
      }
    } else if (u.overlay === 'menu' && (a === 'menu' || a === 'back')) {
      this.closeOverlay();
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ menu actions */
  private mutate<T>(fn: (s: GameState) => T): T {
    const s = this.state!;
    const r = fn(s);
    this.stateChanged();
    return r;
  }
  setParty(heroes: HeroId[]) {
    return this.mutate((s) => P.setParty(s, heroes));
  }
  setLoadout(hero: HeroId, slot: number, skillId: string | null) {
    return this.mutate((s) => P.setLoadout(s, hero, slot, skillId));
  }
  equip(hero: HeroId, slot: number, itemId: string | null) {
    return this.mutate((s) => P.equipAccessory(s, hero, slot, itemId));
  }
  train(hero: HeroId, stat: 'hp' | 'ki' | 'atk' | 'def' | 'spd') {
    return this.mutate((s) => P.trainStat(s, hero, stat));
  }
  refundTraining(hero: HeroId) {
    return this.mutate((s) => P.refundTraining(s, hero));
  }
  useItem(itemId: string, hero: HeroId) {
    const r = this.mutate((s) => P.useFieldItem(s, itemId, hero));
    if (r.ok) audio.sfx('item');
    return r;
  }
  buy(shopId: string, itemId: string, qty: number) {
    const r = this.mutate((s) => P.buyItem(s, shopId, itemId, qty));
    audio.sfx(r.ok ? 'item' : 'ui-error');
    return r;
  }
  sell(itemId: string, qty: number) {
    const r = this.mutate((s) => P.sellItem(s, itemId, qty));
    audio.sfx(r.ok ? 'item' : 'ui-error');
    return r;
  }
  setDifficulty(d: 'easy' | 'normal') {
    this.mutate((s) => {
      s.difficulty = d;
    });
  }
  async openShop(shopId: string): Promise<void> {
    const { SHOPS } = await import('../data/items');
    return new Promise((res) => {
      this.shopResolve = res;
      uiStore.patch({ overlay: 'shop', shop: { shopId, name: SHOPS[shopId]?.name ?? 'Shop' } });
    });
  }
  closeShop() {
    uiStore.patch({ overlay: null, shop: null });
    const r = this.shopResolve;
    this.shopResolve = null;
    r?.();
  }
  openTravel(options: { map: string; label: string; hint: string }[]): Promise<number | null> {
    return new Promise((res) => {
      this.travelResolve = res;
      uiStore.patch({ overlay: 'travel', travel: { options } });
    });
  }
  chooseTravel(i: number | null) {
    uiStore.patch({ overlay: null, travel: null });
    const r = this.travelResolve;
    this.travelResolve = null;
    r?.(i);
  }
  openSave(): Promise<void> {
    return new Promise((res) => {
      this.saveResolve = res;
      this.refreshSlots();
      uiStore.patch({ overlay: 'save' });
    });
  }

  /* ------------------------------------------------------------------ battles */
  async fight(setup: BattleSetup, stage: StageDef, kind: BattleKind): Promise<Battle> {
    const state = this.state!;
    const battle = new Battle(setup);
    if (this.encountersEnabled === false && kind === 'random') void 0;
    this.scriptBegin();
    audio.playMusic((stage.music || 'battle') as never);
    audio.sfx('boss-in');
    this.game.scene.sleep('World');
    this.game.scene.start('Battle', { mapId: stage.backdrop });
    const scene = this.game.scene.getScene('Battle') as BattleScene;
    await this.sceneReady(() => scene.isReady);
    this.battleScene = scene;
    const st = uiStore.get().settings;
    scene.setOptions({ reducedMotion: st.reducedMotion, shake: st.screenShake, battleSpeed: st.battleSpeed });
    uiStore.patch({ screen: 'battle', overlay: null });
    const host: DirectorHost = {
      setView: (v: BattleView) => uiStore.patch({ battle: { ...v, targetHint: uiStore.get().battle?.targetHint ?? null } }),
      settings: () => uiStore.get().settings,
      nextAction: () => new Promise<BattleAction>((res) => (this.actionResolve = res)),
      tutorial: (id, _t) => new Promise<void>((res) => {
        void id;
        this.tutorialResolve = res;
      }),
      rejected: (reason) => this.toast(reason),
    };
    const dir = new BattleDirector(battle, scene, scene.clock, host, kind, this.tutorialsSeen);
    this.director = dir;
    await dir.run();
    await scene.clock.wait(900);
    this.director = null;
    this.battleScene = null;
    this.game.scene.stop('Battle');
    this.game.scene.wake('World');
    uiStore.patch({ screen: 'world', battle: null });
    if (this.state) audio.playMusic(MAPS[state.mapId].music as never);
    return battle;
  }

  battleSubmit(action: BattleAction) {
    const d = this.director;
    if (!d || !this.actionResolve) return { ok: false, reason: 'Not accepting commands' };
    const chk = d.battle.checkAction(action);
    if (!chk.ok) {
      audio.sfx('ui-error');
      return chk;
    }
    const r = this.actionResolve;
    this.actionResolve = null;
    audio.sfx('ui-confirm');
    r(action);
    return { ok: true };
  }
  battleGuard(slot: number) {
    this.director?.guardPress(slot);
  }
  battlePause(paused: boolean) {
    const d = this.director;
    if (!d) return;
    d.paused = paused;
    if (this.battleScene) this.battleScene.clock.paused = paused;
    d.pushView({});
  }
  dismissBattleTutorial() {
    const r = this.tutorialResolve;
    this.tutorialResolve = null;
    uiStore.patch({ battle: uiStore.get().battle ? { ...uiStore.get().battle!, tutorial: null } : null });
    r?.();
  }
  skipBattleAnimations() {
    this.director?.skip(true);
  }

  /* rewards / defeat */
  showRewards(stage: StageDef, summary: import('../systems/progression').RewardSummary, kind: BattleKind): Promise<void> {
    const names: Record<string, string> = {};
    for (const h of Object.keys(HEROES)) names[h] = HEROES[h as HeroId].name;
    return new Promise((res) => {
      this.rewardsResolve = res;
      uiStore.patch({ overlay: 'rewards', rewards: { stageName: stage.name, summary, kind, names } });
    });
  }
  dismissRewards() {
    uiStore.patch({ overlay: null, rewards: null });
    const r = this.rewardsResolve;
    this.rewardsResolve = null;
    r?.();
  }
  defeatChoice(c: 'retry' | 'load'): void;
  defeatChoice(stage: StageDef): Promise<'retry' | 'load'>;
  defeatChoice(arg: StageDef | 'retry' | 'load'): void | Promise<'retry' | 'load'> {
    if (typeof arg === 'string') {
      uiStore.patch({ overlay: null, defeat: null });
      if (arg === 'load') this.pendingLoad = true;
      const r = this.defeatResolve;
      this.defeatResolve = null;
      r?.(arg);
      return;
    }
    const hasSave = uiStore.get().hasSave;
    return new Promise((res) => {
      this.defeatResolve = res;
      audio.sfx('defeat');
      uiStore.patch({ overlay: 'defeat', defeat: { stageName: arg.name, canLoad: hasSave } });
    });
  }
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
export type { UISnapshot, ControllerHost };
void heroActorId;
