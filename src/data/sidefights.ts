import type { StageDef } from '../types';

const side = (s: Omit<StageDef, 'flags' | 'result' | 'music' | 'backdrop'> & Partial<Pick<StageDef, 'flags' | 'result' | 'music' | 'backdrop'>>): StageDef => ({ flags: [], result: {}, music: 'battle', backdrop: s.map, ...s });

/** Optional quest fights. Each can be won once for its reward; they may be retried when lost. */
export const SIDE_STAGES: StageDef[] = [
  side({ id: 'Q_EVAC1', chapter: 1, name: 'Pinned Civilians', map: 'south_city', mode: 'win', enemies: ['recon-probe', 'recon-probe'], team: [], p: 9, xp: 110, zeni: 80, canFlee: true, hint: 'Clear the probes pinning down the civilians.' }),
  side({ id: 'Q_EVAC2', chapter: 1, name: 'Collapsed Alley', map: 'south_city', mode: 'win', enemies: ['drain-drone', 'recon-probe'], team: [], p: 9, xp: 120, zeni: 90, canFlee: true, hint: 'Destroy the drone first — it drains Ki.' }),
  side({ id: 'Q_GINGER', chapter: 3, name: 'The Cellar Guardian', map: 'gingertown', mode: 'win', enemies: ['cell-husk', 'absorbed-shadow'], team: [], p: 16, xp: 260, zeni: 180, canFlee: true, music: 'mystery', hint: 'Break the guardian to free the survivor.' }),
  side({ id: 'Q_PICCOLO', chapter: 3, name: 'The Lookout Trial', map: 'lookout', mode: 'protect', enemies: ['training-sentinel', 'training-sentinel'], team: [], p: 17, protect: { name: 'Training Stone', hp: 260, actor: 'civilian' }, xp: 300, zeni: 200, music: 'lookout', hint: 'Defend the stone while defeating the sentinels.' }),
  side({ id: 'Q_CHAMBER', chapter: 5, name: 'Three-Fighter Spar', map: 'time_chamber', mode: 'win', enemies: ['training-sentinel', 'training-sentinel', 'chamber-guardian'], team: [], p: 20, xp: 380, zeni: 260, music: 'training', hint: 'A three-on-three spar: switch targets, use combos, Rage and Sparking.' }),
];

/** Postgame Cell Games simulations — clearly non-canonical; dead heroes (Goku) may be fielded. */
export const SIM_STAGES: StageDef[] = [
  side({ id: 'SIM_JUNIORS', chapter: 8, name: 'Simulation: Cell Junior Swarm', map: 'capsule_corp', mode: 'win', enemies: ['cell-junior', 'cell-junior', 'cell-junior', 'cell-junior'], team: [], p: 24, xp: 300, zeni: 300, music: 'training', hint: 'A Capsule Corp simulation. Nothing here changes the story.' }),
  side({ id: 'SIM_PERFECT', chapter: 8, name: 'Simulation: Perfect Cell', map: 'capsule_corp', mode: 'win', enemies: ['cell-perfect'], team: [], p: 26, xp: 500, zeni: 500, music: 'perfectCell', hint: 'A rematch against a simulated Perfect Cell.' }),
  side({ id: 'SIM_SUPER', chapter: 8, name: 'Simulation: Super Perfect Cell', map: 'capsule_corp', mode: 'win', enemies: ['cell-super-perfect'], team: [], p: 27, xp: 800, zeni: 800, music: 'perfectCell', hint: 'The ultimate trial. Records are saved.' }),
];

export const ALL_SIDE: Record<string, StageDef> = Object.fromEntries([...SIDE_STAGES, ...SIM_STAGES].map((s) => [s.id, s]));
