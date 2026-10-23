import type { MapDef } from '../../types/script';

export const TILE = 32;
/** player collision body (feet box), in px */
export const BODY_W = 18;
export const BODY_H = 12;

const SOLID_CHARS = new Set(['#', '~']);

export interface CollisionGrid {
  w: number;
  h: number;
  blocked: Uint8Array;
}

const cache = new WeakMap<MapDef, CollisionGrid>();

export function buildCollision(map: MapDef): CollisionGrid {
  const hit = cache.get(map);
  if (hit) return hit;
  const blocked = new Uint8Array(map.width * map.height);
  for (let y = 0; y < map.height; y++) {
    const row = map.tiles[y] ?? '';
    for (let x = 0; x < map.width; x++) {
      if (SOLID_CHARS.has(row[x] ?? '#')) blocked[y * map.width + x] = 1;
    }
  }
  for (const p of map.props) {
    if (!p.solid) continue;
    for (let dy = 0; dy < p.fh; dy++) {
      for (let dx = 0; dx < p.fw; dx++) {
        const tx = p.x + dx;
        const ty = p.y + dy;
        if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height) blocked[ty * map.width + tx] = 1;
      }
    }
  }
  const g = { w: map.width, h: map.height, blocked };
  cache.set(map, g);
  return g;
}

export const tileBlocked = (g: CollisionGrid, tx: number, ty: number): boolean => tx < 0 || ty < 0 || tx >= g.w || ty >= g.h || g.blocked[ty * g.w + tx] === 1;

/** is the body box centred horizontally at (x, y=feet) free of static geometry? */
export function bodyFree(g: CollisionGrid, x: number, y: number, extra?: (tx: number, ty: number) => boolean): boolean {
  const x0 = Math.floor((x - BODY_W / 2) / TILE);
  const x1 = Math.floor((x + BODY_W / 2 - 0.001) / TILE);
  const y0 = Math.floor((y - BODY_H) / TILE);
  const y1 = Math.floor((y - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileBlocked(g, tx, ty)) return false;
      if (extra && extra(tx, ty)) return false;
    }
  }
  return true;
}

export function isWalkablePx(map: MapDef, x: number, y: number): boolean {
  return bodyFree(buildCollision(map), x, y);
}

/** axis-separated move with collision; returns the new position */
export function moveBody(g: CollisionGrid, x: number, y: number, dx: number, dy: number, extra?: (tx: number, ty: number) => boolean): { x: number; y: number; hitX: boolean; hitY: boolean } {
  let nx = x;
  let ny = y;
  let hitX = false;
  let hitY = false;
  if (dx !== 0) {
    if (bodyFree(g, x + dx, y, extra)) nx = x + dx;
    else {
      hitX = true;
      // slide up to the wall in 1px steps
      const sgn = Math.sign(dx);
      for (let i = 0; i < Math.abs(dx); i++) {
        if (bodyFree(g, nx + sgn, y, extra)) nx += sgn;
        else break;
      }
    }
  }
  if (dy !== 0) {
    if (bodyFree(g, nx, y + dy, extra)) ny = y + dy;
    else {
      hitY = true;
      const sgn = Math.sign(dy);
      for (let i = 0; i < Math.abs(dy); i++) {
        if (bodyFree(g, nx, ny + sgn, extra)) ny += sgn;
        else break;
      }
    }
  }
  return { x: nx, y: ny, hitX, hitY };
}

/** BFS over tile centres for the nearest free tile (spawn repair, warps) */
export function nearestFreeTile(map: MapDef, tx: number, ty: number, extra?: (tx: number, ty: number) => boolean): { x: number; y: number } | null {
  const g = buildCollision(map);
  const seen = new Set<number>();
  const q: [number, number][] = [[tx, ty]];
  while (q.length) {
    const [cx, cy] = q.shift()!;
    const key = cy * 4096 + cx;
    if (seen.has(key) || cx < 0 || cy < 0 || cx >= g.w || cy >= g.h) continue;
    seen.add(key);
    if (bodyFree(g, cx * TILE + TILE / 2, cy * TILE + TILE - 2, extra)) return { x: cx * TILE + TILE / 2, y: cy * TILE + TILE - 2 };
    q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    if (seen.size > 4000) break;
  }
  return null;
}

/** 4-connected path over tile centres where the body fits. Returns tile list including start/goal or null. */
export function findPath(map: MapDef, from: { x: number; y: number }, to: { x: number; y: number }, extra?: (tx: number, ty: number) => boolean): { x: number; y: number }[] | null {
  const g = buildCollision(map);
  const sx = Math.floor(from.x / TILE);
  const sy = Math.floor((from.y - 0.01) / TILE); // feet exactly on a tile border belong to the tile above (the body box occupies it)
  const gx = Math.floor(to.x / TILE);
  const gy = Math.floor(to.y / TILE);
  const free = (cx: number, cy: number) => bodyFree(g, cx * TILE + TILE / 2, cy * TILE + TILE - 2, extra);
  const prev = new Map<number, number>();
  const key = (x: number, y: number) => y * 4096 + x;
  const q: [number, number][] = [[sx, sy]];
  prev.set(key(sx, sy), -1);
  let found = false;
  while (q.length) {
    const [cx, cy] = q.shift()!;
    if (cx === gx && cy === gy) {
      found = true;
      break;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      if (!(nx === gx && ny === gy) && !free(nx, ny)) continue;
      prev.set(k, key(cx, cy));
      q.push([nx, ny]);
    }
  }
  if (!found) return null;
  const out: { x: number; y: number }[] = [];
  let k = key(gx, gy);
  while (k !== -1) {
    out.push({ x: k % 4096, y: Math.floor(k / 4096) });
    k = prev.get(k) ?? -1;
  }
  return out.reverse();
}
