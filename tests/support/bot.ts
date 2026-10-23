import { GameController, type BattleKind, type ControllerHost } from '../../src/app/controller';
import { ITEMS } from '../../src/data/items';
import { MAPS, TRAVEL_DESTINATIONS } from '../../src/data/maps';
import { getSkill } from '../../src/data/skills';
import { BEATS } from '../../src/data/story';
import { Battle, type BattleSetup } from '../../src/engine/combat/engine';
import { chooseAction } from '../../src/engine/combat/policy';
import { Rng } from '../../src/engine/combat/rng';
import { TILE, findPath } from '../../src/engine/world/collision';
import { evalCond } from '../../src/systems/cond';
import type { GameState } from '../../src/systems/gameState';
import { maxStats } from '../../src/systems/gameState';
import type { RewardSummary } from '../../src/systems/progression';
import { useFieldItem, buyItem, learnedSkillIds, setLoadout, shopStock } from '../../src/systems/progression';
import type { GuardGrade, StageDef } from '../../src/types';
import type { Entity, PointEntity } from '../../src/types/script';

export interface GuardPolicy {
  name: string;
  perfect: number;
  good: number;
  difficulty: 'easy' | 'normal';
}
export const POLICIES: Record<string, GuardPolicy> = {
  attentive: { name: 'attentive', perfect: 0.55, good: 0.35, difficulty: 'normal' },
  average: { name: 'average', perfect: 0.15, good: 0.45, difficulty: 'normal' },
  noguard_easy: { name: 'noguard_easy', perfect: 0, good: 0, difficulty: 'easy' },
  noguard_normal: { name: 'noguard_normal', perfect: 0, good: 0, difficulty: 'normal' },
};

export interface BattleLog {
  stage: string;
  kind: string;
  outcome: string;
  rounds: number;
  turns: number;
  hitsTaken: number;
  perfect: number;
  good: number;
  missed: number;
  itemsUsed: number;
  rageArts: number;
  party: string;
  attempt: number;
}

/* ------------------------------------------------------------------ battle policy (uses only the public Battle API) */
export function playBattle(b: Battle, pol: GuardPolicy, rng: Rng, _state: GameState): void {
  let guard = 0;
  b.start();
  let safety = 0;
  while (!b.ended) {
    if (++safety > 20000) throw new Error('battle did not terminate: ' + b.summary());
    if (b.phase === 'guard' && b.pending) {
      const r = rng.next();
      const g: GuardGrade = r < pol.perfect ? 'perfect' : r < pol.perfect + pol.good ? 'good' : 'none';
      b.provideGuard(g);
      guard++;
      continue;
    }
    const f = b.current;
    if (!f) throw new Error('no actor while waiting for input');
    const a = chooseAction(b, f);
    const res = b.submit(a);
    if (!res.ok) {
      const fb = b.submit({ kind: 'attack', targetUid: b.livingEnemies()[0]?.uid ?? '' });
      if (!fb.ok) b.submit({ kind: 'defend' });
    }
  }
  void guard;
  b.drainEvents();
}

/* ------------------------------------------------------------------ headless host + world bot */
export class HeadlessHost implements ControllerHost {
  logs: BattleLog[] = [];
  toasts: string[] = [];
  rewards: { stage: string; summary: RewardSummary }[] = [];
  attempts: Record<string, number> = {};
  defeats = 0;
  maxDefeats = 12;
  rng: Rng;
  constructor(public state: GameState, public pol: GuardPolicy, seed = 99) {
    this.rng = new Rng(seed);
  }
  async say() {}
  async card() {}
  async cutscene() {}
  async ask(_p: string, choices: string[]) {
    const i = choices.findIndex((c) => /ready|begin|yes/i.test(c));
    return i >= 0 ? i : choices.length - 1;
  }
  async warp() {}
  async warpTo(_m: string, _x: number, _y: number, _f: unknown, apply: () => void) {
    apply();
  }
  music() {}
  sfx() {}
  toast(t: string) {
    this.toasts.push(t);
  }
  async battle(): Promise<RewardSummary> {
    throw new Error('battle is routed through the controller');
  }
  autosave() {}
  hideEntity() {}
  async fight(setup: BattleSetup, stage: StageDef, kind: BattleKind): Promise<Battle> {
    setup.difficulty = this.pol.difficulty;
    const b = new Battle(setup);
    const att = (this.attempts[stage.id] = (this.attempts[stage.id] ?? 0) + 1);
    playBattle(b, this.pol, this.rng, this.state);
    this.logs.push({
      stage: stage.id, kind, outcome: b.outcome!.outcome, rounds: b.roundsCompleted, turns: b.stats.turns, hitsTaken: b.stats.hitsTaken, perfect: b.stats.guardsPerfect, good: b.stats.guardsGood,
      missed: b.stats.guardsMissed, itemsUsed: b.stats.itemsUsed, rageArts: b.stats.rageArts, party: b.heroes().map((h) => `${h.defId}L${h.level}`).join(','), attempt: att,
    });
    if (b.outcome!.outcome === 'defeat') {
      this.defeats++;
      if (this.defeats > this.maxDefeats) throw new Error(`Too many defeats; stuck at ${stage.id}`);
    }
    return b;
  }
  async openShop() {}
  async openTravel(options: { map: string }[]) {
    void options;
    return null;
  }
  async openSave() {}
  async defeatChoice(): Promise<'retry' | 'load'> {
    return 'retry';
  }
  async showRewards(stage: StageDef, summary: RewardSummary) {
    this.rewards.push({ stage: stage.id, summary });
  }
  stateChanged() {}
}

export class WorldBot {
  ticks = 0;
  constructor(public c: GameController, public host: HeadlessHost) {}
  get w() {
    return this.c.world;
  }
  get s() {
    return this.c.state;
  }

  private async step(dx: number, dy: number) {
    const evs = this.w.update(16, { dx, dy, run: true });
    this.ticks++;
    for (const e of evs) {
      if (e.type === 'step') continue;
      await this.c.handle(e);
      if (e.type === 'exit' || e.type === 'foe' || e.type === 'zone') return true;
    }
    return false;
  }

  /** walk (via the real movement/collision code) to a pixel target; returns false if stuck */
  async walkTo(tx: number, ty: number, stopWithin = 5): Promise<boolean> {
    const startMap = this.w.map.id;
    for (let attempt = 0; attempt < 6; attempt++) {
      const path = findPath(this.w.map, { x: this.w.px, y: this.w.py }, { x: tx, y: ty }, this.w.isBlockedTile);
      if (!path) return false;
      for (let i = 1; i < path.length; i++) {
        const gx = path[i].x * TILE + TILE / 2;
        const gy = path[i].y * TILE + TILE - 2;
        let guard = 0;
        while (Math.hypot(gx - this.w.px, gy - this.w.py) > stopWithin) {
          if (++guard > 400) break;
          const dx = gx - this.w.px;
          const dy = gy - this.w.py;
          const len = Math.hypot(dx, dy);
          const interrupted = await this.step(dx / len, dy / len);
          if (this.w.map.id !== startMap || interrupted) return this.w.map.id === startMap && !interrupted ? true : this.w.map.id !== startMap;
        }
      }
      if (Math.hypot(tx - this.w.px, ty - this.w.py) <= 20) return true;
    }
    return false;
  }

  private mapEdges(from: string): { to: string; via: Entity | 'travel'; x: number; y: number }[] {
    const m = MAPS[from];
    const out: { to: string; via: Entity | 'travel'; x: number; y: number }[] = [];
    for (const e of m.entities) {
      if (e.kind === 'exit' && (!e.requires || evalCond(this.s, e.requires)) && (!e.when || evalCond(this.s, e.when))) out.push({ to: e.to.map, via: e, x: e.x + e.w / 2, y: e.y + e.h / 2 });
      if (e.kind === 'travel') {
        for (const d of TRAVEL_DESTINATIONS) if (d.map !== from && evalCond(this.s, d.when)) out.push({ to: d.map, via: 'travel', x: e.x, y: e.y });
      }
    }
    return out;
  }

  private route(from: string, to: string): { to: string; via: Entity | 'travel'; x: number; y: number }[] | null {
    if (from === to) return [];
    const prev = new Map<string, { from: string; edge: { to: string; via: Entity | 'travel'; x: number; y: number } }>();
    const q = [from];
    const seen = new Set([from]);
    while (q.length) {
      const cur = q.shift()!;
      for (const e of this.mapEdges(cur)) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        prev.set(e.to, { from: cur, edge: e });
        if (e.to === to) {
          const out: { to: string; via: Entity | 'travel'; x: number; y: number }[] = [];
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

  async goToMap(target: string): Promise<boolean> {
    for (let hops = 0; hops < 12 && this.w.map.id !== target; hops++) {
      const r = this.route(this.w.map.id, target);
      if (!r) return false;
      const e = r[0];
      if (e.via === 'travel') {
        const tp = this.w.map.entities.find((x) => x.kind === 'travel')!;
        if (!(await this.reachAndInteract(tp))) return false;
        // headless travel: drive the controller directly
        const d = TRAVEL_DESTINATIONS.find((x) => x.map === e.to)!;
        await this.c.host.warpTo(d.map, d.x, d.y, undefined, () => this.w.warp(d.map, d.x, d.y));
      } else {
        const from = this.w.map.id;
        const ok = await this.walkTo(e.x, e.y, 4);
        if (!ok && this.w.map.id === from) return false;
      }
    }
    return this.w.map.id === target;
  }

  private entityPos(e: Entity): { x: number; y: number } {
    if (e.kind === 'zone' || e.kind === 'exit') return { x: e.x + e.w / 2, y: e.y + e.h / 2 };
    if (e.kind === 'foe') {
      const [x, y] = this.w.foePos(e);
      return { x, y };
    }
    return { x: (e as { x: number }).x, y: (e as PointEntity).y };
  }

  async reachAndInteract(e: Entity): Promise<boolean> {
    const p = this.entityPos(e);
    if (e.kind === 'foe' || e.kind === 'zone') {
      const before = JSON.stringify([this.s.beat, this.s.opened.length, this.s.stats.battlesWon]);
      const ok = await this.walkTo(p.x, p.y + 0, 6);
      if (!this.w.activeEntities().includes(e)) return true;
      if (ok && e.kind === 'zone' && (e as { manual?: boolean }).manual) await this.c.handle({ type: 'interact', entity: e });
      void before;
      return true;
    }
    // stand on a free neighbouring tile then face the entity
    const tx = Math.floor(p.x / TILE);
    const ty = Math.floor(p.y / TILE);
    const dirs: [number, number, 'up' | 'down' | 'left' | 'right'][] = [[0, 1, 'up'], [0, -1, 'down'], [1, 0, 'left'], [-1, 0, 'right']];
    for (const [dx, dy, face] of dirs) {
      const gx = (tx + dx) * TILE + TILE / 2;
      const gy = (ty + dy) * TILE + TILE - 2;
      const path = findPath(this.w.map, { x: this.w.px, y: this.w.py }, { x: gx, y: gy }, this.w.isBlockedTile);
      if (!path) continue;
      const mapId = this.w.map.id;
      if (!(await this.walkTo(gx, gy, 4))) continue;
      if (this.w.map.id !== mapId) return false;
      // press toward the entity so facing updates through the real input path
      const toward = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[face === 'up' ? 'down' : face === 'down' ? 'up' : face === 'left' ? 'right' : 'left'];
      await this.step(toward[0] * 0.2, toward[1] * 0.2);
      const ev = this.w.interact();
      if (ev && ev.type === 'interact') {
        await this.c.handle(ev);
        return true;
      }
    }
    return false;
  }

  /** conditional rest / shopping / loadout hygiene before the next beat */
  async prepare() {
    const s = this.s;
    // heal at a pad on the current map when needed
    const need = s.party.some((h) => s.roster[h].hp < maxStats(s, h).hp * 0.7 || s.roster[h].ki < maxStats(s, h).ki * 0.6);
    const heal = this.w.map.entities.find((e) => e.kind === 'heal' && this.w.entityActive(e));
    if (need && heal) await this.reachAndInteract(heal);
    // shop when standing in a shop map with spare zeni
    const shop = this.w.map.entities.find((e) => e.kind === 'shop') as PointEntity | undefined;
    if (shop && shopStock(s, shop.shop!).length) {
      for (const [item, want] of [['senzu_small', 6], ['ki_capsule', 4], ['revive_seed', 1], ['antidote', 2]] as const) {
        const have = s.inventory[item] ?? 0;
        if (have < want && s.zeni >= ITEMS[item].price * (want - have) + 100 && shopStock(s, shop.shop!).includes(item)) buyItem(s, shop.shop!, item, want - have);
      }
    }
    // keep loadouts populated with learned techniques (no silent rewrites of non-empty slots)
    for (const h of s.joined) {
      const r = s.roster[h];
      const learned = learnedSkillIds(s, h);
      for (let i = 0; i < 4; i++) {
        if (r.loadout[i]) continue;
        const cand = learned.find((id) => !r.loadout.includes(id) && (getSkill(id)?.kind === 'attack'));
        if (cand) setLoadout(s, h, i, cand);
      }
    }
    void useFieldItem;
  }

  async playNextBeat(): Promise<string> {
    const s = this.s;
    const b = BEATS[s.beat];
    if (!b) return 'done';
    const idx = s.beat;
    // beat prerequisites that the player has to discover in the world
    if (b.id === 'A06' && !s.flags.lab_door_open) {
      await this.goToMap('mountain_lab');
      const lever = this.w.map.entities.find((e) => e.id === 'lever_lab')!;
      await this.reachAndInteract(lever);
    }
    if (b.id === 'G01' && !s.flags.ponr_accepted) {
      await this.goToMap('cell_games_approach');
      await this.prepare();
      const off = this.w.map.entities.find((e) => e.id === 'ca_official')!;
      await this.reachAndInteract(off);
    }
    if (!(await this.goToMap(b.map))) throw new Error(`cannot reach ${b.map} for ${b.id} from ${this.w.map.id}`);
    await this.prepare();
    const trigger = this.w.map.entities.find((e) => (e as { story?: string }).story === b.id)!;
    for (let tries = 0; tries < 4 && this.s.beat === idx; tries++) {
      await this.reachAndInteract(trigger);
    }
    if (this.s.beat === idx) throw new Error(`beat ${b.id} did not complete`);
    return b.id;
  }
}
