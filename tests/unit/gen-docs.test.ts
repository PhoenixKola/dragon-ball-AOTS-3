import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { HEROES } from '../../src/data/heroes';
import { MAP_LIST } from '../../src/data/maps';
import { QUESTS } from '../../src/data/quests';
import { RAGE_ARTS, SKILL_LIST } from '../../src/data/skills';
import { STAGES } from '../../src/data/stages';
import { BEATS } from '../../src/data/story';
import { COMBOS } from '../../src/data/items';
import { HERO_IDS } from '../../src/types';

// Generates the data-derived documentation. Runs as part of the normal suite so the docs can never drift from the data.
describe('generate data-derived docs', () => {
  it('writes ALL_84_SKILLS_MATRIX, STORY_ENCOUNTER_MATRIX and MAPS_AND_INTERACTABLES', () => {
    mkdirSync('docs', { recursive: true });
    let s = '# All 84 skills (generated from src/data/skills.ts)\n\nEach hero has 12 techniques, four equippable slots, plus a Rage Art, Sparking, forms and combos outside the slots. "Mechanics" is derived from the data fields the engine interprets.\n\n';
    for (const h of HERO_IDS) {
      s += `## ${HEROES[h].name} — ${HEROES[h].role}\n\n| id | name | unlock | kind / target | cost | hits | special mechanics | requires |\n|---|---|---|---|---|---|---|---|\n`;
      for (const k of SKILL_LIST.filter((x) => x.hero === h)) {
        const mech: string[] = [];
        if (k.pierce) mech.push(`pierce ${Math.round(k.pierce * 100)}% DEF`);
        if (k.acc && k.acc >= 90) mech.push('never misses');
        if (k.splash) mech.push(`splash ${Math.round(k.splash * 100)}%`);
        if (k.lifesteal) mech.push(`lifesteal ${Math.round(k.lifesteal * 100)}%`);
        if (k.chargeTurns) mech.push(`charge ${k.chargeTurns} turn(s)`);
        if (k.hpCost) mech.push(`HP cost ${Math.round(k.hpCost * 100)}%`);
        if (k.rageCost) mech.push(`Rage cost ${k.rageCost}`);
        if (k.healPct) mech.push(`heal ${Math.round(k.healPct * 100)}%`);
        if (k.revive) mech.push('revive');
        if (k.kiDrain) mech.push(`drain ${k.kiDrain} Ki`);
        if (k.battleLimit) mech.push(`${k.battleLimit}x per battle`);
        for (const a of [...(k.apply ?? []), ...(k.self ?? [])]) mech.push(`${a.kind}${a.chance && a.chance < 1 ? ` ${Math.round(a.chance * 100)}%` : ''} ${a.turns}t`);
        if (k.tags?.length) mech.push(`[${k.tags.join(',')}]`);
        const req = [k.requires?.form ? `form ${[k.requires.form].flat().join('/')}` : '', k.requires?.flag ? `flag ${k.requires.flag}` : '', k.requires?.hpBelow ? `HP<${Math.round(k.requires.hpBelow * 100)}%` : '', k.requires?.storyOnly ? 'story only' : ''].filter(Boolean).join(', ') || '—';
        s += `| ${k.id} | ${k.name} | L${k.unlock} | ${k.kind} / ${k.target} (${k.element}) | ${k.ki} Ki | ${k.hits.join('+') || '—'} | ${mech.join('; ') || '—'} | ${req} |\n`;
      }
      const ra = RAGE_ARTS[h];
      s += `\nRage Art: **${ra.name}** — ${ra.desc}\n\n`;
    }
    s += '## Team combos\n\n| id | name | members | Ki each | effect |\n|---|---|---|---|---|\n';
    for (const c of COMBOS) s += `| ${c.id} | ${c.name} | ${c.members.join(' + ')} | ${c.kiCost} | ${c.desc} |\n`;
    writeFileSync('docs/ALL_84_SKILLS_MATRIX.md', s);

    let t = '# Story and encounter matrix (generated)\n\nBeats are strictly ordered; every battle is reached by walking to its trigger entity on the listed map.\n\n| # | id | chapter | map | mode | enemies | team | p | rewards (XP/zeni) | flags set on success |\n|---|---|---|---|---|---|---|---|---|---|\n';
    BEATS.forEach((b, i) => {
      const st = STAGES.find((x) => x.id === b.id);
      if (!st) {
        t += `| ${i} | ${b.id} | ${b.chapter} | ${b.map} | event | — | — | — | — | piccolo_kami_merged |\n`;
        return;
      }
      const en = [...st.enemies, ...(st.waves ?? []).flat()].map((e) => ENEMIES[e].name).join(', ');
      t += `| ${i} | ${st.id} ${st.name} | ${st.chapter} | ${st.map} | ${st.mode}${st.threshold ? ` (<${st.threshold})` : ''}${st.rounds ? ` (${st.rounds} rounds)` : ''} | ${en} | ${st.team.join(', ') || 'party'} | ${st.p} | ${st.noRewards ? 'story XP only ' : ''}${st.xp}/${st.zeni} | ${st.flags.join(', ') || '—'} |\n`;
    });
    writeFileSync('docs/STORY_ENCOUNTER_MATRIX.md', t);

    let m = '# Maps and interactables (generated)\n\n';
    for (const map of MAP_LIST) {
      const counts: Record<string, number> = {};
      for (const e of map.entities) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
      m += `## ${map.name} (\`${map.id}\`, ${map.width}x${map.height} tiles)\n\nMusic ${map.music}; encounters: ${map.encounters ?? 'none'}; props ${map.props.length}.\n\nEntities: ${Object.entries(counts).map(([k, v]) => `${k} ×${v}`).join(', ')}\n\n`;
      m += map.entities.filter((e) => ['npc', 'foe', 'exit', 'save', 'heal', 'shop', 'travel', 'lever', 'chest', 'pickup', 'terminal'].includes(e.kind)).map((e) => `- ${e.kind} \`${e.id}\`${e.when ? ` (when ${e.when})` : ''}${(e as { story?: string }).story ? ` — story ${(e as { story?: string }).story}` : ''}`).join('\n') + '\n\n';
    }
    m += '## Quests\n\n| id | window | giver | objectives | reward |\n|---|---|---|---|---|\n';
    for (const q of QUESTS) m += `| ${q.id} | after ${q.from}, closes after ${q.until} | ${q.giver.npc} @ ${q.giver.map} | ${q.objectives.map((o) => `${o.text} (${o.need})`).join('; ')} | ${q.reward.note} |\n`;
    writeFileSync('docs/MAPS_AND_INTERACTABLES.md', m);
  });
});
