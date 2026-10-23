import registryJson from '../data/artRegistry.generated.json';
import type { ActorArt, ArtRegistry, FrameRef, VfxArt, WorldArt } from '../data/artTypes';
import type { FormId, HeroId } from '../types';

export const registry = registryJson as unknown as ArtRegistry;

/** URLs are relative so the build works from any folder and offline (file served by the local server). */
export const assetUrl = (path: string): string => `./${path}`;

export const getActor = (id: string): ActorArt | undefined => registry.actors[id];
export const getWorld = (map: string): WorldArt | undefined => registry.worlds[map];
export const getVfx = (id: string): VfxArt | undefined => registry.vfx[id];

export const portraitUrl = (actor: string): string | null => {
  const a = registry.actors[actor];
  return a?.portrait ? assetUrl(a.portrait.path) : null;
};
export const skillIconUrl = (skillId: string): string | null => {
  const p = registry.skillIcons[skillId];
  return p ? assetUrl(p) : null;
};
export const itemIconUrl = (itemId: string): string | null => {
  const p = registry.itemIcons[itemId];
  return p ? assetUrl(p) : null;
};
export const uiIconUrl = (key: string): string | null => {
  const p = registry.uiIcons?.[key];
  return p ? assetUrl(p) : null;
};
export const uiFrameUrl = (name: string): string | null => {
  const p = registry.uiFrames[name];
  return p ? assetUrl(p) : null;
};

/** hero + form (+ story flags) -> art actor id, with a documented fallback chain ending at the hero's base art */
export function heroActorId(hero: HeroId | string, form: FormId | 'base' = 'base', flags: Record<string, boolean> = {}): string {
  const tryIds: string[] = [];
  if (hero === 'piccolo' && flags.piccolo_kami_merged) tryIds.push('piccolo-kami');
  if (hero === 'goku' && flags.goku_sick && !flags.goku_recovered && form === 'base') tryIds.push('goku-weakened');
  if (hero === 'gohan' && flags.goku_sacrifice && !flags.cell_final_defeated && form === 'base') tryIds.push('gohan-wounded');
  if (form !== 'base') tryIds.push(`${hero}-${form}`);
  tryIds.push(`${hero}-base`);
  return tryIds.find((id) => registry.actors[id]) ?? `${hero}-base`;
}

export function actorKey(actor: string, state: string): string {
  return `act:${actor}:${state}`;
}

/** which way the stored frame faces vs. which way it must face on screen */
export function needsFlip(frame: Pick<FrameRef, 'facing'>, side: 'ally' | 'enemy'): boolean {
  const want = side === 'ally' ? 'right' : 'left';
  if (frame.facing === 'front' || frame.facing === 'back') return false;
  return frame.facing !== want;
}

export const ART_COUNTS = {
  actors: Object.keys(registry.actors).length,
  worlds: Object.keys(registry.worlds).length,
  vfx: Object.keys(registry.vfx).length,
  skillIcons: Object.keys(registry.skillIcons).length,
};
