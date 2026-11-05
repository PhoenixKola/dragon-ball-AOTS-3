// Fresh New Game capture matrix for Batch A: no test-only save, map or story state is injected.
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4190 });
const { page } = t;
try {
  await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await shot(page, 'title', 'tests/logs/screens/evidence-after');
  await page.getByRole('button', { name: /new game/i }).first().click();
  await page.getByRole('button', { name: /^Normal/ }).first().click();

  const held = new Set();
  const move = async (want) => {
    for (const key of [...held]) if (!want.has(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of want) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  };
  let captured = { title: true, dialogue: false, world: false, menu: false, battle: false, target: false, techniques: false };
  let lastState;
  for (let i = 0; i < 1800; i++) {
    const state = await page.evaluate(() => window.__AOTS__.snapshot());
    lastState = { screen: state.screen, dialogue: !!state.dialogue, overlay: state.overlay, scriptActive: state.scriptActive, loading: state.loading, phase: state.battle?.phase };
    if (state.dialogue && !captured.dialogue) {
      await page.waitForTimeout(700);
      await shot(page, 'opening-dialogue', 'tests/logs/screens/evidence-after');
      captured.dialogue = true;
    }
    if (state.dialogue) { await page.keyboard.press('Enter'); await page.waitForTimeout(70); continue; }
    if (state.screen === 'cutscene') { await page.keyboard.press('Enter'); await page.waitForTimeout(70); continue; }
    if (state.screen === 'world' && !captured.world && !state.overlay && !state.scriptActive && !state.loading) {
      await page.waitForTimeout(350);
      await shot(page, 'opening-world', 'tests/logs/screens/evidence-after');
      captured.world = true;
      await page.keyboard.press('Tab');
      await page.waitForTimeout(250);
      await shot(page, 'main-menu', 'tests/logs/screens/evidence-after');
      captured.menu = true;
      await page.keyboard.press('Tab');
      await page.waitForTimeout(150);
    }
    if (state.screen === 'battle' && state.battle?.phase === 'input' && state.battle.commands) {
      if (!captured.battle) {
        await page.waitForTimeout(250);
        await shot(page, 'battle-input', 'tests/logs/screens/evidence-after');
        captured.battle = true;
      }
      if (!captured.target) {
        await page.getByRole('button', { name: /^Attack/ }).first().click();
        await page.waitForTimeout(150);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
        await shot(page, 'target-selection', 'tests/logs/screens/evidence-after');
        captured.target = true;
        await page.keyboard.press('KeyX');
        await page.waitForTimeout(120);
      }
      if (!captured.techniques) {
        await page.getByRole('button', { name: /Techniques/i }).first().click();
        await page.waitForTimeout(150);
        await shot(page, 'technique-list', 'tests/logs/screens/evidence-after');
        captured.techniques = true;
      }
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
          await page.keyboard.press({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[point.face]);
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
  const missing = Object.entries(captured).filter(([, ok]) => !ok).map(([name]) => name);
  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ route: 'fresh New Game through P01 input', captured, missing, errors: t.errors, externalRequests: external }));
  if (missing.length || t.errors.length || external.length) process.exitCode = 1;
} finally {
  await t.close();
}
