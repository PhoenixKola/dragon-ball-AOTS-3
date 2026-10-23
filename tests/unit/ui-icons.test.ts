import { describe, expect, it } from 'vitest';
import { FORMS } from '../../src/data/heroes';
import { ITEMS } from '../../src/data/items';
import { SKILLS } from '../../src/data/skills';
import { GLYPH_KEYS, STATUS_INFO, iconForCommand, iconForForm, iconForItem, iconForSkill, iconForStatus, type CommandKey, type IconRef } from '../../src/components/helpers';
import type { StatusKind } from '../../src/types';

const valid = (r: IconRef) => (typeof r.url === 'string' && r.url.length > 0) || (GLYPH_KEYS as readonly string[]).includes(r.glyph);
const always = (r: IconRef) => (GLYPH_KEYS as readonly string[]).includes(r.glyph);

describe('UI icons: nothing is ever blank', () => {
  it('every item has an icon URL or a fallback glyph (glyph always present)', () => {
    for (const id of Object.keys(ITEMS)) {
      const r = iconForItem(id);
      expect(valid(r), id).toBe(true);
      expect(always(r), id).toBe(true);
    }
  });
  it('item glyph depends on the item kind', () => {
    expect(iconForItem('power_charm').glyph).toBe('charm');
    expect(iconForItem('senzu_small').glyph).toBe('potion');
    expect(iconForItem('medicine_vial').glyph).toBe('key');
  });
  it('every skill (incl. Rage Arts and the Android 16 kit) has an icon or glyph', () => {
    const ids = Object.keys(SKILLS);
    expect(ids.length).toBeGreaterThanOrEqual(84);
    for (const id of ids) {
      const r = iconForSkill(id);
      expect(valid(r), id).toBe(true);
      expect(always(r), id).toBe(true);
    }
  });
  it('every status kind has an icon or glyph and a label', () => {
    for (const k of Object.keys(STATUS_INFO) as StatusKind[]) {
      const r = iconForStatus(k);
      expect(valid(r), k).toBe(true);
      expect(always(r), k).toBe(true);
      expect(STATUS_INFO[k].label.length, k).toBeGreaterThan(0);
    }
  });
  it('every form and every command has an icon or glyph', () => {
    for (const f of [...(Object.keys(FORMS) as (keyof typeof FORMS)[])]) expect(valid(iconForForm(f)), f).toBe(true);
    const cmds: CommandKey[] = ['attack', 'skills', 'defend', 'items', 'combo', 'rage', 'sparking', 'form', 'flee', 'finisher'];
    for (const c of cmds) {
      expect(valid(iconForCommand(c)), c).toBe(true);
      expect(always(iconForCommand(c)), c).toBe(true);
    }
  });
});
