/* Dev-only harness: renders every UI state with a mock SessionApi. Not part of the shipped bundle. */
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { input } from '../systems/input';
import { DEFAULT_SETTINGS, bindApi, uiStore, type BattleView, type Commands, type FighterView, type SessionApi, type UISnapshot } from './store';
import { COMBOS } from '../data/items';
import { SKILLS } from '../data/skills';
import { BEATS, BEAT_INDEX } from '../data/story';
import { newGameState, type GameState, maxStats, availableHeroes } from '../systems/gameState';
import { addItem, equipAccessory, joinHero, leaveHero, restParty, setLoadout, setParty, trainStat, refundTraining, useFieldItem, buyItem, sellItem, grantXp } from '../systems/progression';
import type { RewardSummary } from '../systems/progression';
import type { SlotInfo } from '../systems/save';
import { HERO_IDS } from '../types';
import { FORMS } from '../data/heroes';

const params = new URLSearchParams(location.search);
const scene = params.get('s') ?? 'title';

function midGame(beatId: string): GameState {
  const g = newGameState('normal');
  const upto = BEAT_INDEX[beatId];
  for (const h of HERO_IDS) joinHero(g, h);
  g.completed = BEATS.slice(0, upto).map((b) => b.id);
  g.beat = upto;
  for (const f of ['warning_delivered', 'goku_sick', 'vegeta_ssj_unlocked', 'gero_fled', 'androids_awakened', 'cell_imperfect_seen', 'piccolo_kami_merged', 'cell_named', 'gingertown_evacuated']) g.flags[f] = true;
  leaveHero(g, 'goku');
  setParty(g, ['trunks', 'gohan', 'vegeta']);
  for (const h of HERO_IDS) grantXp(g, h, 900);
  g.zeni = 2840;
  addItem(g, 'senzu_small', 5);
  addItem(g, 'ki_capsule', 3);
  addItem(g, 'revive_seed', 1);
  addItem(g, 'power_charm', 1);
  addItem(g, 'guard_charm', 1);
  addItem(g, 'medicine_vial', 1);
  addItem(g, 'lab_medicine', 2);
  g.quests = { medicine_route: { state: 'active', progress: {} }, android_evacuations: { state: 'done', progress: { rescued: 2, report: 1 } }, gero_records: { state: 'missed', progress: {} } };
  g.roster.trunks.hp = Math.round(maxStats(g, 'trunks').hp * 0.6);
  g.stats.playMs = 5_400_000;
  return g;
}

const game = midGame('C03');
const settings = { ...DEFAULT_SETTINGS };

const SLOTS: SlotInfo[] = [
  { slot: 'auto', status: 'ok', savedAt: Date.now() - 3600_000, chapter: 3, map: 'gingertown', playMs: 5_300_000, leader: 'trunks', level: 18 },
  { slot: 0, status: 'ok', savedAt: Date.now() - 86400_000, chapter: 2, map: 'lab_inner', playMs: 3_100_000, leader: 'vegeta', level: 14 },
  { slot: 1, status: 'corrupt', error: 'Checksum mismatch' },
  { slot: 2, status: 'empty' },
];

const base = (): UISnapshot => ({
  ...uiStore.get(), version: 1, screen: 'world', overlay: null, game, settings, assetsReady: true, slots: SLOTS, hasSave: true, hudMap: 'Ginger Town',
  hudObjective: { text: BEATS[game.beat].objective, where: 'Ginger Town: The evacuation road at the town\'s east end.' }, toasts: [], dialogue: null, choice: null, card: null, caption: null, battle: null, rewards: null, shop: null, travel: null, defeat: null, confirm: null, scriptActive: false, prompt: null, note: null, fullscreen: false,
});

const F = (uid: string, name: string, team: 'ally' | 'enemy', actor: string, hp: number, maxHp: number, o: Partial<FighterView> = {}): FighterView => ({
  uid, team, defId: uid, name, actor, hp, maxHp, ki: 70, maxKi: 100, rage: 40, level: 18, form: 'base', statuses: [], alive: hp > 0, sparking: 0, charging: false, isHero: team === 'ally', boss: false, guest: false, isProtectee: false, ...o,
});

function battleView(phase: BattleView['phase']): BattleView {
  const g = game;
  const skills = g.roster.trunks.loadout.filter(Boolean).map((id) => {
    const s = SKILLS[id];
    return { id, name: s.name, desc: s.desc, ki: s.ki, hpCost: s.hpCost, ok: s.ki <= 70, reason: s.ki <= 70 ? undefined : `Needs ${s.ki} Ki`, target: (s.target === 'enemy' ? 'enemy' : s.target === 'ally' ? 'ally' : 'none') as 'enemy', role: s.role, tradeoff: s.tradeoff, icon: id };
  });
  skills.push({ ...skills[0], id: 'trunks_10', name: 'Ultra Burst', ok: false, reason: 'Requires Ultra Super Saiyan', ki: 28 });
  const commands: Commands = {
    actorUid: 'h:trunks', actorName: 'Future Trunks', skills,
    items: [{ id: 'senzu_small', name: 'Senzu Fragment', desc: 'Restores 35% max HP.', count: 5, revive: false }, { id: 'revive_seed', name: 'Revive Seed', desc: 'Revives a fallen fighter.', count: 1, revive: true }],
    combos: COMBOS.slice(0, 2).map((c, i) => ({ id: c.id, name: c.name, desc: c.desc, ok: i === 0, reason: i === 0 ? undefined : 'Gohan already acted', target: 'enemy' as const, members: c.members })),
    forms: [{ form: 'ssj', name: FORMS.ssj.name, note: FORMS.ssj.note, ok: true }, { form: 'ultra', name: FORMS.ultra.name, note: FORMS.ultra.note, ok: false, reason: 'Not unlocked yet' }],
    rage: { ok: true, name: 'Heat Dome Sword Flash', desc: 'Six piercing hits', target: 'none' }, sparking: { ok: false, reason: 'Needs 60 Rage' }, flee: { ok: false, reason: 'Cannot flee from this battle' }, finisher: { ok: false, visible: false },
    enemyTargets: ['e:0:cell-imperfect', 'e:1:cell-probe'], allyTargets: ['h:trunks', 'h:gohan', 'h:vegeta'], deadAllyTargets: [],
  };
  return {
    stageId: 'C02', stageName: 'Piccolo and the Monster', kind: 'story', hint: 'Cell grabs a fighter with its tail.', mode: 'threshold', round: 4, fighters: [
      F('h:trunks', 'Future Trunks', 'ally', 'trunks-base', Math.round(maxStats(g, 'trunks').hp * 0.6), maxStats(g, 'trunks').hp, { level: g.roster.trunks.level, rage: 100, statuses: [{ kind: 'defUp', turns: 2, power: 0.2 }] }),
      F('h:gohan', 'Gohan', 'ally', 'gohan-base', 380, 520, { level: g.roster.gohan.level, form: 'ssj', sparking: 2, statuses: [{ kind: 'absorbLock', turns: 99, power: 1 }] }),
      F('h:vegeta', 'Vegeta', 'ally', 'vegeta-base', 0, 540, { level: g.roster.vegeta.level, alive: false }),
      F('e:0:cell-imperfect', 'Imperfect Cell', 'enemy', 'cell-imperfect', 1300, 2200, { boss: true, statuses: [{ kind: 'absorbing', turns: 2, power: 1 }], charging: true }),
      F('e:1:cell-probe', 'Cell Probe', 'enemy', 'cell-probe', 90, 180),
    ],
    phase, currentUid: 'h:trunks', turnOrder: ['h:trunks', 'e:0:cell-imperfect', 'h:gohan', 'e:1:cell-probe', 'h:vegeta'],
    log: ['Round 4', 'Imperfect Cell: its tail opens hungrily toward a fighter!', 'Perfect Guard! Gohan takes 6.', 'Trunks uses Burning Attack.', 'Imperfect Cell regenerates 120 HP.', 'Gohan is held by Cell\'s tail!'],
    guard: phase === 'guard' ? { id: 1, targetUid: 'h:gohan', attackerUid: 'e:0:cell-imperfect', label: 'Tail Absorption', openAt: 1000, impactAt: 1900, closeAt: 2100, slot: 2, hitIndex: 0, hits: 1 } : null,
    commands: phase === 'input' ? commands : null, paused: false, banner: phase === 'guard' ? 'Tail Absorption' : null, tutorial: scene === 'battle-tutorial' ? 'Press the guard key when the ring closes. A Perfect Guard cuts damage by 80%.' : null,
    battleClock: phase === 'guard' ? 1700 : 0, outcome: phase === 'ended' ? { outcome: 'victory', reason: 'enemies defeated' } : null, roundsGoal: 4,
  };
}

const rewards = (): { stageName: string; kind: 'story'; names: Record<string, string>; summary: RewardSummary } => ({
  stageName: 'Piccolo and the Monster', kind: 'story', names: { trunks: 'Future Trunks', gohan: 'Gohan', vegeta: 'Vegeta' },
  summary: { outcome: 'victory', xp: { trunks: 640, gohan: 640, vegeta: 448 }, levelUps: [{ hero: 'gohan', from: 17, to: 18, newSkills: ['gohan_8'] }], zeni: 380, items: [{ id: 'senzu_small', n: 1 }], flags: ['gohan_ssj_unlocked', 'cell_named'], note: '' },
});

const push = (p: Partial<UISnapshot>) => uiStore.set({ ...base(), ...p });

function apply() {
  const R: Record<string, () => void> = {
    title: () => push({ screen: 'title', game: null, hasSave: true }),
    'title-nosave': () => push({ screen: 'title', game: null, hasSave: false }),
    'title-loading': () => push({ screen: 'title', game: null, assetsReady: false }),
    'title-newgame': () => push({ screen: 'title', overlay: 'newgame' }),
    'title-options': () => push({ screen: 'title', overlay: 'options' }),
    world: () => push({ prompt: 'E: Talk to Evacuation Driver' }),
    'menu-status': () => push({ overlay: 'menu' }),
    'menu-party': () => push({ overlay: 'menu' }),
    'menu-abilities': () => push({ overlay: 'menu' }),
    'menu-items': () => push({ overlay: 'menu' }),
    'menu-equipment': () => push({ overlay: 'menu' }),
    'menu-journal': () => push({ overlay: 'menu' }),
    'menu-options': () => push({ overlay: 'menu' }),
    'menu-save': () => push({ overlay: 'menu' }),
    shop: () => push({ overlay: 'shop', shop: { shopId: 'capsule_corp', name: 'Capsule Corp Supply' } }),
    travel: () => push({ overlay: 'travel', travel: { options: [{ map: 'capsule_corp', label: 'Capsule Corporation', hint: 'Home base.' }, { map: 'south_city', label: 'South City', hint: 'Shops and shelters.' }, { map: 'lookout', label: 'Kami\'s Lookout', hint: 'Above the clouds.' }] } }),
    save: () => push({ overlay: 'save' }),
    options: () => push({ overlay: 'options' }),
    help: () => push({ overlay: 'help' }),
    credits: () => push({ overlay: 'credits' }),
    confirm: () => push({ overlay: 'confirm', confirm: { title: 'Leave the area?', body: 'You cannot return until the story allows it.', yes: 'Go', no: 'Stay' } }),
    dialogue: () => push({ scriptActive: true, dialogue: { id: 1, who: 'piccolo', name: 'Piccolo', actor: 'piccolo-base', color: '#72b878', text: 'Clothing in the street. No bodies. Something took the people whole, and it is not finished.' } }),
    'dialogue-narrator': () => push({ scriptActive: true, dialogue: { id: 2, who: 'narrator', name: '', actor: 'narrator', color: '#aaaaaa', text: 'You pull the cable out of the relay. Its light dies.' } }),
    choice: () => push({ scriptActive: true, choice: { id: 1, prompt: 'Enter the Cell Games arena?', choices: ['Not yet', 'Show me what I can still do', 'I\'m ready'] } }),
    card: () => push({ scriptActive: true, card: { id: 1, text: 'THREE YEARS LATER', sub: 'Capsule Corporation, West City' } }),
    caption: () => push({ scriptActive: true, caption: 'Another world — King Kai\'s small planet, far from Earth.' }),
    toast: () => push({ toasts: [{ id: 1, text: 'Obtained Lab Medicine' }, { id: 2, text: 'Quest started' }] }),
    'battle-input': () => push({ screen: 'battle', battle: battleView('input') }),
    'battle-skills': () => push({ screen: 'battle', battle: battleView('input') }),
    'battle-guard': () => push({ screen: 'battle', battle: battleView('guard') }),
    'battle-anim': () => push({ screen: 'battle', battle: battleView('anim') }),
    'battle-tutorial': () => push({ screen: 'battle', battle: battleView('input') }),
    'battle-reduced': () => { settings.reducedMotion = true; push({ screen: 'battle', battle: battleView('guard') }); },
    rewards: () => push({ screen: 'battle', overlay: 'rewards', battle: battleView('ended'), rewards: rewards() }),
    defeat: () => push({ screen: 'battle', overlay: 'defeat', battle: battleView('ended'), defeat: { stageName: 'Piccolo and the Monster', canLoad: true } }),
  };
  (R[scene] ?? R.title)();
}

const sync = () => {
  uiStore.set({ ...uiStore.get(), game: structuredClone(game), settings: { ...settings }, version: uiStore.get().version + 1 });
};

// Expose submitted commands so browser checks can verify the visible menu path.
const submitted: unknown[] = [];
(window as unknown as { __battleSubmissions: unknown[] }).__battleSubmissions = submitted;

const mock: SessionApi = {
  newGame: () => {}, continueGame: () => {}, loadSlot: () => true, saveSlot: () => ({ ok: true }), deleteSlot: () => {}, exportSlot: () => {}, importFile: () => ({ ok: true }), toTitle: () => {}, refreshSlots: () => {},
  openMenu: () => push({ overlay: 'menu' }), closeOverlay: () => uiStore.patch({ overlay: null }), openOverlay: (o) => uiStore.patch({ overlay: o }),
  confirm: async () => true, resolveConfirm: () => uiStore.patch({ overlay: null, confirm: null }), advanceDialogue: () => uiStore.patch({ dialogue: null }), skipDialogue: () => uiStore.patch({ dialogue: null }), chooseOption: () => uiStore.patch({ choice: null }),
  updateSettings: (p) => { Object.assign(settings, p); sync(); }, toggleFullscreen: () => uiStore.patch({ fullscreen: !uiStore.get().fullscreen }),
  setParty: (h) => { const r = setParty(game, h); sync(); return r; },
  setLoadout: (h, s, k) => { const r = setLoadout(game, h, s, k); sync(); return r; },
  equip: (h, s, i) => { const r = equipAccessory(game, h, s, i); sync(); return r; },
  train: (h, s) => { const r = trainStat(game, h, s); sync(); return r; },
  refundTraining: (h) => { const n = refundTraining(game, h); sync(); return n; },
  useItem: (i, h) => { const r = useFieldItem(game, i, h); sync(); return r; },
  buy: (s, i, q) => { const r = buyItem(game, s, i, q); sync(); return r; },
  sell: (i, q) => { const r = sellItem(game, i, q); sync(); return r; },
  closeShop: () => uiStore.patch({ overlay: null, shop: null }), chooseTravel: () => uiStore.patch({ overlay: null, travel: null }), setDifficulty: (d) => { game.difficulty = d; sync(); },
  dismissRewards: () => uiStore.patch({ overlay: null, rewards: null }), defeatChoice: () => uiStore.patch({ overlay: null }),
  battleSubmit: (action) => { submitted.push(action); return { ok: true }; }, battleGuard: () => {}, battlePause: (p) => { const b = uiStore.get().battle; if (b) uiStore.patch({ battle: { ...b, paused: p } }); },
  dismissBattleTutorial: () => { const b = uiStore.get().battle; if (b) uiStore.patch({ battle: { ...b, tutorial: null } }); }, skipBattleAnimations: () => {}, ui: () => {},
};

bindApi(mock);
input.attach();
(window as unknown as { __ui: typeof uiStore }).__ui = uiStore;
restParty(game);
game.roster.trunks.hp = Math.round(maxStats(game, 'trunks').hp * 0.6);
void availableHeroes;
apply();
createRoot(document.getElementById('root')!).render(<App />);

