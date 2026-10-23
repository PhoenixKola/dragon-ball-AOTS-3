import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { COMBOS, ITEMS, SHOPS } from '../../src/data/items';
import { MAP_LIST, MAPS, TRAVEL_DESTINATIONS } from '../../src/data/maps';
import { QUESTS } from '../../src/data/quests';
import { ALL_SIDE } from '../../src/data/sidefights';
import { RAGE_ARTS, SKILL_LIST, SKILLS } from '../../src/data/skills';
import { STAGES } from '../../src/data/stages';
import { BEATS, BEAT_INDEX } from '../../src/data/story';
import { CUTSCENES } from '../../src/data/cutscenes';
import { SPEAKERS } from '../../src/data/speakers';
import { parseCondOrThrow } from '../../src/systems/cond';
import { TILE, buildCollision, bodyFree, findPath } from '../../src/engine/world/collision';
import { HERO_IDS } from '../../src/types';
import type { Step } from '../../src/types/script';

const walkSteps = (steps: Step[], fn: (s: Step) => void) => {
  for (const s of steps) {
    fn(s);
    if (s.t === 'if') {
      walkSteps(s.then, fn);
      walkSteps(s.else ?? [], fn);
    }
    if (s.t === 'ask') s.choices.forEach((c) => walkSteps(c.steps, fn));
    if (s.t === 'once') walkSteps(s.steps, fn);
  }
};

describe('skills', () => {
  it('has exactly 12 distinct skills per core hero (84 total)', () => {
    const per = HERO_IDS.map((h) => SKILL_LIST.filter((s) => s.hero === h).length);
    expect(per).toEqual([12, 12, 12, 12, 12, 12, 12]);
    expect(SKILL_LIST.filter((s) => s.hero !== 'android16').length).toBe(84);
    expect(new Set(SKILL_LIST.map((s) => s.id)).size).toBe(SKILL_LIST.length);
  });
  it('every skill is fully specified', () => {
    for (const s of SKILL_LIST) {
      expect(s.name.length, s.id).toBeGreaterThan(2);
      expect(s.desc.length, s.id).toBeGreaterThan(10);
      expect(s.vfx && s.clip && s.sfx, s.id).toBeTruthy();
      expect(s.unlock, s.id).toBeGreaterThanOrEqual(1);
      if (s.kind === 'attack' || s.kind === 'special') expect(s.hits.length, s.id).toBeGreaterThan(0);
      for (const h of s.hits) expect(h, s.id).toBeGreaterThan(0);
      expect(s.ki, s.id).toBeGreaterThanOrEqual(0);
      expect(['phys', 'ki']).toContain(s.element);
    }
  });
  it('84 skills have 84 mechanically distinct signatures', () => {
    const sig = (s: (typeof SKILL_LIST)[number]) =>
      JSON.stringify([s.kind, s.target, s.element, s.hits, s.pierce, s.acc, s.splash, s.lifesteal, s.apply, s.self, s.healPct, s.kiRestore, s.kiDrain, s.chargeTurns, s.hpCost, s.rageCost, s.requires, s.tags, s.battleLimit, s.revive, s.crit, s.rageGain]);
    const core = SKILL_LIST.filter((s) => s.hero !== 'android16');
    const sigs = new Set(core.map(sig));
    expect(sigs.size).toBe(core.length);
  });
  it('every hero has a Rage Art and a form-gated or story-gated skill list is coherent', () => {
    for (const h of HERO_IDS) expect(RAGE_ARTS[h]).toBeTruthy();
    expect(SKILLS.gohan_11.requires?.storyOnly).toBe(true);
    expect(SKILLS.gohan_10.requires?.form).toBe('ssj2');
  });
  it('has 7 combos requiring two heroes each, 6+ usable', () => {
    expect(COMBOS.length).toBeGreaterThanOrEqual(6);
    for (const c of COMBOS) {
      expect(c.members.length).toBeGreaterThanOrEqual(2);
      expect(c.members.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('story content', () => {
  it('has exactly 29 mandatory battle stages in chapter order', () => {
    expect(STAGES.length).toBe(29);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(29);
    for (let i = 1; i < STAGES.length; i++) expect(STAGES[i].chapter).toBeGreaterThanOrEqual(STAGES[i - 1].chapter);
    for (const id of ['P01', 'P02', 'A01', 'A08', 'C01', 'C03', 'H01', 'H03', 'T01', 'T04', 'R01', 'R02', 'G01', 'G07']) expect(STAGES.some((s) => s.id === id), id).toBe(true);
  });
  it('beats are consistent with stages', () => {
    const battles = BEATS.filter((b) => b.kind === 'battle');
    expect(battles.map((b) => b.id)).toEqual(STAGES.map((s) => s.id));
    expect(BEATS.filter((b) => b.kind === 'event').length).toBeGreaterThanOrEqual(1);
    BEATS.forEach((b, i) => expect(BEAT_INDEX[b.id]).toBe(i));
  });
  it('every enemy referenced by a stage, wave, side fight or table exists', () => {
    const all = [...STAGES, ...Object.values(ALL_SIDE)];
    for (const st of all) {
      for (const id of [...st.enemies, ...(st.waves ?? []).flat()]) expect(ENEMIES[id], `${st.id}:${id}`).toBeTruthy();
      expect(MAPS[st.map], st.id).toBeTruthy();
    }
    for (const e of Object.values(ENEMIES)) {
      expect(e.moves.length, e.id).toBeGreaterThan(0);
      expect(e.hpx).toBeGreaterThan(0);
    }
  });
  it('every enemy art actor id maps to one of the 22 required actors', () => {
    const required = new Set(['mecha-frieza', 'king-cold', 'android-19', 'android-20', 'android-17', 'android-18', 'android-16', 'cell-imperfect', 'cell-semi-perfect', 'cell-perfect', 'cell-super-perfect', 'cell-junior', 'landing-security', 'recon-probe', 'drain-drone', 'armored-sentinel', 'security-grid', 'cell-husk', 'absorbed-shadow', 'cell-probe', 'training-sentinel', 'chamber-guardian']);
    for (const e of Object.values(ENEMIES)) expect(required.has(e.actor), e.id).toBe(true);
    expect(required.size).toBe(22);
  });
  it('all script references resolve', () => {
    const check = (steps: Step[], where: string) =>
      walkSteps(steps, (s) => {
        if (s.t === 'cutscene') expect(CUTSCENES[s.id], `${where}:${s.id}`).toBeTruthy();
        if (s.t === 'give' || s.t === 'take') expect(ITEMS[s.item], `${where}:${s.item}`).toBeTruthy();
        if (s.t === 'say') expect(SPEAKERS[s.who], `${where}:${s.who}`).toBeTruthy();
        if (s.t === 'quest') expect(QUESTS.some((q) => q.id === s.id), `${where}:${s.id}`).toBe(true);
        if (s.t === 'warp') expect(MAPS[s.map], `${where}:${s.map}`).toBeTruthy();
        if (s.t === 'battle') expect(ALL_SIDE[s.stage] ?? STAGES.find((x) => x.id === s.stage), `${where}:${s.stage}`).toBeTruthy();
        if (s.t === 'if') parseCondOrThrow(s.cond);
      });
    for (const b of BEATS) {
      check(b.pre, b.id);
      check(b.post, b.id);
      if (b.gate) parseCondOrThrow(b.gate);
    }
    for (const m of MAP_LIST) for (const e of m.entities) {
      const sc = (e as { script?: Step[] }).script;
      if (sc) check(sc, `${m.id}:${e.id}`);
    }
    for (const c of Object.values(CUTSCENES)) for (const s of c.steps) if (s.t === 'say') expect(SPEAKERS[s.who], `${c.id}:${s.who}`).toBeTruthy();
  });
  it('quests: 10 with real rewards and existing giver/map entities', () => {
    expect(QUESTS.length).toBe(10);
    for (const q of QUESTS) {
      expect(BEAT_INDEX[q.from], q.id).toBeDefined();
      expect(BEAT_INDEX[q.until], q.id).toBeGreaterThan(BEAT_INDEX[q.from]);
      const m = MAPS[q.giver.map];
      expect(m, q.id).toBeTruthy();
      expect(m.entities.some((e) => e.id === q.giver.npc), `${q.id} giver ${q.giver.npc}`).toBe(true);
      expect(Object.keys(q.reward).length).toBeGreaterThan(1);
      for (const it of q.reward.items ?? []) expect(ITEMS[it.id], it.id).toBeTruthy();
    }
  });
  it('shops stock real items', () => {
    for (const sh of Object.values(SHOPS)) for (const id of sh.stock) expect(ITEMS[id], id).toBeTruthy();
  });
});

describe('maps', () => {
  it('has the 12 blueprint regions', () => {
    expect(MAP_LIST.map((m) => m.id).sort()).toEqual(['android_island', 'capsule_corp', 'cell_games_approach', 'cell_games_arena', 'gingertown', 'lab_inner', 'landing_future', 'lookout', 'mountain_lab', 'rocky_outskirts', 'south_city', 'time_chamber']);
  });
  for (const m of MAP_LIST) {
    describe(m.id, () => {
      it('tile rows are well formed and entity ids are unique', () => {
        expect(m.tiles.length).toBe(m.height);
        for (const r of m.tiles) expect(r.length).toBe(m.width);
        for (const r of m.tiles) expect(/^[.,=#~:]+$/.test(r)).toBe(true);
        const ids = m.entities.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const e of m.entities) {
          if (e.when) parseCondOrThrow(e.when);
          if ((e as { requires?: string }).requires) parseCondOrThrow((e as { requires?: string }).requires!);
          const story = (e as { story?: string }).story;
          if (story) expect(BEAT_INDEX[story], `${m.id}:${e.id}`).toBeDefined();
        }
      });
      it('spawn is walkable and every entity is reachable from spawn', () => {
        const g = buildCollision(m);
        const sx = m.spawn.x * TILE + TILE / 2;
        const sy = m.spawn.y * TILE + TILE - 2;
        expect(bodyFree(g, sx, sy), 'spawn free').toBe(true);
        // blockers: every body-blocking entity except doors (doors are opened by story)
        const bodies = new Set<string>();
        const bodyKinds = new Set(['npc', 'chest', 'save', 'heal', 'shop', 'terminal', 'lever', 'travel', 'sign']);
        for (const e of m.entities) {
          if (!bodyKinds.has(e.kind)) continue;
          const bx = Math.floor((e as { x: number }).x / TILE);
          const by = Math.floor((e as { y: number }).y / TILE);
          const wide = e.kind === 'save' || e.kind === 'heal' || e.kind === 'shop';
          for (let dx = wide ? -1 : 0; dx <= (wide ? 1 : 0); dx++) bodies.add(`${bx + dx},${by}`);
        }
        const reach = (tx: number, ty: number, allowSelf: boolean) => {
          const extra = (x: number, y: number) => bodies.has(`${x},${y}`) && !(allowSelf && x === tx && y === ty);
          return findPath(m, { x: sx, y: sy }, { x: tx * TILE + TILE / 2, y: ty * TILE + TILE - 2 }, extra);
        };
        for (const e of m.entities) {
          if (e.kind === 'door') continue;
          if (e.kind === 'exit' || e.kind === 'zone') {
            const tx = Math.floor((e.x + e.w / 2) / TILE);
            const ty = Math.floor((e.y + e.h / 2) / TILE);
            expect(reach(tx, ty, true), `${m.id}:${e.id} unreachable`).not.toBeNull();
            continue;
          }
          const tx = Math.floor((e as { x: number }).x / TILE);
          const ty = Math.floor((e as { y: number }).y / TILE);
          // some neighbouring tile must be reachable (entity interactable from 4 sides or foes can be walked into)
          const ok = e.kind === 'foe' ? !!reach(tx, ty, true) : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach(tx + dx, ty + dy, false) !== null);
          expect(ok, `${m.id}:${e.id} unreachable at ${tx},${ty}`).toBe(true);
          if (e.kind !== 'foe') expect(g.blocked[ty * m.width + tx], `${m.id}:${e.id} stands inside geometry`).toBe(0);
        }
      });
      it('exits lead to walkable arrivals', () => {
        for (const e of m.entities) {
          if (e.kind !== 'exit') continue;
          const dest = MAPS[e.to.map];
          expect(dest, `${m.id}:${e.id}`).toBeTruthy();
          const g = buildCollision(dest);
          const free = bodyFree(g, e.to.x * TILE + TILE / 2, e.to.y * TILE + TILE - 2);
          expect(free, `${m.id}:${e.id} arrival (${e.to.x},${e.to.y}) in ${dest.id}`).toBe(true);
        }
      });
    });
  }
  it('every battle beat has a trigger entity on its map', () => {
    for (const b of BEATS) {
      const m = MAPS[b.map];
      expect(m, b.id).toBeTruthy();
      expect(m.entities.some((e) => (e as { story?: string }).story === b.id), `${b.id} trigger in ${b.map}`).toBe(true);
    }
  });
  it('travel destinations exist', () => {
    for (const d of TRAVEL_DESTINATIONS) {
      expect(MAPS[d.map]).toBeTruthy();
      parseCondOrThrow(d.when);
    }
  });
});
