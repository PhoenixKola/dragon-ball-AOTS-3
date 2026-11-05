import { describe, expect, it } from 'vitest';
import { resolvePresentationClip } from '../../src/engine/combat/presentation';

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
});
