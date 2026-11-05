import Phaser from 'phaser';
import aliasJson from '../../data/propAlias.generated.json';
import { getActor, getWorld, heroActorId } from '../assets';
import { evalCond } from '../../systems/cond';
import type { GameState } from '../../systems/gameState';
import type { Entity, FoeEntity, NpcEntity, PointEntity } from '../../types/script';
import { WorldSim, type WorldEvent, type Facing } from '../world/sim';
import { ensureActor, ensureMap, ensureObjects } from './loader';
import { registry } from '../assets';
import { input } from '../../systems/input';
import { BEAT_INDEX } from '../../data/story';

const ALIAS = aliasJson as Record<string, Record<string, string>>;
const TILE = 32;
const FOLLOW_LERP = 0.18;
type TileClass = 'floor' | 'floor2' | 'path' | 'wall' | 'water' | 'edge';
const TILE_KEYS: Record<string, TileClass> = { '.': 'floor', ',': 'floor2', '=': 'path', '#': 'wall', '~': 'water', ':': 'edge' };
const TILE_FALLBACK: Record<string, number> = { '.': 0x6a7a56, ',': 0x627250, '=': 0x9a8a6a, '#': 0x3a3a48, '~': 0x2a5a9a, ':': 0x7a7a6a };
const ORGANIC_PATH_MAPS = new Set(['gingertown', 'landing_future', 'rocky_outskirts', 'mountain_lab', 'android_island']);
const FOLLOW_ZOOM = 2;

interface Visual {
  e: Entity;
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Container | Phaser.GameObjects.Rectangle;
  label?: Phaser.GameObjects.Text;
  shadow?: Phaser.GameObjects.Ellipse;
}

interface SurvivorFollower {
  obj: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  trail: Array<{ x: number; y: number; t: number }>;
  nextSample: number;
  walkT: number;
  facing: Facing;
}

export interface WorldBridge {
  sim: WorldSim;
  /** true while a script/battle/menu owns the screen */
  blocked(): boolean;
  reducedMotion(): boolean;
  onEvents(events: WorldEvent[]): void;
  onPrompt(text: string | null): void;
  tick(dtMs: number): void;
}

export class WorldScene extends Phaser.Scene {
  bridge!: WorldBridge;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private visuals: Visual[] = [];
  private player?: Phaser.GameObjects.Image;
  private playerShadow?: Phaser.GameObjects.Ellipse;
  private survivorFollower?: SurvivorFollower;
  private mapId = '';
  private walkT = 0;
  private lastPlayerActor = '';
  private weather?: Phaser.GameObjects.Rectangle[];
  private mist?: Phaser.GameObjects.Image[];
  private exitArrows: Phaser.GameObjects.Text[] = [];
  private t = 0;
  loading = false;

  constructor() {
    super('World');
  }

  create() {
    this.cameras.main.setBackgroundColor('#05070d');
    this.cameras.main.setZoom(FOLLOW_ZOOM);
    this.cameras.main.setRoundPixels(true);
  }

  /** (re)build the scene for the sim's current map */
  async loadMap(state: GameState, sim: WorldSim) {
    this.loading = true;
    const map = sim.map;
    await ensureMap(this, map.id);
    await ensureObjects(this);
    // actors needed on this map
    const actors = new Set<string>();
    for (const e of map.entities) {
      if (e.kind === 'npc') actors.add(e.actor);
      if (e.kind === 'foe') actors.add(e.actor);
    }
    const leader = heroActorId(state.party[0] ?? 'trunks', 'base', { ...state.flags, goku_sick: false });
    actors.add(leader);
    await Promise.all([...actors].map((a) => ensureActor(this, a, getActor(a)?.kind === 'enemy' ? 'battle' : 'all')));
    this.destroyLayer();
    this.mapId = map.id;
    this.buildTerrain(sim);
    this.buildProps(sim);
    this.buildEntities(sim);
    this.buildPlayer(state, sim);
    this.buildSurvivorFollower(sim);
    this.buildWeather(sim);
    this.cameras.main.setBounds(0, 0, map.width * TILE, map.height * TILE);
    // Keep the camera round-pixel crisp while easing just enough to avoid a
    // hard snap when the player changes direction or enters a new map.
    this.cameras.main.startFollow(this.player!, true, FOLLOW_LERP, FOLLOW_LERP);
    this.cameras.main.centerOn(sim.px, sim.py - 16);
    this.loading = false;
  }

  private destroyLayer() {
    for (const o of this.layer) o.destroy();
    this.layer = [];
    this.visuals = [];
    this.exitArrows = [];
    this.weather = undefined;
    this.mist = undefined;
    this.player = undefined;
    this.survivorFollower = undefined;
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.layer.push(o);
    return o;
  }

  private buildTerrain(sim: WorldSim) {
    const map = sim.map;
    const rt = this.add2(this.add.renderTexture(0, 0, map.width * TILE, map.height * TILE).setOrigin(0, 0).setDepth(0));
    const mapSeed = [...map.id].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const ch = map.tiles[y][x];
        const tileClass = TILE_KEYS[ch] ?? 'floor';
        const variants = getWorld(map.id)?.tileVariants?.[tileClass] ?? [];
        const hash = (Math.imul(x + 1, 0x45d9f3b) ^ Math.imul(y + 3, 0x119de1f3) ^ mapSeed) >>> 0;
        const variant = variants.length ? hash % (variants.length + 1) : 0;
        const key = variant ? `tile:${map.id}:${tileClass}:variant:${variant - 1}` : `tile:${map.id}:${tileClass}`;
        if (this.textures.exists(key)) {
          // The original world sheets are seamless square textures. Orient each
          // tile deterministically so the authored texture keeps its palette and
          // detail without forming a visible 32px checkerboard across a whole map.
          const tile = this.make.image({ key, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, add: false });
          const organicGround = ['floor', 'floor2', 'water'].includes(tileClass)
            || (tileClass === 'path' && ORGANIC_PATH_MAPS.has(map.id))
            || (map.id === 'gingertown' && tileClass === 'wall');
          tile.setOrigin(0.5).setRotation(organicGround ? (hash & 3) * Math.PI / 2 : 0).setFlipX(organicGround && (hash & 4) !== 0);
          rt.draw(tile);
          tile.destroy();
        } else rt.fill(TILE_FALLBACK[ch] ?? 0x555555, 1, x * TILE, y * TILE, TILE, TILE);
      }
    }
    // soft shading on blocking tiles' bottom edge for depth
    const g = this.add2(this.add.graphics().setDepth(1));
    g.fillStyle(0x000000, 0.18);
    for (let y = 0; y < map.height - 1; y++) for (let x = 0; x < map.width; x++) {
      if ((map.tiles[y][x] === '#') && map.tiles[y + 1][x] !== '#' && map.tiles[y + 1][x] !== '~') g.fillRect(x * TILE, (y + 1) * TILE, TILE, 6);
    }
  }

  private buildProps(sim: WorldSim) {
    const map = sim.map;
    const world = getWorld(map.id);
    const alias = ALIAS[map.id] ?? {};
    for (const p of map.props) {
      const artName = alias[p.prop] ?? p.prop;
      const key = `prop:${map.id}:${artName}`;
      const cx = (p.x + p.fw / 2) * TILE;
      const bottom = (p.y + p.fh) * TILE;
      if (world?.props[artName] && this.textures.exists(key)) {
        const img = this.add2(this.add.image(cx, bottom, key).setOrigin(0.5, 1).setDepth(bottom));
        const pw = world.props[artName].w;
        if (p.fw >= 3 && pw > 0) img.setScale(Phaser.Math.Clamp((p.fw * TILE) / pw, 0.6, 2.4));
      } else {
        // labelled stand-in so missing prop art is obvious but still readable
        const r = this.add2(this.add.rectangle(cx, bottom, p.fw * TILE - 2, Math.max(p.fh * TILE, 28), 0x56506a, 0.9).setOrigin(0.5, 1).setStrokeStyle(2, 0x1a1626).setDepth(bottom));
        void r;
        this.add2(this.add.text(cx, bottom - 6, p.prop, { fontFamily: 'monospace', fontSize: '9px', color: '#d9d3ee' }).setOrigin(0.5, 1).setDepth(bottom + 1));
      }
    }
  }

  private owFrame(actor: string, dir: Facing, step: number | 'idle'): { key: string; scale: number; ox: number; oy: number } | null {
    const a = getActor(actor);
    if (!a) return null;
    const d = a.overworld?.[dir];
    const fr = d ? (step === 'idle' ? d.idle : d.walk[step % d.walk.length] ?? d.idle) : (a.battle.idle ?? null);
    if (!fr) return null;
    const key = d ? `act:${actor}:ow:${dir}:${step}` : `act:${actor}:idle`;
    // one scale per actor (down-facing idle) so walk frames and directions never change the sprite's size
    const ref = a.overworld?.down?.idle ?? d?.idle ?? fr;
    const h = Math.max(1, ref.bbox[3]);
    const target = a.owHeight ?? (a.kind === 'enemy' ? 70 : a.kind === 'hero' ? 54 : 52);
    return { key, scale: target / h, ox: fr.feet[0] / fr.w, oy: fr.feet[1] / fr.h };
  }

  private setOw(img: Phaser.GameObjects.Image, actor: string, dir: Facing, step: number | 'idle') {
    const f = this.owFrame(actor, dir, step);
    if (!f || !this.textures.exists(f.key)) {
      const fb = `act:${actor}:idle`;
      if (this.textures.exists(fb)) {
        img.setTexture(fb).setOrigin(0.5, 1).setScale(0.6);
      }
      return;
    }
    img.setTexture(f.key).setOrigin(f.ox, f.oy).setScale(f.scale);
    const a = getActor(actor);
    // enemies' stored frames face right (minions) or front; keep them facing the player's side
    if (a?.kind === 'enemy') img.setFlipX(a.battle.idle?.facing === 'right');
  }

  private buildEntities(sim: WorldSim) {
    const map = sim.map;
    for (const e of map.entities) {
      const v = this.makeVisual(e, sim);
      if (v) this.visuals.push(v);
    }
    for (const e of map.entities) {
      if (e.kind !== 'exit') continue;
      const cx = e.x + e.w / 2;
      const cy = e.y + e.h / 2;
      const arrow = this.add2(this.add.text(cx, cy, e.w > e.h ? (e.x < 100 ? '◀' : '▶') : e.y < 100 ? '▲' : '▼', { fontFamily: 'monospace', fontSize: '18px', color: '#ffe38a' }).setOrigin(0.5).setDepth(5).setAlpha(0.7));
      this.exitArrows.push(arrow);
    }
  }

  private makeVisual(e: Entity, sim: WorldSim): Visual | null {
    switch (e.kind) {
      case 'npc': {
        const n = e as NpcEntity;
        const img = this.add2(this.add.image(n.x, n.y, 'act:none').setOrigin(0.5, 1));
        this.setOw(img, n.actor, (n.facing ?? 'down') as Facing, 'idle');
        const shadow = this.add2(this.add.ellipse(n.x, n.y - 1, 24, 8, 0x000000, 0.3).setDepth(2));
        const label = this.add2(this.add.text(n.x, n.y - img.displayHeight - 4, n.story ? '!' : '', { fontFamily: 'monospace', fontSize: '16px', color: '#ffe14d', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(n.y + 2));
        return { e, obj: img, label, shadow };
      }
      case 'foe': {
        const f = e as FoeEntity;
        const img = this.add2(this.add.image(f.x, f.y, 'act:none').setOrigin(0.5, 1));
        this.setOw(img, f.actor, 'down', 'idle');
        const shadow = this.add2(this.add.ellipse(f.x, f.y - 1, 40, 10, 0x000000, 0.35).setDepth(2));
        const label = this.add2(this.add.text(f.x, f.y - img.displayHeight - 4, f.story ? '!!' : '!', { fontFamily: 'monospace', fontSize: '16px', color: '#ff6a5a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(f.y + 2));
        return { e, obj: img, label, shadow };
      }
      case 'chest': {
        const img = this.objectImage('chest-closed', e.x, e.y, 30);
        if (img) return { e, obj: img };
        const r = this.add2(this.add.rectangle(e.x, e.y, 22, 16, 0xc79a3a).setOrigin(0.5, 1).setStrokeStyle(2, 0x3a2a0c));
        this.add2(this.add.rectangle(e.x, e.y - 8, 6, 5, 0xf5e08a).setDepth(e.y + 1));
        return { e, obj: r };
      }
      case 'save': return this.building(e, 'save', 0x4aa8ff, 'SAVE');
      case 'heal': return this.building(e, 'heal', 0x4ae08a, 'HEAL');
      case 'shop': return this.building(e, 'shop', 0xff9a3a, 'SHOP');
      case 'travel': {
        const x = (e as PointEntity).x;
        const y = (e as PointEntity).y;
        const img = this.objectImage('flyer', x, y + 4, registry.objects?.flyer?.displayHeight ?? 48)
          ?? this.worldPropImage(['capsule_car', 'hovercar', 'truck'], x, y + 4, 44);
        if (!img) return this.marker(e, 0xb06aff, 'FLYER');
        const label = this.add2(this.add.text(x, y - img.displayHeight - 2, (e as PointEntity).label ?? 'CAPSULE FLYER', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(y + 2));
        return { e, obj: img, label };
      }
      case 'terminal': return this.interactiveProp(e, ['terminal', 'computer', 'console', 'machine'], 38, 0x9aa6b8);
      case 'lever': return this.interactiveProp(e, ['lever', 'console', 'machine', 'terminal'], 38, 0xd9b04a);
      case 'sign': {
        const p = e as PointEntity;
        const img = this.mapId === 'lab_inner'
          ? this.worldPropImage(['wall_panel', 'wall_terminal'], p.x, p.y + 4, 42)
          : this.objectImage('sign', p.x, p.y + 4, registry.objects?.sign?.displayHeight ?? 44)
            ?? this.worldPropImage(['sign'], p.x, p.y + 4, 42);
        return img ? { e, obj: img } : this.marker(e, 0xa87a4a, '');
      }
      case 'pickup': {
        const p = e as PointEntity;
        const img = this.worldPropImage(['crate', 'chest', 'crate_green', 'crate_yellow', 'crate_red'], p.x, p.y + 4, 34);
        return img ? { e, obj: img, label: this.entityLabel(p, img, p.label ?? 'SUPPLIES') } : this.marker(e, 0xffe14d, '');
      }
      case 'door': {
        const d = e as PointEntity;
        const img = this.worldPropImage(['lab_gate', 'wall_door', 'elevator_door', 'lab_gate_open'], d.x + ((d.w ?? 1) * TILE) / 2, d.y + ((d.h ?? 1) * TILE), 46);
        if (img) return { e, obj: img };
        const r = this.add2(this.add.rectangle(d.x, d.y, (d.w ?? 1) * TILE, (d.h ?? 1) * TILE, 0x2b2f3a).setOrigin(0, 0).setStrokeStyle(2, 0x9aa6b8).setDepth(d.y + 30));
        return { e, obj: r };
      }
      default: return null;
    }
    void sim;
  }

  /** bottom-anchored world object sprite from registry.objects (null when the art is missing) */
  private objectImage(key: string, x: number, y: number, displayH: number): Phaser.GameObjects.Image | null {
    const o = registry.objects?.[key];
    const tex = `obj:${key}`;
    if (!o || !this.textures.exists(tex)) return null;
    const img = this.add2(this.add.image(x, y, tex).setOrigin(o.feet[0] / o.w, o.feet[1] / o.h).setDepth(y));
    img.setScale(displayH / o.h);
    return img;
  }

  /** Use the current region's illustrated map prop for a visible interaction. */
  private worldPropImage(candidates: string[], x: number, y: number, displayH: number): Phaser.GameObjects.Image | null {
    const props = getWorld(this.mapId)?.props;
    for (const name of candidates) {
      const ref = props?.[name];
      const key = `prop:${this.mapId}:${name}`;
      if (!ref || !this.textures.exists(key)) continue;
      const img = this.add2(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(y));
      img.setScale(displayH / Math.max(1, ref.h));
      return img;
    }
    return null;
  }

  private entityLabel(e: PointEntity, img: Phaser.GameObjects.Image, fallback = ''): Phaser.GameObjects.Text | undefined {
    const text = e.label?.trim() || fallback.trim();
    if (!text) return undefined;
    return this.add2(this.add.text(e.x, e.y - img.displayHeight - 2, text, { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(e.y + 2));
  }

  private interactiveProp(e: Entity, candidates: string[], height: number, color: number): Visual {
    const p = e as PointEntity;
    const img = this.worldPropImage(candidates, p.x, p.y + 4, height);
    if (!img) return this.marker(e, color, p.label ?? '');
    return { e, obj: img, label: this.entityLabel(p, img, p.label ?? '') };
  }

  private building(e: Entity, key: string, color: number, text: string): Visual {
    const x = (e as { x: number }).x;
    const y = (e as { y: number }).y;
    const img = this.objectImage(key, x, y + 4, 66);
    if (!img) return this.marker(e, color, text);
    const label = this.add2(this.add.text(x, y - img.displayHeight - 2, text, { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(y + 2));
    return { e, obj: img, label };
  }

  private marker(e: Entity, color: number, text: string): Visual {
    const x = (e as { x: number }).x;
    const y = (e as { y: number }).y;
    const gr = this.add2(this.add.rectangle(x, y, 18, 22, color).setOrigin(0.5, 1).setStrokeStyle(2, 0x10131c).setDepth(y));
    const top = this.add2(this.add.rectangle(x, y - 22, 12, 12, 0xffffff, 0.8).setStrokeStyle(2, 0x10131c).setAngle(45).setDepth(y + 1));
    void top;
    const label = this.add2(this.add.text(x, y - 36, text, { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(y + 2));
    return { e, obj: gr, label };
  }

  private buildPlayer(state: GameState, sim: WorldSim) {
    const actor = heroActorId(state.party[0] ?? 'trunks', 'base', { ...state.flags, goku_sick: false });
    this.lastPlayerActor = actor;
    this.playerShadow = this.add2(this.add.ellipse(sim.px, sim.py, 26, 9, 0x000000, 0.35).setDepth(2));
    this.player = this.add2(this.add.image(sim.px, sim.py, 'act:none').setOrigin(0.5, 1));
    this.setOw(this.player, actor, sim.facing, 'idle');
  }

  /** Ginger Town's rescued civilian follows the actual player route to the evacuation shuttle. */
  private buildSurvivorFollower(sim: WorldSim) {
    if (sim.map.id !== 'gingertown') return;
    const x = sim.px - 30;
    const y = sim.py;
    const shadow = this.add2(this.add.ellipse(x, y - 1, 22, 7, 0x000000, 0.3).setDepth(2));
    const obj = this.add2(this.add.image(x, y, 'act:none').setOrigin(0.5, 1));
    this.setOw(obj, 'civilian', 'down', 'idle');
    const active = !!sim.state.flags.ginger_cellar_free && !sim.state.flags.ginger_survivor_evacuated;
    obj.setVisible(active);
    shadow.setVisible(active);
    this.survivorFollower = { obj, shadow, trail: [{ x, y, t: this.t }], nextSample: this.t, walkT: 0, facing: 'down' };
  }

  private buildWeather(sim: WorldSim) {
    const m = sim.map;
    const rects: Phaser.GameObjects.Rectangle[] = [];
    if (m.light === 'dim') rects.push(this.add2(this.add.rectangle(0, 0, m.width * TILE, m.height * TILE, 0x000820, 0.22).setOrigin(0, 0).setDepth(9000)));
    if (m.weather === 'mist' && this.textures.exists(`weather:${m.id}`)) {
      const key = `weather:${m.id}`;
      const xs = [m.width * TILE * 0.2, m.width * TILE * 0.52, m.width * TILE * 0.82];
      const ys = [m.height * TILE * 0.3, m.height * TILE * 0.56, m.height * TILE * 0.78];
      this.mist = xs.map((x, i) => this.add2(this.add.image(x, ys[i], key).setScale(0.28).setAlpha(0.19).setDepth(9001)));
    } else if (m.weather === 'mist' || m.weather === 'dust') {
      for (let i = 0; i < 6; i++) rects.push(this.add2(this.add.rectangle(Phaser.Math.Between(0, m.width * TILE), Phaser.Math.Between(0, m.height * TILE), 220, 60, m.weather === 'mist' ? 0xcfd8e6 : 0xd9b98a, 0.07).setDepth(9001)));
    }
    this.weather = rects;
  }

  /* ------------------------------------------------------------------ frame */
  override update(_t: number, dt: number) {
    if (!this.bridge || this.loading || !this.player) return;
    this.t += dt;
    const sim = this.bridge.sim;
    this.bridge.tick(dt);
    const blocked = this.bridge.blocked();
    const reducedMotion = this.bridge.reducedMotion();
    if (!blocked) {
      const held = input.held();
      const events = sim.update(Math.min(dt, 50), held);
      this.walkT += sim.moving ? dt : 0;
      if (events.length) this.bridge.onEvents(events);
    }
    // player visuals
    const step = sim.moving && !blocked ? Math.floor(this.walkT / 140) % 3 : 'idle';
    const actor = this.lastPlayerActor;
    this.setOw(this.player, actor, sim.facing, step);
    this.player.setPosition(Math.round(sim.px), Math.round(sim.py)).setDepth(sim.py);
    this.playerShadow?.setPosition(sim.px, sim.py - 1);
    this.updateSurvivorFollower(sim, dt, blocked);
    for (const v of this.visuals) {
      const active = sim.entityActive(v.e);
      (v.obj as Phaser.GameObjects.Image).setVisible(active);
      v.label?.setVisible(active);
      v.shadow?.setVisible(active);
      if (v.e.kind === 'foe') {
        const [fx, fy] = sim.foePos(v.e as FoeEntity);
        (v.obj as Phaser.GameObjects.Image).setPosition(fx, fy).setDepth(fy);
        v.label?.setPosition(fx, fy - (v.obj as Phaser.GameObjects.Image).displayHeight - 4 + (reducedMotion ? 0 : Math.sin(this.t / 200) * 2));
        v.shadow?.setPosition(fx, fy - 1);
      } else if (v.e.kind === 'npc') {
        // Entity coordinates are pixels; use the same feet-plane units as props and the player.
        (v.obj as Phaser.GameObjects.Image).setDepth(v.obj.y);
        const n = v.e as NpcEntity;
        const marker = n.story && sim.state.beat === BEAT_INDEX[n.story] ? '!' : '';
        if (v.label && v.label.text !== marker) v.label.setText(marker);
      } else if (v.e.kind === 'chest') {
        const opened = sim.state.opened.includes(`chest:${v.e.id}`);
        if (v.obj instanceof Phaser.GameObjects.Image) {
          const o = registry.objects?.[opened ? 'chest-open' : 'chest-closed'];
          const key = `obj:${opened ? 'chest-open' : 'chest-closed'}`;
          if (o && this.textures.exists(key) && v.obj.texture.key !== key) {
            v.obj.setTexture(key).setOrigin(o.feet[0] / o.w, o.feet[1] / o.h).setScale((opened ? 26 : 30) / o.h);
          }
        } else (v.obj as Phaser.GameObjects.Rectangle).setFillStyle(opened ? 0x6a5a3a : 0xc79a3a);
        v.obj.setDepth(v.e.y);
      } else if (v.e.kind === 'door') {
        const d = v.e as PointEntity;
        v.obj.setVisible(!!d.closedWhen && evalCond(sim.state, d.closedWhen));
      }
    }
    this.exitArrows.forEach((a, i) => a.setAlpha(reducedMotion ? 0.7 : 0.45 + 0.35 * Math.sin(this.t / 250 + i)));
    if (this.weather) this.weather.forEach((r, i) => {
      if (r.fillAlpha < 0.1 && !reducedMotion) {
        r.x += 0.009 * Math.min(dt, 50) * (i % 2 ? 1 : -1);
        if (r.x > sim.map.width * TILE + 120) r.x = -120;
        if (r.x < -120) r.x = sim.map.width * TILE + 120;
      }
    });
    if (this.mist && !reducedMotion) this.mist.forEach((img, i) => {
      img.x += 0.004 * Math.min(dt, 50) * (i % 2 ? 1 : -1);
    });
    // prompt
    const tgt = blocked ? null : sim.interactTarget();
    this.bridge.onPrompt(tgt ? this.promptFor(tgt, sim.state) : null);
  }

  private updateSurvivorFollower(sim: WorldSim, dt: number, blocked: boolean) {
    const follower = this.survivorFollower;
    if (!follower) return;
    const active = !!sim.state.flags.ginger_cellar_free && !sim.state.flags.ginger_survivor_evacuated;
    follower.obj.setVisible(active);
    follower.shadow.setVisible(active);
    if (!active) return;
    const now = this.t;
    if (!blocked && now >= follower.nextSample) {
      follower.trail.push({ x: sim.px, y: sim.py, t: now });
      follower.nextSample = now + 55;
    }
    while (follower.trail.length > 2 && follower.trail[1].t < now - 900) follower.trail.shift();
    const targetT = now - 360;
    let target = follower.trail[0];
    for (let i = 1; i < follower.trail.length; i++) {
      const next = follower.trail[i];
      if (next.t >= targetT) {
        const prev = follower.trail[i - 1];
        const span = Math.max(1, next.t - prev.t);
        const a = Phaser.Math.Clamp((targetT - prev.t) / span, 0, 1);
        target = { x: Phaser.Math.Linear(prev.x, next.x, a), y: Phaser.Math.Linear(prev.y, next.y, a), t: targetT };
        break;
      }
      target = next;
    }
    // Keep the rescuee close enough to read as following, but out of the
    // player's silhouette when the player pauses at an objective or shuttle.
    if (Math.hypot(target.x - sim.px, target.y - sim.py) < 38) {
      const behind = { up: [0, 38], down: [0, -38], left: [38, 0], right: [-38, 0] }[sim.facing];
      target = { ...target, x: sim.px + behind[0], y: sim.py + behind[1] };
    }
    const dx = target.x - follower.obj.x;
    const dy = target.y - follower.obj.y;
    const distance = Math.hypot(dx, dy);
    const moving = distance > 3;
    if (moving) {
      const step = Math.min(distance, 155 * Math.min(dt, 50) / 1000);
      follower.obj.x += dx / distance * step;
      follower.obj.y += dy / distance * step;
      follower.walkT += dt;
      if (Math.abs(dx) > Math.abs(dy)) follower.facing = dx >= 0 ? 'right' : 'left';
      else follower.facing = dy >= 0 ? 'down' : 'up';
    }
    const frame = moving ? Math.floor(follower.walkT / 150) % 3 : 'idle';
    this.setOw(follower.obj, 'civilian', follower.facing, frame);
    follower.obj.setPosition(Math.round(follower.obj.x), Math.round(follower.obj.y)).setDepth(follower.obj.y);
    follower.shadow.setPosition(follower.obj.x, follower.obj.y - 1);
  }

  private promptFor(e: Entity, s: GameState): string {
    switch (e.kind) {
      case 'npc': return `Talk: ${e.name}`;
      case 'foe': return `Challenge: ${e.name}`;
      case 'chest': return s.opened.includes(`chest:${e.id}`) ? 'Empty chest' : 'Open chest';
      case 'save': return 'Save game';
      case 'heal': return 'Rest and recover';
      case 'shop': return 'Shop';
      case 'travel': return 'Capsule Flyer';
      case 'pickup': return `Take: ${(e as PointEntity).label ?? 'item'}`;
      case 'terminal': case 'lever': case 'sign': case 'door': return (e as PointEntity).label ?? 'Examine';
      case 'zone': return 'Interact';
      default: return 'Interact';
    }
  }

  debugState() {
    return { map: this.mapId, player: this.player ? { x: this.player.x, y: this.player.y, tex: this.player.texture.key } : null, visuals: this.visuals.length, missing: this.visuals.filter((v) => (v.obj as Phaser.GameObjects.Image).texture?.key === 'act:none').length };
  }
}
