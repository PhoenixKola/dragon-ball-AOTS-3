import Phaser from 'phaser';
import { uiStore, type FighterView, type GuardCue } from '../../app/store';
import { actorKey, getActor, getVfx, getWorld, needsFlip } from '../assets';
import type { BattleStage, Clock } from '../combat/director';
import type { BattleEvent, ClipId, FormId, GuardGrade, StatusKind } from '../../types';
import { audio } from '../audio';
import { ensureActor, ensureMap, ensureVfx } from './loader';
import { HEROES } from '../../data/heroes';

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
  aura: Phaser.GameObjects.Ellipse;
  homeX: number;
  homeY: number;
  baseScale: number;
  pose: string;
  poseUntil: number;
  bobPhase: number;
  alive: boolean;
  engaged: boolean;
}

const AURA: Partial<Record<FormId | 'sparking' | 'rage', number>> = { ssj: 0xffe14d, ssj2: 0xfff27a, ascended: 0xffc23b, ultra: 0xff9a2b, sparking: 0x6fe1ff };

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
  private dim = false;

  constructor() {
    super('Battle');
  }

  setOptions(o: { reducedMotion: boolean; shake: number; battleSpeed: number }) {
    this.opts = o;
  }

  init(data: { mapId: string }) {
    this.mapId = data.mapId;
  }

  /** true between create() and shutdown; the session waits for it instead of guessing a delay */
  isReady = false;

  create() {
    this.isReady = true;
    this.cameras.main.setBackgroundColor('#0b1020');
    this.ring = this.add.graphics().setDepth(900);
    this.events.on('shutdown', () => {
      this.isReady = false;
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
      s.aura.setVisible(!!aur && s.alive);
      if (aur) {
        s.aura.setFillStyle(aur, 0.22 + (this.opts.reducedMotion ? 0 : 0.08 * Math.sin(sec * 7)));
        s.aura.setSize(s.img.displayWidth * 0.8, s.img.displayHeight * 1.1);
      }
    }
    this.drawRing(now);
  }

  private auraFor(v: FighterView): number | null {
    if (v.sparking > 0) return AURA.sparking!;
    if (v.form !== 'base') return AURA[v.form] ?? null;
    return null;
  }

  /* ------------------------------------------------------------------ setup */
  async setup(fighters: FighterView[]): Promise<void> {
    await ensureMap(this, this.mapId);
    this.buildBackground();
    const actors = new Set(fighters.map((f) => f.actor));
    await Promise.all([...actors].map((a) => ensureActor(this, a, 'battle')));
    await ensureVfx(this, ['impact-hit', 'impact-big', 'explosion', 'beam-blue', 'beam-yellow', 'beam-purple', 'beam-gold', 'beam-green', 'beam-red', 'ball-blue', 'ball-yellow', 'ball-purple', 'ball-red', 'ball-green', 'slash', 'disc', 'spiral', 'flare', 'barrier', 'teleport', 'regen', 'absorb', 'lightning', 'charge', 'father-son', 'aura-ssj', 'aura-ssj2']);
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
    const bdKey = `bd:${this.mapId}:0`;
    const horizon = 430;
    if (this.textures.exists(bdKey)) {
      const img = this.add.image(W / 2, horizon, bdKey).setOrigin(0.5, 1).setDepth(0);
      const sc = Math.max(W / img.width, 1);
      img.setScale(sc);
      this.bg.push(img);
    } else {
      this.bg.push(this.add.rectangle(W / 2, horizon / 2, W, horizon, 0x20304f).setDepth(0));
    }
    const tileKey = `tile:${this.mapId}:floor`;
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
    const aura = this.add.ellipse(x, y - 60, 90, 140, 0xffffff, 0.2).setDepth(11).setVisible(false);
    const img = this.add.image(x, y, actorKey(v.actor, 'idle')).setDepth(20 + y / 10);
    const s: Slot = { uid: v.uid, view: v, img, shadow, aura, homeX: x, homeY: y, baseScale: 1, pose: 'idle', poseUntil: 0, bobPhase: Math.random() * 6, alive: v.alive, engaged: false };
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
      this.tweens.add({ targets, ...props, duration: dur, ease, onComplete: () => resolve() });
    });
  }

  async clip(uid: string, clip: ClipId, vfx: string, sfx: string, targetUid?: string): Promise<void> {
    const s = this.slots.get(uid);
    if (!s) return;
    this.returnHome(s, 0);
    audio.sfx(sfx as never);
    const att = s.view.team === 'ally' ? 1 : -1;
    const target = (targetUid ? this.slots.get(targetUid) : undefined) ?? this.nearestFoe(s);
    switch (clip) {
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
          await this.tween(s.img, { x: tx }, 130, 'Cubic.easeIn');
        }
        s.engaged = true;
        break;
      }
      case 'beam': case 'blast': case 'barrage': case 'disc': case 'special': {
        this.setPose(s, clip === 'beam' || clip === 'special' ? 'special' : 'attack', 900);
        this.playVfx('charge', s.img.x + att * 30, s.homeY - s.img.displayHeight * 0.55, 0.9);
        await this.wait(190);
        if (target) await this.projectile(vfx, s, target, clip);
        break;
      }
      case 'flare':
        this.setPose(s, 'special', 700);
        this.playVfx('flare', s.img.x, s.homeY - s.img.displayHeight * 0.7, 2.2);
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

  private nearestFoe(s: Slot): Slot | undefined {
    const foes = [...this.slots.values()].filter((o) => o.view.team !== s.view.team && o.alive && !o.view.isProtectee);
    return foes[0];
  }

  /** resolves when the projectile/beam reaches the target (so the hit lands at contact) */
  private projectile(vfx: string, from: Slot, to: Slot, clip: ClipId): Promise<void> {
    const v = getVfx(vfx) ?? getVfx('beam-blue');
    const x0 = from.img.x + (from.view.team === 'ally' ? 44 : -44);
    const y0 = from.homeY - from.img.displayHeight * 0.55;
    const x1 = to.homeX;
    const y1 = to.homeY - to.img.displayHeight * 0.5;
    const key = v ? `vfx:${v.id}:0` : '';
    const travel = this.fast ? 1 : 230 / this.opts.battleSpeed;
    return new Promise((resolve) => {
      if (!key || !this.textures.exists(key)) {
        const g = this.add.circle(x0, y0, 18, 0x8fd7ff).setDepth(800);
        this.tweens.add({ targets: g, x: x1, y: y1, duration: travel, ease: 'Sine.easeIn', onComplete: () => { g.destroy(); resolve(); } });
        return;
      }
      const img = this.add.image(x0, y0, key).setDepth(800).setOrigin(0, 0.5);
      const dist = Math.hypot(x1 - x0, y1 - y0);
      img.setRotation(Math.atan2(y1 - y0, x1 - x0));
      const beam = v!.family === 'beam' && clip === 'beam';
      if (beam) {
        img.setScale(0.01, 2);
        this.tweens.add({
          targets: img, scaleX: Math.max(1, dist / img.width), duration: travel, ease: 'Sine.easeIn',
          onComplete: () => { resolve(); this.tweens.add({ targets: img, alpha: 0, duration: this.fast ? 1 : 260, onComplete: () => img.destroy() }); },
        });
      } else {
        img.setScale(2).setOrigin(0.5);
        this.tweens.add({ targets: img, x: x1, y: y1, duration: travel, ease: 'Sine.easeIn', onComplete: () => { img.destroy(); resolve(); } });
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

  playVfx(id: string, x: number, y: number, scale = 1, flip = false) {
    const v = getVfx(id);
    if (!v || this.opts.reducedMotion && v.family === 'lightning') return;
    const keys = v.frames.map((_, i) => `vfx:${id}:${i}`).filter((k) => this.textures.exists(k));
    if (!keys.length) {
      const c = this.add.circle(x, y, 30 * scale, 0xffffff, 0.8).setDepth(810);
      this.tweens.add({ targets: c, alpha: 0, scale: 1.8, duration: this.fast ? 1 : 260, onComplete: () => c.destroy() });
      return;
    }
    const img = this.add.image(x, y, keys[0]).setDepth(810).setScale(scale * 2).setFlipX(flip);
    // frames marked variants_not_sequence play as a short pulse (never a fake smooth animation)
    const seq = v.note?.includes('variants_not_sequence') ? [keys[0]] : keys.slice(0, 6);
    let i = 0;
    const step = () => {
      if (!img.scene) return;
      if (i >= seq.length) {
        this.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.15, duration: this.fast ? 1 : 140, onComplete: () => img.destroy() });
        return;
      }
      img.setTexture(seq[i++]);
      this.time.delayedCall(this.fast ? 1 : 70, step);
    };
    step();
  }

  approach(attackerUid: string, targetUid: string, ms: number, _label: string) {
    const a = this.slots.get(attackerUid);
    const t = this.slots.get(targetUid);
    if (!a || !t) return;
    const dir = a.view.team === 'ally' ? 1 : -1;
    this.returnHome(a, 0);
    this.setPose(a, 'charge', Math.min(ms * 0.45, 300));
    a.engaged = true;
    // coil back first, then accelerate so contact coincides with the guard impact time
    const back = Math.min(ms * 0.35, 220);
    void this.tween(a.img, { x: a.homeX - dir * 14 }, back, 'Sine.easeOut').then(() => {
      this.setPose(a, 'attack', 1200);
      return this.tween(a.img, { x: t.homeX - dir * 96 }, Math.max(60, ms - back), 'Cubic.easeIn');
    });
  }

  async hit(e: Extract<BattleEvent, { t: 'hit' }>): Promise<void> {
    const t = this.slots.get(e.target);
    const a = this.slots.get(e.attacker);
    if (!t) return;
    const last = e.hitIndex >= e.hits - 1;
    if (a && a.engaged && last) this.returnHome(a, 170);
    if (e.absorbed) {
      this.floatText(t, 'ABSORBED', '#9ae6ff');
      this.playVfx('absorb', t.homeX, t.homeY - 70, 1.3);
      audio.sfx('absorb');
      return;
    }
    const big = e.crit || e.dmg > t.view.maxHp * 0.18;
    this.setPose(t, e.guard === 'none' ? 'hurt' : 'guard', 420);
    this.playVfx(e.vfx === 'father-son' ? 'father-son' : big ? 'impact-big' : 'impact-hit', t.homeX, t.homeY - t.img.displayHeight * 0.5, big ? 1.5 : 1);
    this.floatText(t, String(e.dmg), e.crit ? '#ffd24a' : e.guard === 'perfect' ? '#b8f5ff' : e.guard === 'good' ? '#d6f0ff' : t.view.team === 'ally' ? '#ff9a8a' : '#ffffff', e.crit);
    audio.sfx(e.crit ? 'hit-crit' : e.element === 'ki' ? 'hit-energy' : 'hit-melee');
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

  async miss(attacker: string, target: string, reason: string): Promise<void> {
    const t = this.slots.get(target);
    void attacker;
    if (t) this.floatText(t, reason === 'evaded' ? 'EVADED' : 'MISS', '#cfd6e6');
    audio.sfx('guard-miss');
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
    if (s && on && ['stun', 'blind', 'seal'].includes(kind)) this.floatText(s, kind.toUpperCase(), '#ffd0f0', false, -30);
  }
  async form(uid: string, _form: FormId, actor: string) {
    const s = this.slots.get(uid);
    if (!s) return;
    audio.sfx('transform');
    await ensureActor(this, actor, 'battle');
    s.view = { ...s.view, actor };
    this.applyFrame(s, 'idle');
    this.playVfx('aura-ssj', s.homeX, s.homeY - 70, 1.6);
    if (!this.opts.reducedMotion) this.cameras.main.flash(220, 255, 240, 160);
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
  async telegraph(uid: string, _text: string, _target?: string) {
    const s = this.slots.get(uid);
    audio.sfx('telegraph');
    if (s) this.setPose(s, 'charge', 700);
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
      const top = hs.homeY - hs.img.displayHeight - 18 + bounce;
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
