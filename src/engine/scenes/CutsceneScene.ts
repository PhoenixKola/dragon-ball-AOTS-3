import Phaser from 'phaser';
import type { CutStep, CutsceneDef } from '../../types/script';
import { actorKey, getActor, getVfx, needsFlip } from '../assets';
import { audio } from '../audio';
import { ensureActor, ensureMap, ensureVfx } from './loader';
import { SceneClock } from './BattleScene';

const W = 1280;
const H = 720;

export interface CutsceneHost {
  say(who: string, text: string): Promise<void>;
  card(text: string, sub?: string): Promise<void>;
  caption(text: string | null): void;
  music(key: string): void;
  reducedMotion(): boolean;
  skip(): boolean;
}

interface CA {
  img: Phaser.GameObjects.Image;
  actor: string;
  facing: 'left' | 'right';
  scale: number;
  y: number;
}

/**
 * Scripted in-engine cutscene player. Uses the same actor frames as battles; missing painted frames are choreographed
 * with poses, VFX, flashes and camera work (def.provisionalArt documents that no painted cutscene art exists).
 */
export class CutsceneScene extends Phaser.Scene {
  clock = new SceneClock(true);
  private actors = new Map<string, CA>();
  private bg: Phaser.GameObjects.GameObject[] = [];
  private fade?: Phaser.GameObjects.Rectangle;
  private host!: CutsceneHost;
  private backdropMap = '';
  /** debug: which cutscene/step is running (read by the e2e watchdog) */
  debug = { id: '', step: -1, kind: '' };
  clockInfo() {
    return { now: this.clock.now(), paused: this.clock.paused, active: this.sys.isActive(), visible: this.sys.isVisible(), fps: this.game.loop.actualFps };
  }

  constructor() {
    super('Cutscene');
  }

  /** true between create() and shutdown; the session waits for it instead of guessing a delay */
  isReady = false;

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    this.isReady = true;
    this.events.once('shutdown', () => (this.isReady = false));
  }

  override update(_t: number, dt: number) {
    this.clock.tick(dt);
  }

  private wait(ms: number) {
    return this.host.skip() ? Promise.resolve() : this.clock.wait(ms);
  }

  private async setBackdrop(mapId: string) {
    this.backdropMap = mapId;
    await ensureMap(this, mapId);
    for (const o of this.bg) o.destroy();
    this.bg = [];
    const bd = `bd:${mapId}:0`;
    if (this.textures.exists(bd)) {
      const img = this.add.image(W / 2, 440, bd).setOrigin(0.5, 1).setDepth(0);
      img.setScale(Math.max(W / img.width, 1));
      this.bg.push(img);
    } else this.bg.push(this.add.rectangle(W / 2, 220, W, 440, 0x20304f));
    const tk = `tile:${mapId}:floor`;
    this.bg.push(this.textures.exists(tk) ? this.add.tileSprite(W / 2, 580, W, 290, tk).setTileScale(2, 2) : this.add.rectangle(W / 2, 580, W, 290, 0x3b4a3a));
  }

  async play(def: CutsceneDef, host: CutsceneHost): Promise<void> {
    this.host = host;
    this.clock = new SceneClock(true);
    this.actors.clear();
    audio.playMusic(def.music as never);
    await this.setBackdrop(def.backdrop);
    this.fade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 1).setDepth(5000);
    this.tweens.add({ targets: this.fade, alpha: 0, duration: 350 });
    this.debug = { id: def.id, step: 0, kind: '' };
    for (const st of def.steps) {
      this.debug.step++;
      this.debug.kind = st.t;
      if (host.skip() && st.t !== 'say') {
        // skip mode still applies state changes so the scene ends consistent
        await this.apply(st, true);
        continue;
      }
      await this.apply(st, false);
    }
    host.caption(null);
    await new Promise<void>((res) => {
      this.tweens.add({ targets: this.fade, alpha: 1, duration: 250, onComplete: () => res() });
    });
    for (const a of this.actors.values()) a.img.destroy();
    this.actors.clear();
  }

  private pose(a: CA, state: string) {
    const art = getActor(a.actor);
    const fr = art?.battle[state as keyof typeof art.battle] ?? art?.battle.idle;
    let key = actorKey(a.actor, state);
    if (!this.textures.exists(key)) key = actorKey(a.actor, 'idle');
    if (!this.textures.exists(key)) return;
    a.img.setTexture(key);
    if (fr && art) {
      a.img.setOrigin(fr.feet[0] / fr.w, fr.feet[1] / fr.h);
      a.img.setScale((art.displayHeight / Math.max(1, (art.battle.idle ?? fr).bbox[3])) * a.scale);
      a.img.setFlipX(needsFlip(fr, a.facing === 'right' ? 'ally' : 'enemy'));
    }
  }

  private async apply(st: CutStep, fast: boolean): Promise<void> {
    switch (st.t) {
      case 'show': {
        await ensureActor(this, st.actor, 'battle');
        const img = this.add.image(st.x * W, st.y * H, actorKey(st.actor, 'idle')).setDepth(100 + st.y * 100);
        const a: CA = { img, actor: st.actor, facing: st.facing ?? 'right', scale: st.scale ?? 1, y: st.y * H };
        this.actors.set(st.id, a);
        this.pose(a, st.state ?? 'idle');
        return;
      }
      case 'hide': {
        const a = this.actors.get(st.id);
        if (a) {
          if (!fast) await new Promise<void>((res) => this.tweens.add({ targets: a.img, alpha: 0, duration: 250, onComplete: () => res() }));
          a.img.destroy();
          this.actors.delete(st.id);
        }
        return;
      }
      case 'move': {
        const a = this.actors.get(st.id);
        if (!a) return;
        if (fast) a.img.setPosition(st.x * W, st.y * H);
        else await new Promise<void>((res) => this.tweens.add({ targets: a.img, x: st.x * W, y: st.y * H, duration: st.ms, ease: 'Sine.easeInOut', onComplete: () => res() }));
        return;
      }
      case 'pose': {
        const a = this.actors.get(st.id);
        if (a) this.pose(a, st.state);
        return;
      }
      case 'form': {
        const a = this.actors.get(st.id);
        if (!a) return;
        await ensureActor(this, st.actor, 'battle');
        a.actor = st.actor;
        this.pose(a, 'idle');
        return;
      }
      case 'say': await this.host.say(st.who, st.text); return;
      case 'vfx': {
        await ensureVfx(this, [st.vfx]);
        if (fast) return;
        this.vfx(st.vfx, st.x * W, st.y * H, st.scale ?? 1, st.ms ?? 600);
        return;
      }
      case 'flash':
        if (!this.host.reducedMotion() && !fast) this.cameras.main.flash(st.ms ?? 300, ...(hex(st.color ?? '#ffffff')));
        return;
      case 'shake':
        if (!this.host.reducedMotion() && !fast) this.cameras.main.shake(st.ms ?? 300, (st.amount ?? 6) / 1000);
        return;
      case 'fade':
        if (!this.fade) return;
        await new Promise<void>((res) => this.tweens.add({ targets: this.fade, alpha: st.to === 'black' ? 1 : 0, duration: fast ? 1 : st.ms ?? 500, onComplete: () => res() }));
        return;
      case 'wait': await this.wait(st.ms); return;
      case 'sfx': audio.sfx(st.key as never); return;
      case 'music': audio.playMusic(st.key as never); return;
      case 'card': await this.host.card(st.text, st.sub); return;
      case 'backdrop': await this.setBackdrop(st.map); return;
      case 'caption': this.host.caption(st.text); if (!fast) await this.wait(Math.min(2600, 700 + st.text.length * 28)); return;
    }
  }

  private vfx(id: string, x: number, y: number, scale: number, ms: number) {
    const v = getVfx(id);
    const keys = v ? v.frames.map((_, i) => `vfx:${id}:${i}`).filter((k) => this.textures.exists(k)) : [];
    if (!keys.length) {
      const c = this.add.circle(x, y, 60 * scale, 0xfff2a0, 0.6).setDepth(4000);
      this.tweens.add({ targets: c, alpha: 0, scale: 1.8, duration: ms, onComplete: () => c.destroy() });
      return;
    }
    const img = this.add.image(x, y, keys[0]).setDepth(4000).setScale(scale * 3);
    let i = 0;
    const timer = this.time.addEvent({
      delay: Math.max(60, ms / Math.max(1, keys.length)),
      repeat: keys.length - 1,
      callback: () => {
        // the fade-out tween may already have destroyed the image; touching it would throw inside the scene's update loop
        if (!img.scene) return;
        img.setTexture(keys[i++ % keys.length]);
      },
    });
    img.once('destroy', () => timer.remove(false));
    this.tweens.add({ targets: img, alpha: 0, delay: ms * 0.7, duration: ms * 0.3, onComplete: () => img.destroy() });
  }
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
