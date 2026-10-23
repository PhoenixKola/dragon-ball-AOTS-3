import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { GameController } from '../../src/app/controller';
import { WorldSim } from '../../src/engine/world/sim';
import { newGameState } from '../../src/systems/gameState';
import { pack } from '../../src/systems/save';
import { HeadlessHost, POLICIES, WorldBot } from '../support/bot';

// Generates legitimately-earned saves (via the headless bot) used by browser tests for resume / screenshot checks.
it('writes saves at selected story beats', async () => {
  const pol = POLICIES.attentive;
  const state = newGameState(pol.difficulty);
  const world = new WorldSim(state);
  const host = new HeadlessHost(state, pol, 1);
  const bot = new WorldBot(new GameController(state, world, host), host);
  mkdirSync('tests/logs/saves', { recursive: true });
  const marks = [3, 10, 17, 23, 26, 29];
  while (state.beat < 30) {
    if (marks.includes(state.beat)) writeFileSync(`tests/logs/saves/beat-${state.beat}.json`, pack(state, 1700000000000 + state.beat));
    await bot.playNextBeat();
  }
  writeFileSync('tests/logs/saves/beat-30.json', pack(state, 1700000000030));
}, 120000);
