import { QUEST_BY_ID, QUESTS } from '../data/quests';
import { ITEMS } from '../data/items';
import type { GameState } from './gameState';
import { addItem, grantXp, itemCount, removeItem } from './progression';
import { availableHeroes } from './gameState';
import { HERO_IDS } from '../types';
import { BEAT_INDEX } from '../data/story';

export type QuestStatus = 'locked' | 'available' | 'active' | 'done' | 'missed';

export function questStatus(s: GameState, id: string): QuestStatus {
  const q = QUEST_BY_ID[id];
  if (!q) return 'locked';
  const st = s.quests[id];
  if (st) return st.state;
  if (s.completed.includes(q.until)) return 'missed';
  if (q.requiresFlag && !s.flags[q.requiresFlag]) return 'locked';
  if (!s.completed.includes(q.from)) return 'locked';
  return 'available';
}

/** objective progress; collect-type objectives (those with an item) mirror the inventory */
export function objectiveProgress(s: GameState, id: string, key: string): number {
  const q = QUEST_BY_ID[id];
  const o = q.objectives.find((x) => x.key === key);
  if (!o) return 0;
  const st = s.quests[id];
  const stored = st?.progress[key] ?? 0;
  if (key === 'vials') return Math.min(o.need, itemCount(s, 'lab_medicine'));
  if (key === 'records') return Math.min(o.need, itemCount(s, 'gero_record'));
  if (key === 'parts') return Math.min(o.need, itemCount(s, 'research_part'));
  return Math.min(o.need, stored);
}

export function startQuest(s: GameState, id: string): boolean {
  if (questStatus(s, id) !== 'available') return false;
  s.quests[id] = { state: 'active', progress: {} };
  return true;
}

export function progressQuest(s: GameState, id: string, key: string, n = 1): boolean {
  const q = QUEST_BY_ID[id];
  const st = s.quests[id];
  if (!q || !st || st.state !== 'active') return false;
  const o = q.objectives.find((x) => x.key === key);
  if (!o) return false;
  st.progress[key] = Math.min(o.need, (st.progress[key] ?? 0) + n);
  return true;
}

export function questReady(s: GameState, id: string): boolean {
  const q = QUEST_BY_ID[id];
  const st = s.quests[id];
  if (!q || !st || st.state !== 'active') return false;
  const final = q.objectives[q.objectives.length - 1].key;
  for (const o of q.objectives) {
    if (o.key === final) continue;
    if (objectiveProgress(s, id, o.key) < o.need) return false;
  }
  return true;
}

export interface QuestReward {
  zeni: number;
  items: { id: string; n: number }[];
  xp: number;
}

export function completeQuest(s: GameState, id: string): { ok: boolean; reason?: string; reward?: QuestReward } {
  const q = QUEST_BY_ID[id];
  const st = s.quests[id];
  if (!q || !st || st.state !== 'active') return { ok: false, reason: 'Quest is not active' };
  if (!questReady(s, id)) return { ok: false, reason: 'Objectives are not finished' };
  for (const c of q.consume ?? []) if (itemCount(s, c.id) < c.n) return { ok: false, reason: `Needs ${c.n} x ${ITEMS[c.id]?.name ?? c.id}` };
  for (const c of q.consume ?? []) removeItem(s, c.id, c.n);
  const reward: QuestReward = { zeni: q.reward.zeni ?? 0, items: q.reward.items ?? [], xp: q.reward.xp ?? 0 };
  s.zeni += reward.zeni;
  for (const it of reward.items) addItem(s, it.id, it.n);
  if (reward.xp) for (const h of availableHeroes(s)) grantXp(s, h, reward.xp);
  st.state = 'done';
  const final = q.objectives[q.objectives.length - 1];
  st.progress[final.key] = final.need;
  return { ok: true, reward };
}

/** called after every beat completion: quests whose window has closed become 'missed' (never retroactively completed) */
export function refreshQuests(s: GameState) {
  for (const q of QUESTS) {
    if (!s.completed.includes(q.until)) continue;
    const st = s.quests[q.id];
    if (!st) s.quests[q.id] = { state: 'missed', progress: {} };
    else if (st.state === 'active') st.state = 'missed';
  }
}

/** quests that will close at the next point of no return (used by the Cell Games prompt) */
export function questsClosingBefore(s: GameState, beatId: string): { id: string; name: string; status: QuestStatus }[] {
  const at = BEAT_INDEX[beatId];
  return QUESTS.filter((q) => BEAT_INDEX[q.until] <= at && questStatus(s, q.id) !== 'done' && questStatus(s, q.id) !== 'missed')
    .map((q) => ({ id: q.id, name: q.name, status: questStatus(s, q.id) }));
}

export function allQuestIds(): string[] {
  return QUESTS.map((q) => q.id);
}
void HERO_IDS;
