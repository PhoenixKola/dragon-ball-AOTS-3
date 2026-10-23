import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GameController } from '../../src/app/controller';
import { MAPS } from '../../src/data/maps';
import { BEATS } from '../../src/data/story';
import { WorldSim } from '../../src/engine/world/sim';
import { newGameState } from '../../src/systems/gameState';
import { SaveManager } from '../../src/systems/save';
import { HeadlessHost, POLICIES, WorldBot } from '../support/bot';

export async function runCampaign(policyName: string, seed: number, opts: { quiet?: boolean; noEncounters?: boolean } = {}) {
  const pol = POLICIES[policyName];
  const state = newGameState(pol.difficulty);
  const world = new WorldSim(state);
  if (opts.noEncounters) world.encountersEnabled = false;
  const host = new HeadlessHost(state, pol, seed);
  const c = new GameController(state, world, host);
  const bot = new WorldBot(c, host);
  const checkpoints: unknown[] = [];
  const mem = new Map<string, string>();
  const sm = new SaveManager({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) });
  let failed: string | null = null;
  const t0 = Date.now();
  try {
    while (state.beat < BEATS.length) {
      const id = await bot.playNextBeat();
      const save = sm.save('auto', state);
      if (!save.ok) throw new Error(`save failed after ${id}: ${save.error}`);
      checkpoints.push({ beat: id, levels: Object.fromEntries(Object.entries(state.roster).map(([h, r]) => [h, r.level])), zeni: state.zeni, map: state.mapId, ticks: bot.ticks });
    }
  } catch (e) {
    failed = e instanceof Error ? e.stack ?? e.message : String(e);
  }
  const report = { policy: policyName, seed, completed: state.completed.length, total: BEATS.length, failed, defeats: host.defeats, battles: host.logs, checkpoints, finalFlags: Object.keys(state.flags), stats: state.stats, ms: Date.now() - t0 };
  if (!opts.quiet) {
    mkdirSync('tests/logs', { recursive: true });
    writeFileSync(`tests/logs/sim-${policyName}-${seed}.json`, JSON.stringify(report, null, 1));
  }
  return { state, report };
}

describe('natural progression simulation', () => {
  it('attentive guard: fresh save to credits without cheats', async () => {
    const { state, report } = await runCampaign('attentive', 1);
    if (report.failed) console.log(report.failed);
    console.log(report.battles.map((b) => `${b.stage}:${b.outcome}:${b.party}:r${b.rounds}:a${b.attempt}`).join(' | '));
    expect(report.failed).toBeNull();
    expect(state.beat).toBe(BEATS.length);
    expect(state.flags.credits_seen).toBe(true);
    expect(MAPS[state.mapId]).toBeTruthy();
  });
});
