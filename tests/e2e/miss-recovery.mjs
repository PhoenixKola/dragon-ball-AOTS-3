// Real Phaser capture with a test-only evade status injected into the first P01 enemy.
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4187 });
try {
  const { page } = t;
  await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
  await page.evaluate(() => window.__AOTS__.settings({ showTutorials: false, battleSpeed: 1 }));
  await page.getByRole('button', { name: /new game/i }).first().click();
  await page.getByRole('button', { name: /^Normal/ }).first().click();

  let targetUid = '';
  const held = new Set();
  const move = async (want) => {
    for (const key of [...held]) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  };
  let lastState;
  for (let i = 0; i < 1600; i++) {
    const state = await page.evaluate(() => window.__AOTS__.snapshot());
    lastState = { screen: state.screen, dialogue: !!state.dialogue, overlay: state.overlay, scriptActive: state.scriptActive, loading: state.loading, phase: state.battle?.phase, tutorial: !!state.battle?.tutorial };
    if (state.dialogue) await page.keyboard.press('Enter');
    if (state.screen === 'cutscene') await page.keyboard.press('Enter');
    if (state.screen === 'battle' && state.battle?.phase === 'input' && state.battle.commands) {
      targetUid = await page.evaluate(() => {
        const battle = window.__AOTS__.battle();
        const target = battle.livingEnemies()[0];
        target.statuses.push({ kind: 'evade', turns: 1, power: 1 });
        return target.uid;
      });
      const result = await page.evaluate((target) => window.__AOTS__.submit({ kind: 'attack', targetUid: target }), targetUid);
      if (!result.ok) throw new Error(`Attack rejected: ${result.reason}`);
      break;
    }
    if (state.screen === 'world' && !state.overlay && !state.scriptActive && !state.loading) {
      const goal = await page.evaluate(() => window.__AOTS__.goal());
      const sim = await page.evaluate(() => window.__AOTS__.sim());
      if (goal?.kind === 'walk') {
        const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [goal.x, goal.y]);
        const keys = new Set(['ShiftLeft']);
        if (d && !d.blocked) {
          if (d.dx > 0.35) keys.add('KeyD');
          if (d.dx < -0.35) keys.add('KeyA');
          if (d.dy > 0.35) keys.add('KeyS');
          if (d.dy < -0.35) keys.add('KeyW');
        }
        await move(keys);
      } else if (goal?.kind === 'interact') {
        const point = await page.evaluate((id) => window.__AOTS__.standPoint(id), goal.entityId);
        if (point && sim && Math.hypot(point.x - sim.x, point.y - sim.y) <= 9) {
          await move(new Set());
          const facing = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[point.face];
          await page.keyboard.press(facing);
          await page.keyboard.press('KeyE');
        } else if (point && sim) {
          const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [point.x, point.y]);
          const keys = new Set(['ShiftLeft']);
          if (d && !d.blocked) {
            if (d.dx > 0.35) keys.add('KeyD');
            if (d.dx < -0.35) keys.add('KeyA');
            if (d.dy > 0.35) keys.add('KeyS');
            if (d.dy < -0.35) keys.add('KeyW');
          }
          await move(keys);
        }
      } else await move(new Set());
    }
    await page.waitForTimeout(60);
  }
  if (!targetUid) throw new Error(`P01 did not reach a player input turn: ${JSON.stringify(lastState)}`);
  await page.waitForTimeout(420);
  await shot(page, 'miss-evasion-contact', 'tests/logs/screens/combat-vfx');
  await page.waitForFunction(() => window.__AOTS__.snapshot().battle?.log.some((line) => /evades .*Attack/i.test(line)), null, { timeout: 10000 });
  const attacker = await page.evaluate(() => window.__AOTS__.battleDebug()?.slots.find((slot) => slot.uid === 'h:trunks'));
  if (!attacker || Math.abs(attacker.x - attacker.homeX) > 2 || attacker.pose !== 'idle') {
    throw new Error(`Whiffed melee did not recover to home: ${JSON.stringify(attacker)}`);
  }
  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ testOnlyFixture: 'one P01 enemy evade charge', attackerReturnedHome: true, errors: t.errors, externalRequests: external }));
  if (t.errors.length || external.length) process.exitCode = 1;
} finally {
  await t.close();
}
