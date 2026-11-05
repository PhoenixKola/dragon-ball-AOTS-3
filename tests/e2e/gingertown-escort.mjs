// Runs the Ginger Town survivor quest from a naturally earned story save,
// including the real Cell-Husk fight, escort walk, driver interaction and art capture.
import { readFileSync } from 'node:fs';
import { launch, shot } from './lib.mjs';

const t = await launch({ width: 1280, height: 720, port: 4191 });
const { page } = t;
const held = new Set();
let victoryCaptured = false;
const snap = () => page.evaluate(() => window.__AOTS__.snapshot());

async function setMotion(next) {
  for (const key of [...held]) if (!next.has(key)) { await page.keyboard.up(key); held.delete(key); }
  for (const key of next) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
}

async function settleUi() {
  let last;
  for (let i = 0; i < 600; i++) {
    const s = await snap();
    last = { screen: s.screen, overlay: s.overlay, dialogue: !!s.dialogue, choice: s.choice, card: s.card, busy: s.scriptActive, phase: s.battle?.phase, tutorial: s.battle?.tutorial, paused: s.battle?.paused };
    if (s.screen === 'battle') {
      const b = s.battle;
      if (s.overlay === 'rewards') { await page.keyboard.press('Enter'); await page.waitForTimeout(120); continue; }
      if (s.overlay === 'defeat') throw new Error('The survivor fight ended in defeat.');
      if (b?.phase === 'ended' && !victoryCaptured) {
        await shot(page, 'gingertown-cell-husk-fight-victory', 'tests/logs/screens/pilot');
        victoryCaptured = true;
      }
      if (b?.tutorial) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); continue; }
      if (b?.paused) { await page.keyboard.press('KeyP'); await page.waitForTimeout(120); continue; }
      if (b?.phase === 'guard' && b.guard) {
        const { id, impactAt, slot } = b.guard;
        const end = Date.now() + 2500;
        while (Date.now() < end) {
          const live = (await snap()).battle;
          if (!live?.guard || live.guard.id !== id) break;
          if (live.battleClock >= impactAt - 10) { await page.keyboard.press(`Digit${slot}`); break; }
          await page.waitForTimeout(6);
        }
        continue;
      }
      if (b?.phase === 'input') {
        const action = await page.evaluate(() => window.__AOTS__.advice());
        if (action) await page.evaluate((a) => window.__AOTS__.submit(a), action);
      }
      await page.waitForTimeout(45);
      continue;
    }
    if (s.overlay === 'rewards') { await page.keyboard.press('Enter'); await page.waitForTimeout(120); continue; }
    if (s.overlay === 'confirm') { await page.getByRole('button', { name: /^yes/i }).first().click(); continue; }
    if (['menu', 'save', 'help', 'options', 'shop'].includes(s.overlay)) { await page.keyboard.press('KeyX'); await page.waitForTimeout(100); continue; }
    if (s.dialogue) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); continue; }
    if (s.choice) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); continue; }
    if (s.card) { await page.keyboard.press('Enter'); await page.waitForTimeout(100); continue; }
    if (s.screen === 'cutscene' || s.scriptActive || await page.evaluate(() => window.__AOTS__.busy())) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      continue;
    }
    if (s.screen === 'world' && !s.overlay) return;
    await page.waitForTimeout(80);
  }
  throw new Error(`The game did not settle back to the world scene: ${JSON.stringify(last)}`);
}

async function walkToInteractable(id, { interact = true } = {}) {
  for (let i = 0; i < 1400; i++) {
    await settleUi();
    const sim = await page.evaluate(() => window.__AOTS__.sim());
    const sp = await page.evaluate((key) => window.__AOTS__.standPoint(key), id);
    if (!sp) throw new Error(`No reachable standing point for ${id}`);
    const distance = Math.hypot(sp.x - sim.x, sp.y - sim.y);
    if (distance <= 9) {
      await setMotion(new Set());
      if (!interact) return sp;
      const face = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[sp.face];
      await page.keyboard.press(face);
      await page.keyboard.press('KeyE');
      await page.waitForTimeout(240);
      return;
    }
    const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [sp.x, sp.y]);
    if (!d || d.blocked) throw new Error(`Path blocked en route to ${id}`);
    const keys = new Set();
    if (d.dx > 0.35) keys.add('KeyD');
    if (d.dx < -0.35) keys.add('KeyA');
    if (d.dy > 0.35) keys.add('KeyS');
    if (d.dy < -0.35) keys.add('KeyW');
    await setMotion(keys);
    await page.waitForTimeout(70);
  }
  throw new Error(`Timed out walking to ${id}`);
}

async function walkNearFoe(id) {
  for (let i = 0; i < 900; i++) {
    await settleUi();
    const sim = await page.evaluate(() => window.__AOTS__.sim());
    const foe = await page.evaluate((key) => window.__AOTS__.entity(key), id);
    if (!foe?.active) return; // settleUi completed the auto-triggered fight above.
    if (Math.hypot(foe.x - sim.x, foe.y - sim.y) <= 42) { await setMotion(new Set()); return; }
    const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [foe.x, foe.y]);
    if (!d || d.blocked) throw new Error(`Path blocked en route to ${id}`);
    const keys = new Set();
    if (d.dx > 0.35) keys.add('KeyD');
    if (d.dx < -0.35) keys.add('KeyA');
    if (d.dy > 0.35) keys.add('KeyS');
    if (d.dy < -0.35) keys.add('KeyW');
    await setMotion(keys);
    await page.waitForTimeout(70);
  }
  throw new Error(`Timed out approaching ${id}`);
}

try {
  const save = readFileSync('tests/logs/saves/beat-11.json', 'utf8');
  await page.evaluate((text) => localStorage.setItem('aots3.cell.v1.slot0', text), save);
  await page.reload();
  await page.waitForFunction(() => window.__AOTS__?.snapshot().assetsReady, null, { timeout: 30000 });
  await page.getByRole('button', { name: /continue/i }).first().click();
  await page.waitForFunction(() => window.__AOTS__?.snapshot().game?.mapId === 'gingertown', null, { timeout: 30000 });
  await page.waitForFunction(() => !window.__AOTS__?.snapshot().loading, null, { timeout: 30000 });
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__AOTS__.setEncounters(false));
  await shot(page, 'gingertown-before-survivor-escort', 'tests/logs/screens/pilot');

  await walkToInteractable('q_cellar_voice');
  if ((await snap()).dialogue) {
    await page.waitForTimeout(2600);
    await shot(page, 'gingertown-cellar-dialogue', 'tests/logs/screens/pilot');
  }
  await settleUi();
  if ((await page.evaluate(() => window.__AOTS__.state().quests.ginger_survivors?.state)) !== 'active') {
    throw new Error('Talking to the cellar did not start the survivor quest.');
  }
  await walkNearFoe('qf_ginger');
  for (let i = 0; i < 2200 && (await snap()).screen !== 'world'; i++) {
    const s = await snap();
    if (s.screen === 'battle' && s.battle?.phase === 'input') {
      const action = await page.evaluate(() => window.__AOTS__.advice());
      if (action) await page.evaluate((a) => window.__AOTS__.submit(a), action);
    } else if (s.screen === 'battle' && s.battle?.phase === 'guard' && s.battle.guard) {
      const { id, impactAt, slot } = s.battle.guard;
      const live = await page.evaluate(() => window.__AOTS__.snapshot().battle);
      if (live?.guard?.id === id && live.battleClock >= impactAt - 10) await page.keyboard.press(`Digit${slot}`);
    } else if (s.overlay === 'rewards' || s.dialogue || s.screen === 'cutscene') await page.keyboard.press('Enter');
    await page.waitForTimeout(55);
  }
  await settleUi();
  const defeated = await page.evaluate(() => window.__AOTS__.state().opened.includes('defeated:qf_ginger'));
  if (!defeated) throw new Error('The Cell-Husk encounter did not record its victory.');

  await walkToInteractable('q_cellar_voice');
  await settleUi();
  const rescued = await page.evaluate(() => !!window.__AOTS__.state().flags.ginger_cellar_free);
  if (!rescued) throw new Error('The rescued civilian did not join the route.');
  await page.waitForTimeout(800);
  await shot(page, 'gingertown-survivor-following', 'tests/logs/screens/pilot');
  const driverPoint = await walkToInteractable('q_truck', { interact: false });
  await page.waitForTimeout(650);
  await shot(page, 'gingertown-survivor-at-shuttle', 'tests/logs/screens/pilot');
  await page.keyboard.press({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[driverPoint.face]);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(240);
  if ((await snap()).dialogue) {
    await page.waitForTimeout(2600);
    await shot(page, 'gingertown-evacuation-driver-dialogue', 'tests/logs/screens/pilot');
  }
  await settleUi();
  const result = await page.evaluate(() => ({ quest: window.__AOTS__.state().quests.ginger_survivors, evacuated: !!window.__AOTS__.state().flags.ginger_survivor_evacuated, follower: window.__AOTS__.worldDebug() }));
  if (result.quest?.state !== 'done' || !result.evacuated) throw new Error('The evacuation did not complete the quest and board the survivor.');
  await shot(page, 'gingertown-survivor-evacuated', 'tests/logs/screens/pilot');

  const external = t.requests.filter((url) => !url.startsWith('http://127.0.0.1') && !url.startsWith('data:') && !url.startsWith('blob:'));
  console.log(JSON.stringify({ route: 'earned beat-11 Normal save, quest played through real movement/combat/interactions', result, errors: t.errors, externalRequests: external }));
  if (t.errors.length || external.length) process.exitCode = 1;
} finally {
  await setMotion(new Set());
  await t.close();
}
