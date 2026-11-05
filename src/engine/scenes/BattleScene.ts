import Phaser from 'phaser';
import { uiStore, type FighterView, type GuardCue } from '../../app/store';
import { actorKey, getActor, getVfx, getWorld, needsFlip, registry } from '../assets';
import type { BattleStage, Clock } from '../combat/director';
import type { BattleEvent, ClipId, FormId, GuardGrade, PendingHit, StatusKind } from '../../types';
import { audio } from '../audio';
import { resolveSkillPresentationClip, shouldAnimateVfxFrames } from '../combat/presentation';
import { ensureActor, ensureMap, ensureVfx } from './loader';
import { HEROES } from '../../data/heroes';
import { getSkill } from '../../data/skills';

export const W = 1280;
export const H = 720;

/** Pausable scene clock used by the director (never wall-clock timeouts). */
export class SceneClock implements Clock {
  private t = 0;
  private timers: { at: number; resolve: () => void }[] = [];
  paused = false;
  /** cutscenes (no pause concept) also arm a wall-clock timeout so a stalled render loop can never soft-lock a script */
  constructor(private wallFallback = false) {}
  now(): number {
    return this.t;
  }
  wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const entry = { at: this.t + ms, resolve };
      this.timers.push(entry);
      if (this.wallFallback) {
        setTimeout(() => {
          if (this.timers.includes(entry)) {
            this.timers = this.timers.filter((x) => x !== entry);
            resolve();
          }
        }, ms + 2500);
      }
    });
  }
  tick(dtMs: number) {
    if (this.paused) return;
    this.t += Math.min(dtMs, 100);
    const due = this.timers.filter((x) => x.at <= this.t);
    if (due.length) {
      this.timers = this.timers.filter((x) => x.at > this.t);
      due.forEach((d) => d.resolve());
    }
  }
  flush() {
    const all = this.timers;
    this.timers = [];
    all.forEach((d) => d.resolve());
  }
}

interface Slot {
  uid: string;
  view: FighterView;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  aura: Phaser.GameObjects.Image;
  auraKey: string;
  homeX: number;
  homeY: number;
  baseScale: number;
  pose: string;
  poseUntil: number;
  bobPhase: number;
  alive: boolean;
  engaged: boolean;
}

const AURA_VFX: Partial<Record<FormId | 'sparking', string>> = { ssj: 'aura-ssj', ssj2: 'aura-ssj2', ascended: 'aura-ascended', ultra: 'aura-ultra', sparking: 'aura-sparking' };

export class BattleScene extends Phaser.Scene implements BattleStage {
  clock = new SceneClock();
  private slots = new Map<string, Slot>();
  private ready!: () => void;
  private ring?: Phaser.GameObjects.Graphics;
  private cue: GuardCue | null = null;
  private bg: Phaser.GameObjects.GameObject[] = [];
  private fast = false;
  private activeUid: string | null = null;
  private opts = { reducedMotion: false, shake: 1, battleSpeed: 1 as number };
  private mapId = 'capsule_corp';
  private stageId = '';
  private dim = false;
  private pendingAnimations = new Set<() => void>();
  private spiritBombs = new Map<string, Phaser.GameObjects.Image>();
  private incomingProjectiles = new Map<string, Promise<void>>();

  constructor() {
    super('Battle');
  }

  setOptions(o: { reducedMotion: boolean; shake: number; battleSpeed: number }) {
    this.opts = o;
  }

  init(data: { mapId: string; stageId?: string }) {
    this.mapId = data.mapId;
    this.stageId = data.stageId ?? '';
  }

  /** true between create() and shutdown; the session waits for it instead of guessing a delay */
  isReady = false;

  create() {
    this.isReady = true;
    this.cameras.main.setBackgroundColor('#0b1020');
    this.ring = this.add.graphics().setDepth(900);
    this.events.on('shutdown', () => {
      this.isReady = false;
      this.clock.flush();
      for (const finish of [...this.pendingAnimations]) finish();
      for (const orb of this.spiritBombs.values()) orb.destroy();
      this.spiritBombs.clear();
      this.incomingProjectiles.clear();
      this.slots.clear();
      this.bg = [];
    });
  }

  override update(_t: number, dt: number) {
    this.clock.tick(dt);
    const now = this.clock.now();
    const sec = this.time.now / 1000;
    for (const s of this.slots.values()) {
      if (!s.alive) continue;
      if (s.pose !== 'idle' && now >= s.poseUntil) this.setPose(s, 'idle');
      const idleBob = s.pose === 'idle' && !this.opts.reducedMotion ? Math.sin(sec * 2 + s.bobPhase) * 3 : 0;
      s.img.y = s.homeY + (s.img.getData('dy') as number ?? 0) + idleBob;
      s.shadow.setPosition(s.img.x, s.homeY + 4);
      s.aura.setPosition(s.img.x, s.homeY - s.img.displayHeight * 0.45);
      const aur = this.auraFor(s.view);
      s.aura.setVisible(!!aur && s.alive && this.textures.exists(`vfx:${aur}:0`));
      if (aur && this.textures.exists(`vfx:${aur}:0`)) {
        if (s.auraKey !== aur) {
          s.auraKey = aur;
          s.aura.setTexture(`vfx:${aur}:0`);
        }
        const frame = getVfx(aur)?.frames[0];
        if (frame) s.aura.setScale((s.img.displayWidth * 1.35) / frame.w, (s.img.displayHeight * 1.25) / frame.h);
        s.aura.setAlpha(this.opts.reducedMotion ? 0.42 : 0.48 + 0.06 * Math.sin(sec * 3.2 + s.bobPhase));
      }
    }
    this.drawRing(now);
  }

  private auraFor(v: FighterView): string | null {
    if (v.sparking > 0) return AURA_VFX.sparking!;
    if (v.form !== 'base') return AURA_VFX[v.form] ?? null;
    return null;
  }

  /* ------------------------------------------------------------------ setup */
  async setup(fighters: FighterView[]): Promise<void> {
    await ensureMap(this, this.mapId);
    this.buildBackground();
    const actors = new Set(fighters.map((f) => f.actor));
    await Promise.all([...actors].map((a) => ensureActor(this, a, 'battle')));
    // Every skill, combo, boss move and status effect references the registry. Loading
    // that complete set prevents quiet fallback to a blue orb for unlisted skills.
    await ensureVfx(this, Object.keys(registry.vfx));
    const allies = fighters.filter((f) => f.team === 'ally' && !f.isProtectee);
    const enemies = fighters.filter((f) => f.team === 'enemy');
    const prot = fighters.filter((f) => f.isProtectee);
    allies.forEach((f, i) => this.addSlot(f, 200 + i * 120, 590 - i * 38 + (allies.length === 1 ? -40 : 0)));
    prot.forEach((f, i) => this.addSlot(f, 90 + i * 60, 640));
    const n = enemies.length;
    enemies.forEach((f, i) => {
      const x = n === 1 ? 760 : 700 + (i % 3) * 120 + (i >= 3 ? 50 : 0);
      const y = n === 1 ? 560 : 545 + ((i % 3) - 1) * 42 + (i >= 3 ? 40 : 0);
      this.addSlot(f, x, y);
    });
  }

  async spawn(fighters: FighterView[]): Promise<void> {
    await Promise.all([...new Set(fighters.map((f) => f.actor))].map((a) => ensureActor(this, a, 'battle')));
    const n = fighters.length;
    fighters.forEach((f, i) => {
      const x = n === 1 ? 760 : 700 + (i % 3) * 120 + (i >= 3 ? 50 : 0);
      const y = n === 1 ? 560 : 545 + ((i % 3) - 1) * 42 + (i >= 3 ? 40 : 0);
      this.addSlot(f, x, y);
    });
  }

  private buildBackground() {
    for (const o of this.bg) o.destroy();
    this.bg = [];
    const w = getWorld(this.mapId);
    const backdrops = w?.backdrops ?? [];
    const fullStagePrimary = backdrops[0]?.note?.includes('battle-stage') ?? false;
    const seed = [...this.stageId].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
    const backdropIndex = fullStagePrimary || backdrops.length < 2 ? 0 : seed % backdrops.length;
    const bdKey = `bd:${this.mapId}:${backdropIndex}`;
    const horizon = 430;
    if (this.textures.exists(bdKey)) {
      const fullStage = backdrops[backdropIndex]?.note?.includes('battle-stage');
      const img = this.add.image(W / 2, fullStage ? H / 2 : horizon, bdKey).setOrigin(0.5, fullStage ? 0.5 : 1).setDepth(0);
      const sc = fullStage ? W / img.width : Math.max(W / img.width, 1);
      img.setScale(sc);
      this.bg.push(img);
      const top = horizon - img.displayHeight;
      if (top > 0) {
        const strips = 64;
        const sw = W / strips;
        for (let i = 0; i < strips; i++) {
          const px = Math.min(img.width - 1, Math.floor(((i + 0.5) * sw - (W - img.displayWidth) / 2) / sc));
          const c = this.textures.getPixel(Math.max(0, px), 0, bdKey);
          this.bg.push(this.add.rectangle(i * sw, 0, sw + 1, top + 1, c ? c.color : 0x20304f).setOrigin(0, 0).setDepth(0));
        }
      }
    } else {
      this.bg.push(this.add.rectangle(W / 2, horizon / 2, W, horizon, 0x20304f).setDepth(0));
    }
    // Ginger Town's fights take place on a damaged street. The map's grass/lot
    // floor is correct for exploration but clashes with its ruined-city stage art.
    const floorClass = this.mapId === 'gingertown' ? 'path' : 'floor';
    const tileKey = `tile:${this.mapId}:${floorClass}`;
    if (this.textures.exists(tileKey)) {
      const ts = this.add.tileSprite(W / 2, (horizon + H) / 2, W, H - horizon, tileKey).setDepth(0).setTileScale(2, 2);
      this.bg.push(ts);
    } else {
      this.bg.push(this.add.rectangle(W / 2, (horizon + H) / 2, W, H - horizon, 0x3b4a3a).setDepth(0));
    }
    const shade = this.add.rectangle(W / 2, horizon + 4, W, 10, 0x000000, 0.35).setDepth(1);
    this.bg.push(shade);
    this.dim = w?.mapId === 'lab_inner';
    if (this.dim) this.bg.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000820, 0.25).setDepth(850));
  }

  private frameFor(actor: string, state: string) {
    const a = getActor(actor);
    const f = a?.battle[state as keyof typeof a.battle] ?? a?.battle.idle;
    return { a, f };
  }

  private applyFrame(s: Slot, state: string) {
    const actor = s.view.actor;
    const { a, f } = this.frameFor(actor, state);
    const real = a?.battle[state as keyof typeof a.battle] ? state : 'idle';
    let key = actorKey(actor, real);
    if (!this.textures.exists(key)) key = actorKey(actor, 'idle');
    if (!this.textures.exists(key)) return;
    s.img.setTexture(key);
    if (f) {
      s.img.setOrigin(f.feet[0] / f.w, f.feet[1] / f.h);
      const scale = (a!.displayHeight || 150) / Math.max(1, (a!.battle.idle ?? f).bbox[3]) * (s.view.isProtectee ? 0.7 : 1);
      s.baseScale = scale;
      s.img.setScale(scale);
      s.img.setFlipX(needsFlip(f, s.view.team));
    } else {
      s.img.setOrigin(0.5, 1);
      s.baseScale = 1.5;
      s.img.setScale(1.5);
    }
  }

  private addSlot(v: FighterView, x: number, y: number) {
    const shadow = this.add.ellipse(x, y + 4, 80, 18, 0x000000, 0.35).setDepth(10);
    const initialAura = this.textures.exists('vfx:aura-ssj:0') ? 'vfx:aura-ssj:0' : actorKey(v.actor, 'idle');
    const aura = this.add.image(x, y - 60, initialAura).setDepth(11).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    const img = this.add.image(x, y, actorKey(v.actor, 'idle')).setDepth(20 + y / 10);
    const s: Slot = { uid: v.uid, view: v, img, shadow, aura, auraKey: '', homeX: x, homeY: y, baseScale: 1, pose: 'idle', poseUntil: 0, bobPhase: Math.random() * 6, alive: v.alive, engaged: false };
    this.slots.set(v.uid, s);
    this.applyFrame(s, v.alive ? 'idle' : 'ko');
    if (!v.alive) this.setPose(s, 'ko');
  }

  private setPose(s: Slot, pose: string, ms = 0) {
    s.pose = pose;
    s.poseUntil = ms > 0 ? this.clock.now() + ms : Infinity;
    this.applyFrame(s, pose);
  }

  /* ------------------------------------------------------------------ BattleStage */
  private async tween(targets: object, props: object, ms: number, ease = 'Sine.easeOut'): Promise<void> {
    const dur = this.fast ? 0 : ms / this.opts.battleSpeed;
    if (dur <= 0) {
      Object.assign(targets, props);
      return;
    }
    return new Promise((resolve) => {
      const finish = () => { this.pendingAnimations.delete(finish); resolve(); };
      this.pendingAnimations.add(finish);
      this.tweens.add({ targets, ...props, duration: dur, ease, onComplete: finish });
    });
  }

  async clip(uid: string, clip: ClipId, vfx: string, sfx: string, targetUid?: string, element?: 'phys' | 'ki', skillId?: string, targetUids?: string[]): Promise<void> {
    const s = this.slots.get(uid);
    if (!s) return;
    const skill = skillId ? getSkill(skillId) : undefined;
    const visualClip = skill ? resolveSkillPresentationClip(skill) : resolveSkillPresentationClip({ kind: 'attack', target: 'enemy', clip, element: element ?? 'phys' });
    this.returnHome(s, 0);
    const attackCue = vfx === 'father-son' || (clip !== 'charge' && (skill ? skill.kind === 'attack' || skill.kind === 'special'
      : !!targetUid && ['melee', 'sword', 'teleport', 'beam', 'blast', 'barrage', 'disc', 'heavy', 'special'].includes(visualClip)));
    // Damaging techniques carry their authored sound on the authoritative hit
    // event; non-damaging stances/support sound when their cue begins.
    if (!attackCue) audio.sfx(sfx as never);
    const att = s.view.team === 'ally' ? 1 : -1;
    const targets = (targetUids ?? (targetUid ? [targetUid] : [])).map((id) => this.slots.get(id)).filter((slot): slot is Slot => !!slot && slot.alive);
    const target = targets[0] ?? this.nearestFoe(s);
    if (skillId === 'goku_10' && clip === 'charge') {
      const existing = this.spiritBombs.get(uid);
      if (existing && !existing.scene) this.spiritBombs.delete(uid);
      const orb = existing?.scene ? existing : this.add.image(s.img.x, s.homeY - s.img.displayHeight * 1.25, 'vfx:spirit-bomb:0')
        .setDepth(s.img.depth + 12).setOrigin(0.5).setScale(0.12).setAlpha(0.72);
      this.spiritBombs.set(uid, orb);
      this.setPose(s, 'charge', 800);
      this.playVfx('charge', s.img.x, s.homeY - s.img.displayHeight * 0.55, 0.7);
      const factor = existing?.scene ? 1.35 : 1;
      const scale = existing?.scene ? orb.scaleX * factor : 0.74;
      await this.tween(orb, { x: s.img.x, y: s.homeY - s.img.displayHeight * 1.35, scaleX: scale, scaleY: scale, alpha: 1 }, this.fast || this.opts.reducedMotion ? 1 : 330 / this.opts.battleSpeed, this.opts.reducedMotion ? 'Linear' : 'Back.easeOut');
      return;
    }
    if (vfx === 'father-son' && target) {
      await this.fatherSonKamehameha(s, target);
      return;
    }
    switch (visualClip) {
      case 'melee': case 'sword': case 'teleport': {
        if (!target) {
          this.setPose(s, 'attack', 500);
          break;
        }
        const tx = target.homeX - att * (clip === 'sword' ? 78 : 88);
        if (clip === 'teleport') {
          // vanish, reappear beside the target; the hit event lands on the reappearance
          this.setPose(s, 'charge', 200);
          this.playVfx('teleport', s.img.x, s.homeY - 60, 1.1);
          await this.tween(s.img, { alpha: 0.1 }, 90);
          s.img.x = tx;
          this.playVfx('teleport', tx, s.homeY - 60, 1.1);
          await this.tween(s.img, { alpha: 1 }, 70);
          this.setPose(s, 'attack', 900);
        } else {
          // anticipation (pull back + coil), then a fast eased dash that arrives exactly when the hit event plays
          this.setPose(s, 'charge', 260);
          await this.tween(s.img, { x: s.homeX - att * 16 }, 130, 'Sine.easeOut');
          this.setPose(s, 'attack', 900);
          if (s.view.team === 'ally') await this.tween(s.img, { x: tx }, 130, 'Cubic.easeIn');
        }
        if (s.view.team === 'ally') s.engaged = true;
        break;
      }
      case 'beam': case 'blast': case 'barrage': case 'disc': case 'special': {
        this.setPose(s, clip === 'beam' || clip === 'special' ? 'special' : 'attack', 900);
        const beam = getVfx(vfx)?.family === 'beam' && (clip === 'beam' || clip === 'special');
        // Keep the charge cue readable and let small signature projectiles retain
        // their own color; the old full-size blue orb hid both the actor and shot.
        const chargeCue = vfx === 'hellzone-grenade' ? vfx : 'charge';
        const chargeScale = vfx === 'hellzone-grenade' ? 0.24 : beam ? 0.42 : 0.58;
        this.playVfx(chargeCue, s.img.x + att * 30, s.homeY - s.img.displayHeight * 0.55, chargeScale);
        await this.wait(190);
        // Travel begins only from the authoritative hit/miss event. This keeps
        // damage, authored sound and visible contact on the same beat.
        break;
      }
      case 'heavy': {
        if (!target) {
          this.setPose(s, 'special', 500);
          break;
        }
        this.setPose(s, 'charge', 450);
        if (getVfx(vfx)?.family === 'aura') this.playVfx(vfx, s.img.x, s.homeY - s.img.displayHeight * 0.55, 1.05);
        else this.playVfx('charge', s.img.x + att * 30, s.homeY - s.img.displayHeight * 0.55, 0.9);
        await this.tween(s.img, { x: s.homeX - att * 20 }, 110, 'Sine.easeOut');
        this.setPose(s, 'special', 700);
        await this.tween(s.img, { x: target.homeX - att * 78 }, 170, 'Cubic.easeIn');
        s.engaged = true;
        break;
      }
      case 'flare':
        this.setPose(s, 'special', 700);
        {
          const authored = getVfx(vfx);
          const cueTargets = targets.length
            ? targets
            : target
              ? [target]
            : authored?.family === 'status'
              ? [...this.slots.values()].filter((slot) => slot.alive && slot.view.team !== s.view.team)
              : [];
          const points = cueTargets.length ? cueTargets : [s];
          for (const point of points) {
            this.playVfx(vfx, point.img.x, point.homeY - point.img.displayHeight * 0.55, points.length > 1 ? 1.05 : vfx === 'telekinetic-pin' ? 1.25 : 1.7);
          }
        }
        await this.wait(260);
        break;
      case 'charge':
        this.setPose(s, 'charge', 900);
        this.playVfx('charge', s.img.x, s.homeY - 60, 1.4);
        await this.wait(260);
        break;
      case 'buff': case 'guard': case 'heal':
        this.setPose(s, clip === 'guard' ? 'guard' : 'charge', 700);
        this.playVfx(vfx, s.img.x, s.homeY - 70, 1.3);
        await this.wait(240);
        break;
      default:
        this.setPose(s, 'attack', 600);
    }
  }

  /** Bespoke finale staging: Goku's spirit joins Gohan, then the beam reaches
   * Cell before the authoritative finisher hit is emitted by the combat engine. */
  private async fatherSonKamehameha(gohan: Slot, cell: Slot): Promise<void> {
    this.setPose(gohan, 'special', 1800);
    const gokuActor = 'goku-ssj';
    await ensureActor(this, gokuActor, 'battle');
    const art = getActor(gokuActor);
    const frame = art?.battle.special ?? art?.battle.idle;
    const key = actorKey(gokuActor, frame === art?.battle.special ? 'special' : 'idle');
    const spirit = this.add.image(gohan.img.x - 64, gohan.homeY + 8, this.textures.exists(key) ? key : actorKey(gokuActor, 'idle'))
      .setDepth(gohan.img.depth - 1).setAlpha(0).setTint(0x9edfff);
    if (frame) spirit.setOrigin(frame.feet[0] / frame.w, frame.feet[1] / frame.h).setScale(art!.displayHeight / Math.max(1, frame.bbox[3]));
    else spirit.setOrigin(0.5, 1).setScale(gohan.baseScale);
    const zoom = this.cameras.main.zoom;
    if (!this.opts.reducedMotion) await this.tween(this.cameras.main, { zoom: zoom * 1.035 }, 300);
    this.playVfx('aura-ssj2', gohan.img.x - 16, gohan.homeY - gohan.img.displayHeight * 0.45, 1.6);
    this.playVfx('charge', gohan.img.x + 54, gohan.homeY - gohan.img.displayHeight * 0.55, 1.2);
    await this.tween(spirit, { alpha: 0.34, x: gohan.img.x - 84 }, 260, 'Sine.easeOut');
    await this.wait(this.opts.reducedMotion ? 100 : 280);
    await this.projectile('father-son', gohan, cell, 'special');
    this.playVfx('explosion', cell.homeX, cell.homeY - cell.img.displayHeight * 0.45, 1.7);
    await this.tween(spirit, { alpha: 0 }, this.opts.reducedMotion ? 100 : 260);
    spirit.destroy();
    if (!this.opts.reducedMotion) await this.tween(this.cameras.main, { zoom }, 220);
  }

  private nearestFoe(s: Slot): Slot | undefined {
    const foes = [...this.slots.values()].filter((o) => o.view.team !== s.view.team && o.alive && !o.view.isProtectee);
    return foes[0];
  }

  /** resolves when the projectile/beam reaches the target (so the hit lands at contact) */
  private projectile(vfx: string, from: Slot, to: Slot, clip: ClipId, skillId?: string, flight: { durationMs?: number; misses?: boolean } = {}): Promise<void> {
    const v = getVfx(vfx) ?? getVfx('beam-blue');
    const x0 = from.img.x + (from.view.team === 'ally' ? 44 : -44);
    const y0 = from.homeY - from.img.displayHeight * 0.55;
    const travelDir = from.view.team === 'ally' ? 1 : -1;
    const x1 = to.homeX + (flight.misses ? travelDir * 104 : 0);
    const y1 = to.homeY - to.img.displayHeight * 0.5 - (flight.misses ? 54 : 0);
    const key = v ? `vfx:${v.id}:0` : '';
    const travel = this.fast ? 1 : flight.durationMs ?? (skillId === 'goku_10' ? 360 : 230) / this.opts.battleSpeed;
    return new Promise((resolve) => {
      const finish = () => { this.pendingAnimations.delete(finish); resolve(); };
      this.pendingAnimations.add(finish);
      if (!key || !this.textures.exists(key)) {
        const g = this.add.circle(x0, y0, 18, 0x8fd7ff).setDepth(800);
        this.tweens.add({ targets: g, x: x1, y: y1, duration: travel, ease: 'Sine.easeIn', onComplete: () => { g.destroy(); finish(); } });
        return;
      }
      const beam = v!.family === 'beam' && (clip === 'beam' || clip === 'special');
      const disc = clip === 'disc' || v!.family === 'slash';
      const img = this.add.image(x0, y0, key).setDepth(800).setOrigin(0, 0.5);
      let frameTimer: Phaser.Time.TimerEvent | undefined;
      const dist = Math.hypot(x1 - x0, y1 - y0);
      img.setRotation(Math.atan2(y1 - y0, x1 - x0));
      if (beam) {
        // Keep the generated beam head intact and add a narrow, palette-matched
        // energy body behind it; stretching the head made beams look like ribbons.
        img.setOrigin(0.5).setScale(vfx === 'beam-neo-tri' ? 0.38 : 0.18, vfx === 'beam-neo-tri' ? 0.56 : 0.42);
        const animateHead = shouldAnimateVfxFrames(v!.note, this.opts.reducedMotion) && v!.frames.length > 1 && !this.fast;
        if (animateHead) {
          let frame = 0;
          frameTimer = this.time.addEvent({
            // Fit the full ordered growth sequence inside the existing travel window
            // so the impact timing stays unchanged and no authored head frame is skipped.
            delay: Math.max(1, travel / v!.frames.length),
            repeat: v!.frames.length - 1,
            callback: () => {
              if (!img.scene) return;
              frame = Math.min(frame + 1, v!.frames.length - 1);
              const frameKey = `vfx:${v!.id}:${frame}`;
              if (this.textures.exists(frameKey)) img.setTexture(frameKey);
            },
          });
          img.once('destroy', () => frameTimer?.remove(false));
        }
        const coreColor = v!.id.includes('neo-tri') ? 0xe6ff82
          : v!.id.includes('yellow') || v!.id.includes('gold') || v!.id.includes('final-flash') ? 0xffe07a
          : v!.id.includes('purple') ? 0xc5a2ff
            : v!.id.includes('red') ? 0xff9a88
              : v!.id.includes('green') || v!.id === 'special-beam-cannon' ? 0x9eff72 : 0xc9f0ff;
        const core = this.add.rectangle(x0, y0, dist, 5, coreColor, 0.88).setDepth(799).setOrigin(0, 0.5).setRotation(img.rotation).setScale(0.01, 1);
        this.tweens.add({
          targets: img, x: x1, y: y1, duration: travel, ease: 'Sine.easeIn',
          onStart: () => this.tweens.add({ targets: core, scaleX: 1, duration: travel * 0.55, ease: 'Sine.easeOut' }),
          onComplete: () => {
            frameTimer?.remove(false);
            finish();
            this.tweens.add({ targets: img, alpha: 0, duration: this.fast ? 1 : 120, onComplete: () => img.destroy() });
            this.tweens.add({ targets: core, alpha: 0, duration: this.fast ? 1 : 120, onComplete: () => core.destroy() });
          },
        });
      } else {
        const spiritBomb = skillId === 'goku_10';
        const hellzoneGrenade = vfx === 'hellzone-grenade';
        img.setScale(disc ? 1.45 : spiritBomb ? 0.95 : hellzoneGrenade ? 0.28 : 0.45).setOrigin(0.5);
        const animateBall = shouldAnimateVfxFrames(v!.note, this.opts.reducedMotion) && v!.frames.length > 1 && !this.fast;
        if (animateBall) {
          let frame = 0;
          frameTimer = this.time.addEvent({
            delay: Math.max(1, travel / v!.frames.length),
            repeat: v!.frames.length - 1,
            callback: () => {
              if (!img.scene) return;
              frame = Math.min(frame + 1, v!.frames.length - 1);
              const frameKey = `vfx:${v!.id}:${frame}`;
              if (this.textures.exists(frameKey)) img.setTexture(frameKey);
            },
          });
          img.once('destroy', () => frameTimer?.remove(false));
        }
        this.tweens.add({ targets: img, x: x1, y: y1, scale: disc ? 1.65 : spiritBomb ? 1.22 : hellzoneGrenade ? 0.42 : 1.05, rotation: img.rotation + (disc || hellzoneGrenade ? Math.PI * 2 : 0), duration: travel, ease: spiritBomb ? 'Cubic.easeIn' : 'Sine.easeIn', onComplete: () => { frameTimer?.remove(false); img.destroy(); finish(); } });
      }
    });
  }

  /** attacker recovers to its home spot (non-blocking) */
  private returnHome(s: Slot, delay: number) {
    if (!s.engaged && Math.abs(s.img.x - s.homeX) < 1) return;
    s.engaged = false;
    this.tweens.killTweensOf(s.img);
    s.img.setAlpha(1);
    this.time.delayedCall(this.fast ? 0 : delay, () => {
      if (!s.img.scene) return;
      this.tweens.add({ targets: s.img, x: s.homeX, duration: this.fast ? 1 : 200 / this.opts.battleSpeed, ease: 'Sine.easeOut' });
    });
  }

  playVfx(id: string, x: number, y: number, scale = 1, flip = false, behindNearestActor = false) {
    const v = getVfx(id);
    if (!v || this.opts.reducedMotion && v.family === 'lightning') return;
    const keys = v.frames.map((_, i) => `vfx:${id}:${i}`).filter((k) => this.textures.exists(k));
    if (!keys.length) {
      const c = this.add.circle(x, y, 30 * scale, 0xffffff, 0.8).setDepth(810);
      this.tweens.add({ targets: c, alpha: 0, scale: 1.8, duration: this.fast ? 1 : 260, onComplete: () => c.destroy() });
      return;
    }
    const nearest = v.family === 'aura' || behindNearestActor
      ? [...this.slots.values()].sort((a, b) => Phaser.Math.Distance.Between(a.img.x, a.img.y - a.img.displayHeight * 0.45, x, y) - Phaser.Math.Distance.Between(b.img.x, b.img.y - b.img.displayHeight * 0.45, x, y))[0]
      : undefined;
    const img = this.add.image(x, y, keys[0]).setDepth(nearest ? nearest.img.depth - 1 : 810).setScale(scale * 2).setFlipX(flip);
    // frames marked variants_not_sequence play as a short pulse (never a fake smooth animation)
    const ordered = shouldAnimateVfxFrames(v.note, this.opts.reducedMotion);
    const seq = ordered ? keys : [keys[0]];
    let i = 0;
    const step = () => {
      if (!img.scene) return;
      if (i >= seq.length) {
        this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.15, duration: this.fast ? 1 : 140, onComplete: () => img.destroy() });
        return;
      }
      img.setTexture(seq[i++]);
      this.time.delayedCall(this.fast ? 1 : ordered ? Math.max(35, 1000 / Math.max(1, v.fps) / this.opts.battleSpeed) : 70 / this.opts.battleSpeed, step);
    };
    step();
  }

  approach(attackerUid: string, targetUid: string, ms: number, _label: string) {
    const a = this.slots.get(attackerUid);
    const t = this.slots.get(targetUid);
    if (!a || !t) return;
    const dir = a.view.team === 'ally' ? 1 : -1;
    this.tweens.killTweensOf(a.img);
    a.img.x = a.homeX;
    a.img.setAlpha(1);
    this.setPose(a, 'charge', Math.min(ms * 0.45, 300));
    a.engaged = true;
    // coil back first, then accelerate so contact coincides with the guard impact time
    const back = Math.min(ms * 0.35, 220);
    void this.tween(a.img, { x: a.homeX - dir * 14 }, back, 'Sine.easeOut').then(() => {
      this.setPose(a, 'attack', 1200);
      return this.tween(a.img, { x: t.homeX - dir * 96 }, Math.max(60, ms - back), 'Cubic.easeIn');
    });
  }

  incomingCue(hit: PendingHit, ms: number) {
    if (hit.element !== 'ki') return;
    const a = this.slots.get(hit.attackerUid);
    const t = this.slots.get(hit.targetUid);
    if (!a || !t) return;
    const key = `${hit.attackerUid}:${hit.targetUid}:${hit.hitIndex}`;
    this.incomingProjectiles.set(key, this.projectile(hit.vfx, a, t, this.projectileClip(hit.vfx), undefined, { durationMs: ms }));
  }

  private projectileClip(vfx: string): ClipId {
    const family = getVfx(vfx)?.family;
    return family === 'beam' ? 'beam' : vfx === 'disc' || family === 'slash' ? 'disc' : 'blast';
  }

  async hit(e: Extract<BattleEvent, { t: 'hit' }>): Promise<void> {
    const t = this.slots.get(e.target);
    const a = this.slots.get(e.attacker);
    if (!t) return;
    const incomingKey = `${e.attacker}:${e.target}:${e.hitIndex}`;
    const incoming = this.incomingProjectiles.get(incomingKey);
    if (incoming) {
      this.incomingProjectiles.delete(incomingKey);
      await incoming;
    } else if (a && e.element === 'ki' && e.vfx !== 'father-son') {
      await this.projectile(e.vfx, a, t, this.projectileClip(e.vfx), e.skillId);
    }
    if (e.skillId === 'goku_10') {
      const held = this.spiritBombs.get(e.attacker);
      this.spiritBombs.delete(e.attacker);
      if (held?.scene) this.tweens.add({ targets: held, alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: this.fast ? 1 : 120, onComplete: () => held.destroy() });
    }
    const last = e.hitIndex >= e.hits - 1;
    if (a && e.countered && e.element === 'phys') {
      this.tweens.killTweensOf(a.img);
      a.img.setAlpha(1);
      a.engaged = true;
      this.setPose(a, 'attack', 360);
      if (!this.opts.reducedMotion) {
        const dir = a.view.team === 'ally' ? 1 : -1;
        await this.tween(a.img, { x: t.homeX - dir * 78 }, 110, 'Cubic.easeIn');
      }
    }
    if (a && a.engaged && last) this.returnHome(a, 170);
    if (e.absorbed) {
      this.floatText(t, 'ABSORBED', '#9ae6ff');
      this.playVfx('absorb', t.homeX, t.homeY - 70, 1.3);
      audio.sfx('absorb');
      return;
    }
    const big = e.crit || e.dmg > t.view.maxHp * 0.18;
    this.setPose(t, e.guard === 'none' ? 'hurt' : 'guard', 420);
    // The action's authored VFX belongs to its own skill family. Add a separate
    // impact burst only for critical/heavy contact, rather than replacing every
    // technique with the same blue star.
    const hitX = t.homeX;
    const hitY = t.homeY - t.img.displayHeight * 0.5;
    const authored = getVfx(e.vfx);
    if (authored?.family === 'aura') {
      this.playVfx(e.vfx, a?.img.x ?? hitX, a ? a.homeY - a.img.displayHeight * 0.5 : hitY, 1.05);
      this.playVfx(e.element === 'phys' ? 'impact-hit' : 'explosion', hitX, hitY, big ? 1.25 : 0.95);
    } else if (authored && ['impact', 'slash'].includes(authored.family)) this.playVfx(e.vfx, hitX, hitY, big ? 1.25 : 0.9);
    else this.playVfx(e.vfx, hitX, hitY, big ? 1.15 : 0.8);
    if (big && e.vfx !== 'father-son') this.playVfx('impact-big', hitX, hitY, 0.7);
    this.floatText(t, String(e.dmg), e.crit ? '#ffd24a' : e.guard === 'perfect' ? '#b8f5ff' : e.guard === 'good' ? '#d6f0ff' : t.view.team === 'ally' ? '#ff9a8a' : '#ffffff', e.crit);
    if (!e.absorbed) audio.sfx(e.sfx ? e.sfx as never : e.crit ? 'hit-crit' : e.element === 'ki' ? 'hit-energy' : 'hit-melee');
    if (t.view.team === 'ally' && e.guard === 'none') audio.sfx('hurt');
    if (!this.fast) {
      // impact feel: white flash, short knockback that settles, camera shake scaled by setting, and a brief hit-stop
      const dir = t.view.team === 'ally' ? -1 : 1;
      if (!this.opts.reducedMotion) {
        t.img.setTintFill(0xffffff);
        this.time.delayedCall(60, () => {
          if (!t.img.scene) return;
          t.img.clearTint();
          this.turnTint();
        });
        this.tweens.add({ targets: t.img, x: t.homeX + dir * (e.guard === 'perfect' ? 3 : big ? 16 : 9), duration: 70, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { t.img.x = t.homeX; } });
        if (this.opts.shake > 0) this.cameras.main.shake(big ? 200 : 110, (big ? 0.008 : 0.0035) * this.opts.shake);
      }
      await this.wait(this.opts.reducedMotion ? 0 : big ? 90 : 45);
    }
  }

  private turnTint() {
    for (const s of this.slots.values()) s.img.setTint(this.activeUid && s.uid !== this.activeUid && s.view.team === 'ally' ? 0xb8bfd0 : 0xffffff);
  }

  async miss(e: Extract<BattleEvent, { t: 'miss' }>): Promise<void> {
    const a = this.slots.get(e.attacker);
    const t = this.slots.get(e.target);
    const incomingKey = `${e.attacker}:${e.target}:${e.hitIndex}`;
    const incoming = this.incomingProjectiles.get(incomingKey);
    let shot: Promise<void> = Promise.resolve();
    if (incoming) {
      this.incomingProjectiles.delete(incomingKey);
      shot = incoming;
    } else if (a && t && e.element === 'ki') {
      shot = this.projectile(e.vfx, a, t, this.projectileClip(e.vfx), undefined, { misses: true });
    }
    let dodge: Promise<void> = Promise.resolve();
    if (e.reason === 'evaded' && t?.alive && !t.engaged && !this.opts.reducedMotion) {
      const startX = t.img.x;
      const away = !a || t.img.x >= a.img.x ? 24 : -24;
      dodge = this.tween(t.img, { x: startX + away }, 80, 'Quad.easeOut').then(async () => {
        if (t.img.scene) await this.tween(t.img, { x: startX }, 100, 'Sine.easeInOut');
      });
    }
    await Promise.all([shot, dodge]);
    if (t) this.floatText(t, e.reason === 'evaded' ? 'EVADED' : 'MISS', '#cfd6e6');
    audio.sfx(e.reason === 'evaded' ? 'teleport' : 'guard-miss');
    const lastHit = e.hitIndex >= e.hits - 1;
    if (lastHit && a?.engaged) {
      a.engaged = false;
      await this.tween(a.img, { x: a.homeX }, 190, 'Sine.easeOut');
      if (a.img.scene) this.setPose(a, 'idle');
    }
  }
  resist(uid: string, kind: StatusKind) {
    const s = this.slots.get(uid);
    if (!s) return;
    this.floatText(s, `${kind.toUpperCase()} RESISTED`, '#c9e4ff', false, -34);
    this.playVfx('barrier', s.img.x, s.homeY - s.img.displayHeight * 0.52, 0.75);
    audio.sfx('guard-good');
  }
  async heal(uid: string, amount: number) {
    const s = this.slots.get(uid);
    if (s) {
      this.floatText(s, `+${amount}`, '#8bf08b');
      this.playVfx('regen', s.homeX, s.homeY - 60, 1.1);
    }
    audio.sfx('heal');
  }
  async ki(uid: string, amount: number) {
    const s = this.slots.get(uid);
    if (s && Math.abs(amount) > 0) this.floatText(s, `${amount > 0 ? '+' : ''}${amount} Ki`, '#7fc8ff', false, -14);
  }
  async ko(uid: string) {
    const s = this.slots.get(uid);
    if (!s) return;
    const held = this.spiritBombs.get(uid);
    this.spiritBombs.delete(uid);
    if (held?.scene) held.destroy();
    s.view.alive = false;
    this.setPose(s, 'ko');
    audio.sfx('ko');
    s.aura.setVisible(false);
    if (s.view.team === 'enemy') {
      await this.tween(s.img, { alpha: 0.0 }, 600);
      s.shadow.setVisible(false);
    }
    s.alive = s.view.team === 'ally';
  }
  async revive(uid: string) {
    const s = this.slots.get(uid);
    if (!s) return;
    s.alive = true;
    s.view.alive = true;
    s.img.setAlpha(1);
    this.setPose(s, 'idle');
    this.playVfx('regen', s.homeX, s.homeY - 60, 1.2);
  }
  status(uid: string, kind: StatusKind, on: boolean) {
    const s = this.slots.get(uid);
    if (!s || !on) return;
    const callouts: Partial<Record<StatusKind, string>> = {
      stun: 'STUN', blind: 'BLINDED', seal: 'SEALED', counter: 'COUNTER READY',
      barrier: 'BARRIER UP', absorbing: 'KI ABSORPTION', atkUp: 'POWER UP',
      defUp: 'GUARD UP', spdUp: 'SPEED UP', regen: 'REGENERATING',
    };
    const label = callouts[kind];
    if (label) this.floatText(s, label, ['stun', 'blind', 'seal'].includes(kind) ? '#ffd0f0' : '#a9edff', false, -30);
  }
  async form(uid: string, form: FormId, actor: string) {
    const s = this.slots.get(uid);
    if (!s) return;
    await ensureActor(this, actor, 'battle');
    const auraId = AURA_VFX[form] ?? 'aura-ssj';
    const motionless = this.opts.reducedMotion || this.fast;
    const cam = this.cameras.main;
    const oldZoom = cam.zoom;
    this.setPose(s, 'charge', 1500);
    s.aura.setVisible(true).setAlpha(motionless ? 0.46 : 0.78);
    const auraKey = `vfx:${auraId}:0`;
    const gatherAura = !motionless && this.textures.exists(auraKey)
      ? this.add.image(s.img.x, s.homeY - s.img.displayHeight * 0.48, auraKey).setDepth(s.img.depth - 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.12).setScale(0.6)
      : undefined;

    if (!motionless) {
      audio.sfx('transform-charge');
      const zoom = 1.055;
      const scrollX = Phaser.Math.Clamp(s.homeX - W / 2 / zoom, 0, W - W / zoom);
      const scrollY = Phaser.Math.Clamp((s.homeY - 80) - H / 2 / zoom, 0, H - H / zoom);
      await this.tween(cam, { zoom, scrollX, scrollY }, 260, 'Sine.easeInOut');
      if (gatherAura) await this.tween(gatherAura, { scaleX: 1.32, scaleY: 1.12, alpha: 0.64 }, 270, 'Sine.easeOut');
      s.img.setTint(0xffdf86);
      await this.tween(s.img, { scaleX: s.img.scaleX * 1.04, scaleY: s.img.scaleY * 0.94, alpha: 0.86 }, 230, 'Sine.easeInOut');
      await this.tween(s.img, { scaleX: s.img.scaleX / 1.04, scaleY: s.img.scaleY / 0.94, alpha: 1 }, 190, 'Back.easeOut');
      this.playVfx('lightning', s.homeX, s.homeY - 90, form === 'ssj2' ? 0.76 : 0.48, false, true);
      await this.wait(110);
    }

    s.view = { ...s.view, actor, form };
    this.applyFrame(s, 'idle');
    if (!motionless) {
      const centerY = s.homeY - s.img.displayHeight * 0.48;
      const ring = this.add.image(s.homeX, centerY, 'vfx:transform-shockwave:0').setDepth(18).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.96).setScale(0.18, 0.18);
      void this.tween(ring, { scaleX: 7.2, scaleY: 5.1, alpha: 0 }, 820, 'Cubic.easeOut').then(() => ring.destroy());
      let auraFade: Promise<void> | undefined;
      if (gatherAura) {
        gatherAura.setPosition(s.homeX, centerY);
        auraFade = this.tween(gatherAura, { scaleX: 2.05, scaleY: 1.8, alpha: 0 }, 650, 'Cubic.easeOut').then(() => gatherAura.destroy());
      }
      audio.sfx('transform-release');
      this.playVfx('flare', s.homeX, centerY, 0.62, false, true);
      if (this.opts.shake > 0) cam.shake(320, 0.006 * this.opts.shake);
      await this.tween(s.img, { scaleX: s.img.scaleX * 0.88, scaleY: s.img.scaleY * 0.88, alpha: 0.62 }, 95, 'Sine.easeIn');
      this.applyFrame(s, 'idle');
      await this.tween(s.img, { scaleX: s.img.scaleX * 1.1, scaleY: s.img.scaleY * 1.1, alpha: 1 }, 140, 'Back.easeOut');
      this.applyFrame(s, 'idle');
      audio.sfx('transform-impact');
      if (auraFade) await auraFade;
      await this.tween(cam, { zoom: oldZoom, scrollX: 0, scrollY: 0 }, 300, 'Sine.easeInOut');
      s.img.clearTint();
    } else {
      this.playVfx(auraId, s.homeX, s.homeY - s.img.displayHeight * 0.5, 0.85);
    }
    this.setPose(s, 'idle');
    const formName = form === 'ssj2' ? 'SUPER SAIYAN 2' : form === 'ssj' ? 'SUPER SAIYAN' : form.toUpperCase();
    this.floatText(s, formName, '#ffe98b', true, -52);
  }
  async phase(uid: string, _text: string, actor?: string) {
    const s = this.slots.get(uid);
    if (!s) return;
    audio.sfx('boss-in');
    if (actor) {
      const def = (await import('../../data/enemies')).ENEMIES[actor];
      if (def) {
        await ensureActor(this, def.actor, 'battle');
        s.view = { ...s.view, actor: def.actor };
        this.applyFrame(s, 'idle');
      }
    }
    this.playVfx('lightning', s.homeX, s.homeY - 80, 1.8);
  }
  async banner(_text: string) {
    await this.wait(220);
  }
  async telegraph(uid: string, _text: string, targetUid?: string) {
    const s = this.slots.get(uid);
    audio.sfx('telegraph');
    if (s) {
      this.setPose(s, 'charge', 700);
      this.playVfx('charge', s.img.x, s.homeY - s.img.displayHeight * 0.6, 0.9);
    }
    const target = targetUid ? this.slots.get(targetUid) : undefined;
    if (target?.alive) {
      this.floatText(target, 'INCOMING!', '#ff7a58', true, -38);
      this.playVfx('lightning', target.img.x, target.homeY - target.img.displayHeight * 0.75, 0.65);
    }
    await this.wait(200);
  }
  guardCue(cue: GuardCue | null) {
    this.cue = cue;
    if (!cue) this.ring?.clear();
  }
  /** instant, unmistakable feedback the moment the Active Guard window closes (text + shape + sound, never colour alone) */
  guardResult(uid: string, grade: GuardGrade) {
    audio.sfx(grade === 'perfect' ? 'guard-perfect' : grade === 'good' ? 'guard-good' : 'guard-miss');
    const s = this.slots.get(uid);
    if (!s) return;
    const label = grade === 'perfect' ? 'PERFECT GUARD!' : grade === 'good' ? 'GOOD GUARD' : 'GUARD MISSED';
    const color = grade === 'perfect' ? '#7cf5ff' : grade === 'good' ? '#9bf28b' : '#ff6a5a';
    const cx = s.img.x;
    const cy = s.homeY - s.img.displayHeight * 0.5;
    const txt = this.add.text(cx, s.homeY - s.img.displayHeight - 34, label, {
      fontFamily: 'monospace', fontSize: grade === 'perfect' ? '34px' : '28px', color, stroke: '#0a0c14', strokeThickness: 6, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(960);
    const hold = this.fast ? 1 : 850 / this.opts.battleSpeed;
    if (!this.opts.reducedMotion && !this.fast) {
      txt.setScale(0.6);
      this.tweens.add({ targets: txt, scale: 1, duration: 120, ease: 'Back.easeOut' });
      this.tweens.add({ targets: txt, y: txt.y - 18, alpha: 0, delay: hold * 0.55, duration: hold * 0.45, onComplete: () => txt.destroy() });
    } else this.time.delayedCall(hold, () => txt.destroy());
    // shape feedback: success = expanding shield ring, miss = red cross over the fighter
    const g = this.add.graphics().setDepth(955);
    if (grade === 'none') {
      g.lineStyle(7, 0xff6a5a, 1).lineBetween(cx - 20, cy - 20, cx + 20, cy + 20).lineBetween(cx + 20, cy - 20, cx - 20, cy + 20);
      this.tweens.add({ targets: g, alpha: 0, delay: hold * 0.4, duration: hold * 0.5, onComplete: () => g.destroy() });
    } else {
      const col = grade === 'perfect' ? 0x7cf5ff : 0x9bf28b;
      const obj = { r: 22, a: 1 };
      const draw = () => {
        g.clear();
        g.lineStyle(grade === 'perfect' ? 7 : 5, col, obj.a).strokeCircle(cx, cy, obj.r);
        if (grade === 'perfect') g.lineStyle(3, 0xffffff, obj.a).strokeCircle(cx, cy, obj.r * 0.7);
      };
      draw();
      if (this.opts.reducedMotion || this.fast) this.time.delayedCall(hold * 0.6, () => g.destroy());
      else this.tweens.add({ targets: obj, r: grade === 'perfect' ? 120 : 90, a: 0, duration: 450, ease: 'Cubic.easeOut', onUpdate: draw, onComplete: () => g.destroy() });
      if (grade === 'perfect' && !this.opts.reducedMotion && !this.fast) this.cameras.main.flash(90, 190, 250, 255);
    }
  }
  rage(uid: string, amount: number) {
    if (amount >= 15) {
      const s = this.slots.get(uid);
      if (s) this.floatText(s, `+${Math.round(amount)} Rage`, '#ff9c4d', false, -44);
    }
  }
  turn(uid: string | null) {
    this.activeUid = uid;
    this.turnTint();
  }
  async end(outcome: 'victory' | 'defeat' | 'fled') {
    if (outcome === 'victory') {
      for (const s of this.slots.values()) if (s.view.team === 'ally' && s.alive) this.setPose(s, 'victory');
      audio.sfx('victory');
    } else if (outcome === 'defeat') audio.sfx('defeat');
    else {
      audio.sfx('flee');
      const allies = [...this.slots.values()].filter((s) => s.view.team === 'ally' && s.alive && !s.view.isProtectee);
      for (const s of allies) {
        this.setPose(s, 'charge', 400);
        this.playVfx('teleport', s.img.x, s.homeY - 60, 1.1);
      }
      await this.wait(160);
      await Promise.all(allies.map((s) => this.tween(s.img, { alpha: 0, x: s.img.x - 60 }, 260, 'Cubic.easeIn')));
    }
    await this.wait(600);
  }
  setFast(skip: boolean) {
    this.fast = skip;
  }

  /* ------------------------------------------------------------------ helpers */
  private wait(ms: number) {
    return this.fast ? Promise.resolve() : this.clock.wait(ms / this.opts.battleSpeed);
  }

  private floatText(s: Slot, text: string, color: string, big = false, dy = 0) {
    const t = this.add.text(s.homeX + Phaser.Math.Between(-14, 14), s.homeY - s.img.displayHeight - 8 + dy, text, {
      fontFamily: 'monospace', fontSize: big ? '38px' : '26px', color, stroke: '#0a0c14', strokeThickness: 5, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(950);
    this.tweens.add({ targets: t, y: t.y - 54, alpha: 0, duration: this.fast ? 1 : 900, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private drawRing(now: number) {
    const g = this.ring;
    if (!g) return;
    g.clear();
    // target-selection marker: bouncing arrow + foot ring over the fighter the HUD is highlighting
    const hint = (uiStore.get().battle as { targetHint?: string | null } | null)?.targetHint;
    const hs = hint ? this.slots.get(hint) : undefined;
    if (hs && hs.alive) {
      const bounce = this.opts.reducedMotion ? 0 : Math.sin(this.time.now / 130) * 6;
      const hx = hs.img.x;
      const top = hs.img.y - hs.img.displayHeight - 18 + bounce;
      g.fillStyle(0xffd24a, 1).fillTriangle(hx - 13, top - 18, hx + 13, top - 18, hx, top + 4);
      g.lineStyle(3, 0x10131c, 1).strokeTriangle(hx - 13, top - 18, hx + 13, top - 18, hx, top + 4);
      g.lineStyle(3, 0xffd24a, 0.9).strokeEllipse(hx, hs.homeY + 4, hs.img.displayWidth * 0.9 + 14, 22);
    }
    const c = this.cue;
    if (!c) return;
    const s = this.slots.get(c.targetUid);
    if (!s) return;
    const total = c.impactAt - c.openAt;
    const p = Math.min(1, Math.max(0, (now - c.openAt) / total));
    const r = 14 + (1 - p) * 90;
    const cx = s.img.x;
    const cy = s.homeY - s.img.displayHeight * 0.5;
    g.lineStyle(5, 0xffffff, 0.95).strokeCircle(cx, cy, r);
    g.lineStyle(3, 0x7cf5ff, 1).strokeCircle(cx, cy, 14);
    // diamond marker so the cue is not colour-only
    g.lineStyle(4, 0xffd24a, 1).strokeRect(cx - 9, cy - 9, 18, 18);
  }

  /** used by debug/e2e to read scene state */
  debugState() {
    return { slots: [...this.slots.values()].map((s) => ({ uid: s.uid, x: s.img.x, y: s.img.y, pose: s.pose, alive: s.alive, tex: s.img.texture.key, flip: s.img.flipX, h: Math.round(s.img.displayHeight), w: Math.round(s.img.displayWidth), homeX: s.homeX, homeY: s.homeY })), cue: this.cue };
  }
}

export const heroColor = (id: string) => (HEROES as Record<string, { color: string }>)[id]?.color ?? '#ffffff';
