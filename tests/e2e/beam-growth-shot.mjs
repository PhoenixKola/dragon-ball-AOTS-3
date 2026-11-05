// Captures the genuine P01 Trunks beam during its projectile travel in Phaser.
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4188 });
try {
  const { page } = t;
  await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
  await page.evaluate(() => window.__AOTS__.settings({ showTutorials: false, battleSpeed: 1 }));
  await page.getByRole('button', { name: /new game/i }).first().click();
  await page.getByRole('button', { name: /^Normal/ }).first().click();

  const held = new Set();
  const move = async (want) => {
    for (const key of [...held]) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  };
  let fired = false;
  let lastState;
  for (let i = 0; i < 1600; i++) {
    const state = await page.evaluate(() => window.__AOTS__.snapshot());
    lastState = { screen: state.screen, dialogue: !!state.dialogue, overlay: state.overlay, scriptActive: state.scriptActive, loading: state.loading, phase: state.battle?.phase };
    if (state.dialogue) await page.keyboard.press('Enter');
    if (state.screen === 'cutscene') await page.keyboard.press('Enter');
    if (state.screen === 'battle' && state.battle?.phase === 'input' && state.battle.commands) {
      const result = await page.evaluate(() => {
        const battle = window.__AOTS__.battle();
        const target = battle.livingEnemies()[0];
        const displayedTarget = window.__AOTS__.snapshot().battle.fighters.find((fighter) => fighter.uid === target.uid);
        return { targetUid: target.uid, hp: displayedTarget.hp, result: window.__AOTS__.submit({ kind: 'skill', skillId: 'trunks_0', targetUid: target.uid }) };
      });
      if (!result.result.ok) throw new Error(`Burning Attack rejected: ${result.result.reason}`);
      // Burning Attack spends 190 ms charging before the 230 ms beam travel.
      // Allow the browser scene clock to enter the travel window before capture.
      await page.waitForTimeout(405);
      const after = await page.evaluate((uid) => window.__AOTS__.snapshot().battle.fighters.find((fighter) => fighter.uid === uid)?.hp, result.targetUid);
      if (after !== result.hp) throw new Error(`Target took damage before beam contact (${result.hp} -> ${after})`);
      await shot(page, 'beam-growth-travel', 'tests/logs/screens/combat-vfx');
      fired = true;
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
  if (!fired) throw new Error(`P01 did not reach a player input turn: ${JSON.stringify(lastState)}`);
  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ route: 'fresh New Game to P01', action: 'Trunks Burning Attack', capturedDuringTravel: true, targetHpUnchangedAtCapture: true, errors: t.errors, externalRequests: external }));
  if (t.errors.length || external.length) process.exitCode = 1;
} finally {
  await t.close();
}
