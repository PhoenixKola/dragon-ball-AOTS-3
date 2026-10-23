import { MAPS, TRAVEL_DESTINATIONS } from '../../data/maps';
import { BEATS } from '../../data/story';
import { evalCond } from '../../systems/cond';
import type { GameState } from '../../systems/gameState';
import { maxStats } from '../../systems/gameState';
import type { Entity } from '../../types/script';
import { TILE, bodyFree, buildCollision, findPath } from './collision';
import type { WorldSim } from './sim';

export interface MapEdge {
  to: string;
  kind: 'exit' | 'travel';
  entity: Entity;
}

/** edges leaving `from` that are usable right now (conditions honoured) */
export function mapEdges(s: GameState, from: string): MapEdge[] {
  const out: MapEdge[] = [];
  const m = MAPS[from];
  for (const e of m.entities) {
    if (e.kind === 'exit' && (!e.requires || evalCond(s, e.requires)) && (!e.when || evalCond(s, e.when))) out.push({ to: e.to.map, kind: 'exit', entity: e });
    if (e.kind === 'travel') for (const d of TRAVEL_DESTINATIONS) if (d.map !== from && evalCond(s, d.when)) out.push({ to: d.map, kind: 'travel', entity: e });
  }
  // walking is preferred over the Capsule Flyer when both reach the same map
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'exit' ? -1 : 1));
}

export function route(s: GameState, from: string, to: string): MapEdge[] | null {
  if (from === to) return [];
  const prev = new Map<string, { from: string; edge: MapEdge }>();
  const q = [from];
  const seen = new Set([from]);
  while (q.length) {
    const cur = q.shift()!;
    for (const e of mapEdges(s, cur)) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { from: cur, edge: e });
      if (e.to === to) {
        const out: MapEdge[] = [];
        let k = to;
        while (k !== from) {
          const p = prev.get(k)!;
          out.unshift(p.edge);
          k = p.from;
        }
        return out;
      }
      q.push(e.to);
    }
  }
  return null;
}

function nextGoalToMap(s: GameState, here: string, target: string): Goal {
  const r = route(s, here, target)!;
  const e = r[0];
  if (e.kind === 'travel') return { kind: 'interact', entityId: e.entity.id, why: 'travel', travelTo: e.to };
  const c = center(e.entity);
  return { kind: 'walk', x: c.x, y: c.y, why: `walk to ${target}` };
}

export type Goal =
  | { kind: 'walk'; x: number; y: number; why: string }
  | { kind: 'interact'; entityId: string; why: string; travelTo?: string }
  | { kind: 'done' };

const center = (e: Entity) => (e.kind === 'exit' || e.kind === 'zone' ? { x: e.x + e.w / 2, y: e.y + e.h / 2 } : { x: (e as { x: number }).x, y: (e as { y: number }).y });

/** what a sensible player does next to advance the story through the real world (no teleports, no skipping) */
export function nextGoal(s: GameState, sim: WorldSim): Goal {
  const b = BEATS[s.beat];
  if (!b) {
    // story complete: the postgame simulation console at Capsule Corp (non-canonical rematches)
    if (s.postgame.records.SIM_JUNIORS) return { kind: 'done' };
    if (sim.map.id !== 'capsule_corp') return route(s, sim.map.id, 'capsule_corp') ? nextGoalToMap(s, sim.map.id, 'capsule_corp') : { kind: 'done' };
    return { kind: 'interact', entityId: 'sim_bulma', why: 'start a postgame simulation' };
  }
  const here = sim.map.id;
  const mapById = (id: string) => MAPS[id];
  const goMap = (target: string, why: string): Goal | null => {
    const r = route(s, here, target);
    if (!r) return null;
    if (r.length === 0) return null;
    const e = r[0];
    if (e.kind === 'travel') return { kind: 'interact', entityId: e.entity.id, why, travelTo: e.to };
    const c = center(e.entity);
    return { kind: 'walk', x: c.x, y: c.y, why: `${why} via ${e.entity.id}` };
  };
  // prerequisites the player has to discover
  if (b.id === 'A06' && !s.flags.lab_door_open) {
    if (here !== 'mountain_lab') return goMap('mountain_lab', 'find the lab lever') ?? { kind: 'done' };
    return { kind: 'interact', entityId: 'lever_lab', why: 'throw the lab lever' };
  }
  if (b.id === 'G01' && !s.flags.ponr_accepted) {
    if (here !== 'cell_games_approach') return goMap('cell_games_approach', 'talk to the tournament official') ?? { kind: 'done' };
    return { kind: 'interact', entityId: 'ca_official', why: 'accept the point of no return' };
  }
  if (here !== b.map) return goMap(b.map, `travel to ${b.map} for ${b.id}`) ?? { kind: 'done' };
  // heal first when hurt and a pad is nearby
  const hurt = s.party.some((h) => s.roster[h].hp < maxStats(s, h).hp * 0.7 || s.roster[h].ki < maxStats(s, h).ki * 0.6);
  const pad = mapById(here).entities.find((e) => e.kind === 'heal' && sim.entityActive(e));
  if (hurt && pad) return { kind: 'interact', entityId: pad.id, why: 'rest before the fight' };
  const trig = mapById(here).entities.find((e) => (e as { story?: string }).story === b.id);
  if (!trig) return { kind: 'done' };
  if (trig.kind === 'npc') return { kind: 'interact', entityId: trig.id, why: `start ${b.id}` };
  const c = trig.kind === 'foe' ? (() => { const [x, y] = sim.foePos(trig); return { x, y }; })() : center(trig);
  return { kind: 'walk', x: c.x, y: c.y, why: `walk to ${b.id} trigger` };
}

/** next movement vector toward a pixel target using the real collision grid; null when there or unreachable */
export function dirTo(sim: WorldSim, tx: number, ty: number): { dx: number; dy: number; arrived: boolean; blocked: boolean } {
  const dist = Math.hypot(tx - sim.px, ty - sim.py);
  if (dist < 8) return { dx: 0, dy: 0, arrived: true, blocked: false };
  const path = findPath(sim.map, { x: sim.px, y: sim.py }, { x: tx, y: ty }, sim.isBlockedTile);
  if (!path) return { dx: 0, dy: 0, arrived: false, blocked: true };
  if (path.length < 2) {
    const l0 = Math.hypot(tx - sim.px, ty - sim.py) || 1;
    return { dx: (tx - sim.px) / l0, dy: (ty - sim.py) / l0, arrived: false, blocked: false };
  }
  // aim at the first waypoint we are not already standing on
  let idx = 1;
  for (; idx < path.length - 1; idx++) {
    const gx = path[idx].x * TILE + TILE / 2;
    const gy = path[idx].y * TILE + TILE - 2;
    if (Math.hypot(gx - sim.px, gy - sim.py) > 6) break;
  }
  const last = idx >= path.length - 1;
  const gx = last ? tx : path[idx].x * TILE + TILE / 2;
  const gy = last ? ty : path[idx].y * TILE + TILE - 2;
  const dx = gx - sim.px;
  const dy = gy - sim.py;
  const l = Math.hypot(dx, dy) || 1;
  return { dx: dx / l, dy: dy / l, arrived: false, blocked: false };
}

/** a free standing point next to an entity so that the player can interact with it */
export function standPoint(sim: WorldSim, e: Entity): { x: number; y: number; face: 'up' | 'down' | 'left' | 'right' } | null {
  const c = center(e);
  const tx = Math.floor(c.x / TILE);
  const ty = Math.floor(c.y / TILE);
  const dirs: [number, number, 'up' | 'down' | 'left' | 'right'][] = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']];
  let best: { x: number; y: number; face: 'up' | 'down' | 'left' | 'right'; len: number } | null = null;
  for (const [dx, dy, face] of dirs) {
    const gx = (tx + dx) * TILE + TILE / 2;
    const gy = (ty + dy) * TILE + TILE - 2;
    // the standing spot itself must be walkable (wide pads block their side tiles)
    if (sim.isBlockedTile(tx + dx, ty + dy) || !bodyFree(buildCollision(sim.map), gx, gy, sim.isBlockedTile)) continue;
    const p = findPath(sim.map, { x: sim.px, y: sim.py }, { x: gx, y: gy }, sim.isBlockedTile);
    if (p && (!best || p.length < best.len)) best = { x: gx, y: gy, face, len: p.length };
  }
  return best ? { x: best.x, y: best.y, face: best.face } : null;
}
