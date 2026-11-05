import type { ClipId, Element } from '../../types';

/** Translate generic authored specials into a presentation that matches damage element. */
export function resolvePresentationClip(clip: ClipId, element?: Element): ClipId {
  return clip === 'special' && element === 'phys' ? 'heavy' : clip;
}
