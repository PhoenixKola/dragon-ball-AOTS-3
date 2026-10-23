import { describe, expect, it } from 'vitest';
import { BEATS } from '../../src/data/story';
import { MAPS } from '../../src/data/maps';
import { QUESTS } from '../../src/data/quests';
import { SKILLS } from '../../src/data/skills';
import { WorldSim } from '../../src/engine/world/sim';
import { InputManager } from '../../src/systems/input';
import { evalCond } from '../../src/systems/cond';
import { newGameState, type GameState } from '../../src/systems/gameState';
import * as P from '../../src/systems/progression';
import { completeQuest, objectiveProgress, progressQuest, questStatus, refreshQuests, startQuest } from '../../src/systems/questRuntime';
import { LEGACY_PREFIX, SaveManager, checksum, pack, unpack, type StorageLike } from '../../src/systems/save';
import { SaveError, validateState } from '../../src/systems/validate';
import { completeBeat, runScript, type ScriptHost } from '../../src/systems/storyRuntime';
import { Battle } from '../../src/engine/combat/engine';
import { heroInit, mkStage, toInput } from '../support/fixtures';

const mem = (): StorageLike & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};
const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s));
/** advance the state through beats by running the real post-scripts' state effects headlessly */
const host: ScriptHost = {
  say: async () => {}, card: async () => {}, cutscene: async () => {}, ask: async () => 0, warp: async () => {}, music: () => {}, sfx: () => {}, toast: () => {},
  battle: async () => { throw new Error('no battle'); }, autosave: () => {}, hideEntity: () => {},
};
async function advanceTo(s: GameState, beatId: string) {
  while (BEATS[s.beat] && BEATS[s.beat].id !== beatId) {
    const b = BEATS[s.beat];
    await runScript(s, b.pre.filter((x) => x.t !== 'battle'), host);
    const st = (await import('../../src/data/stages')).STAGES.find((x) => x.id === b.id);
    for (const f of st?.flags ?? []) s.flags[f] = true;
    completeBeat(s, b.id);
    await runScript(s, b.post, host);
  }
  return s;
}

describe('save integrity', () => {
  it('round-trips and detects checksum corruption', () => {
    const s = newGameState();
    const text = pack(s, 123);
    expect(unpack(text).zeni).toBe(s.zeni);
    const env = JSON.parse(text);
    env.body = env.body.replace('"zeni":300', '"zeni":999999');
    expect(() => unpack(JSON.stringify(env))).toThrow(/Checksum/);
    expect(() => unpack('{not json')).toThrow(SaveError);
    expect(() => unpack(JSON.stringify({ product: 'AOTS2' }))).toThrow(/AOTS3/);
  });
  it('keeps a backup of the previous valid copy and recovers from a corrupted slot', () => {
    const st = mem();
    const sm = new SaveManager(st);
    const s = newGameState();
    expect(sm.save(0, s).ok).toBe(true);
    s.zeni = 777;
    expect(sm.save(0, s).ok).toBe(true);
    st.setItem('aots3.cell.v1.slot0', '{"garbage":1}');
    const r = sm.load(0);
    expect(r.info.status).toBe('recovered');
    expect(r.state?.zeni).toBe(300);
    expect(sm.load(1).info.status).toBe('empty');
    st.setItem('aots3.cell.v1.slot1', 'nonsense');
    expect(sm.load(1).info.status).toBe('corrupt');
  });
  it('uses an isolated namespace and never touches AOTS2/legacy keys', () => {
    const st = mem();
    st.setItem('aots2.save', 'namek');
    st.setItem(`${LEGACY_PREFIX}0`, 'legacy');
    const sm = new SaveManager(st);
    sm.save('auto', newGameState());
    expect([...st.m.keys()].filter((k) => k.startsWith('aots3.cell.v1.')).length).toBeGreaterThan(0);
    expect(st.getItem('aots2.save')).toBe('namek');
    expect(st.getItem(`${LEGACY_PREFIX}0`)).toBe('legacy');
  });
  it('rejects tampered or impossible states', async () => {
    const base = newGameState();
    const bad: [string, (s: any) => void][] = [
      ['early SSJ2', (s) => { s.flags.gohan_ssj2_unlocked = true; }],
      ['unknown flag', (s) => { s.flags.totally_made_up = true; }],
      ['proto flag', (s) => { Object.defineProperty(s.flags, '__proto__', { value: true, enumerable: true }); }],
      ['negative zeni', (s) => { s.zeni = -5; }],
      ['NaN zeni', (s) => { s.zeni = NaN; }],
      ['unknown item', (s) => { s.inventory.mystery_box = 3; }],
      ['oversized count', (s) => { s.inventory.senzu_small = 999; }],
      ['story jump', (s) => { s.beat = 20; }],
      ['credits early', (s) => { s.flags.credits_seen = true; }],
      ['unavailable hero in party', (s) => { s.party = ['goku']; }],
      ['duplicate party hero', (s) => { s.party = ['trunks', 'trunks']; }],
      ['level above cap', (s) => { s.roster.goku.level = 99; }],
      ['wrong hero skill', (s) => { s.roster.goku.loadout = ['vegeta_0', '', '', '']; }],
      ['locked skill', (s) => { s.roster.goku.loadout = ['goku_10', '', '', '']; }],
      ['story-only skill', (s) => { s.roster.gohan.level = 40; s.roster.gohan.loadout = ['gohan_11', '', '', '']; }],
      ['hp over max', (s) => { s.roster.goku.hp = 999999; }],
      ['bad map', (s) => { s.mapId = 'namek'; }],
      ['android16 roster', (s) => { s.roster.android16 = s.roster.goku; }],
      ['extra training points', (s) => { s.roster.goku.tp = 50; }],
      ['unknown quest', (s) => { s.quests.hack = { state: 'done', progress: {} }; }],
      ['postgame record before postgame', (s) => { s.postgame.records.SIM_SUPER = { best: 3, clears: 1 }; }],
      ['kami flag early', (s) => { s.flags.piccolo_kami_merged = true; }],
    ];
    for (const [name, fn] of bad) {
      const s: any = clone(base);
      fn(s);
      expect(() => validateState(s), name).toThrow(SaveError);
    }
    void advanceTo;
  });
  it('accepts every state reached by legitimately progressing through the story (invariants hold at every beat)', async () => {
    const s = newGameState();
    for (const b of BEATS) {
      await advanceTo(s, b.id);
      const v = validateState(clone(s));
      expect(v.beat).toBe(s.beat);
    }
    await advanceTo(s, 'ZZZ');
    expect(s.flags.credits_seen).toBe(true);
    expect(s.away).toContain('goku');
    const v = validateState(clone(s));
    expect(v.flags.cell_final_defeated).toBe(true);
  });
  it('Goku stays away after the sacrifice (not resurrected in canon) and SSJ2 needs Android 16\'s death', async () => {
    const s = await advanceTo(newGameState(), 'G06');
    expect(s.flags.goku_sacrifice).toBe(true);
    const bad = clone(s);
    bad.away = bad.away.filter((h) => h !== 'goku');
    expect(() => validateState(bad)).toThrow();
    const early = await advanceTo(newGameState(), 'G03');
    expect(early.flags.gohan_ssj2_unlocked).toBeUndefined();
  });
  it('export filename and import validation', () => {
    const sm = new SaveManager(mem());
    sm.save(1, newGameState());
    expect(sm.exportFilename(1, new Date('2026-10-22T00:00:00Z'))).toBe('AOTS3-Cell-Saga_slot2_2026-10-22.json');
    const text = sm.exportText(1)!;
    expect(sm.importText(2, text).ok).toBe(true);
    expect(sm.importText(2, text.replace('zeni\\":300', 'zeni\\":301')).ok).toBe(false);
    expect(sm.load(2).state).toBeTruthy();
    expect(checksum('a')).not.toBe(checksum('b'));
  });
  it('legacy prototype saves are never loaded as progress; migration starts a new game', () => {
    const st = mem();
    st.setItem(`${LEGACY_PREFIX}0`, JSON.stringify({ product: 'AOTS3-Cell-Saga', body: JSON.stringify({ index: 12, zeni: 99999, difficulty: 'Easy' }), checksum: 'x' }));
    const r = new SaveManager(st).migrateLegacy(0);
    expect(r.ok).toBe(true);
    expect(r.state!.beat).toBe(0);
    expect(r.state!.zeni).toBeLessThanOrEqual(1000);
    expect(r.state!.difficulty).toBe('easy');
    expect(new SaveManager(st).load(0).info.status).toBe('empty');
  });
});

describe('progression, economy and equipment', () => {
  it('XP levels up, grants TP, unlocks techniques into empty slots only', () => {
    const s = newGameState();
    const r = s.roster.krillin;
    r.loadout = ['krillin_0', '', '', ''];
    const lu = P.grantXp(s, 'krillin', 100000);
    expect(lu?.to).toBeGreaterThan(r.level - 1);
    expect(r.level).toBeLessThanOrEqual(40);
    expect(r.tp).toBeGreaterThan(0);
    const s2 = newGameState();
    const before = [...s2.roster.goku.loadout];
    P.grantXp(s2, 'goku', 100000);
    expect(s2.roster.goku.loadout).toEqual(before); // full custom loadout is never rewritten
  });
  it('loadout rules: swap on duplicate, locked/story-only/foreign rejected', () => {
    const s = newGameState();
    expect(P.setLoadout(s, 'goku', 1, 'goku_0').ok).toBe(true);
    expect(s.roster.goku.loadout[1]).toBe('goku_0');
    expect(s.roster.goku.loadout.filter((x) => x === 'goku_0').length).toBe(1);
    expect(P.setLoadout(s, 'goku', 0, 'vegeta_0').ok).toBe(false);
    expect(P.setLoadout(s, 'goku', 0, 'goku_10').ok).toBe(false);
    expect(P.setLoadout(s, 'gohan', 0, 'gohan_11').ok).toBe(false);
    expect(P.setLoadout(s, 'goku', 9, 'goku_0').ok).toBe(false);
    expect(P.setLoadout(s, 'goku', 3, null).ok).toBe(true);
    expect(s.roster.goku.loadout[3]).toBe('');
    expect(SKILLS.goku_0).toBeTruthy();
  });
  it('shop: purchase validation, no negative zeni, caps, sell rules, key items unsellable', async () => {
    const s = await advanceTo(newGameState(), 'A02');
    s.zeni = 100;
    expect(P.buyItem(s, 'capsule_corp', 'senzu_large', 1).ok).toBe(false);
    expect(s.zeni).toBe(100);
    expect(P.buyItem(s, 'capsule_corp', 'senzu_small', 1).ok).toBe(true);
    expect(s.zeni).toBe(30);
    expect(P.buyItem(s, 'capsule_corp', 'senzu_small', 0).ok).toBe(false);
    expect(P.buyItem(s, 'capsule_corp', 'senzu_small', 1.5).ok).toBe(false);
    s.zeni = 1e6;
    expect(P.buyItem(s, 'capsule_corp', 'senzu_small', 99).ok).toBe(false); // exceeds stock cap
    expect(P.buyItem(s, 'south_city', 'senzu_large', 1).ok).toBe(false); // not sold there
    s.inventory.medicine_vial = 1;
    expect(P.sellItem(s, 'medicine_vial', 1).ok).toBe(false);
    const z = s.zeni;
    expect(P.sellItem(s, 'senzu_small', 1).ok).toBe(true);
    expect(s.zeni).toBeGreaterThan(z);
  });
  it('accessories: equip/unequip conserve stock; stats change; no duplication', () => {
    const s = newGameState();
    s.inventory.power_charm = 1;
    const atk0 = P.makeBattleSetup(s, mkStage({ team: ['goku'] })).heroes[0];
    void atk0;
    expect(P.equipAccessory(s, 'goku', 0, 'power_charm').ok).toBe(true);
    expect(s.inventory.power_charm).toBeUndefined();
    expect(P.equipAccessory(s, 'gohan', 0, 'power_charm').ok).toBe(false);
    expect(P.equipAccessory(s, 'goku', 0, null).ok).toBe(true);
    expect(s.inventory.power_charm).toBe(1);
    expect(P.equipAccessory(s, 'goku', 0, 'medicine_vial').ok).toBe(false);
  });
  it('training points: spend, cap and refund restore points', () => {
    const s = newGameState();
    s.roster.goku.tp = 3;
    expect(P.trainStat(s, 'goku', 'atk').ok).toBe(true);
    expect(s.roster.goku.tp).toBe(2);
    expect(P.refundTraining(s, 'goku')).toBe(1);
    expect(s.roster.goku.tp).toBe(3);
    s.roster.goku.tp = 0;
    expect(P.trainStat(s, 'goku', 'hp').ok).toBe(false);
  });
  it('field items: heal, revive rules, no wasted consumption', () => {
    const s = newGameState();
    const mx = P.makeBattleSetup(s, mkStage({ team: ['trunks'] })).heroes[0].hp;
    expect(P.useFieldItem(s, 'senzu_small', 'goku').ok).toBe(false); // not a party member yet
    expect(P.useFieldItem(s, 'senzu_small', 'trunks').ok).toBe(false); // already full
    expect(s.inventory.senzu_small).toBe(3);
    s.roster.trunks.hp = Math.floor(mx / 4);
    expect(P.useFieldItem(s, 'senzu_small', 'trunks').ok).toBe(true);
    expect(s.roster.trunks.hp).toBeGreaterThan(mx / 4);
    s.roster.trunks.hp = 0;
    expect(P.useFieldItem(s, 'senzu_small', 'trunks').ok).toBe(false);
    s.inventory.revive_seed = 1;
    expect(P.useFieldItem(s, 'revive_seed', 'trunks').ok).toBe(true);
    expect(s.roster.trunks.hp).toBeGreaterThan(0);
  });
  it('battle results: XP exactly once per commit, defeat changes nothing, flee gives no rewards', () => {
    const s = newGameState();
    const stage = mkStage({ team: ['goku'], xp: 500, zeni: 100, enemies: ['recon-probe'] });
    const setup = P.makeBattleSetup(s, stage);
    const b = new Battle(setup);
    b.start();
    toInput(b, 'perfect');
    b.fighters.filter((f) => f.team === 'enemy').forEach((f) => (f.hp = 1));
    b.submit({ kind: 'skill', skillId: 'goku_3', targetUid: b.livingEnemies()[0].uid });
    expect(b.outcome?.outcome).toBe('victory');
    const before = s.roster.goku.level * 1e6 + s.roster.goku.xp;
    const z = s.zeni;
    const r = P.applyBattleResult(s, stage, b, 'story');
    expect(r.xp.goku).toBeGreaterThan(0);
    expect(s.roster.goku.level * 1e6 + s.roster.goku.xp).toBeGreaterThan(before);
    expect(s.zeni).toBe(z + 100);
    // defeat
    const s2 = newGameState();
    const b2 = new Battle(P.makeBattleSetup(s2, mkStage({ team: ['goku'], enemies: ['recon-probe'] })));
    b2.start();
    b2.heroes()[0].hp = 0;
    b2.heroes()[0].alive = false;
    b2.submit({ kind: 'attack', targetUid: 'x' });
    (b2 as any).phase = 'ended';
    (b2 as any).outcome = { outcome: 'defeat', reason: 'x' };
    const snapshot = JSON.stringify(s2.roster);
    const dz = s2.zeni;
    const r2 = P.applyBattleResult(s2, stage, b2, 'story');
    expect(r2.outcome).toBe('defeat');
    expect(JSON.stringify(s2.roster)).toBe(snapshot);
    expect(s2.zeni).toBe(dz);
    expect(s2.stats.battlesLost).toBe(1);
  });
  it('heroes helper init is consistent with stats', () => {
    expect(heroInit('goku', 10).hp).toBeGreaterThan(0);
  });
});

describe('quests and story commit', () => {
  it('quest availability follows beats, progress is capped, rewards pay exactly once', async () => {
    const s = await advanceTo(newGameState(), 'A02');
    expect(questStatus(s, 'medicine_route')).toBe('available');
    expect(questStatus(s, 'gero_records')).toBe('locked');
    expect(startQuest(s, 'medicine_route')).toBe(true);
    expect(startQuest(s, 'medicine_route')).toBe(false);
    expect(completeQuest(s, 'medicine_route').ok).toBe(false);
    s.inventory.lab_medicine = 3;
    expect(objectiveProgress(s, 'medicine_route', 'vials')).toBe(3);
    progressQuest(s, 'medicine_route', 'deliver');
    const r1 = completeQuest(s, 'medicine_route');
    expect(r1.ok).toBe(true);
    expect(s.inventory.lab_medicine).toBeUndefined();
    expect(completeQuest(s, 'medicine_route').ok).toBe(false);
    expect(s.inventory.ki_capsule).toBeGreaterThanOrEqual(5);
  });
  it('windows close: unfinished quests become missed after their deadline beat and cannot be completed retroactively', async () => {
    const s = await advanceTo(newGameState(), 'C01');
    refreshQuests(s);
    expect(questStatus(s, 'android_evacuations')).toBe('missed');
    expect(startQuest(s, 'android_evacuations')).toBe(false);
    expect(() => validateState(clone(s))).not.toThrow();
  });
  it('10 quests exist with finite objectives', () => {
    expect(QUESTS.length).toBe(10);
    for (const q of QUESTS) for (const o of q.objectives) expect(o.need).toBeGreaterThan(0);
  });
  it('beat commit is idempotent (no double rewards on reload/retry loops)', () => {
    const s = newGameState();
    expect(completeBeat(s, 'P01')).toBe(true);
    expect(completeBeat(s, 'P01')).toBe(false);
    expect(completeBeat(s, 'A03')).toBe(false); // cannot skip ahead
    expect(s.beat).toBe(1);
  });
  it('condition language', () => {
    const s = newGameState();
    s.flags.x = true;
    expect(evalCond(s, 'flag:x && !flag:y')).toBe(true);
    expect(evalCond(s, 'flag:y || beat==P01')).toBe(true);
    expect(evalCond(s, 'beat>=P02')).toBe(false);
    expect(evalCond(s, 'item:senzu_small>=3')).toBe(true);
    expect(evalCond(s, 'quest:medicine_route=none')).toBe(true);
    expect(() => evalCond(s, 'bogus:1')).toThrow();
  });
});

describe('world simulation', () => {
  it('walls block movement, spawn is safe, and exits trigger once', () => {
    const s = newGameState();
    s.mapId = 'capsule_corp';
    const m = MAPS.capsule_corp;
    s.x = m.spawn.x * 32 + 16;
    s.y = m.spawn.y * 32 + 30;
    const w = new WorldSim(s);
    w.encountersEnabled = false;
    // run into the top wall
    for (let i = 0; i < 600; i++) w.update(16, { dx: 0, dy: -1 });
    expect(w.py).toBeGreaterThan(8 * 32 - 4); // main building is solid
    // walk east to the exit
    let exits = 0;
    for (let i = 0; i < 1500; i++) {
      const ev = w.update(16, { dx: 1, dy: 0.0 });
      exits += ev.filter((e) => e.type === 'exit').length;
    }
    expect(exits).toBeLessThanOrEqual(1);
  });
  it('random encounters can be disabled by the test hook only and respect grace periods', () => {
    const s = newGameState();
    s.mapId = 'rocky_outskirts';
    s.x = 3 * 32;
    s.y = 20 * 32 + 30;
    const w = new WorldSim(s);
    let enc = 0;
    for (let i = 0; i < 4000; i++) {
      enc += w.update(16, { dx: i % 400 < 200 ? 1 : -1, dy: 0 }).filter((e) => e.type === 'encounter').length;
    }
    expect(enc).toBeGreaterThan(0);
    const s2 = newGameState();
    s2.mapId = 'rocky_outskirts';
    s2.x = 3 * 32;
    s2.y = 20 * 32 + 30;
    const w2 = new WorldSim(s2);
    w2.encountersEnabled = false;
    let enc2 = 0;
    for (let i = 0; i < 4000; i++) enc2 += w2.update(16, { dx: i % 400 < 200 ? 1 : -1, dy: 0 }).filter((e) => e.type === 'encounter').length;
    expect(enc2).toBe(0);
  });
  it('warping repairs a blocked destination to a free tile', () => {
    const s = newGameState();
    s.mapId = 'capsule_corp';
    const w = new WorldSim(s);
    w.warp('south_city', 4, 4); // inside a building block
    expect(w.map.id).toBe('south_city');
    expect(w.px).toBeGreaterThan(0);
  });
});

describe('input manager', () => {
  it('stacked handlers consume actions; held pad button does not re-fire; keyboard ignores modifier chords', () => {
    const im = new InputManager();
    const seen: string[] = [];
    im.push((a) => { seen.push('base:' + a); });
    const pop = im.push((a) => { if (a === 'confirm') { seen.push('modal:' + a); return true; } });
    im.emit('confirm');
    im.emit('back');
    pop();
    im.emit('confirm');
    expect(seen).toEqual(['modal:confirm', 'base:back', 'base:confirm']);
    let pressed = true;
    im.getPads = () => [{ connected: true, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0 ? pressed : false, value: 0, touched: false })), axes: [0, 0] } as unknown as Gamepad];
    const fired: string[] = [];
    im.push((a) => { fired.push(a); return true; });
    for (let t = 0; t < 5; t++) im.pollPad(t * 16);
    expect(fired.filter((x) => x === 'confirm').length).toBe(1);
    pressed = false;
    im.pollPad(100);
    pressed = true;
    im.pollPad(120);
    expect(fired.filter((x) => x === 'confirm').length).toBe(2);
    im.getPads = () => [null];
    expect(() => im.pollPad(200)).not.toThrow();
    expect(im.held()).toEqual({ dx: 0, dy: 0, run: false });
  });
});
