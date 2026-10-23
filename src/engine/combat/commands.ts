import type { Commands, ComboOption, FormOption, ItemOption, SkillOption } from '../../app/store';
import { COMBOS, ITEMS } from '../../data/items';
import { FORMS, HERO_FORMS, HEROES } from '../../data/heroes';
import { getSkill, RAGE_ARTS } from '../../data/skills';
import type { HeroId } from '../../types';
import type { Battle } from './engine';

/** Everything the command UI needs for the current hero (pure read of the engine; no mutation). */
export function buildCommands(b: Battle): Commands | null {
  const f = b.current;
  if (!f || b.phase !== 'input' || !f.isHero) return null;
  const skills: SkillOption[] = f.loadout
    .filter((id) => id)
    .map((id) => {
      const s = getSkill(id)!;
      const st = b.skillStatus(f, s);
      return {
        id: s.id, name: s.name, desc: s.desc, ki: s.ki, hpCost: s.hpCost, rageCost: s.rageCost, ok: st.ok, reason: st.reason,
        target: s.target === 'enemy' ? 'enemy' : s.target === 'ally' ? 'ally' : s.target === 'anyAlly' ? 'anyAlly' : 'none', role: s.role, tradeoff: s.tradeoff, icon: s.id,
      } satisfies SkillOption;
    });
  const items: ItemOption[] = Object.entries(b.inventory)
    .filter(([id, n]) => n > 0 && ITEMS[id]?.battle)
    .map(([id, n]) => ({ id, name: ITEMS[id].name, desc: ITEMS[id].desc, count: n, revive: !!ITEMS[id].revivePct }));
  const combos: ComboOption[] = COMBOS.filter((c) => c.members.includes(f.defId as HeroId)).map((c) => {
    const st = b.comboStatus(f, c);
    return { id: c.id, name: c.name, desc: c.desc, ok: st.ok, reason: st.reason, target: c.target === 'enemy' ? 'enemy' : 'none', members: c.members.map((m) => HEROES[m].name) };
  });
  const forms: FormOption[] = [];
  if (!f.guest) {
    for (const e of HERO_FORMS[f.defId as HeroId] ?? []) {
      const st = b.formStatus(f, e.form);
      forms.push({ form: e.form, name: FORMS[e.form].name, note: FORMS[e.form].note, ok: st.ok, reason: st.reason });
    }
    if (f.form !== 'base') forms.push({ form: 'base', name: 'Power down', note: 'Return to base form (free).', ok: true });
  }
  const art = f.guest ? null : RAGE_ARTS[f.defId as HeroId];
  const dummyTarget = b.opponents(f)[0]?.uid;
  const rageChk = art ? b.checkAction({ kind: 'rage', targetUid: dummyTarget }) : { ok: false, reason: 'No Rage Art' };
  const fin = b.finisherStatus(f);
  const fl = b.canFlee() ? { ok: true } : { ok: false, reason: 'Cannot flee from this battle' };
  return {
    actorUid: f.uid,
    actorName: f.name,
    skills,
    items,
    combos,
    forms,
    rage: { ok: rageChk.ok, reason: rageChk.reason, name: art?.name ?? 'Rage Art', desc: art?.desc ?? '', target: art?.target === 'enemy' ? 'enemy' : 'none' },
    sparking: b.checkAction({ kind: 'sparking' }),
    flee: fl,
    finisher: { ok: fin.ok, reason: fin.reason, visible: b.stage.mode === 'finisher' && f.defId === 'gohan' },
    enemyTargets: b.opponents(f).map((x) => x.uid),
    allyTargets: b.heroes().filter((x) => x.alive).map((x) => x.uid),
    deadAllyTargets: b.heroes().filter((x) => !x.alive).map((x) => x.uid),
  };
}
