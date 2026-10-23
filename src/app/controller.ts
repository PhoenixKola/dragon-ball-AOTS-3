import { ITEMS } from '../data/items';
import { MAPS, TRAVEL_DESTINATIONS } from '../data/maps';
import { ALL_SIDE } from '../data/sidefights';
import { BEATS, BEAT_INDEX } from '../data/story';
import { Battle, type BattleSetup } from '../engine/combat/engine';
import { WorldSim, type WorldEvent } from '../engine/world/sim';
import { evalCond } from '../systems/cond';
import type { GameState } from '../systems/gameState';
import { addItem, applyBattleResult, makeBattleSetup, nextStagePower, randomStage, restParty, type RewardSummary } from '../systems/progression';
import { beatGate, playBeat, runScript, type ScriptHost } from '../systems/storyRuntime';
import type { StageDef } from '../types';
import type { Entity, FoeEntity, NpcEntity, PointEntity } from '../types/script';

export type BattleKind = 'story' | 'side' | 'random' | 'sim';

export interface ControllerHost extends ScriptHost {
  /** run a battle to its end and hand back the finished Battle */
  fight(setup: BattleSetup, stage: StageDef, kind: BattleKind): Promise<Battle>;
  /** presentation-side map change: fade out, call apply() (which moves the sim), load the new map, fade in */
  warpTo(map: string, x: number, y: number, facing: 'up' | 'down' | 'left' | 'right' | undefined, apply: () => void): Promise<void>;
  openShop(shopId: string): Promise<void>;
  /** resolves with the chosen destination or null */
  openTravel(options: { map: string; label: string; hint: string }[]): Promise<number | null>;
  openSave(): Promise<void>;
  defeatChoice(stage: StageDef): Promise<'retry' | 'load'>;
  showRewards(stage: StageDef, summary: RewardSummary, kind: BattleKind): Promise<void>;
  /** called when state changed in ways the HUD should re-read */
  stateChanged(): void;
}

export class GameController {
  busy = false;
  constructor(public state: GameState, public world: WorldSim, public host: ControllerHost) {}

  /** ScriptHost adapter used by the story runtime: wraps host and adds battle orchestration */
  scriptHost(): ScriptHost {
    const h = this.host;
    return {
      say: (w, t, m) => h.say(w, t, m),
      card: (t, s) => h.card(t, s),
      cutscene: (id) => h.cutscene(id),
      ask: (p, c) => h.ask(p, c),
      warp: async (map, x, y, f) => {
        await h.warpTo(map, x, y, f, () => this.world.warp(map, x, y, f));
      },
      music: (k) => h.music(k),
      sfx: (k) => h.sfx(k),
      toast: (t) => h.toast(t),
      battle: (stage, kind) => this.runBattle(stage, stage.id.startsWith('SIM_') ? 'sim' : kind),
      autosave: () => h.autosave(),
      hideEntity: (id) => h.hideEntity(id),
    };
  }

  /** fight with retry-on-defeat; commits the result exactly once */
  async runBattle(stage: StageDef, kind: BattleKind, opts: { enemyIds?: string[]; p?: number; foeId?: string } = {}): Promise<RewardSummary> {
    for (;;) {
      const setup = makeBattleSetup(this.state, stage, { enemyIds: opts.enemyIds, p: opts.p, random: kind === 'random', mercy: kind === 'story' || kind === 'side' ? 0.6 : 0, sim: kind === 'sim' });
      const battle = await this.host.fight(setup, stage, kind);
      const summary = applyBattleResult(this.state, stage, battle, kind);
      if (summary.outcome === 'defeat') {
        const c = await this.host.defeatChoice(stage);
        this.host.stateChanged();
        if (c === 'load') return summary;
        continue;
      }
      if (opts.foeId && summary.outcome === 'victory') this.state.opened.push(`defeated:${opts.foeId}`);
      this.host.stateChanged();
      if (summary.outcome === 'victory') await this.host.showRewards(stage, summary, kind);
      return summary;
    }
  }

  /** process one world event; returns when all consequences (dialogue, fights, warps) have finished */
  async handle(ev: WorldEvent): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.dispatch(ev);
    } finally {
      this.busy = false;
      this.host.stateChanged();
    }
  }

  private async dispatch(ev: WorldEvent): Promise<void> {
    const s = this.state;
    const sh = this.scriptHost();
    switch (ev.type) {
      case 'step': return;
      case 'blocked': this.host.toast(ev.text); return;
      case 'exit': {
        const e = ev.entity;
        await this.host.warpTo(e.to.map, e.to.x, e.to.y, e.to.facing, () => this.world.warp(e.to.map, e.to.x, e.to.y, e.to.facing));
        this.host.music(MAPS[e.to.map].music);
        return;
      }
      case 'zone': {
        const z = ev.entity;
        if (z.story) {
          await this.story(z.story);
          return;
        }
        if (z.script) await runScript(s, z.script, sh);
        if (z.once) s.opened.push(`zone:${z.id}`);
        return;
      }
      case 'foe': return this.foe(ev.entity);
      case 'encounter': {
        const stage = randomStage(this.world.map.id, ev.enemies, ev.p);
        const r = await this.runBattle(stage, 'random', { enemyIds: ev.enemies, p: ev.p });
        void r;
        return;
      }
      case 'interact': return this.interact(ev.entity);
    }
  }

  private async story(beatId: string): Promise<boolean> {
    const i = BEAT_INDEX[beatId];
    if (this.state.beat !== i) return false;
    const gate = beatGate(this.state, BEATS[i]);
    if (!gate.ok) {
      this.host.toast(gate.text ?? 'Not yet.');
      return false;
    }
    return playBeat(this.state, beatId, this.scriptHost());
  }

  private async foe(e: FoeEntity): Promise<void> {
    const s = this.state;
    const sh = this.scriptHost();
    if (e.story) {
      await this.story(e.story);
      return;
    }
    if (e.fight) {
      const stage = ALL_SIDE[e.fight.stage];
      const r = await this.runBattle(stage, 'side', { foeId: e.id });
      if (r.outcome === 'victory' && e.script) await runScript(s, e.script, sh);
      else if (r.outcome !== 'victory') {
        // step the player back so the foe does not instantly re-trigger
        const w = this.world;
        await this.host.warpTo(w.map.id, Math.floor(w.px / 32) - 3, Math.floor(w.py / 32), undefined, () => w.warp(w.map.id, Math.floor(w.px / 32) - 3, Math.floor(w.py / 32)));
      }
      return;
    }
    if (e.script) await runScript(s, e.script, sh);
  }

  private async interact(e: Entity): Promise<void> {
    const s = this.state;
    const sh = this.scriptHost();
    const h = this.host;
    switch (e.kind) {
      case 'npc': {
        const n = e as NpcEntity;
        if (n.story && s.beat === BEAT_INDEX[n.story]) {
          await this.story(n.story);
          return;
        }
        if (n.script) await runScript(s, n.script, sh);
        return;
      }
      case 'foe': return this.foe(e);
      case 'zone': {
        if (e.story) await this.story(e.story);
        else if (e.script) await runScript(s, e.script, sh);
        return;
      }
      case 'chest': {
        const key = `chest:${e.id}`;
        if (s.opened.includes(key)) {
          h.toast('Empty.');
          return;
        }
        s.opened.push(key);
        h.sfx('chest');
        if (e.item) {
          const n = addItem(s, e.item, e.n ?? 1);
          h.toast(n > 0 ? `Found ${ITEMS[e.item].name}${(e.n ?? 1) > 1 ? ` x${n}` : ''}` : 'Your pack is full.');
          if (n === 0) s.opened.pop();
        }
        if (e.zeni) {
          s.zeni += e.zeni;
          h.toast(`Found ${e.zeni} Zeni`);
        }
        if (e.script) await runScript(s, e.script, sh);
        return;
      }
      case 'pickup': {
        const key = `pickup:${e.id}`;
        if (s.opened.includes(key)) return;
        const n = e.item ? addItem(s, e.item, e.n ?? 1) : 0;
        if (e.item && n === 0) {
          h.toast('Your pack is full.');
          return;
        }
        s.opened.push(key);
        h.sfx('item');
        h.toast(`Obtained ${ITEMS[e.item!].name}`);
        return;
      }
      case 'save': await h.openSave(); return;
      case 'heal': {
        restParty(s);
        h.sfx('heal');
        h.toast('Your party is fully restored.');
        return;
      }
      case 'shop': await h.openShop((e as PointEntity).shop!); return;
      case 'sign': await h.say('narrator', (e as PointEntity).text ?? '...'); return;
      case 'lever': case 'terminal': case 'door': {
        const p = e as PointEntity;
        if (p.script) await runScript(s, p.script, sh);
        else if (p.text) await h.say('narrator', p.text);
        return;
      }
      case 'travel': {
        const dests = TRAVEL_DESTINATIONS.filter((d) => evalCond(s, d.when) && d.map !== this.world.map.id);
        if (dests.length === 0) {
          await h.say('narrator', 'The Capsule Flyer has nowhere to go yet.');
          return;
        }
        const i = await h.openTravel(dests);
        if (i === null) return;
        const d = dests[i];
        await h.warpTo(d.map, d.x, d.y, undefined, () => this.world.warp(d.map, d.x, d.y));
        h.music(MAPS[d.map].music);
        return;
      }
      default: return;
    }
  }

  /** objective text for the HUD / journal */
  objective(): { text: string; where: string } {
    const b = BEATS[this.state.beat];
    if (!b) return { text: 'The Cell Saga is complete. Train, rematch, or explore.', where: 'Capsule Corp simulation room' };
    return { text: b.objective, where: `${MAPS[b.map].name}: ${b.where}` };
  }
}

export const powerHint = nextStagePower;
