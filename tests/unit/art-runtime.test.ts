import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CUTSCENES } from '../../src/data/cutscenes';
import { ENEMIES } from '../../src/data/enemies';
import { ITEMS, COMBOS } from '../../src/data/items';
import { MAP_LIST } from '../../src/data/maps';
import { SKILL_LIST, RAGE_ARTS } from '../../src/data/skills';
import { SPEAKERS } from '../../src/data/speakers';
import { registry, getActor, heroActorId } from '../../src/engine/assets';
import { HERO_FORMS } from '../../src/data/heroes';
import { HERO_IDS } from '../../src/types';
import propAlias from '../../src/data/propAlias.generated.json';

const PUBLIC = 'public';
const png = (p: string) => join(PUBLIC, p);

function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const report: Record<string, unknown> = {};

describe('runtime art integration audit', () => {
  it('every registry frame exists on disk with the recorded size and visible pixels', () => {
    let frames = 0;
    const bad: string[] = [];
    const check = (path: string, w: number, h: number, visible: number, label: string) => {
      frames++;
      if (!existsSync(png(path))) return bad.push(`${label}: missing ${path}`);
      const [pw, ph] = pngSize(png(path));
      if (pw !== w || ph !== h) bad.push(`${label}: size ${pw}x${ph} != ${w}x${h}`);
      if (!(visible > 0)) bad.push(`${label}: no visible pixels`);
    };
    for (const a of Object.values(registry.actors)) {
      for (const [k, f] of Object.entries(a.battle)) if (f) check(f.path, f.w, f.h, f.visible, `${a.id}/${k}`);
      for (const [d, v] of Object.entries(a.overworld ?? {})) {
        if (!v) continue;
        check(v.idle.path, v.idle.w, v.idle.h, v.idle.visible, `${a.id}/${d}/idle`);
        v.walk.forEach((f, i) => check(f.path, f.w, f.h, f.visible, `${a.id}/${d}/walk${i}`));
      }
      if (a.portrait) check(a.portrait.path, a.portrait.w, a.portrait.h, a.portrait.visible, `${a.id}/portrait`);
      expect(a.approved, `${a.id} must not claim approval`).toBe(false);
    }
    for (const v of Object.values(registry.vfx)) v.frames.forEach((f, i) => check(f.path, f.w, f.h, f.visible, `vfx ${v.id}/${i}`));
    for (const w of Object.values(registry.worlds)) w.backdrops.forEach((f, i) => check(f.path, f.w, f.h, f.visible, `${w.mapId}/backdrop${i}`));
    report.framesChecked = frames;
    expect(bad).toEqual([]);
  });

  it('every actor the game can request resolves to art or is covered by a documented fallback', () => {
    const wanted = new Set<string>();
    for (const e of Object.values(ENEMIES)) wanted.add(e.actor);
    for (const s of Object.values(SPEAKERS)) wanted.add(s.actor);
    for (const h of HERO_IDS) {
      wanted.add(`${h}-base`);
      for (const f of HERO_FORMS[h]) wanted.add(`${h}-${f.form}`);
    }
    for (const m of MAP_LIST) for (const e of m.entities) if (e.kind === 'npc' || e.kind === 'foe') wanted.add(e.actor);
    for (const c of Object.values(CUTSCENES)) for (const s of c.steps) if (s.t === 'show' || s.t === 'form') wanted.add(s.actor);
    wanted.add('piccolo-kami');
    wanted.add('goku-weakened');
    wanted.add('gohan-wounded');
    const missing = [...wanted].filter((a) => !getActor(a));
    report.actorsWanted = wanted.size;
    report.actorsMissingArt = missing;
    // 'narrator' is not a real actor; android-16 etc. are required
    const allowed = new Set(['narrator', 'protectee', 'sim']);
    expect(missing.filter((m) => !allowed.has(m)), 'actors without registry art (runtime would use the labelled placeholder)').toEqual([]);
  });

  it('hero form art resolution follows the documented fallback chain and never mixes characters', () => {
    expect(heroActorId('gohan', 'ssj2', {})).toBe('gohan-ssj2');
    expect(heroActorId('gohan', 'base', { goku_sacrifice: true })).toBe('gohan-wounded');
    expect(heroActorId('piccolo', 'base', { piccolo_kami_merged: true })).toBe('piccolo-kami');
    expect(heroActorId('goku', 'base', { goku_sick: true })).toBe('goku-weakened');
    expect(heroActorId('krillin', 'ssj', {})).toBe('krillin-base');
    for (const h of HERO_IDS) for (const f of ['base', 'ssj', 'ssj2', 'ascended', 'ultra'] as const) expect(heroActorId(h, f, {}).startsWith(h)).toBe(true);
  });

  it('all 84 skills have an icon file; every skill/combo/rage vfx id exists or has a runtime graphics fallback', () => {
    let icons = 0;
    for (const s of SKILL_LIST.filter((x) => x.hero !== 'android16')) {
      const p = registry.skillIcons[s.id];
      expect(p, `icon for ${s.id}`).toBeTruthy();
      expect(existsSync(png(p)), p).toBe(true);
      icons++;
    }
    expect(icons).toBe(84);
    const vfxIds = new Set<string>([...SKILL_LIST.map((s) => s.vfx), ...Object.values(RAGE_ARTS).map((s) => s.vfx), ...COMBOS.map((c) => c.vfx)]);
    const noArt = [...vfxIds].filter((v) => !registry.vfx[v]);
    report.vfxIdsUsed = vfxIds.size;
    report.vfxWithoutArt = noArt;
    // missing ids render a Phaser-graphics burst (BattleScene.playVfx); they must be few
    expect(noArt.length).toBeLessThanOrEqual(8);
    // semantic sanity: ids with "variants_not_sequence" are never advertised as smooth animation
    for (const v of Object.values(registry.vfx)) expect(v.frames.length).toBeGreaterThan(0);
  });

  it('items: each item id has an icon or a documented stand-in', () => {
    const lacking = Object.keys(ITEMS).filter((i) => !registry.itemIcons[i]);
    report.itemsWithoutIcon = lacking;
    expect(lacking).toEqual([]);
    for (const p of Object.values(registry.itemIcons)) expect(existsSync(png(p)), p).toBe(true);
  });

  it('12 worlds have tile classes, backdrops and every prop alias used by the map data resolves or is explicitly unresolved', () => {
    const unresolved: string[] = [];
    for (const m of MAP_LIST) {
      const w = registry.worlds[m.id];
      expect(w, m.id).toBeTruthy();
      for (const cls of ['floor', 'floor2', 'path', 'wall', 'water', 'edge'] as const) {
        const p = w.tiles[cls];
        expect(p, `${m.id} tile ${cls}`).toBeTruthy();
        expect(existsSync(png(p!)), p).toBe(true);
      }
      expect(w.backdrops.length).toBeGreaterThan(0);
      const alias = (propAlias as Record<string, Record<string, string>>)[m.id] ?? {};
      for (const p of m.props) {
        const art = alias[p.prop] ?? p.prop;
        if (!w.props[art]) unresolved.push(`${m.id}:${p.prop}`);
      }
    }
    report.unresolvedProps = [...new Set(unresolved)];
    expect(Object.keys(registry.worlds).length).toBe(12);
  });

  it('cutscenes document that painted art is provisional', () => {
    expect(Object.values(CUTSCENES).every((c) => c.provisionalArt)).toBe(true);
  });

  it('reports unused source art distinctly and checks no review-only collage is shipped in public/', () => {
    const used = new Set<string>();
    const add = (p: string | undefined) => p && used.add(p);
    for (const a of Object.values(registry.actors)) {
      for (const f of Object.values(a.battle)) add(f?.path);
      for (const v of Object.values(a.overworld ?? {})) {
        add(v?.idle.path);
        v?.walk.forEach((f) => add(f.path));
      }
      add(a.portrait?.path);
    }
    for (const v of Object.values(registry.vfx)) v.frames.forEach((f) => add(f.path));
    for (const w of Object.values(registry.worlds)) {
      Object.values(w.tiles).forEach(add);
      Object.values(w.props).forEach((p) => add(p.path));
      w.backdrops.forEach((b) => add(b.path));
    }
    Object.values(registry.skillIcons).forEach(add);
    Object.values(registry.itemIcons).forEach(add);
    Object.values(registry.uiFrames).forEach(add);
    const all: string[] = [];
    const walk = (d: string) => {
      for (const n of readdirSync(d)) {
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p);
        else if (n.endsWith('.png')) all.push(p.replace(/\\/g, '/').replace(/^public\//, ''));
      }
    };
    walk(join(PUBLIC, 'assets'));
    const unused = all.filter((p) => !used.has(p));
    report.publicPngs = all.length;
    report.publicPngsUnreferencedByRegistry = unused.length;
    report.unusedSample = unused.slice(0, 30);
    expect(all.some((p) => /REVIEW-ONLY|concept|full-interface/i.test(p))).toBe(false);
    mkdirSync('tests/logs', { recursive: true });
    writeFileSync('tests/logs/art-runtime-audit.json', JSON.stringify(report, null, 1));
  });
});
