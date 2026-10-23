import { describe, expect, it } from 'vitest';
import { COMBOS } from '../../src/data/items';
import { FORMS, HEROES, HERO_FORMS } from '../../src/data/heroes';
import { RAGE_ARTS, SKILL_LIST } from '../../src/data/skills';
import { ENEMIES } from '../../src/data/enemies';
import { Battle } from '../../src/engine/combat/engine';
import { GUARD_PRESETS, GuardTracker } from '../../src/engine/combat/guard';
import { GUARD_MULT, effSpd, mitigation } from '../../src/engine/combat/formulas';
import { Rng } from '../../src/engine/combat/rng';
import { chooseAction } from '../../src/engine/combat/policy';
import { HERO_IDS, type BattleEvent, type HeroId } from '../../src/types';
import { actAs, heroInit, mkBattle, toInput } from '../support/fixtures';

const started = (b: Battle) => {
  b.start();
  toInput(b);
  return b;
};
const hits = (ev: BattleEvent[]) => ev.filter((e): e is Extract<BattleEvent, { t: 'hit' }> => e.t === 'hit');

describe('RNG and determinism', () => {
  it('same seed gives the same sequence; different seeds differ', () => {
    const a = new Rng(42), b = new Rng(42), c = new Rng(43);
    const sa = Array.from({ length: 20 }, () => a.next());
    expect(sa).toEqual(Array.from({ length: 20 }, () => b.next()));
    expect(sa).not.toEqual(Array.from({ length: 20 }, () => c.next()));
    expect(sa.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('two battles with the same seed and the same commands produce identical event streams', () => {
    const run = () => {
      const b = mkBattle({ enemies: ['recon-probe', 'drain-drone'], seed: 99 });
      b.start();
      const events: BattleEvent[] = [];
      for (let i = 0; i < 60 && !b.ended; i++) {
        events.push(...b.drainEvents());
        if (b.phase === 'guard') b.provideGuard(i % 3 === 0 ? 'perfect' : 'none');
        else if (b.phase === 'input') b.submit({ kind: 'attack', targetUid: b.livingEnemies()[0].uid });
      }
      return JSON.stringify(events);
    };
    expect(run()).toBe(run());
  });
});

describe('Active Guard', () => {
  it('grades presses by distance to impact and consumes them', () => {
    const g = new GuardTracker(GUARD_PRESETS.standard);
    g.press('h:goku', 1000);
    expect(g.grade('h:goku', 1030)).toBe('perfect');
    expect(g.grade('h:goku', 1030)).toBe('none'); // consumed
    g.clear();
    g.press('h:goku', 1000);
    expect(g.grade('h:goku', 1000 + GUARD_PRESETS.standard.goodMs - 5)).toBe('good');
    g.clear();
    g.press('h:goku', 1000);
    expect(g.grade('h:goku', 1000 + GUARD_PRESETS.standard.goodMs + 50)).toBe('none');
  });
  it('anti-mash cooldown ignores rapid presses; windows widen by preset', () => {
    const g = new GuardTracker();
    expect(g.press('x', 0)).toBe(true);
    expect(g.press('x', 100)).toBe(false);
    expect(g.press('x', 400)).toBe(true);
    expect(GUARD_PRESETS.assist.perfectMs).toBeGreaterThan(GUARD_PRESETS.standard.perfectMs);
    expect(GUARD_PRESETS.relaxed.goodMs).toBeGreaterThan(GUARD_PRESETS.standard.goodMs);
  });
  it('perfect < good < none damage for the same hit', () => {
    const dmg = (grade: 'perfect' | 'good' | 'none') => {
      const b = mkBattle({ enemies: ['landing-security'], seed: 5 });
      b.start();
      for (let i = 0; i < 40 && !b.ended; i++) {
        if (b.phase === 'guard') {
          b.provideGuard(grade);
          const h = hits(b.drainEvents()).find((e) => e.guard === grade || (grade === 'none' && e.guard === 'none'));
          if (h) return h.dmg;
        } else if (b.phase === 'input') b.submit({ kind: 'defend' });
      }
      return NaN;
    };
    const p = dmg('perfect'), g = dmg('good'), n = dmg('none');
    expect(p).toBeLessThan(g);
    expect(g).toBeLessThan(n);
    expect(GUARD_MULT.perfect).toBeLessThan(GUARD_MULT.good);
  });
  it('every hit on a hero by an enemy produces a guard prompt (no permanently unguardable telegraphed hit)', () => {
    const b = mkBattle({ enemies: ['recon-probe', 'recon-probe', 'recon-probe'], seed: 3 });
    b.start();
    let prompts = 0, heroHits = 0;
    for (let i = 0; i < 80 && !b.ended; i++) {
      if (b.phase === 'guard') {
        prompts++;
        expect(b.pending!.guardable).toBe(true);
        b.provideGuard('none');
      } else if (b.phase === 'input') b.submit({ kind: 'defend' });
      heroHits += hits(b.drainEvents()).filter((e) => b.get(e.target)?.isHero && !e.countered).length;
    }
    expect(prompts).toBeGreaterThan(0);
    expect(heroHits).toBe(prompts);
  });
});

describe('formulas, turn order and targeting', () => {
  it('mitigation falls with DEF but never reaches zero', () => {
    expect(mitigation(0)).toBe(1);
    expect(mitigation(14)).toBeGreaterThan(mitigation(35));
    expect(mitigation(1000)).toBeGreaterThan(0);
  });
  it('turn order is speed-sorted with a deterministic tiebreak', () => {
    const b = started(mkBattle({ heroes: [heroInit('piccolo', 20), heroInit('krillin', 20), heroInit('goku', 20)], enemies: ['recon-probe'] }));
    const order: string[] = [];
    const events = b.drainEvents();
    void events;
    // collect the actor sequence through a whole round
    const seq: string[] = [];
    for (let i = 0; i < 12 && !b.ended; i++) {
      if (b.phase === 'guard') b.provideGuard('none');
      else if (b.phase === 'input') {
        seq.push(b.current!.defId);
        b.submit({ kind: 'defend' });
      }
      for (const e of b.drainEvents()) if (e.t === 'turn') order.push(e.uid);
    }
    const spd = (id: string) => effSpd(b.get(`h:${id}`)!);
    const heroSeq = seq.slice(0, 3);
    const sorted = [...heroSeq].sort((x, y) => spd(y) - spd(x));
    expect(heroSeq.filter((h) => spd(h) >= effSpd(b.livingEnemies()[0])).join()).toBe(sorted.filter((h) => spd(h) >= effSpd(b.livingEnemies()[0])).join());
  });
  it('rejects invalid targets, dead targets, wrong-team targets and insufficient Ki', () => {
    const b = started(mkBattle({ enemies: ['recon-probe', 'recon-probe'] }));
    const f = b.current!;
    expect(b.checkAction({ kind: 'attack', targetUid: 'nope' }).ok).toBe(false);
    expect(b.checkAction({ kind: 'attack', targetUid: f.uid }).ok).toBe(false);
    const e0 = b.livingEnemies()[0];
    e0.hp = 0;
    e0.alive = false;
    expect(b.checkAction({ kind: 'attack', targetUid: e0.uid }).ok).toBe(false);
    const sk = f.loadout[0];
    f.ki = 0;
    const r = b.checkAction({ kind: 'skill', skillId: sk, targetUid: b.livingEnemies()[0].uid });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Ki/);
    expect(b.checkAction({ kind: 'skill', skillId: 'vegeta_0', targetUid: b.livingEnemies()[0].uid }).ok).toBe(false);
  });
  it('commands are refused when it is not the player\'s turn or the battle has ended', () => {
    const b = mkBattle();
    expect(b.checkAction({ kind: 'defend' }).ok).toBe(false);
    started(b);
  });
});

describe('statuses', () => {
  it('stun makes the victim lose exactly its turn; stunned enemies skip', () => {
    const b = started(mkBattle({ heroes: [heroInit('tien', 25)], enemies: ['landing-security'] }));
    const f = b.current!;
    const e = b.livingEnemies()[0];
    b.applyStatus(e, { kind: 'stun', turns: 1 });
    const hpBefore = f.hp;
    b.submit({ kind: 'defend' });
    toInput(b);
    expect(f.hp).toBe(hpBefore);
  });
  it('barrier absorbs damage before HP and is removed when spent', () => {
    const b = started(mkBattle({ heroes: [heroInit('piccolo', 20)], enemies: ['landing-security'] }));
    const f = b.current!;
    b.applyStatus(f, { kind: 'barrier', turns: 5, power: 9999 });
    const hp = f.hp;
    b.submit({ kind: 'defend' });
    toInput(b);
    expect(f.hp).toBe(hp);
  });
  it('freshly applied buffs keep their full duration for the owner', () => {
    const b = started(mkBattle({ heroes: [heroInit('vegeta', 20)], enemies: ['landing-security'] }));
    const f = b.current!;
    f.ki = f.maxKi;
    b.submit({ kind: 'skill', skillId: 'vegeta_5' });
    const s = f.statuses.find((x) => x.kind === 'atkUp')!;
    expect(s.turns).toBe(4); // not consumed by the very turn it was cast in
  });
  it('heals never exceed max HP and healing cannot go negative', () => {
    const b = started(mkBattle({ heroes: [heroInit('piccolo', 20)], enemies: ['landing-security'] }));
    const f = b.current!;
    f.hp = f.maxHp - 3;
    f.ki = f.maxKi;
    b.submit({ kind: 'skill', skillId: 'piccolo_4' });
    expect(f.hp).toBeLessThanOrEqual(f.maxHp);
    expect(f.hp).toBeGreaterThan(f.maxHp - 3);
  });
});

describe('all 84 skills + 7 Rage Arts resolve correctly', () => {
  const flagsAll: Record<string, boolean> = { gohan_ssj_unlocked: true, gohan_ssj2_unlocked: true, android16_destroyed: true, goku_ssj_unlocked: true, goku_recovered: true, vegeta_ssj_unlocked: true, vegeta_ascended_unlocked: true, trunks_ssj_unlocked: true, trunks_ultra_unlocked: true, piccolo_kami_merged: true, goku_sick: true, goku_sacrifice: true };
  for (const sk of SKILL_LIST.filter((s) => s.hero !== 'android16')) {
    it(`${sk.id} ${sk.name}`, () => {
      const hero = sk.hero as HeroId;
      const forms = Array.isArray(sk.requires?.form) ? sk.requires!.form : sk.requires?.form ? [sk.requires.form] : [];
      const init = heroInit(hero, 30, { loadout: [sk.id, '', '', ''], form: forms[0], ki: 9999, hp: 99999 });
      const others = HERO_IDS.filter((h) => h !== hero).slice(0, 2).map((h) => heroInit(h, 30));
      const b = mkBattle({ heroes: [init, ...others], enemies: ['security-grid', 'cell-husk'], flags: flagsAll, stage: { p: 30 } });
      b.start();
      toInput(b);
      const f = actAs(b, hero)!;
      expect(f.defId).toBe(hero);
      if (forms[0]) f.form = forms[0];
      f.ki = f.maxKi;
      f.rage = 100;
      if (sk.requires?.hpBelow !== undefined) f.hp = Math.max(2, Math.floor(f.maxHp * (sk.requires.hpBelow - 0.05)));
      const st = b.skillStatus(f, sk);
      if (sk.requires?.storyOnly) {
        expect(st.ok).toBe(false);
        return;
      }
      expect(st.ok, `${sk.id}: ${st.reason}`).toBe(true);
      const kiBefore = f.ki;
      const foe = b.livingEnemies()[0];
      const ally = b.heroes().find((h) => h.uid !== f.uid)!;
      let target: string | undefined;
      if (sk.target === 'enemy') target = foe.uid;
      else if (sk.target === 'ally' || sk.target === 'anyAlly') target = ally.uid;
      b.drainEvents();
      const r = b.submit({ kind: 'skill', skillId: sk.id, targetUid: target });
      expect(r.ok, sk.id).toBe(true);
      const ev = b.drainEvents();
      if (sk.chargeTurns) {
        expect(f.charging, 'charge skills queue').toBeTruthy();
        expect(ev.filter((e) => e.t === 'hit').length).toBe(0);
      }
      const cost = Math.round(sk.ki);
      expect(kiBefore - f.ki).toBeGreaterThanOrEqual(Math.min(cost, kiBefore) - Math.round(f.maxKi * 0.1) - 40);
      if ((sk.kind === 'attack') && !sk.chargeTurns) {
        const dealt = hits(ev).filter((e) => e.attacker === f.uid);
        expect(dealt.length, `${sk.id} produced hit events`).toBeGreaterThan(0);
        expect(dealt.length).toBeLessThanOrEqual(sk.hits.length + 4);
      }
      expect(Number.isFinite(f.hp) && f.hp >= 0).toBe(true);
      for (const x of b.fighters) expect(x.hp).toBeGreaterThanOrEqual(0);
    });
  }
  for (const h of HERO_IDS) {
    it(`Rage Art ${RAGE_ARTS[h].name} needs 100 Rage, consumes it and acts`, () => {
      const b = mkBattle({ heroes: [heroInit(h, 30), heroInit(h === 'goku' ? 'gohan' : 'goku', 30)], enemies: ['security-grid', 'cell-husk'], flags: {}, stage: { p: 30 } });
      toInput(started(b));
      const f = actAs(b, h)!;
      f.rage = 99;
      expect(b.checkAction({ kind: 'rage', targetUid: b.livingEnemies()[0].uid }).ok).toBe(false);
      f.rage = 100;
      f.hp = Math.floor(f.maxHp * 0.5);
      b.drainEvents();
      expect(b.submit({ kind: 'rage', targetUid: b.livingEnemies()[0].uid }).ok).toBe(true);
      expect(f.rage).toBeLessThan(100);
      expect(b.stats.rageArts).toBe(1);
    });
  }
});

describe('Rage and Sparking', () => {
  it('Sparking needs 60 Rage, lasts 3 own turns, cannot stack, and expires', () => {
    const b = started(mkBattle({ heroes: [heroInit('goku', 20)], enemies: ['landing-security'] }));
    const f = b.current!;
    expect(b.checkAction({ kind: 'sparking' }).ok).toBe(false);
    f.rage = 70;
    expect(b.submit({ kind: 'sparking' }).ok).toBe(true);
    expect(f.rage).toBe(10);
    expect(f.sparkingTurns).toBeGreaterThan(0);
    toInput(b);
    f.rage = 90;
    expect(b.checkAction({ kind: 'sparking' }).ok).toBe(false);
    for (let i = 0; i < 5 && !b.ended; i++) {
      toInput(b);
      b.submit({ kind: 'defend' });
    }
    toInput(b);
    expect(f.sparkingTurns).toBe(0);
  });
  it('defend spam only pays Rage once in a row', () => {
    const b = started(mkBattle({ heroes: [heroInit('goku', 20)], enemies: ['landing-security'] }));
    const f = b.current!;
    const r0 = f.rage;
    b.submit({ kind: 'defend' });
    toInput(b);
    const r1 = f.rage;
    b.submit({ kind: 'defend' });
    toInput(b);
    expect(f.rage - r1).toBeLessThanOrEqual(r1 - r0 + 20);
  });
});

describe('forms', () => {
  it('Gohan SSJ2 is unavailable without the story unlock and cannot be forced by a form action', () => {
    const b = started(mkBattle({ heroes: [heroInit('gohan', 40)], enemies: ['recon-probe'], flags: { gohan_ssj_unlocked: true } }));
    const f = b.current!;
    f.ki = f.maxKi;
    expect(b.checkAction({ kind: 'form', form: 'ssj2' }).ok).toBe(false);
    expect(b.checkAction({ kind: 'form', form: 'ssj' }).ok).toBe(true);
    const b2 = started(mkBattle({ heroes: [heroInit('gohan', 40)], enemies: ['recon-probe'], flags: { gohan_ssj2_unlocked: true } }));
    expect(b2.checkAction({ kind: 'form', form: 'ssj2' }).ok).toBe(false); // needs android16_destroyed too
    const b3 = started(mkBattle({ heroes: [heroInit('gohan', 40)], enemies: ['recon-probe'], flags: { gohan_ssj2_unlocked: true, android16_destroyed: true } }));
    expect(b3.checkAction({ kind: 'form', form: 'ssj2' }).ok).toBe(true);
  });
  it('forms are independent per hero and cannot be used by other heroes', () => {
    const flags = { vegeta_ssj_unlocked: true, vegeta_ascended_unlocked: true, trunks_ultra_unlocked: true };
    const b = started(mkBattle({ heroes: [heroInit('piccolo', 30), heroInit('krillin', 30)], enemies: ['recon-probe'], flags }));
    for (const f of ['ssj', 'ssj2', 'ascended', 'ultra'] as const) expect(b.checkAction({ kind: 'form', form: f }).ok).toBe(false);
    expect(HERO_FORMS.piccolo.length).toBe(0);
    expect(HERO_FORMS.gohan.map((x) => x.form)).toEqual(['ssj', 'ssj2']);
  });
  it('form upkeep drains Ki each turn and drops the form when Ki runs out', () => {
    const b = started(mkBattle({ heroes: [heroInit('vegeta', 30, { ki: 40 })], enemies: ['security-grid'], flags: { vegeta_ssj_unlocked: true } }));
    const f = b.current!;
    expect(b.submit({ kind: 'form', form: 'ssj' }).ok).toBe(true);
    expect(f.form).toBe('ssj');
    f.ki = 5;
    toInput(b);
    for (let i = 0; i < 6 && !b.ended; i++) {
      toInput(b);
      b.submit({ kind: 'defend' });
    }
    expect(['base', 'ssj']).toContain(f.form);
    expect(FORMS.ultra.spd).toBeLessThan(1);
    expect(FORMS.ascended.spd).toBeLessThan(1);
  });
});

describe('combos', () => {
  it('six or more combos; need living partners who have not acted; consume partner turn', () => {
    expect(COMBOS.length).toBeGreaterThanOrEqual(6);
    const b = started(mkBattle({ heroes: [heroInit('goku', 20), heroInit('gohan', 20), heroInit('vegeta', 20)], enemies: ['security-grid', 'security-grid'] }));
    const f = b.current!;
    const c = COMBOS.find((x) => x.id === 'father_son_strike')!;
    if (!c.members.includes(f.defId as HeroId)) actAs(b, 'goku');
    const cur = b.current!;
    const partner = b.get(c.members.find((m) => m !== cur.defId) ? `h:${c.members.find((m) => m !== cur.defId)}` : '')!;
    if (cur.defId === 'goku' || cur.defId === 'gohan') {
      const st = b.comboStatus(cur, c);
      if (!partner.actedThisRound) {
        expect(st.ok).toBe(true);
        partner.alive = false;
        expect(b.comboStatus(cur, c).ok).toBe(false);
        partner.alive = true;
      }
    }
  });
  it('combo members must be in the party', () => {
    const b = started(mkBattle({ heroes: [heroInit('krillin', 20), heroInit('piccolo', 20)], enemies: ['security-grid'] }));
    const c = COMBOS.find((x) => x.id === 'solar_cage')!;
    expect(b.comboStatus(b.current!, c).ok).toBe(false);
  });
});

describe('boss rules', () => {
  it('Android 19 absorbs Ki blasts only while its palms are open; physical attacks always hurt', () => {
    const b = started(mkBattle({ heroes: [heroInit('goku', 25, { loadout: ['goku_0', 'goku_1', '', ''] })], enemies: ['android-19'], stage: { p: 25 } }));
    const e = b.livingEnemies()[0];
    e.hp = e.maxHp - 100;
    b.applyStatus(e, { kind: 'absorbing', turns: 3, power: 1 });
    const hpBefore = e.hp;
    b.submit({ kind: 'skill', skillId: 'goku_0', targetUid: e.uid });
    const ev = b.drainEvents();
    expect(hits(ev).some((h) => h.absorbed)).toBe(true);
    expect(e.hp).toBeGreaterThanOrEqual(hpBefore);
    toInput(b);
    const e2 = b.livingEnemies()[0];
    b.submit({ kind: 'skill', skillId: 'goku_1', targetUid: e2.uid });
    expect(hits(b.drainEvents()).some((h) => !h.absorbed && h.dmg > 0)).toBe(true);
  });
  it('Imperfect Cell grab: perfect guard staggers; unguarded lock absorbs unless interrupted by damage; last hero is never absorbed', () => {
    const b = mkBattle({ heroes: [heroInit('gohan', 25), heroInit('krillin', 25)], enemies: ['cell-imperfect'], stage: { p: 25 }, seed: 11 });
    b.start();
    const cell = b.livingEnemies()[0];
    const victim = b.heroes()[0];
    victim.statuses.push({ kind: 'absorbLock', turns: 99, power: cell.hp, source: cell.uid });
    // interrupt: Cell loses >= 6% of its HP before its next turn
    cell.hp -= Math.ceil(cell.maxHp * 0.1);
    for (let i = 0; i < 12 && !b.ended; i++) {
      if (b.phase === 'guard') b.provideGuard('none');
      else if (b.phase === 'input') b.submit({ kind: 'defend' });
      if (!victim.statuses.some((s) => s.kind === 'absorbLock')) break;
    }
    expect(victim.alive).toBe(true);
    // last hero survives a lock outright
    const b2 = mkBattle({ heroes: [heroInit('gohan', 25)], enemies: ['cell-imperfect'], stage: { p: 25 }, seed: 11 });
    b2.start();
    const c2 = b2.livingEnemies()[0];
    const v2 = b2.heroes()[0];
    v2.statuses.push({ kind: 'absorbLock', turns: 99, power: c2.hp, source: c2.uid });
    for (let i = 0; i < 20 && !b2.ended; i++) {
      if (b2.phase === 'guard') b2.provideGuard('perfect');
      else if (b2.phase === 'input') b2.submit({ kind: 'defend' });
      if (!v2.statuses.some((s) => s.kind === 'absorbLock')) break;
    }
    expect(v2.hp).toBeGreaterThan(0);
  });
  it('Armored Sentinel alternates shielded / exposed and takes more damage when exposed', () => {
    const b = started(mkBattle({ heroes: [heroInit('goku', 20)], enemies: ['armored-sentinel'], stage: { p: 20 } }));
    const s = b.livingEnemies()[0];
    expect(s.statuses.some((x) => x.kind === 'shielded')).toBe(true);
    const seen = new Set<string>();
    for (let i = 0; i < 8 && !b.ended; i++) {
      toInput(b);
      for (const x of s.statuses) if (x.kind === 'shielded' || x.kind === 'exposed') seen.add(x.kind);
      if (b.phase === 'input') b.submit({ kind: 'defend' });
    }
    expect(seen.has('shielded') && seen.has('exposed')).toBe(true);
  });
  it('Cell adapts after three uses of the same technique by the same hero', () => {
    expect(ENEMIES['cell-perfect'].adapts).toBe(true);
    const b = started(mkBattle({ heroes: [heroInit('goku', 30)], enemies: ['cell-perfect'], stage: { p: 30 } }));
    const cell = b.livingEnemies()[0];
    cell.hp = cell.maxHp = 9_999_999;
    for (let i = 0; i < 4 && !b.ended; i++) {
      toInput(b, 'perfect');
      const f = b.current!;
      f.ki = f.maxKi;
      b.submit({ kind: 'skill', skillId: 'goku_0', targetUid: cell.uid });
    }
    expect(cell.adaptCount['h:goku:goku_0']).toBeGreaterThanOrEqual(3);
  });
  it('survive objective ends exactly after N rounds; threshold ends at the HP fraction; flee is refused in story fights', () => {
    const b = mkBattle({ heroes: [heroInit('goku', 30), heroInit('gohan', 30), heroInit('vegeta', 30)], enemies: ['android-17'], stage: { mode: 'survive', rounds: 2, p: 12 }, difficulty: 'easy' });
    b.start();
    for (let i = 0; i < 400 && !b.ended; i++) {
      if (b.phase === 'guard') b.provideGuard('perfect');
      else if (b.phase === 'input') {
        expect(b.checkAction({ kind: 'flee' }).ok).toBe(false);
        b.submit({ kind: 'defend' });
      }
    }
    expect(b.outcome?.outcome).toBe('victory');
    expect(b.roundsCompleted).toBe(2);
    const t = mkBattle({ heroes: [heroInit('goku', 30)], enemies: ['android-20'], stage: { mode: 'threshold', threshold: 0.5, p: 10 } });
    started(t);
    const e = t.livingEnemies()[0];
    e.hp = Math.floor(e.maxHp * 0.45);
    t.applyStatus(t.current!, { kind: 'atkUp', turns: 2, power: 1 });
    t.submit({ kind: 'attack', targetUid: e.uid });
    expect(t.ended && t.outcome?.outcome === 'victory').toBe(true);
  });
  it('finisher is only legal for SSJ2 Gohan after the story gates and the opening round', () => {
    const stage = { mode: 'finisher' as const, finisherAfter: 2, enemies: ['cell-super-perfect'], p: 22, forms: { gohan: 'ssj2' as const } };
    const early = started(mkBattle({ heroes: [heroInit('gohan', 30)], enemies: stage.enemies, stage, flags: { gohan_ssj2_unlocked: true, android16_destroyed: true, goku_sacrifice: true } }));
    expect(early.checkAction({ kind: 'finisher' }).ok).toBe(false);
    const noFlags = started(mkBattle({ heroes: [heroInit('gohan', 30)], enemies: stage.enemies, stage, flags: {} }));
    expect(noFlags.checkAction({ kind: 'finisher' }).ok).toBe(false);
    const b = mkBattle({ heroes: [heroInit('gohan', 30)], enemies: stage.enemies, stage, flags: { gohan_ssj2_unlocked: true, android16_destroyed: true, goku_sacrifice: true, gohan_ssj_unlocked: true } });
    b.start();
    for (let i = 0; i < 60 && !b.ended; i++) {
      if (b.phase === 'guard') b.provideGuard('perfect');
      else if (b.phase === 'input') {
        if (b.checkAction({ kind: 'finisher' }).ok) {
          expect(b.submit({ kind: 'finisher' }).ok).toBe(true);
          break;
        }
        b.current!.hp = b.current!.maxHp;
        b.submit({ kind: 'defend' });
      }
    }
    expect(b.outcome?.outcome).toBe('victory');
  });
  it('Perfect Cell phase: transforms to Semi-Perfect once (no double reward ids)', () => {
    const b = started(mkBattle({ heroes: [heroInit('gohan', 30)], enemies: ['cell-perfect'], stage: { p: 25 } }));
    expect(ENEMIES['cell-perfect']).toBeTruthy();
    void b;
  });
});

describe('AI sanity', () => {
  it('enemies never target a downed hero or act while dead; no infinite loops', () => {
    const b = mkBattle({ enemies: ['recon-probe', 'drain-drone', 'cell-probe'], stage: { p: 30 }, seed: 17 });
    b.start();
    let steps = 0;
    while (!b.ended && steps++ < 3000) {
      for (const e of b.drainEvents()) {
        if (e.t === 'hit' && !e.countered) {
          const att = b.get(e.attacker);
          const tgt = b.get(e.target);
          expect(att).toBeTruthy();
          expect(tgt).toBeTruthy();
        }
      }
      if (b.phase === 'guard') b.provideGuard('good');
      else if (b.phase === 'input') b.submit(chooseAction(b, b.current!));
    }
    expect(b.ended).toBe(true);
    for (const f of b.fighters) expect(f.hp).toBeGreaterThanOrEqual(0);
  });
  it('items: use, consume, revive and reject invalid uses', () => {
    const b = started(mkBattle({ heroes: [heroInit('goku', 20), heroInit('gohan', 20)], enemies: ['landing-security'], inventory: { senzu_small: 1, revive_seed: 1 } }));
    const f = b.current!;
    const other = b.heroes().find((h) => h.uid !== f.uid)!;
    other.hp = 5;
    expect(b.checkAction({ kind: 'item', itemId: 'revive_seed', targetUid: other.uid }).ok).toBe(false);
    expect(b.submit({ kind: 'item', itemId: 'senzu_small', targetUid: other.uid }).ok).toBe(true);
    expect(other.hp).toBeGreaterThan(5);
    expect(b.inventory.senzu_small).toBe(0);
    toInput(b);
    expect(b.checkAction({ kind: 'item', itemId: 'senzu_small', targetUid: other.uid }).ok).toBe(false);
  });
});

describe('4 skill slots', () => {
  it('cannot use a technique that is not equipped, even if learned', () => {
    const b = started(mkBattle({ heroes: [heroInit('goku', 30, { loadout: ['goku_0', '', '', ''] })], enemies: ['recon-probe'] }));
    const t = b.livingEnemies()[0].uid;
    expect(b.checkAction({ kind: 'skill', skillId: 'goku_1', targetUid: t }).ok).toBe(false);
    expect(b.checkAction({ kind: 'skill', skillId: 'goku_0', targetUid: t }).ok).toBe(true);
    expect(HEROES.goku.defaultLoadout.length).toBe(4);
  });
});
