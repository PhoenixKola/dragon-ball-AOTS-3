import { FORMS, HEROES } from '../data/heroes';
import type { GameState } from '../systems/gameState';
import { itemIconUrl, skillIconUrl, uiIconUrl } from '../engine/assets';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import type { FormId, HeroId, SkillDef, StatusKind, TargetMode } from '../types';

export const heroName = (h: string): string => HEROES[h as HeroId]?.name ?? h;

export const STATUS_INFO: Record<StatusKind, { short: string; label: string; desc: string }> = {
  stun: { short: 'STUN', label: 'Stunned', desc: 'Loses its next turn.' },
  blind: { short: 'BLND', label: 'Blinded', desc: 'Accuracy greatly reduced.' },
  seal: { short: 'SEAL', label: 'Sealed', desc: 'Cannot use techniques.' },
  atkUp: { short: 'ATK+', label: 'Attack up', desc: 'Deals more damage.' },
  atkDown: { short: 'ATK-', label: 'Attack down', desc: 'Deals less damage.' },
  defUp: { short: 'DEF+', label: 'Defence up', desc: 'Takes less damage.' },
  defDown: { short: 'DEF-', label: 'Defence down', desc: 'Takes more damage.' },
  spdUp: { short: 'SPD+', label: 'Speed up', desc: 'Acts earlier.' },
  spdDown: { short: 'SPD-', label: 'Speed down', desc: 'Acts later.' },
  regen: { short: 'REGN', label: 'Regeneration', desc: 'Recovers HP at the start of each turn.' },
  evade: { short: 'EVAD', label: 'Evasion', desc: 'Dodges the next incoming hit(s).' },
  counter: { short: 'CNTR', label: 'Counter stance', desc: 'Answers the next attack with a counter.' },
  reflect: { short: 'RFLX', label: 'Reflect', desc: 'Reflects part of the next Ki attack.' },
  cover: { short: 'COVR', label: 'Covering', desc: 'Takes hits aimed at allies at reduced damage.' },
  heavyGuard: { short: 'GRD', label: 'Heavy guard', desc: 'Takes half damage until its next turn.' },
  barrier: { short: 'BARR', label: 'Barrier', desc: 'Absorbs damage.' },
  sparking: { short: 'SPRK', label: 'Sparking', desc: 'ATK x1.25, Ki costs halved, damage taken x0.9.' },
  mine: { short: 'MINE', label: 'Energy mine', desc: 'Explodes when the timer ends.' },
  marked: { short: 'MARK', label: 'Marked', desc: 'The next ally hit deals bonus damage.' },
  endure: { short: 'ENDR', label: 'Endure', desc: 'Survives the next lethal hit with 1 HP.' },
  focus: { short: 'FOCS', label: 'Focus', desc: 'No form upkeep; bonus ATK.' },
  accUp: { short: 'ACC+', label: 'Accuracy up', desc: 'More accurate.' },
  critUp: { short: 'CRT+', label: 'Crit up', desc: 'Higher critical chance.' },
  multiform: { short: 'MULT', label: 'Multi-Form', desc: 'The next attack strikes three times.' },
  drain: { short: 'DRAN', label: 'Drained', desc: 'Ki is being drained.' },
  absorbLock: { short: 'HELD', label: 'Held', desc: 'Gripped by Cell\'s tail! Guard perfectly, stun it, or deal damage before its next turn.' },
  adapted: { short: 'ADPT', label: 'Adapted', desc: 'Has learned this technique.' },
  virus: { short: 'VIRS', label: 'Heart virus', desc: 'Loses HP each turn.' },
  vulnerable: { short: 'VULN', label: 'Vulnerable', desc: 'Takes extra damage.' },
  storedBeam: { short: 'CHRG', label: 'Charged', desc: 'Energy stored.' },
  absorbing: { short: 'ABSB', label: 'Absorbing', desc: 'Palms open: Ki attacks heal it. Use physical attacks!' },
  shielded: { short: 'SHLD', label: 'Shield closed', desc: 'Takes half damage.' },
  exposed: { short: 'EXPO', label: 'Weak point exposed', desc: 'Takes +40% damage.' },
};

export const TARGET_TEXT: Record<TargetMode, string> = {
  enemy: 'One enemy', allEnemies: 'All enemies', randomEnemies: 'Random enemies', ally: 'One ally', allAllies: 'All allies', self: 'Self', anyAlly: 'Ally (can revive)',
};

export interface SkillNote {
  /** hard lock: cannot be equipped */
  locked: boolean;
  reason?: string;
  /** soft requirement shown as a note (equippable, but disabled in battle until met) */
  note?: string;
}

export function skillNote(game: GameState, hero: HeroId, s: SkillDef): SkillNote {
  const lv = game.roster[hero].level;
  if (s.requires?.storyOnly) return { locked: true, reason: 'Reserved for the final battle' };
  if (s.unlock > lv) return { locked: true, reason: `Unlocks at level ${s.unlock}` };
  const notes: string[] = [];
  if (s.requires?.form) {
    const forms = (Array.isArray(s.requires.form) ? s.requires.form : [s.requires.form]) as FormId[];
    notes.push(`Requires ${forms.map((f) => FORMS[f].name).join(' / ')}`);
  }
  if (s.requires?.flag) notes.push(game.flags[s.requires.flag] ? 'Story requirement met' : 'Needs a story event');
  if (s.requires?.hpBelow !== undefined) notes.push(`Only below ${Math.round(s.requires.hpBelow * 100)}% HP`);
  return { locked: false, note: notes.join(' · ') || undefined };
}

export const FLAG_NOTES: Record<string, string> = {
  goku_ssj_unlocked: 'Goku can now go Super Saiyan.',
  gohan_ssj_unlocked: 'Gohan can now go Super Saiyan.',
  gohan_ssj2_unlocked: 'Gohan has awakened as a Super Saiyan 2!',
  vegeta_ssj_unlocked: 'Vegeta can now go Super Saiyan.',
  vegeta_ascended_unlocked: 'Vegeta mastered the Ascended Super Saiyan form.',
  trunks_ssj_unlocked: 'Trunks can now go Super Saiyan.',
  trunks_ultra_unlocked: 'Trunks learned the Ultra Super Saiyan form (strong but slow).',
  piccolo_kami_merged: 'Piccolo merged with Kami — permanent stat boost.',
  goku_recovered: 'Goku has recovered and rejoins the party.',
};

export const DIFFICULTY_TEXT = {
  easy: 'Easy: enemies deal much less damage, extra XP, and a wider Active Guard window by default.',
  normal: 'Normal: the intended challenge. Learn the Active Guard timing and spend Ki wisely.',
};

/* ------------------------------------------------------------------ icons: every entry always has a URL or a glyph */
export const GLYPH_KEYS = ['attack', 'skills', 'defend', 'items', 'combo', 'rage', 'sparking', 'form', 'flee', 'finisher', 'potion', 'charm', 'key', 'melee', 'beam', 'plus', 'debuff', 'up', 'pin', 'circle'] as const;
export type GlyphKey = (typeof GLYPH_KEYS)[number];
export interface IconRef {
  /** real art, if it exists in the registry (may still 404 -> the component falls back to the glyph) */
  url: string | null;
  glyph: GlyphKey;
}

export const iconForItem = (id: string): IconRef => {
  const k = ITEMS[id]?.kind;
  return { url: itemIconUrl(id), glyph: k === 'accessory' ? 'charm' : k === 'key' ? 'key' : 'potion' };
};
export const iconForSkill = (id: string): IconRef => {
  const s = SKILLS[id];
  let glyph: GlyphKey = 'skills';
  if (s) {
    if (s.kind === 'attack' || s.kind === 'special') glyph = s.element === 'ki' ? 'beam' : 'melee';
    else if (s.kind === 'heal') glyph = 'plus';
    else if (s.kind === 'debuff') glyph = 'debuff';
    else glyph = 'defend';
  }
  return { url: skillIconUrl(id), glyph };
};
const BAD_STATUS = new Set<StatusKind>(['stun', 'blind', 'seal', 'atkDown', 'defDown', 'spdDown', 'drain', 'virus', 'mine', 'vulnerable', 'absorbLock', 'exposed']);
export const isBadStatus = (k: StatusKind) => BAD_STATUS.has(k);
export const iconForStatus = (k: StatusKind): IconRef => ({ url: uiIconUrl(`status-${k}`), glyph: BAD_STATUS.has(k) ? 'debuff' : 'up' });
export const iconForForm = (f: FormId | 'base'): IconRef => ({ url: uiIconUrl(`form-${f}`), glyph: f === 'base' ? 'circle' : 'form' });
export type CommandKey = 'attack' | 'skills' | 'defend' | 'items' | 'combo' | 'rage' | 'sparking' | 'form' | 'flee' | 'finisher';
export const iconForCommand = (c: CommandKey): IconRef => ({ url: uiIconUrl(`cmd-${c}`), glyph: c });
export const iconForMap = (): IconRef => ({ url: null, glyph: 'pin' });
