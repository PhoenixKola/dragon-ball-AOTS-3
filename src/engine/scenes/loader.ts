import Phaser from 'phaser';
import type { FrameRef } from '../../data/artTypes';
import { actorKey, assetUrl, getActor, getVfx, getWorld, registry } from '../assets';

/** keys that failed to load -> reported by the runtime asset audit */
export const missingAssets = new Set<string>();

export function loadImages(scene: Phaser.Scene, items: { key: string; path: string }[]): Promise<void> {
  const todo = items.filter((i) => !scene.textures.exists(i.key));
  if (todo.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let pending = todo.length;
    const done = () => {
      if (--pending <= 0) {
        scene.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFile);
        scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
        resolve();
      }
    };
    const keys = new Set(todo.map((t) => t.key));
    const onFile = (key: string) => {
      if (keys.has(key)) done();
    };
    const onErr = (file: Phaser.Loader.File) => {
      if (keys.has(file.key)) {
        missingAssets.add(file.key);
        done();
      }
    };
    scene.load.on(Phaser.Loader.Events.FILE_COMPLETE, onFile);
    scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onErr);
    for (const t of todo) scene.load.image(t.key, assetUrl(t.path));
    if (!scene.load.isLoading()) scene.load.start();
  });
}

const BATTLE_STATES = ['idle', 'attack', 'guard', 'charge', 'special', 'hurt', 'victory', 'ko', 'beam'] as const;

export function actorFrames(actor: string): { key: string; path: string; frame: FrameRef }[] {
  const a = getActor(actor);
  if (!a) return [];
  const out: { key: string; path: string; frame: FrameRef }[] = [];
  for (const s of BATTLE_STATES) {
    const f = (a.battle as Record<string, FrameRef | undefined>)[s];
    if (f) out.push({ key: actorKey(actor, s), path: f.path, frame: f });
  }
  if (a.overworld) {
    for (const [dir, d] of Object.entries(a.overworld)) {
      if (!d) continue;
      out.push({ key: actorKey(actor, `ow:${dir}:idle`), path: d.idle.path, frame: d.idle });
      d.walk.forEach((w, i) => out.push({ key: actorKey(actor, `ow:${dir}:${i}`), path: w.path, frame: w }));
    }
  }
  if (a.portrait) out.push({ key: actorKey(actor, 'portrait'), path: a.portrait.path, frame: a.portrait });
  return out;
}

export async function ensureActor(scene: Phaser.Scene, actor: string, what: 'battle' | 'overworld' | 'all' = 'all'): Promise<void> {
  const frames = actorFrames(actor).filter((f) => what === 'all' || (what === 'battle' ? !f.key.includes(':ow:') && !f.key.endsWith(':portrait') : f.key.includes(':ow:')));
  if (!frames.length) {
    makeFallbackActor(scene, actor);
    return;
  }
  await loadImages(scene, frames);
  for (const f of frames) if (!scene.textures.exists(f.key)) missingAssets.add(f.key);
}

export function mapAssetList(mapId: string): { key: string; path: string }[] {
  const w = getWorld(mapId);
  if (!w) return [];
  const out: { key: string; path: string }[] = [];
  for (const [cls, path] of Object.entries(w.tiles)) if (path) out.push({ key: `tile:${mapId}:${cls}`, path });
  for (const [name, p] of Object.entries(w.props)) out.push({ key: `prop:${mapId}:${name}`, path: p.path });
  w.backdrops.forEach((b, i) => out.push({ key: `bd:${mapId}:${i}`, path: b.path }));
  return out;
}
export const ensureMap = (scene: Phaser.Scene, mapId: string) => loadImages(scene, mapAssetList(mapId));

export function ensureObjects(scene: Phaser.Scene): Promise<void> {
  return loadImages(scene, Object.entries(registry.objects ?? {}).map(([k, o]) => ({ key: `obj:${k}`, path: o.path })));
}

export function ensureVfx(scene: Phaser.Scene, ids: string[]): Promise<void> {
  const items: { key: string; path: string }[] = [];
  for (const id of ids) {
    const v = getVfx(id);
    if (!v) continue;
    v.frames.forEach((f, i) => items.push({ key: `vfx:${id}:${i}`, path: f.path }));
  }
  return loadImages(scene, items);
}

export function ensureIcons(scene: Phaser.Scene): Promise<void> {
  return Promise.resolve(void scene);
}

/** clearly-labelled generated stand-in used when an actor has no art at all */
export function makeFallbackActor(scene: Phaser.Scene, actor: string): void {
  const key = actorKey(actor, 'idle');
  if (scene.textures.exists(key)) return;
  missingAssets.add(key);
  const w = 96;
  const h = 128;
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.getContext();
  const hue = [...actor].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) % 360, 7);
  c.fillStyle = `hsl(${hue},45%,42%)`;
  c.fillRect(24, 44, 48, 64);
  c.fillStyle = `hsl(${hue},35%,70%)`;
  c.fillRect(32, 12, 32, 32);
  c.fillStyle = '#10131c';
  c.strokeStyle = '#10131c';
  c.lineWidth = 3;
  c.strokeRect(24, 44, 48, 64);
  c.strokeRect(32, 12, 32, 32);
  c.fillRect(38, 24, 6, 6);
  c.fillRect(52, 24, 6, 6);
  c.fillStyle = '#f5d96b';
  c.font = 'bold 12px monospace';
  c.textAlign = 'center';
  c.fillText(actor.slice(0, 6).toUpperCase(), 48, 82);
  c.fillText('(art?)', 48, 98);
  t.refresh();
}

export const registryActors = () => Object.keys(registry.actors);
