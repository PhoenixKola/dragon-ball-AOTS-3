// Real-browser playthrough: drives the packaged dist build in system Chrome with real keyboard events.
// Navigation goals come from the shared navigator (real collision grid); battle decisions come from the shared reference policy and
// are submitted through the same api.battleSubmit path the HUD buttons use (the first fights use the real HUD buttons).
// Active Guard is pressed with real key events timed from the live cue.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { launch, shot, snap } from './lib.mjs';

const POLICY = process.env.POLICY || 'attentive';
const PROB = { attentive: [0.55, 0.35], average: [0.15, 0.45], noguard: [0, 0] }[POLICY] || [0.55, 0.35];
const MAX_MIN = Number(process.env.MAX_MIN || 40);
const t0 = Date.now();
const t = await launch({ width: 1280, height: 720, port: 4181 });
const { page } = t;
const log = [];
const L = (m) => { const line = `[${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`; console.log(line); log.push(line); };
await page.waitForFunction(() => window.__AOTS__ && window.__AOTS__.snapshot().assetsReady, null, { timeout: 30000 });
if (process.env.START_SAVE) {
  const text = readFileSync(process.env.START_SAVE, 'utf8');
  await page.evaluate((t) => localStorage.setItem('aots3.cell.v1.slot0', t), text);
  await page.reload();
  await page.waitForFunction(() => window.__AOTS__ && window.__AOTS__.snapshot().assetsReady, null, { timeout: 30000 });
  await page.getByRole('button', { name: /continue/i }).first().click();
} else {
  await page.getByRole('button', { name: /new game/i }).first().click();
  await page.getByRole('button', { name: new RegExp('^' + (POLICY === 'noguard' ? 'Easy' : 'Normal')) }).first().click();
}
await page.waitForFunction(() => window.__AOTS__.snapshot().screen !== 'title', null, { timeout: 20000 });
await page.evaluate(() => window.__AOTS__.settings({ battleSpeed: 2, showTutorials: false }));

const held = new Set();
const setKeys = async (want) => {
  for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
  for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
};
const release = () => setKeys(new Set());
let battles = 0, lastBeat = -1, stuck = 0, lastPos = '';
let inBattle = false;
const shotBattles = new Set();
const jitterDone = new Set();
const seenMaps = new Set();
const beatLog = [];
let rng = 12345;
const rnd = () => ((rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0) / 4294967296);

async function battleStep(s) {
  const b = s.battle;
  await release();
  if (b.tutorial) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); return; }
  if (b.paused) { await page.keyboard.press('KeyP'); return; }
  if (b.phase === 'guard' && b.guard) {
    const r = rnd();
    if (r < PROB[0] + PROB[1]) {
      const offset = r < PROB[0] ? (rnd() - 0.5) * 70 : (rnd() - 0.5) * 240;
      const target = b.guard.impactAt + offset;
      const dl = Date.now() + 2500;
      while (Date.now() < dl) {
        const cur = await page.evaluate(() => window.__AOTS__.snapshot().battle);
        if (!cur || !cur.guard || cur.guard.id !== b.guard.id) return;
        if (cur.battleClock >= target - 8) { await page.keyboard.press('Digit' + b.guard.slot); break; }
        await page.waitForTimeout(5);
      }
    }
    await page.waitForFunction((id) => { const x = window.__AOTS__.snapshot().battle; return !x || !x.guard || x.guard.id !== id; }, b.guard.id, { timeout: 4000 }).catch(() => {});
    return;
  }
  if (b.phase === 'input' && b.commands) {
    const key = b.stageId + ':' + b.round;
    if (!shotBattles.has(b.stageId) && !b.stageId.startsWith('RND') ) { shotBattles.add(b.stageId); await page.waitForTimeout(250); await shot(page, `battle-${b.stageId}`, 'tests/logs/screens/playthrough'); }
    void key;
    if (process.env.JITTER && !jitterDone.has(b.stageId)) {
      jitterDone.add(b.stageId);
      const samples = await page.evaluate(() => new Promise((res) => { const out = []; let n = 0; const f = () => { const d = window.__AOTS__.battleDebug(); if (d) out.push(d.slots.map((s) => [s.uid, s.x, s.y, s.h, s.tex, s.homeX, s.homeY])); if (++n < 90) requestAnimationFrame(f); else res(out); }; requestAnimationFrame(f); }));
      const byUid = {};
      for (const fr of samples) for (const [uid, x, y, h, tex, hx, hy] of fr) (byUid[uid] ??= []).push({ x, y, h, tex, hx, hy });
      for (const [uid, arr] of Object.entries(byUid)) {
        let maxStep = 0, maxDx = 0, hVar = 0;
        for (let i = 1; i < arr.length; i++) { maxStep = Math.max(maxStep, Math.abs(arr[i].y - arr[i - 1].y)); maxDx = Math.max(maxDx, Math.abs(arr[i].x - arr[i].hx)); hVar = Math.max(hVar, Math.abs(arr[i].h - arr[0].h)); }
        L('JITTER ' + b.stageId + ' ' + uid + ' idle maxYstep=' + maxStep.toFixed(2) + ' maxXoffHome=' + maxDx.toFixed(1) + ' heightVar=' + hVar + ' tex=' + new Set(arr.map((q) => q.tex)).size);
      }
    }
    const a = await page.evaluate(() => window.__AOTS__.advice());
    if (!a) { await page.waitForTimeout(50); return; }
    let ok = false;
    if (battles <= 2 && a.kind === 'attack') {
      try {
        await page.getByRole('button', { name: /^Attack/ }).first().click({ timeout: 800 });
        await page.waitForTimeout(80);
        const tn = b.fighters.find((f) => f.uid === a.targetUid)?.name ?? '';
        await page.getByRole('button', { name: new RegExp(tn.replace(/[().]/g, '.')) }).first().click({ timeout: 800 });
        ok = true;
      } catch { await page.keyboard.press('KeyX'); }
    }
    if (!ok) {
      const r = await page.evaluate((act) => window.__AOTS__.submit(act), a);
      if (!r.ok) L('submit rejected: ' + r.reason + ' ' + JSON.stringify(a));
    }
    await page.waitForTimeout(30);
    return;
  }
  await page.waitForTimeout(40);
}

async function overlayStep(s) {
  await release();
  const o = s.overlay;
  if (o === 'rewards') { await page.keyboard.press('Enter'); await page.waitForTimeout(150); return true; }
  if (o === 'defeat') { L('DEFEAT -> retry'); await page.getByRole('button', { name: /retry/i }).first().click(); return true; }
  if (o === 'travel') return false;
  if (o === 'confirm') { await page.getByRole('button', { name: /^yes/i }).first().click(); return true; }
  if (o === 'shop' || o === 'menu' || o === 'save' || o === 'help' || o === 'options') { await page.keyboard.press('KeyX'); await page.waitForTimeout(100); return true; }
  return false;
}

let lastDiag = 0;
while ((Date.now() - t0) / 60000 < MAX_MIN) {
  const s = await snap(page);
  if (Date.now() - lastDiag > 30000) {
    lastDiag = Date.now();
    const raf = await page.evaluate(() => new Promise((res) => { const t0 = performance.now(); let n = 0; const f = () => { n++; if (performance.now() - t0 > 300) res(n); else requestAnimationFrame(f); }; requestAnimationFrame(f); setTimeout(() => res(-n), 1500); })).catch(() => 'evalfail');
    L('raf frames in 300ms: ' + raf + ' hidden=' + (await page.evaluate(() => document.hidden)));
    if (t.errors.length) L('errors so far: ' + JSON.stringify(t.errors.slice(-3)));
    L('diag ' + JSON.stringify({ screen: s.screen, overlay: s.overlay, phase: s.battle?.phase, round: s.battle?.round, cur: s.battle?.currentUid, tut: !!s.battle?.tutorial, paused: s.battle?.paused, guard: !!s.battle?.guard, cmd: !!s.battle?.commands, dlg: !!s.dialogue, script: s.scriptActive, cut: s.screen === 'cutscene' ? await page.evaluate(() => window.__AOTS__.cutDebug()) : null }));
  }
  if (s.screen === 'battle' && s.battle) {
    if (!inBattle) { inBattle = true; battles++; }
    if (s.overlay) { await overlayStep(s); continue; }
    if (s.battle.phase === 'ended') { await page.waitForTimeout(100); continue; }
    await battleStep(s);
    continue;
  }
  inBattle = false;
  if (s.overlay && (await overlayStep(s))) continue;
  if (s.dialogue) { await release(); await page.keyboard.press('Enter'); await page.waitForTimeout(110); continue; }
  if (s.choice) {
    await release();
    const idx = s.choice.choices.findIndex((c) => new RegExp(process.env.CHOICE_RE || 'ready|begin|yes', 'i').test(c));
    const label = s.choice.choices[idx >= 0 ? idx : s.choice.choices.length - 1];
    await page.getByRole('button', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 24)) }).first().click();
    continue;
  }
  if (s.card || s.screen === 'cutscene' || s.scriptActive || (await page.evaluate(() => window.__AOTS__.busy()))) { await release(); await page.waitForTimeout(150); continue; }
  const game = s.game;
  if (!game) { await page.waitForTimeout(100); continue; }
  if (game.beat !== lastBeat) {
    if (lastBeat >= 0) {
      beatLog.push({ beat: lastBeat, levels: Object.fromEntries(Object.entries(game.roster).map(([h, r]) => [h, r.level])), t: Math.round((Date.now() - t0) / 1000) });
      L(`beat ${lastBeat} done -> now ${game.beat} (completed ${game.completed.length}) map=${game.mapId} battles=${battles}`);
      await shot(page, `pt-${POLICY}-beat-${String(game.beat).padStart(2, '0')}`, 'tests/logs/screens/playthrough');
    }
    lastBeat = game.beat; stuck = 0;
  }
  if (game.beat >= 30 && !process.env.POSTGAME) { L('STORY COMPLETE'); break; }
  if (process.env.POSTGAME && game.postgame.records.SIM_JUNIORS) { L('POSTGAME SIM CLEARED ' + JSON.stringify(game.postgame.records)); break; }
  if (!seenMaps.has(game.mapId)) { seenMaps.add(game.mapId); await shot(page, `map-${game.mapId}`, 'tests/logs/screens/playthrough'); }
  const goal = await page.evaluate(() => window.__AOTS__.goal());
  if (!goal || goal.kind === 'done') { L('no goal'); break; }
  const simPos = await page.evaluate(() => window.__AOTS__.sim());
  const posKey = Math.round(simPos.x / 6) + ',' + Math.round(simPos.y / 6) + simPos.map;
  stuck = posKey === lastPos ? stuck + 1 : 0;
  lastPos = posKey;
  if (stuck > 80) { L('STUCK at ' + posKey + ' goal ' + JSON.stringify(goal) + ' sim ' + JSON.stringify(simPos) + ' held ' + [...held].join('+') + ' dir ' + JSON.stringify(goal.kind === 'walk' ? await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [goal.x, goal.y]) : null) + ' ui ' + JSON.stringify({ o: s.overlay, d: !!s.dialogue, sa: s.scriptActive, ld: s.loading })); await shot(page, 'stuck', 'tests/logs/screens/playthrough'); break; }
  const keysFor = (d) => {
    const want = new Set();
    if (d && !d.blocked) {
      if (d.dx > 0.35) want.add('KeyD');
      if (d.dx < -0.35) want.add('KeyA');
      if (d.dy > 0.35) want.add('KeyS');
      if (d.dy < -0.35) want.add('KeyW');
    }
    want.add('ShiftLeft');
    return want;
  };
  if (goal.kind === 'walk') {
    const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [goal.x, goal.y]);
    if (!d || d.blocked) { L('blocked walking: ' + JSON.stringify(goal)); stuck += 10; await release(); await page.waitForTimeout(100); continue; }
    await setKeys(keysFor(d));
    await page.waitForTimeout(70);
    continue;
  }
  if (goal.kind === 'interact') {
    const sp = await page.evaluate((id) => window.__AOTS__.standPoint(id), goal.entityId);
    if (!sp) { L('no stand point for ' + goal.entityId); stuck += 20; continue; }
    const dist = Math.hypot(sp.x - simPos.x, sp.y - simPos.y);
    if (dist > 9) {
      const d = await page.evaluate(([x, y]) => window.__AOTS__.dirTo(x, y), [sp.x, sp.y]);
      await setKeys(keysFor(d));
      await page.waitForTimeout(70);
      continue;
    }
    await release();
    const toward = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' }[sp.face];
    await page.keyboard.down(toward);
    await page.waitForTimeout(90);
    await page.keyboard.up(toward);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(250);
    const s2 = await snap(page);
    if (s2.overlay === 'travel' && goal.travelTo) {
      const opt = s2.travel.options.find((o) => o.map === goal.travelTo);
      await page.getByRole('button', { name: new RegExp(opt.label) }).first().click();
      await page.waitForTimeout(600);
    }
    continue;
  }
}
await release();
const final = await page.evaluate(() => ({ beat: window.__AOTS__.state().beat, completed: window.__AOTS__.state().completed.length, flags: Object.keys(window.__AOTS__.state().flags), stats: window.__AOTS__.state().stats }));
await shot(page, `pt-${POLICY}-final`, 'tests/logs/screens/playthrough');
L('FINAL ' + JSON.stringify(final));
L('page errors: ' + JSON.stringify(t.errors));
const external = t.requests.filter((u) => !u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:'));
L('external requests: ' + JSON.stringify(external));
mkdirSync('tests/logs', { recursive: true });
writeFileSync(`tests/logs/e2e-playthrough-${POLICY}.json`, JSON.stringify({ policy: POLICY, final, beatLog, errors: t.errors, externalRequests: external, minutes: (Date.now() - t0) / 60000, log }, null, 1));
await t.close();
process.exit(final.beat >= 30 ? 0 : 1);
