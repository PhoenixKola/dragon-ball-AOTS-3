import type { Entity, MapDef, MapProp, Step } from '../../types/script';

/** feet-centre pixel position of a tile */
export const T = (tx: number, ty: number): { x: number; y: number } => ({ x: tx * 32 + 16, y: ty * 32 + 30 });

export class MB {
  tiles: string[][];
  props: MapProp[] = [];
  entities: Entity[] = [];
  constructor(public id: string, public name: string, public width: number, public height: number, base = '.', public region = id) {
    this.tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => base));
  }
  fill(x: number, y: number, w: number, h: number, ch: string) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < this.height && xx < this.width) this.tiles[yy][xx] = ch;
    return this;
  }
  box(x: number, y: number, w: number, h: number, ch: string) {
    this.fill(x, y, w, 1, ch).fill(x, y + h - 1, w, 1, ch).fill(x, y, 1, h, ch).fill(x + w - 1, y, 1, h, ch);
    return this;
  }
  border(ch = '#', thick = 1) {
    return this.box(0, 0, this.width, this.height, ch).fill(0, 0, this.width, thick, ch).fill(0, this.height - thick, this.width, thick, ch).fill(0, 0, thick, this.height, ch).fill(this.width - thick, 0, thick, this.height, ch);
  }
  hpath(y: number, x1: number, x2: number, wd = 2, ch = '=') {
    return this.fill(Math.min(x1, x2), y, Math.abs(x2 - x1) + 1, wd, ch);
  }
  vpath(x: number, y1: number, y2: number, wd = 2, ch = '=') {
    return this.fill(x, Math.min(y1, y2), wd, Math.abs(y2 - y1) + 1, ch);
  }
  /** scatter variation tiles deterministically */
  speckle(ch: string, from: string, every = 7, offset = 0) {
    let n = offset;
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (this.tiles[y][x] !== from) continue;
      n = (n * 1103515245 + 12345 + x * 31 + y * 17) >>> 0;
      if (n % every === 0) this.tiles[y][x] = ch;
    }
    return this;
  }
  prop(name: string, x: number, y: number, fw = 1, fh = 1, solid = true) {
    this.props.push({ prop: name, x, y, fw, fh, solid });
    return this;
  }
  row(name: string, x: number, y: number, n: number, dx: number, fw = 1, fh = 1, solid = true) {
    for (let i = 0; i < n; i++) this.prop(name, x + i * dx, y, fw, fh, solid);
    return this;
  }
  col(name: string, x: number, y: number, n: number, dy: number, fw = 1, fh = 1, solid = true) {
    for (let i = 0; i < n; i++) this.prop(name, x, y + i * dy, fw, fh, solid);
    return this;
  }
  e(...ents: Entity[]) {
    this.entities.push(...ents);
    return this;
  }
  build(o: { spawn: { x: number; y: number }; music: string; encounters?: string; encounterRate?: number; weather?: MapDef['weather']; light?: string }): MapDef {
    return {
      id: this.id, name: this.name, width: this.width, height: this.height, tiles: this.tiles.map((r) => r.join('')), props: this.props, entities: this.entities,
      spawn: o.spawn, music: o.music, encounters: o.encounters, encounterRate: o.encounterRate, weather: o.weather ?? 'none', light: o.light, region: this.region,
    };
  }
}

/* ------------------------------------------------------------------ entity shorthands */
type P = { x: number; y: number };
const at = (tx: number, ty: number): P => T(tx, ty);

export const npc = (id: string, name: string, actor: string, tx: number, ty: number, script: Step[], o: { facing?: 'up' | 'down' | 'left' | 'right'; when?: string; story?: string; wander?: number } = {}): Entity => ({
  kind: 'npc', id, name, actor, ...at(tx, ty), script, facing: o.facing ?? 'down', when: o.when, story: o.story, wander: o.wander,
});
export const foe = (id: string, name: string, actor: string, tx: number, ty: number, o: { story?: string; fight?: string; script?: Step[]; when?: string; patrol?: { dx: number; dy: number }; aggro?: number } = {}): Entity => ({
  kind: 'foe', id, name, actor, ...at(tx, ty), story: o.story, fight: o.fight ? { stage: o.fight } : undefined, script: o.script, when: o.when, patrol: o.patrol, aggro: o.aggro,
});
export const exit = (id: string, tx: number, ty: number, tw: number, th: number, to: { map: string; x: number; y: number; facing?: 'up' | 'down' | 'left' | 'right' }, o: { requires?: string; lockedText?: string; when?: string } = {}): Entity => ({
  kind: 'exit', id, x: tx * 32, y: ty * 32, w: tw * 32, h: th * 32, to: { map: to.map, x: to.x, y: to.y, facing: to.facing }, requires: o.requires, lockedText: o.lockedText, when: o.when,
});
export const chest = (id: string, tx: number, ty: number, o: { item?: string; n?: number; zeni?: number; when?: string; script?: Step[] }): Entity => ({
  kind: 'chest', id, ...at(tx, ty), item: o.item, n: o.n, zeni: o.zeni, when: o.when, script: o.script,
});
export const zone = (id: string, tx: number, ty: number, tw: number, th: number, o: { story?: string; script?: Step[]; once?: boolean; manual?: boolean; when?: string } = {}): Entity => ({
  kind: 'zone', id, x: tx * 32, y: ty * 32, w: tw * 32, h: th * 32, story: o.story, script: o.script, once: o.once, manual: o.manual, when: o.when,
});
export const point = (kind: 'save' | 'heal' | 'travel' | 'sign' | 'shop' | 'lever' | 'door' | 'terminal' | 'pickup', id: string, tx: number, ty: number, o: { text?: string; shop?: string; item?: string; n?: number; script?: Step[]; when?: string; w?: number; h?: number; closedWhen?: string; label?: string } = {}): Entity => ({
  kind, id, ...(kind === 'door' ? { x: tx * 32, y: ty * 32 } : at(tx, ty)), text: o.text, shop: o.shop, item: o.item, n: o.n, script: o.script, when: o.when, w: o.w, h: o.h, closedWhen: o.closedWhen, label: o.label,
});

export const say = (who: string, text: string): Step => ({ t: 'say', who, text });
export const set = (flag: string): Step => ({ t: 'set', flag });
export const cond = (c: string, then: Step[], els: Step[] = []): Step => ({ t: 'if', cond: c, then, else: els });
