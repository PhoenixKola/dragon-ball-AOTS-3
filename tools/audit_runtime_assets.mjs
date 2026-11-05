import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import registry from '../src/data/artRegistry.generated.json' with { type: 'json' };

const publicRoot = resolve('public');
const paths = new Set();
const add = (path) => { if (path) paths.add(path); };
for (const actor of Object.values(registry.actors)) {
  for (const frame of Object.values(actor.battle)) add(frame?.path);
  for (const direction of Object.values(actor.overworld ?? {})) {
    add(direction?.idle.path);
    direction?.walk.forEach((frame) => add(frame.path));
  }
  add(actor.portrait?.path);
}
for (const world of Object.values(registry.worlds)) {
  Object.values(world.tiles).forEach(add);
  Object.values(world.tileVariants ?? {}).flat().forEach(add);
  Object.values(world.props).forEach((prop) => add(prop.path));
  world.backdrops.forEach((frame) => add(frame.path));
  add(world.weatherOverlay);
}
for (const effect of Object.values(registry.vfx)) effect.frames.forEach((frame) => add(frame.path));
for (const group of ['skillIcons', 'itemIcons', 'uiFrames', 'uiIcons']) Object.values(registry[group] ?? {}).forEach(add);
Object.values(registry.objects ?? {}).forEach((item) => add(item.path));
Object.values(registry.cinematics ?? {}).forEach((item) => add(item.path));
add(registry.title?.path);
add(registry.title?.small);

const missing = [];
const invalidPng = [];
for (const path of paths) {
  const file = resolve(publicRoot, path);
  if (!file.startsWith(`${publicRoot}/`) && !file.startsWith(`${publicRoot}\\`)) {
    missing.push(`unsafe registry path ${path}`);
    continue;
  }
  if (!existsSync(file)) {
    missing.push(path);
    continue;
  }
  if (path.endsWith('.png')) {
    const header = readFileSync(file).subarray(0, 8);
    if (header.toString('hex') !== '89504e470d0a1a0a') invalidPng.push(path);
  }
}

console.log(`Runtime art paths checked: ${paths.size}`);
console.log(`Missing files: ${missing.length}; invalid PNG signatures: ${invalidPng.length}`);
for (const path of missing) console.error(`MISSING ${path}`);
for (const path of invalidPng) console.error(`INVALID PNG ${path}`);
if (missing.length || invalidPng.length) process.exitCode = 1;
