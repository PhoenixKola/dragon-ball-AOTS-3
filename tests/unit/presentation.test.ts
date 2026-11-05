import { describe, expect, it } from 'vitest';
import { COMBOS } from '../../src/data/items';
import { RAGE_ARTS, SKILL_LIST } from '../../src/data/skills';
import { registry } from '../../src/engine/assets';
import { resolvePresentationClip, shouldAnimateVfxFrames } from '../../src/engine/combat/presentation';

describe('combat presentation clip resolution', () => {
  it('turns physical authored specials into close-range heavy attacks', () => {
    expect(resolvePresentationClip('special', 'phys')).toBe('heavy');
  });

  it('keeps ki specials and all explicitly authored clips intact', () => {
    expect(resolvePresentationClip('special', 'ki')).toBe('special');
    expect(resolvePresentationClip('special')).toBe('special');
    expect(resolvePresentationClip('beam', 'ki')).toBe('beam');
    expect(resolvePresentationClip('melee', 'phys')).toBe('melee');
  });

  it('keeps every core skill, Rage Art, and combo connected to a registered effect', () => {
    const coreSkills = SKILL_LIST.filter((skill) => skill.hero !== 'android16');
    expect(coreSkills).toHaveLength(84);
    for (const action of [...coreSkills, ...Object.values(RAGE_ARTS), ...COMBOS]) {
      expect(registry.vfx[action.vfx], `${action.id} references ${action.vfx}`).toBeDefined();
    }
  });

  it('animates only authored temporal sequences and honors reduced motion', () => {
    expect(shouldAnimateVfxFrames('ordered_growth: head frames expand', false)).toBe(true);
    expect(shouldAnimateVfxFrames('temporal_sequence: contact, break, fade', false)).toBe(true);
    expect(shouldAnimateVfxFrames('variants_not_sequence: blue orb + shards', false)).toBe(false);
    expect(shouldAnimateVfxFrames('ordered_growth: head frames expand', true)).toBe(false);
    expect(shouldAnimateVfxFrames(undefined, false)).toBe(false);
  });
});
