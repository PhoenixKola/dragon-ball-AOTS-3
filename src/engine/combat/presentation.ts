import type { ClipId, Element } from '../../types';

/** Translate generic authored specials into a presentation that matches damage element. */
export function resolvePresentationClip(clip: ClipId, element?: Element): ClipId {
  return clip === 'special' && element === 'phys' ? 'heavy' : clip;
}

/** Only animate authored temporal/growth sequences; never cycle unrelated variants as frames. */
export function shouldAnimateVfxFrames(note: string | undefined, reducedMotion: boolean): boolean {
  return !reducedMotion && !!note && ['ordered_growth', 'temporal_sequence', 'temporal_growth'].some((kind) => note.includes(kind));
}
