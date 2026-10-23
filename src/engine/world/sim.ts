import { BEAT_INDEX } from '../../data/story';
import { MAPS } from '../../data/maps';
import { ENCOUNTER_TABLES } from '../../data/enemies';
import { evalCond } from '../../systems/cond';
import type { GameState } from '../../systems/gameState';
import { nextStagePower } from '../../systems/progression';
import type { Entity, FoeEntity, MapDef, NpcEntity, PointEntity } from '../../types/script';
import { Rng } from '../combat/rng';
import { TILE, buildCollision, moveBody, nearestFreeTile } from './collision';

export const WALK_SPEED = 118; // px/s
export const RUN_SPEED = 190;
export const INTERACT_REACH = 30;
export const ENTITY_BODY = 22;

export type Facing = 'up' | 'down' | 'left' | 'right';

export type WorldEvent =
  | { type: 'interact'; entity: Entity }
  | { type: 'exit'; entity: Entity & { kind: 'exit' } }
  | { type: 'zone'; entity: Entity & { kind: 'zone' } }
  | { type: 'foe'; entity: FoeEntity }
  | { type: 'encounter'; enemies: string[]; p: number }
  | { type: 'blocked'; text: string }
  | { type: 'step' };

export interface Mover {
  id: string;
  x: number;
  y: number;
  dir: Facing;
  moving: boolean;
}

/**
 * Pure exploration simulation. The Phaser WorldScene renders it; the headless bot and tests drive it with the same update().
 * All state lives in GameState (position) so saving mid-map is exact.
 */
export class WorldSim {
  map: MapDef;
  px: number;
  py: number;
  facing: Facing;
  moving = false;
  encountersEnabled = true;
  private enc = new Rng(1);
  private stepAccum = 0;
  private graceMs = 2500;
  private foeOffsets = new Map<string, { t: number }>();
  /** edge detection for zones/exits so they fire once per entry */
  private inside = new Set<string>();
  time = 0;

  constructor(public state: GameState) {
    this.map = MAPS[state.mapId];
    this.px = state.x;
    this.py = state.y;
    this.facing = state.facing;
    this.enc = new Rng(state.seedCounter * 7919 + state.stats.stepsTaken);
  }

  /* ------------------------------------------------------------ entity queries */
  entityActive(e: Entity): boolean {
    const s = this.state;
    if (s.opened.includes(`hidden:${e.id}`)) return false;
    if (e.when && !evalCond(s, e.when)) return false;
    const story = (e as { story?: string }).story;
    if (story && (e.kind === 'foe' || e.kind === 'zone')) {
      if (s.beat !== BEAT_INDEX[story]) return false;
    }
    if (e.kind === 'foe' && e.fight && s.opened.includes(`defeated:${e.id}`)) return false;
    if (e.kind === 'chest' && s.opened.includes(`chest:${e.id}`)) return true;
    if (e.kind === 'pickup' && s.opened.includes(`pickup:${e.id}`)) return false;
    return true;
  }

  activeEntities(): Entity[] {
    return this.map.entities.filter((e) => this.entityActive(e));
  }

  /** entities whose body blocks movement (npc, chest, foe, save/heal/shop/terminal pillars, closed doors) */
  private bodyBlocked = (tx: number, ty: number): boolean => {
    for (const e of this.map.entities) {
      if (!this.entityActive(e)) continue;
      switch (e.kind) {
        case 'save': case 'heal': case 'shop':
          // the building sprite is about three tiles wide
          if (Math.abs(Math.floor(e.x / TILE) - tx) <= 1 && Math.floor(e.y / TILE) === ty) return true;
          break;
        case 'npc': case 'chest': case 'terminal': case 'lever': case 'travel': case 'sign':
          if (Math.floor(e.x / TILE) === tx && Math.floor(e.y / TILE) === ty) return true;
          break;
        case 'door': {
          const d = e as PointEntity;
          if (d.closedWhen && evalCond(this.state, d.closedWhen)) {
            const x0 = Math.floor(d.x / TILE);
            const y0 = Math.floor(d.y / TILE);
            if (tx >= x0 && tx < x0 + (d.w ?? 1) && ty >= y0 && ty < y0 + (d.h ?? 1)) return true;
          }
          break;
        }
        default: break;
      }
    }
    return false;
  };

  isBlockedTile = (tx: number, ty: number) => this.bodyBlocked(tx, ty);

  /* ------------------------------------------------------------ map switching */
  warp(mapId: string, tx: number, ty: number, facing?: Facing) {
    this.state.mapId = mapId;
    this.map = MAPS[mapId];
    const free = nearestFreeTile(this.map, tx, ty, this.bodyBlocked);
    const p = free ?? { x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 2 };
    this.px = p.x;
    this.py = p.y;
    if (facing) this.facing = facing;
    this.inside.clear();
    this.graceMs = 2500;
    this.stepAccum = 0;
    this.sync();
  }

  sync() {
    this.state.x = this.px;
    this.state.y = this.py;
    this.state.facing = this.facing;
  }

  /* ------------------------------------------------------------ simulation step */
  update(dtMs: number, input: { dx: number; dy: number; run?: boolean }): WorldEvent[] {
    const events: WorldEvent[] = [];
    this.time += dtMs;
    this.graceMs = Math.max(0, this.graceMs - dtMs);
    let { dx, dy } = input;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (len > 0) {
      dx /= len;
      dy /= len;
      const speed = (input.run ? RUN_SPEED : WALK_SPEED) * (dtMs / 1000);
      if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? 'right' : 'left';
      else this.facing = dy > 0 ? 'down' : 'up';
      const g = buildCollision(this.map);
      const r = moveBody(g, this.px, this.py, dx * speed, dy * speed, this.bodyBlocked);
      const moved = Math.hypot(r.x - this.px, r.y - this.py);
      this.px = r.x;
      this.py = r.y;
      if (moved > 0.01) {
        this.stepAccum += moved;
        if (this.stepAccum >= TILE) {
          this.stepAccum -= TILE;
          this.state.stats.stepsTaken++;
          events.push({ type: 'step' });
          const enc = this.rollEncounter();
          if (enc) events.push(enc);
        }
      }
    }
    this.patrol(dtMs);
    for (const e of this.activeEntities()) {
      if (e.kind === 'exit') {
        const over = this.overlaps(e.x, e.y, e.w, e.h);
        const was = this.inside.has(e.id);
        if (over && !was) {
          this.inside.add(e.id);
          if (e.requires && !evalCond(this.state, e.requires)) events.push({ type: 'blocked', text: e.lockedText ?? 'You cannot go that way yet.' });
          else events.push({ type: 'exit', entity: e });
        } else if (!over && was) this.inside.delete(e.id);
      } else if (e.kind === 'zone' && !e.manual) {
        const over = this.overlaps(e.x, e.y, e.w, e.h);
        const was = this.inside.has(e.id);
        if (over && !was) {
          this.inside.add(e.id);
          if (!(e.once && this.state.opened.includes(`zone:${e.id}`))) events.push({ type: 'zone', entity: e });
        } else if (!over && was) this.inside.delete(e.id);
      } else if (e.kind === 'foe') {
        const [fx, fy] = this.foePos(e);
        if (Math.hypot(fx - this.px, fy - (this.py - 10)) <= (e.aggro ?? 46)) events.push({ type: 'foe', entity: e });
      }
    }
    this.sync();
    return events;
  }

  private overlaps(x: number, y: number, w: number, h: number): boolean {
    return this.px + 6 > x && this.px - 6 < x + w && this.py > y && this.py - 6 < y + h;
  }

  private patrol(dtMs: number) {
    for (const e of this.map.entities) {
      if (e.kind !== 'foe' || !e.patrol) continue;
      const o = this.foeOffsets.get(e.id) ?? { t: 0 };
      o.t += dtMs / 1000;
      this.foeOffsets.set(e.id, o);
    }
  }

  foePos(e: FoeEntity): [number, number] {
    if (!e.patrol) return [e.x, e.y];
    const t = this.foeOffsets.get(e.id)?.t ?? 0;
    const k = Math.sin(t * 0.8);
    return [e.x + e.patrol.dx * k, e.y + e.patrol.dy * k];
  }

  /* ------------------------------------------------------------ interaction */
  /** nearest active interactable in front of the player */
  interactTarget(): Entity | null {
    const fx = this.px + (this.facing === 'left' ? -INTERACT_REACH : this.facing === 'right' ? INTERACT_REACH : 0);
    const fy = this.py - 10 + (this.facing === 'up' ? -INTERACT_REACH : this.facing === 'down' ? INTERACT_REACH : 0);
    let best: Entity | null = null;
    let bd = 1e9;
    for (const e of this.activeEntities()) {
      let ex: number;
      let ey: number;
      let range = 34;
      switch (e.kind) {
        case 'npc': case 'chest': case 'save': case 'heal': case 'shop': case 'terminal': case 'lever': case 'travel': case 'sign': case 'pickup':
          ex = e.x;
          ey = e.y - 10;
          break;
        case 'foe': {
          const [x, y] = this.foePos(e);
          ex = x;
          ey = y - 10;
          range = 40;
          break;
        }
        case 'door': ex = e.x + ((e as PointEntity).w ?? 1) * TILE / 2; ey = e.y + ((e as PointEntity).h ?? 1) * TILE / 2; range = 40; break;
        case 'zone':
          if (!e.manual || !this.overlaps(e.x, e.y, e.w, e.h)) continue;
          ex = this.px;
          ey = this.py;
          break;
        default: continue;
      }
      const d = Math.min(Math.hypot(ex - fx, ey - fy), Math.hypot(ex - this.px, ey - (this.py - 10)) * 0.9);
      if (d < range && d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  interact(): WorldEvent | null {
    const t = this.interactTarget();
    return t ? { type: 'interact', entity: t } : null;
  }

  /* ------------------------------------------------------------ encounters */
  private rollEncounter(): WorldEvent | null {
    const table = this.map.encounters ? ENCOUNTER_TABLES[this.map.encounters] : undefined;
    if (!this.encountersEnabled || !table || this.graceMs > 0) return null;
    // never within reach of a story trigger or an NPC conversation point
    for (const e of this.activeEntities()) {
      if ((e.kind === 'foe' || e.kind === 'zone') && (e as { story?: string }).story) {
        const cx = e.kind === 'zone' ? e.x + e.w / 2 : e.x;
        const cy = e.kind === 'zone' ? e.y + e.h / 2 : e.y;
        if (Math.hypot(cx - this.px, cy - this.py) < 160) return null;
      }
    }
    const rate = this.map.encounterRate ?? 0.06;
    if (this.enc.next() > rate) return null;
    const f = this.enc.weighted(table, (t) => t.weight);
    this.graceMs = 20000;
    return { type: 'encounter', enemies: f.enemies, p: Math.max(6, nextStagePower(this.state) - 1) };
  }
}

export const isNpc = (e: Entity): e is NpcEntity => e.kind === 'npc';
export const WORLD_TILE = TILE;
