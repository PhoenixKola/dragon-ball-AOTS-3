import type { ClipId, Element, SkillDef } from '../../types';

/** Translate generic authored specials into a presentation that matches damage element. */
export function resolvePresentationClip(clip: ClipId, element?: Element): ClipId {
  return clip === 'special' && element === 'phys' ? 'heavy' : clip;
}

/** Self-targeted non-damaging stances must not lunge to the nearest enemy. */
export function resolveSkillPresentationClip(skill: Pick<SkillDef, 'kind' | 'target' | 'clip' | 'element'>): ClipId {
  const clip = resolvePresentationClip(skill.clip, skill.element);
  if (skill.kind === 'stance' && skill.target === 'self' && ['melee', 'sword', 'teleport', 'heavy'].includes(clip)) return 'buff';
  return clip;
}

/** Only animate authored temporal/growth sequences; never cycle unrelated variants as frames. */
export function shouldAnimateVfxFrames(note: string | undefined, reducedMotion: boolean): boolean {
  return !reducedMotion && !!note && ['ordered_growth', 'temporal_sequence', 'temporal_growth'].some((kind) => note.includes(kind));
}
