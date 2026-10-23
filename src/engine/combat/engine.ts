import { COMBOS, ITEMS } from '../../data/items';
import { ENEMIES } from '../../data/enemies';
import { FORMS, HERO_FORMS, HEROES } from '../../data/heroes';
import { getSkill, RAGE_ARTS } from '../../data/skills';
import type {
  BattleAction, BattleEvent, BattlePhase, ComboDef, Difficulty, Element, EnemyMove, Fighter, FormId, GuardGrade, HeroId, PendingHit,
  SkillDef, StageDef, StatusApply, StatusInstance, StatusKind,
} from '../../types';
import { buildEnemyFighter, buildHeroFighter, scaleEnemy, type HeroInit } from './fighters';
import {
  accuracyOf, CRIT_CHANCE, CRIT_MULT, DEFEND_MULT, ENEMY_DMG, EASY_ENEMY_DMG, effAtk, effDef, effSpd, getStatus, GUARD_MULT, hasStatus, kiCost, mitigation, SPARKING_COST,
  SPARKING_TURNS, statusPower,
} from './formulas';
import { RAGE, rageDealt, rageTaken } from './rage';
import { heroActorId } from '../assets';
import { Rng } from './rng';

export interface BattleSetup {
  stage: StageDef;
  seed: number;
  difficulty: Difficulty;
  heroes: HeroInit[];
  /** override for random encounters / training */
  enemyIds?: string[];
  p?: number;
  flags: Record<string, boolean>;
  inventory: Record<string, number>;
  random?: boolean;
}

export interface BattleOutcome {
  outcome: 'victory' | 'defeat' | 'fled';
  reason: string;
}

interface HitSpec {
  mult: number;
  element: Element;
  pierce?: number;
  acc?: number;
  critBonus?: number;
  hitIndex: number;
  hits: number;
  vfx: string;
  label: string;
  skillId?: string;
  atkOverride?: number;
  noCounter?: boolean;
  forceCrit?: boolean;
  guardable?: boolean;
  isCounter?: boolean;
  noRedirect?: boolean;
  damageMod?: number;
  unguarded?: boolean;
}
interface HitResult {
  dmg: number;
  landed: boolean;
  crit: boolean;
  target: Fighter;
  killed: boolean;
}

type Gen<T = void> = Generator<PendingHit, T, GuardGrade>;

const TICK_AT_START = new Set<StatusKind>(['stun', 'heavyGuard']);
const DEBUFFS = new Set<StatusKind>(['stun', 'blind', 'seal', 'atkDown', 'defDown', 'spdDown']);
const NEGATIVE = new Set<StatusKind>(['stun', 'blind', 'seal', 'atkDown', 'defDown', 'spdDown', 'drain', 'virus', 'mine', 'marked']);

export class Battle {
  readonly rng: Rng;
  readonly stage: StageDef;
  readonly difficulty: Difficulty;
  readonly flags: Record<string, boolean>;
  readonly random: boolean;
  /** widest Active Guard window bonus from equipped accessories (Guard Charm) */
  readonly guardAssist: number;
  fighters: Fighter[] = [];
  round = 0;
  phase: BattlePhase = 'input';
  current: Fighter | null = null;
  pending: PendingHit | null = null;
  outcome: BattleOutcome | null = null;
  inventory: Record<string, number>;
  readonly itemsUsed: Record<string, number> = {};
  events: BattleEvent[] = [];
  waveIdx = 0;
  roundsCompleted = 0;
  finisherReady = false;
  /** wall-clock-independent counters for reports and tests */
  stats = { turns: 0, hitsTaken: 0, guardsPerfect: 0, guardsGood: 0, guardsMissed: 0, damageDealt: 0, damageTaken: 0, itemsUsed: 0, rageArts: 0, ko: 0 };
  readonly defeatedIds: string[] = [];
  private queue: { uid: string; extra: boolean }[] = [];
  private gen: Gen | null = null;
  private guardIn: GuardGrade | undefined;
  private waitingInput = false;
  private nextEnemyIndex = 0;
  private readonly p: number;
  private actionRageGain = new Map<string, number>();
  private lastGrade: GuardGrade = 'none';
  /** boss HP is authored for three fighters; smaller teams face proportionally less */
  private hpScale = 1;

  constructor(private setup: BattleSetup) {
    this.rng = new Rng(setup.seed);
    this.stage = setup.stage;
    this.difficulty = setup.difficulty;
    this.flags = setup.flags;
    this.random = !!setup.random;
    this.guardAssist = Math.max(0, ...setup.heroes.flatMap((h) => h.accessories.map((a) => ITEMS[a]?.mods?.guardAssist ?? 0)));
    this.inventory = { ...setup.inventory };
    this.p = setup.p ?? setup.stage.p;
    for (const h of setup.heroes) {
      const f = buildHeroFighter(h);
      const forced = setup.stage.forms?.[h.id as HeroId];
      if (forced && this.formUnlocked(h.id as HeroId, forced)) f.form = forced;
      this.refreshActor(f);
      this.fighters.push(f);
    }
    if (setup.stage.protect) {
      const pr = setup.stage.protect;
      this.fighters.push({
        ...buildEnemyFighter('recon-probe', this.p, 0), uid: 'p:0', team: 'ally', defId: 'protectee', name: pr.name, actor: pr.actor, hp: pr.hp, maxHp: pr.hp, isProtectee: true, boss: false,
      });
    }
    this.hpScale = [1, 0.5, 0.75, 1][Math.min(3, setup.heroes.length)] ?? 1;
    this.spawnWave(setup.enemyIds ?? setup.stage.enemies);
    for (const f of this.fighters) if (f.defId === 'armored-sentinel') this.setSentinelState(f, 'shielded');
  }

  /** art actor follows the hero's current form (and story state) */
  private refreshActor(f: Fighter) {
    if (f.isHero && !f.guest) f.actor = heroActorId(f.defId, f.form, this.flags);
  }

  /* ------------------------------------------------------------------ queries */
  get(uid: string): Fighter | undefined {
    return this.fighters.find((f) => f.uid === uid);
  }
  heroes(): Fighter[] {
    return this.fighters.filter((f) => f.team === 'ally' && !f.isProtectee);
  }
  enemies(): Fighter[] {
    return this.fighters.filter((f) => f.team === 'enemy');
  }
  livingEnemies(): Fighter[] {
    return this.enemies().filter((f) => f.alive);
  }
  livingAllies(of: Fighter): Fighter[] {
    return this.fighters.filter((f) => f.team === of.team && f.alive && !f.isProtectee);
  }
  opponents(of: Fighter): Fighter[] {
    return this.fighters.filter((f) => f.team !== of.team && f.alive);
  }
  get ended() {
    return this.phase === 'ended';
  }
  drainEvents(): BattleEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
  private emit(e: BattleEvent) {
    this.events.push(e);
  }
  private log(text: string) {
    this.emit({ t: 'log', text });
  }
  /** authoritative values for the presentation layer, emitted whenever a fighter's numbers change */
  snapAll() {
    for (const f of this.fighters) this.snap(f);
  }
  snap(f: Fighter) {
    this.emit({ t: 'snap', uid: f.uid, hp: f.hp, maxHp: f.maxHp, ki: f.ki, maxKi: f.maxKi, rage: Math.floor(f.rage), alive: f.alive, form: f.form, actor: f.actor, name: f.name, sparking: f.sparkingTurns, charging: !!f.charging });
  }

  formUnlocked(hero: HeroId, form: FormId): boolean {
    if (form === 'base') return true;
    const e = HERO_FORMS[hero]?.find((x) => x.form === form);
    if (!e || !this.flags[e.flag]) return false;
    if (form === 'ssj2') return !!this.flags.gohan_ssj2_unlocked && !!this.flags.android16_destroyed;
    return true;
  }

  /* ------------------------------------------------------------------ lifecycle */
  start(): void {
    this.log(`${this.stage.name}: ${this.stage.hint}`);
    this.snapAll();
    this.run();
  }

  private spawnWave(ids: string[]) {
    ids.forEach((id) => {
      const f = buildEnemyFighter(id, this.p, this.nextEnemyIndex++, this.stage.enemyHpFrac ?? 1);
      if (this.hpScale < 1) {
        f.maxHp = Math.max(20, Math.round(f.maxHp * this.hpScale));
        f.hp = Math.max(1, Math.round(f.hp * this.hpScale));
      }
      this.fighters.push(f);
    });
  }

  private buildQueue() {
    const entries: { uid: string; key: number; tie: number; extra: boolean }[] = [];
    this.fighters.forEach((f, i) => {
      if (!f.alive || f.isProtectee) return;
      entries.push({ uid: f.uid, key: effSpd(f), tie: i, extra: false });
      const acts = f.team === 'enemy' ? (ENEMIES[f.defId]?.acts ?? 1) : 1;
      for (let a = 1; a < acts; a++) entries.push({ uid: f.uid, key: effSpd(f) * 0.55, tie: i, extra: true });
    });
    entries.sort((a, b) => b.key - a.key || a.tie - b.tie);
    this.queue = entries.map((e) => ({ uid: e.uid, extra: e.extra }));
  }

  private startRound() {
    this.round++;
    for (const f of this.fighters) f.actedThisRound = false;
    this.buildQueue();
    this.emit({ t: 'round', round: this.round });
  }

  private endRound() {
    this.roundsCompleted = this.round;
    for (const f of this.fighters) {
      if (!f.alive) continue;
      for (const k of Object.keys(f.cooldowns)) if (f.cooldowns[k] > 0) f.cooldowns[k]--;
      if (f.team === 'enemy') {
        const reg = ENEMIES[f.defId]?.regen;
        if (reg && this.round % reg.every === 0) {
          const a = Math.round(f.maxHp * reg.pct);
          if (f.hp < f.maxHp) {
            f.hp = Math.min(f.maxHp, f.hp + a);
            this.emit({ t: 'heal', uid: f.uid, amount: a });
            this.log(`${f.name} regenerates ${a} HP.`);
          }
        }
      }
    }
    if (this.stage.mode === 'finisher' && this.round >= (this.stage.finisherAfter ?? 2)) this.finisherReady = true;
    if (this.stage.mode === 'survive' && this.stage.rounds && this.roundsCompleted >= this.stage.rounds) {
      this.finish('victory', this.stage.result.survived ?? 'Survived');
    }
  }

  /** drives automatic parts until the engine needs the player (command or guard) or the battle ends */
  private run(): void {
    let guardLoops = 0;
    while (this.phase !== 'ended') {
      if (this.gen) {
        const input = this.guardIn;
        this.guardIn = undefined;
        const r = this.gen.next(input as GuardGrade);
        if ((this.phase as BattlePhase) === 'ended') return;
        if (!r.done) {
          this.pending = r.value;
          this.phase = 'guard';
          return;
        }
        this.gen = null;
        this.pending = null;
        this.phase = 'input';
        this.snapAll();
        if (this.checkEnd()) return;
        this.endTurn();
        if (++guardLoops > 10000) throw new Error('run loop overflow');
        continue;
      }
      if (this.waitingInput) {
        this.phase = 'input';
        return;
      }
      if (this.checkEnd()) return;
      this.nextTurn();
    }
  }

  private nextTurn() {
    let entry: { uid: string; extra: boolean } | undefined;
    for (;;) {
      if (this.queue.length === 0) {
        if (this.round > 0) this.endRound();
        if (this.phase === 'ended') return;
        this.startRound();
      }
      entry = this.queue.shift();
      const f = entry && this.get(entry.uid);
      if (f && f.alive) break;
    }
    const f = this.get(entry!.uid)!;
    this.current = f;
    this.stats.turns++;
    this.emit({ t: 'turn', uid: f.uid });
    const act = this.beginTurn(f);
    if (this.phase === 'ended') return;
    if (act === 'skip') {
      this.endTurn();
      return;
    }
    if (act === 'auto') {
      this.gen = this.autoTurn(f);
      return;
    }
    if (f.team === 'ally') {
      this.waitingInput = true;
      this.phase = 'input';
    } else {
      this.gen = this.enemyTurn(f);
    }
  }

  /** returns what should happen for this actor now */
  private beginTurn(f: Fighter): 'input' | 'skip' | 'auto' {
    f.defending = false;
    // absorb resolution happens before stun so a stunned Cell releases its victim
    if (f.team === 'enemy') this.resolveAbsorbLocks(f);
    // start-of-turn effects
    const regen = getStatus(f, 'regen');
    if (regen && f.alive) {
      const a = Math.max(1, Math.round(f.maxHp * regen.power));
      f.hp = Math.min(f.maxHp, f.hp + a);
      this.emit({ t: 'heal', uid: f.uid, amount: a });
    }
    const virus = getStatus(f, 'virus');
    if (virus && f.alive) {
      const d = Math.max(1, Math.round(f.maxHp * virus.power));
      f.hp = Math.max(1, f.hp - d);
      this.log(`${f.name} is weakened by the heart virus (-${d} HP).`);
    }
    if (f.isHero) {
      const gain = Math.max(3, Math.round(f.maxKi * 0.04));
      f.ki = Math.min(f.maxKi, f.ki + gain);
      if (f.form !== 'base') {
        const up = hasStatus(f, 'focus') ? 0 : Math.round(f.maxKi * FORMS[f.form].upkeep);
        f.ki = Math.max(0, f.ki - up);
        if (f.ki <= 0) {
          this.log(`${f.name} runs out of Ki and drops out of ${FORMS[f.form].name}.`);
          f.form = 'base';
          this.refreshActor(f);
          this.emit({ t: 'form', uid: f.uid, form: 'base' });
        }
      }
    }
    this.snap(f);
    const stun = getStatus(f, 'stun');
    if (stun) {
      this.tickStart(f);
      f.charging = undefined;
      this.log(`${f.name} is stunned and loses the turn.`);
      this.emit({ t: 'announce', uid: f.uid, text: 'Stunned!' });
      return 'skip';
    }
    this.tickStart(f);
    if (f.charging) {
      f.charging.turnsLeft--;
      if (f.charging.turnsLeft > 0) {
        this.log(`${f.name} keeps gathering energy...`);
        return 'skip';
      }
      return 'auto';
    }
    return 'input';
  }

  private tickStart(f: Fighter) {
    for (const s of [...f.statuses]) {
      if (!TICK_AT_START.has(s.kind)) continue;
      s.turns--;
      if (s.turns <= 0) this.removeStatus(f, s.kind);
    }
  }

  private endTurn() {
    const f = this.current;
    this.waitingInput = false;
    this.current = null;
    if (!f) return;
    f.actedThisRound = true;
    if (f.alive) {
      if (f.sparkingTurns > 0) {
        f.sparkingTurns--;
        if (f.sparkingTurns === 0) {
          this.log(`${f.name}'s Sparking fades.`);
          this.emit({ t: 'status', uid: f.uid, kind: 'sparking', on: false });
        }
      }
      const wasShielded = hasStatus(f, 'shielded');
      for (const s of [...f.statuses]) {
        if (TICK_AT_START.has(s.kind) || s.kind === 'absorbLock') continue;
        if (s.fresh) {
          s.fresh = false;
          continue;
        }
        s.turns--;
        if (s.turns <= 0) {
          if (s.kind === 'mine') this.explodeMine(f, s);
          this.removeStatus(f, s.kind);
        }
      }
      if (f.defId === 'armored-sentinel' && f.alive) this.setSentinelState(f, wasShielded ? 'exposed' : 'shielded', true);
    }
    this.snapAll();
    this.checkEnd();
  }

  private setSentinelState(f: Fighter, state: 'shielded' | 'exposed', announce = false) {
    this.removeStatus(f, 'shielded');
    this.removeStatus(f, 'exposed');
    f.statuses.push({ kind: state, turns: 1, power: state === 'shielded' ? 0.5 : 0.4 });
    this.emit({ t: 'status', uid: f.uid, kind: state, on: true });
    if (announce) {
      this.emit({ t: 'announce', uid: f.uid, text: state === 'exposed' ? 'Weak point exposed!' : 'Shield rotated closed' });
      this.log(state === 'exposed' ? `${f.name}'s shield rotates open — its weak point is exposed (+40% damage taken)!` : `${f.name}'s shield rotates closed (-50% damage taken).`);
    }
  }

  private explodeMine(owner: Fighter, s: StatusInstance) {
    const src = s.source ? this.get(s.source) : undefined;
    const base = src ? effAtk(src) : 20;
    const dmg = Math.max(1, Math.round(base * s.power * mitigation(effDef(owner))));
    this.log(`The energy mine explodes on ${owner.name} for ${dmg}!`);
    this.emit({ t: 'hit', attacker: src?.uid ?? owner.uid, target: owner.uid, dmg, crit: false, hitIndex: 0, hits: 1, element: 'ki', guard: 'none', vfx: 'explosion' });
    this.applyDamage(owner, dmg, src);
  }

  /* ------------------------------------------------------------------ outcome */
  private finish(outcome: BattleOutcome['outcome'], reason: string): boolean {
    if (this.phase === 'ended') return true;
    this.outcome = { outcome, reason };
    this.phase = 'ended';
    this.gen = null;
    this.pending = null;
    this.waitingInput = false;
    this.emit({ t: 'end', outcome, reason });
    this.log(outcome === 'victory' ? `Victory — ${reason}` : outcome === 'fled' ? 'The party got away.' : reason);
    return true;
  }

  private checkEnd(): boolean {
    if (this.phase === 'ended') return true;
    if (!this.fighters.some((f) => f.team === 'ally' && !f.isProtectee && f.alive)) return this.finish('defeat', 'The party was defeated. Retry the battle or load a save.');
    const pr = this.fighters.find((f) => f.isProtectee);
    if (pr && !pr.alive) return this.finish('defeat', `${pr.name} could not be protected. Retry the battle.`);
    const living = this.livingEnemies();
    if (living.length === 0) {
      const waves = this.stage.waves;
      if (waves && this.waveIdx < waves.length) {
        const w = waves[this.waveIdx++];
        this.log('Reinforcements arrive!');
        const before = this.fighters.length;
        this.spawnWave(w);
        this.emit({ t: 'wave', uids: this.fighters.slice(before).map((f) => f.uid) });
        this.snapAll();
        this.emit({ t: 'announce', uid: 'e:0', text: 'Next wave!' });
        if (this.queue.length) this.queue = this.queue.concat(this.fighters.filter((f) => f.team === 'enemy' && f.alive).map((f) => ({ uid: f.uid, extra: false })));
        return false;
      }
      return this.finish('victory', this.stage.result.survived && this.stage.mode !== 'win' ? this.stage.result.survived : 'enemies defeated');
    }
    if (this.stage.mode === 'threshold' && this.stage.threshold !== undefined) {
      const t = this.stage.threshold;
      if (living.every((e) => e.hp / e.maxHp <= t)) return this.finish('victory', this.stage.result.repelled ?? 'Repelled');
    }
    return false;
  }

  /* ------------------------------------------------------------------ player API */
  skillStatus(f: Fighter, skill: SkillDef): { ok: boolean; reason?: string } {
    if (skill.requires?.storyOnly) return { ok: false, reason: 'Reserved for a story battle' };
    if (skill.requires?.form) {
      const need = Array.isArray(skill.requires.form) ? skill.requires.form : [skill.requires.form];
      if (!need.includes(f.form)) return { ok: false, reason: `Requires ${need.map((n) => FORMS[n].name).join(' / ')}` };
    }
    if (skill.requires?.flag && !this.flags[skill.requires.flag]) return { ok: false, reason: 'Story requirement not met' };
    if (skill.requires?.hpBelow !== undefined && f.hp / f.maxHp >= skill.requires.hpBelow) return { ok: false, reason: `Only below ${Math.round(skill.requires.hpBelow * 100)}% HP` };
    if (hasStatus(f, 'seal') && !f.guest) return { ok: false, reason: 'Sealed' };
    const cost = kiCost(f, skill.ki);
    if (f.ki < cost) return { ok: false, reason: `Needs ${cost} Ki` };
    if (skill.hpCost) {
      const need = skill.hpCost + (skill.tags?.includes('hpFloor') ? 0.2 : 0.02);
      if (f.hp / f.maxHp <= need) return { ok: false, reason: 'Too little HP' };
    }
    if (skill.rageCost && f.rage < skill.rageCost) return { ok: false, reason: `Needs ${skill.rageCost} Rage` };
    if (skill.battleLimit && (f.used[skill.id] ?? 0) >= skill.battleLimit) return { ok: false, reason: 'Used up this battle' };
    if (skill.target === 'anyAlly' && skill.revive) {
      // always usable if any ally is alive or dead
    }
    return { ok: true };
  }

  targetsFor(f: Fighter, skill: SkillDef | 'attack' | 'rage' | 'item-heal' | 'item-revive'): Fighter[] {
    if (skill === 'attack') return this.opponents(f);
    if (skill === 'item-heal') return this.fighters.filter((x) => x.team === f.team && x.alive && !x.isProtectee);
    if (skill === 'item-revive') return this.fighters.filter((x) => x.team === f.team && !x.alive && !x.isProtectee);
    if (skill === 'rage') return this.targetsFor(f, RAGE_ARTS[f.defId as HeroId]);
    switch (skill.target) {
      case 'enemy': return this.opponents(f);
      case 'ally': return this.fighters.filter((x) => x.team === f.team && x.alive && !x.isProtectee);
      case 'anyAlly': return this.fighters.filter((x) => x.team === f.team && !x.isProtectee && (x.alive || !!skill.revive));
      default: return [];
    }
  }

  comboStatus(f: Fighter, combo: ComboDef): { ok: boolean; reason?: string } {
    if (!combo.members.includes(f.defId as HeroId)) return { ok: false, reason: 'Not a member' };
    const lvl = Math.min(...combo.members.map((m) => this.get(`h:${m}`)?.level ?? 0));
    for (const m of combo.members) {
      const p = this.get(`h:${m}`);
      if (!p) return { ok: false, reason: `${HEROES[m].name} is not in the party` };
      if (!p.alive) return { ok: false, reason: `${HEROES[m].name} is down` };
      if (hasStatus(p, 'stun')) return { ok: false, reason: `${HEROES[m].name} is stunned` };
      if (m !== f.defId && p.actedThisRound) return { ok: false, reason: `${HEROES[m].name} already acted — start it from the faster fighter` };
      if (p.ki < kiCost(p, combo.kiCost)) return { ok: false, reason: `${HEROES[m].name} needs ${combo.kiCost} Ki` };
    }
    if (lvl < combo.unlockLevel) return { ok: false, reason: `Requires level ${combo.unlockLevel} for both` };
    if (combo.unlockFlag && !this.flags[combo.unlockFlag]) return { ok: false, reason: 'Story requirement not met' };
    return { ok: true };
  }

  canFlee(): boolean {
    return !!this.stage.canFlee || this.random;
  }

  finisherStatus(f: Fighter): { ok: boolean; reason?: string } {
    if (this.stage.mode !== 'finisher') return { ok: false, reason: 'Only in the final battle' };
    if (f.defId !== 'gohan') return { ok: false, reason: 'Only Gohan' };
    if (f.form !== 'ssj2' || !this.flags.gohan_ssj2_unlocked || !this.flags.goku_sacrifice) return { ok: false, reason: 'Requires Super Saiyan 2 and the Cell Games story' };
    if (!this.finisherReady) return { ok: false, reason: `Survive until round ${this.stage.finisherAfter ?? 2} to open the final opening` };
    return { ok: true };
  }

  formStatus(f: Fighter, form: FormId | 'base'): { ok: boolean; reason?: string } {
    if (!f.isHero || f.guest) return { ok: false, reason: 'No forms' };
    if (form === 'base') return f.form === 'base' ? { ok: false, reason: 'Already in base form' } : { ok: true };
    if (!HERO_FORMS[f.defId as HeroId]?.some((x) => x.form === form)) return { ok: false, reason: 'This hero has no such form' };
    if (!this.formUnlocked(f.defId as HeroId, form)) return { ok: false, reason: form === 'ssj2' ? 'Not awakened yet' : 'Not unlocked yet' };
    if (f.form === form) return { ok: false, reason: 'Already active' };
    const need = FORMS[form].entryKi;
    if (f.ki < need) return { ok: false, reason: `Needs ${need} Ki` };
    return { ok: true };
  }

  /** is `action` legal for the current hero? (no side effects) */
  checkAction(action: BattleAction): { ok: boolean; reason?: string } {
    const f = this.current;
    if (!f || this.phase !== 'input' || !this.waitingInput) return { ok: false, reason: 'Not accepting commands' };
    const tgt = (uid?: string) => (uid ? this.get(uid) : undefined);
    switch (action.kind) {
      case 'attack': {
        const t = tgt(action.targetUid);
        return t && t.alive && t.team !== f.team ? { ok: true } : { ok: false, reason: 'Choose a living enemy' };
      }
      case 'defend': return { ok: true };
      case 'skill': {
        const sk = getSkill(action.skillId);
        if (!sk) return { ok: false, reason: 'Unknown technique' };
        if (!f.guest && !f.loadout.includes(sk.id)) return { ok: false, reason: 'Technique is not equipped' };
        if (f.guest && !f.loadout.includes(sk.id)) return { ok: false, reason: 'Not available' };
        if (sk.hero !== f.defId) return { ok: false, reason: 'Not this fighter\'s technique' };
        const st = this.skillStatus(f, sk);
        if (!st.ok) return st;
        if (sk.target === 'enemy') {
          const t = tgt(action.targetUid);
          if (!t || !t.alive || t.team === f.team) return { ok: false, reason: 'Choose a living enemy' };
        } else if (sk.target === 'ally' || sk.target === 'anyAlly') {
          const t = tgt(action.targetUid);
          if (!t || t.team !== f.team || t.isProtectee || (!t.alive && !(sk.revive && sk.target === 'anyAlly'))) return { ok: false, reason: 'Choose an ally' };
        }
        return { ok: true };
      }
      case 'item': {
        const it = ITEMS[action.itemId];
        if (!it || !it.battle) return { ok: false, reason: 'Cannot be used in battle' };
        if ((this.inventory[it.id] ?? 0) <= 0) return { ok: false, reason: 'None left' };
        const t = tgt(action.targetUid);
        if (!t || t.team !== f.team || t.isProtectee) return { ok: false, reason: 'Choose an ally' };
        if (it.revivePct) return t.alive ? { ok: false, reason: 'Only fallen fighters' } : { ok: true };
        if (!t.alive) return { ok: false, reason: 'Fighter is down' };
        return { ok: true };
      }
      case 'flee': return this.canFlee() ? { ok: true } : { ok: false, reason: 'Cannot flee from this battle' };
      case 'rage': {
        const art = RAGE_ARTS[f.defId as HeroId];
        if (!art || f.guest) return { ok: false, reason: 'No Rage Art' };
        if (f.rage < 100) return { ok: false, reason: 'Needs 100 Rage' };
        if (art.target === 'enemy') {
          const t = tgt(action.targetUid);
          if (!t || !t.alive || t.team === f.team) return { ok: false, reason: 'Choose a living enemy' };
        }
        return { ok: true };
      }
      case 'sparking':
        if (f.guest) return { ok: false, reason: 'No Sparking' };
        if (f.sparkingTurns > 0) return { ok: false, reason: 'Already Sparking' };
        if (f.rage < SPARKING_COST) return { ok: false, reason: `Needs ${SPARKING_COST} Rage` };
        return { ok: true };
      case 'form': return this.formStatus(f, action.form);
      case 'combo': {
        const c = COMBOS.find((x) => x.id === action.comboId);
        if (!c) return { ok: false, reason: 'Unknown combo' };
        const st = this.comboStatus(f, c);
        if (!st.ok) return st;
        if (c.target === 'enemy') {
          const t = tgt(action.targetUid);
          if (!t || !t.alive || t.team === f.team) return { ok: false, reason: 'Choose a living enemy' };
        }
        return { ok: true };
      }
      case 'finisher': return this.finisherStatus(f);
    }
  }

  submit(action: BattleAction): { ok: boolean; reason?: string } {
    const chk = this.checkAction(action);
    if (!chk.ok) return chk;
    const f = this.current!;
    this.waitingInput = false;
    this.gen = this.perform(f, action);
    this.run();
    return { ok: true };
  }

  /** the UI/bot supplies the Active Guard grade for the pending hit */
  provideGuard(grade: GuardGrade): void {
    if (this.phase !== 'guard' || !this.pending) return;
    this.guardIn = grade;
    this.pending = null;
    this.phase = 'input';
    this.run();
  }

  /* ------------------------------------------------------------------ action implementations */
  private *perform(f: Fighter, a: BattleAction): Gen {
    this.actionRageGain.clear();
    if (a.kind !== 'defend') f.rageStreakDefend = 0;
    switch (a.kind) {
      case 'attack': {
        const t = this.get(a.targetUid)!;
        const multi = getStatus(f, 'multiform');
        this.emit({ t: 'clip', uid: f.uid, clip: 'melee', vfx: 'impact-hit', sfx: 'hit-melee', targetUid: t.uid });
        if (multi) {
          this.removeStatus(f, 'multiform');
          this.log(`${f.name}'s copies join the strike!`);
          for (let i = 0; i < 3; i++) {
            const tt = t.alive ? t : this.rng.pick(this.opponents(f));
            if (!tt) break;
            yield* this.hit(f, tt, { mult: 0.7, element: 'phys', hitIndex: i, hits: 3, vfx: 'impact-hit', label: 'Attack' });
          }
        } else {
          yield* this.hit(f, t, { mult: 1.0, element: 'phys', hitIndex: 0, hits: 1, vfx: 'impact-hit', label: 'Attack' });
        }
        const gain = f.guest ? 0 : 3;
        f.ki = Math.min(f.maxKi, f.ki + gain);
        break;
      }
      case 'defend': {
        f.defending = true;
        f.ki = Math.min(f.maxKi, f.ki + 8);
        this.emit({ t: 'clip', uid: f.uid, clip: 'guard', vfx: 'barrier', sfx: 'charge' });
        this.emit({ t: 'ki', uid: f.uid, amount: 8 });
        f.rageStreakDefend++;
        if (f.rageStreakDefend === 1) this.gainRage(f, RAGE.DEFEND_GAIN, 'defend');
        this.log(`${f.name} defends (damage x${DEFEND_MULT}, +8 Ki).`);
        return;
      }
      case 'skill': {
        const sk = getSkill(a.skillId)!;
        yield* this.useSkill(f, sk, a.targetUid);
        break;
      }
      case 'item': {
        this.useItem(f, a.itemId, this.get(a.targetUid)!);
        break;
      }
      case 'flee': {
        const mySpd = this.heroes().filter((h) => h.alive).reduce((s, h) => s + effSpd(h), 0) / Math.max(1, this.heroes().filter((h) => h.alive).length);
        const foeSpd = this.livingEnemies().reduce((s, h) => s + effSpd(h), 0) / Math.max(1, this.livingEnemies().length);
        const chance = Math.max(0.4, Math.min(0.95, 0.65 + (mySpd - foeSpd) / 80));
        if (this.rng.next() < chance) {
          this.finish('fled', 'fled');
          return;
        }
        this.log(`${f.name} could not get away!`);
        break;
      }
      case 'rage': {
        const art = RAGE_ARTS[f.defId as HeroId];
        f.rage = 0;
        this.stats.rageArts++;
        this.emit({ t: 'rage', uid: f.uid, amount: -100, why: art.name });
        this.emit({ t: 'announce', uid: f.uid, text: art.name });
        yield* this.useSkill(f, art, a.targetUid, { free: true });
        break;
      }
      case 'sparking': {
        f.rage -= SPARKING_COST;
        f.sparkingTurns = SPARKING_TURNS + 1;
        this.emit({ t: 'rage', uid: f.uid, amount: -SPARKING_COST, why: 'Sparking' });
        this.emit({ t: 'status', uid: f.uid, kind: 'sparking', on: true });
        this.emit({ t: 'clip', uid: f.uid, clip: 'buff', vfx: 'aura-sparking', sfx: 'sparking' });
        this.emit({ t: 'announce', uid: f.uid, text: 'SPARKING!' });
        this.log(`${f.name} goes Sparking for ${SPARKING_TURNS} turns: ATK x1.25, Ki costs halved, damage taken x0.9.`);
        return;
      }
      case 'form': {
        if (a.form === 'base') {
          f.form = 'base';
          this.log(`${f.name} powers down.`);
        } else {
          f.ki -= FORMS[a.form].entryKi;
          f.form = a.form;
          this.log(`${f.name} transforms: ${FORMS[a.form].name}!`);
          this.emit({ t: 'announce', uid: f.uid, text: FORMS[a.form].name });
        }
        this.refreshActor(f);
        this.snap(f);
        this.emit({ t: 'form', uid: f.uid, form: f.form });
        this.emit({ t: 'clip', uid: f.uid, clip: 'buff', vfx: `aura-${a.form === 'base' ? 'base' : a.form}`, sfx: 'transform' });
        return;
      }
      case 'combo': {
        yield* this.doCombo(f, COMBOS.find((c) => c.id === a.comboId)!, a.targetUid);
        break;
      }
      case 'finisher': {
        this.emit({ t: 'announce', uid: f.uid, text: 'FATHER–SON KAMEHAMEHA!' });
        this.emit({ t: 'clip', uid: f.uid, clip: 'special', vfx: 'father-son', sfx: 'beam' });
        for (const e of this.livingEnemies()) {
          this.emit({ t: 'hit', attacker: f.uid, target: e.uid, dmg: e.hp, crit: true, hitIndex: 0, hits: 1, element: 'ki', guard: 'none', vfx: 'father-son' });
          this.applyDamage(e, e.hp, f);
        }
        this.log('Gohan commits everything — the Father–Son Kamehameha overwhelms Cell!');
        break;
      }
    }
  }

  private *doCombo(f: Fighter, c: ComboDef, targetUid?: string): Gen {
    const members = c.members.map((m) => this.get(`h:${m}`)!);
    for (const m of members) {
      m.ki -= kiCost(m, c.kiCost);
      if (m.uid !== f.uid) this.queue = this.queue.filter((q) => q.uid !== m.uid);
      m.actedThisRound = true;
    }
    this.emit({ t: 'announce', uid: f.uid, text: c.name });
    this.emit({ t: 'clip', uid: f.uid, clip: 'special', vfx: c.vfx, sfx: 'hit-crit', targetUid: targetUid ?? this.opponents(f)[0]?.uid });
    this.log(`${members.map((m) => m.name).join(' & ')} unite: ${c.name}!`);
    const atk = members.reduce((s, m) => s + effAtk(m), 0) / members.length;
    const targets = c.target === 'allEnemies' ? this.opponents(f) : [this.get(targetUid!)!];
    const hitTargets: Fighter[] = [];
    for (let i = 0; i < c.hits.length; i++) {
      for (const t of targets) {
        if (!t.alive) continue;
        const r = yield* this.hit(f, t, { mult: c.hits[i], element: c.element, hitIndex: i, hits: c.hits.length, vfx: c.vfx, label: c.name, atkOverride: atk * (1 + 0.05 * (members.length - 1)), pierce: c.id === 'double_saiyan_blast' ? 0.3 : 0 });
        if (r.landed) hitTargets.push(t);
      }
    }
    const tgts = c.hits.length ? [...new Set(hitTargets)] : targets;
    for (const ap of c.apply ?? []) {
      if (c.id === 'mentors_guard') {
        for (const m of this.livingAllies(f)) {
          this.applyStatus(m, ap, f);
          this.applyStatus(m, { kind: 'barrier', turns: 4, power: 50 }, f);
        }
      } else {
        for (const t of tgts) if (t.alive) this.applyStatus(t, ap, f);
      }
    }
    for (const m of members) this.gainRage(m, 6, 'combo');
  }

  private useItem(f: Fighter, itemId: string, t: Fighter) {
    const it = ITEMS[itemId];
    this.inventory[itemId] = (this.inventory[itemId] ?? 0) - 1;
    this.itemsUsed[itemId] = (this.itemsUsed[itemId] ?? 0) + 1;
    this.stats.itemsUsed++;
    this.emit({ t: 'clip', uid: f.uid, clip: 'heal', vfx: 'regen', sfx: 'item' });
    if (it.revivePct && !t.alive) {
      t.alive = true;
      t.hp = Math.max(1, Math.round(t.maxHp * it.revivePct));
      this.emit({ t: 'revive', uid: t.uid });
      this.log(`${f.name} revives ${t.name} with ${it.name}.`);
      return;
    }
    let healed = 0;
    if (it.healPct) healed += Math.round(t.maxHp * it.healPct);
    if (it.heal) healed += it.heal;
    if (healed) {
      const real = Math.min(t.maxHp - t.hp, healed);
      t.hp += real;
      this.emit({ t: 'heal', uid: t.uid, amount: real });
    }
    let ki = 0;
    if (it.ki) ki += it.ki;
    if (it.kiPct) ki += Math.round(t.maxKi * it.kiPct);
    if (ki) {
      const real = Math.min(t.maxKi - t.ki, ki);
      t.ki += real;
      this.emit({ t: 'ki', uid: t.uid, amount: real });
    }
    for (const k of it.cure ?? []) this.removeStatus(t, k);
    if (it.buff) this.applyStatus(t, it.buff, f);
    this.log(`${f.name} uses ${it.name} on ${t.name}.`);
  }

  /* ------------------------------------------------------------------ skills */
  private *useSkill(f: Fighter, sk: SkillDef, targetUid?: string, opts: { free?: boolean; fromCharge?: boolean } = {}): Gen {
    if (!opts.fromCharge && !opts.free) {
      const cost = kiCost(f, sk.ki);
      f.ki -= cost;
      if (sk.hpCost) f.hp = Math.max(1, f.hp - Math.round(f.maxHp * sk.hpCost));
      if (sk.rageCost) f.rage -= sk.rageCost;
      f.used[sk.id] = (f.used[sk.id] ?? 0) + 1;
    }
    if (sk.chargeTurns && !opts.fromCharge && !opts.free) {
      f.charging = { skillId: sk.id, targetUid, turnsLeft: sk.chargeTurns };
      this.emit({ t: 'clip', uid: f.uid, clip: 'charge', vfx: 'charge', sfx: 'charge' });
      this.emit({ t: 'announce', uid: f.uid, text: `${sk.name}...` });
      this.log(`${f.name} gathers energy for ${sk.name}.`);
      return;
    }
    this.emit({ t: 'announce', uid: f.uid, text: sk.name });
    this.emit({ t: 'clip', uid: f.uid, clip: sk.clip, vfx: sk.vfx, sfx: sk.sfx, skillId: sk.id, targetUid: sk.target === 'enemy' ? (targetUid && this.get(targetUid)?.alive && this.get(targetUid)?.team !== f.team ? targetUid : this.opponents(f)[0]?.uid) : sk.target === 'ally' || sk.target === 'anyAlly' ? targetUid : undefined });
    const kind = sk.kind;
    let primary: Fighter[] = [];
    switch (sk.target) {
      case 'enemy': {
        let t = targetUid ? this.get(targetUid) : undefined;
        if (!t || !t.alive || t.team === f.team) t = this.opponents(f)[0];
        if (t) primary = [t];
        break;
      }
      case 'allEnemies': primary = this.opponents(f); break;
      case 'randomEnemies': primary = []; break;
      case 'ally': case 'anyAlly': {
        const t = targetUid ? this.get(targetUid) : undefined;
        primary = t ? [t] : [f];
        break;
      }
      case 'allAllies': primary = this.fighters.filter((x) => x.team === f.team && x.alive && !x.isProtectee); break;
      case 'self': primary = [f]; break;
    }

    if (kind === 'attack' || kind === 'special') {
      const landed = new Set<Fighter>();
      const dealt: number[] = [];
      let anyCrit = false;
      const mode = sk.target;
      for (let i = 0; i < sk.hits.length; i++) {
        let targets: Fighter[] = primary;
        if (mode === 'randomEnemies') {
          const o = this.opponents(f);
          if (!o.length) break;
          targets = [this.rng.pick(o)];
        } else if (mode === 'enemy') {
          if (!primary[0].alive) {
            if (sk.hits.length > 1 && primary[0].team !== f.team) break;
          }
        }
        for (const t of targets) {
          if (!t.alive) continue;
          let mult = sk.hits[i];
          if (sk.tags?.includes('missingHpScale')) mult = sk.hits[0] + 2.0 * (1 - f.hp / f.maxHp);
          if (sk.tags?.includes('missingHpScale2')) mult = sk.hits[0] + 3.0 * (1 - f.hp / f.maxHp);
          let forceCrit = !!sk.tags?.includes('guaranteedCrit');
          if (sk.tags?.includes('critVsDisabled') && (hasStatus(t, 'blind') || hasStatus(t, 'stun') || hasStatus(t, 'seal'))) forceCrit = true;
          let guardBroken = false;
          if (sk.tags?.includes('guardBreak') && (t.defending || hasStatus(t, 'heavyGuard') || hasStatus(t, 'barrier') || hasStatus(t, 'shielded'))) {
            mult *= 2;
            guardBroken = true;
            t.defending = false;
            this.removeStatus(t, 'heavyGuard');
            this.removeStatus(t, 'barrier');
            this.removeStatus(t, 'shielded');
            this.log(`${f.name} shatters ${t.name}'s guard!`);
          }
          const adapt = this.adaptMod(f, t, sk);
          const r: HitResult = yield* this.hit(f, t, {
            mult, element: sk.element, pierce: sk.pierce, acc: sk.acc, critBonus: sk.crit && sk.crit > 0 ? sk.crit : undefined, hitIndex: i, hits: sk.hits.length, vfx: sk.vfx, label: sk.name, skillId: sk.id,
            forceCrit, noCounter: !!sk.tags?.includes('noCounter'), damageMod: adapt,
          });
          if (sk.crit === -1 && r.crit) void r;
          if (r.landed) {
            landed.add(t);
            dealt.push(r.dmg);
            if (r.crit) anyCrit = true;
          }
          if (guardBroken && sk.tags?.includes('guardBreak') && r.landed && t.alive && this.rng.next() < 0.4) this.applyStatus(t, { kind: 'stun', turns: 1 }, f);
          if (this.phase === 'ended') return;
        }
      }
      for (const t of landed) {
        if (t.team !== f.team) this.noteAdapt(f, t, sk);
      }
      if (sk.splash && primary[0] && sk.target === 'enemy') {
        const first = sk.hits[0] ?? 1;
        for (const o of this.opponents(f)) {
          if (o === primary[0]) continue;
          yield* this.hit(f, o, { mult: first * sk.splash, element: sk.element, pierce: sk.pierce, hitIndex: 0, hits: 1, vfx: sk.vfx, label: `${sk.name} (splash)`, noCounter: true, noRedirect: true, skillId: sk.id });
        }
      }
      const total = dealt.reduce((a, b) => a + b, 0);
      if (sk.lifesteal && total > 0) this.healFighter(f, Math.round(total * sk.lifesteal));
      if (sk.tags?.includes('critRefund8') && anyCrit) this.restoreKi(f, 8);
      if (sk.tags?.includes('partyKi20')) for (const a of this.livingAllies(f)) this.restoreKi(a, 20);
      for (const ap of sk.apply ?? []) for (const t of landed) if (t.alive) this.applyStatus(t, ap, f);
      if (sk.rageGain) this.gainRage(f, sk.rageGain, sk.name);
    } else {
      // support / heal / debuff / stance
      for (const t of primary) {
        if (sk.healPct) {
          if (!t.alive && sk.revive) {
            t.alive = true;
            t.hp = Math.max(1, Math.round(t.maxHp * sk.revive));
            this.emit({ t: 'revive', uid: t.uid });
            this.log(`${f.name} revives ${t.name}!`);
          } else if (t.alive) {
            this.healFighter(t, Math.round(t.maxHp * sk.healPct));
          }
        }
        if (!t.alive) continue;
        if (sk.kiRestore) this.restoreKi(t, sk.kiRestore);
        if (sk.kiDrain) {
          const d = Math.min(t.ki, Math.round(sk.kiDrain * (1 - t.drainResist)));
          t.ki -= d;
          this.emit({ t: 'ki', uid: t.uid, amount: -d });
          this.log(`${t.name} loses ${d} Ki.`);
        }
        for (const ap of sk.apply ?? []) {
          const ap2 = sk.tags?.includes('barrierScale') && ap.kind === 'barrier' ? { ...ap, power: ap.power! + f.level * 4 } : ap;
          this.applyStatus(t, ap2, f);
        }
        if (sk.tags?.includes('cleanse') || sk.id === 'rage_piccolo') {
          for (const s of [...t.statuses]) if (NEGATIVE.has(s.kind)) this.removeStatus(t, s.kind);
        }
      }
      if (sk.tags?.includes('coverAlly') && primary[0]) {
        this.applyStatus(f, { kind: 'cover', turns: 3, power: 0.5 }, f, { source: primary[0].uid });
        this.log(`${f.name} covers ${primary[0].name}.`);
      }
      if (sk.tags?.includes('rage30')) this.gainRage(f, 30, sk.name);
      if (sk.kiRestore && sk.target === 'self') void 0;
    }
    for (const ap of sk.self ?? []) {
      const meta = sk.tags?.includes('counterAny') && ap.kind === 'counter' ? 'any' : undefined;
      this.applyStatus(f, ap, f, { meta });
    }
    if (sk.healPct && sk.target === 'self' && sk.kind !== 'heal') void 0;
    if (sk.rageGain && !(sk.kind === 'attack' || sk.kind === 'special')) this.gainRage(f, sk.rageGain, sk.name);
  }

  private adaptMod(att: Fighter, tgt: Fighter, sk: SkillDef): number {
    if (!att.isHero || !ENEMIES[tgt.defId]?.adapts) return 1;
    const n = tgt.adaptCount[`${att.uid}:${sk.id}`] ?? 0;
    return n >= 3 ? 0.75 : 1;
  }
  private noteAdapt(att: Fighter, tgt: Fighter, sk: SkillDef) {
    if (!att.isHero || !ENEMIES[tgt.defId]?.adapts) return;
    const key = `${att.uid}:${sk.id}`;
    const n = (tgt.adaptCount[key] ?? 0) + 1;
    tgt.adaptCount[key] = n;
    if (n === 3) this.log(`${tgt.name} has studied ${att.name}'s ${sk.name} — it will do less damage now. Vary your tactics!`);
  }

  /* ------------------------------------------------------------------ hit resolution */
  private findCover(att: Fighter, tgt: Fighter): { f: Fighter; power: number } | null {
    if (tgt.team === att.team) return null;
    for (const c of this.fighters) {
      if (c === tgt || c.team !== tgt.team || !c.alive || c.isProtectee) continue;
      if (hasStatus(c, 'stun')) continue;
      const s = c.statuses.find((x) => x.kind === 'cover' && (!x.source || x.source === tgt.uid));
      if (s) return { f: c, power: s.power };
    }
    return null;
  }

  private *hit(att: Fighter, tgt0: Fighter, spec: HitSpec): Gen<HitResult> {
    let tgt = tgt0;
    let cover = 0;
    if (!spec.noRedirect && !spec.isCounter) {
      const c = this.findCover(att, tgt);
      if (c) {
        this.log(`${c.f.name} takes the hit for ${tgt.name}!`);
        tgt = c.f;
        cover = c.power;
      }
    }
    const none: HitResult = { dmg: 0, landed: false, crit: false, target: tgt, killed: false };
    if (!tgt.alive) return none;
    const ignoresEvade = (spec.acc ?? 0) >= 90;
    const ev = getStatus(tgt, 'evade');
    if (ev && !ignoresEvade) {
      ev.power -= 1;
      if (ev.power <= 0) this.removeStatus(tgt, 'evade');
      this.emit({ t: 'miss', attacker: att.uid, target: tgt.uid, reason: 'evaded' });
      this.log(`${tgt.name} evades ${att.name}'s ${spec.label}.`);
      const cs = getStatus(tgt, 'counter');
      if (cs && cs.meta === 'any' && !spec.noCounter && !spec.isCounter && att.alive) {
        this.removeStatus(tgt, 'counter');
        yield* this.hit(tgt, att, { mult: cs.power, element: 'phys', hitIndex: 0, hits: 1, vfx: 'impact-hit', label: 'Counter', isCounter: true, noRedirect: true });
      }
      return none;
    }
    const acc = accuracyOf(att, spec.acc ?? 0);
    if (this.rng.next() > acc) {
      this.emit({ t: 'miss', attacker: att.uid, target: tgt.uid, reason: 'missed' });
      this.log(`${att.name}'s ${spec.label} misses ${tgt.name}.`);
      return none;
    }
    let grade: GuardGrade = 'none';
    if (tgt.isHero && att.team === 'enemy' && spec.guardable !== false && !spec.unguarded) {
      grade = yield { attackerUid: att.uid, targetUid: tgt.uid, hitIndex: spec.hitIndex, hits: spec.hits, label: spec.label, guardable: true };
      this.lastGrade = grade;
      if (grade === 'perfect') this.stats.guardsPerfect++;
      else if (grade === 'good') this.stats.guardsGood++;
      else this.stats.guardsMissed++;
    }
    const critChance = (att.isHero ? CRIT_CHANCE : 0.03) + (spec.critBonus ?? 0) + statusPower(att, 'critUp') + att.critMod;
    const crit = !!spec.forceCrit || this.rng.next() < critChance;
    let d = (spec.atkOverride ?? effAtk(att)) * spec.mult * mitigation(effDef(tgt) * (1 - (spec.pierce ?? 0)));
    if (crit) d *= CRIT_MULT;
    if (hasStatus(tgt, 'exposed')) d *= 1 + statusPower(tgt, 'exposed');
    if (hasStatus(tgt, 'shielded')) d *= 1 - statusPower(tgt, 'shielded');
    if (hasStatus(tgt, 'vulnerable')) d *= 1.25;
    const mark = getStatus(tgt, 'marked');
    if (mark && att.team !== tgt.team && att.isHero) {
      d *= 1 + mark.power;
      this.removeStatus(tgt, 'marked');
    }
    const hg = getStatus(tgt, 'heavyGuard');
    if (hg) d *= 1 - hg.power;
    if (tgt.defending) d *= DEFEND_MULT;
    if (cover) d *= 1 - cover;
    d *= GUARD_MULT[grade];
    if (tgt.isHero && tgt.sparkingTurns > 0) d *= 0.9;
    if (spec.damageMod) d *= spec.damageMod;
    if (tgt.isHero && att.team === 'enemy') d *= ENEMY_DMG * (this.difficulty === 'easy' ? EASY_ENEMY_DMG : 1);
    else if (this.difficulty === 'easy' && !tgt.isHero) d *= 1.1;
    d *= 0.92 + this.rng.next() * 0.16;
    // energy absorption: only while the 'absorbing' stance is up
    if (tgt.team === 'enemy' && spec.element === 'ki' && ENEMIES[tgt.defId]?.absorbs === 'ki' && hasStatus(tgt, 'absorbing')) {
      const heal = Math.max(1, Math.round(d * 0.6));
      const real = Math.min(tgt.maxHp - tgt.hp, heal);
      tgt.hp += real;
      this.emit({ t: 'hit', attacker: att.uid, target: tgt.uid, dmg: 0, crit: false, hitIndex: spec.hitIndex, hits: spec.hits, element: spec.element, guard: grade, vfx: spec.vfx, absorbed: true });
      this.emit({ t: 'heal', uid: tgt.uid, amount: real });
      this.log(`${tgt.name} absorbs the energy and recovers ${real} HP! Use physical attacks!`);
      return { dmg: 0, landed: true, crit: false, target: tgt, killed: false };
    }
    const dmg = Math.max(1, Math.round(d));
    const before = tgt.hp;
    this.emit({ t: 'hit', attacker: att.uid, target: tgt.uid, dmg, crit, hitIndex: spec.hitIndex, hits: spec.hits, element: spec.element, guard: grade, vfx: spec.vfx, countered: spec.isCounter });
    const real = this.applyDamage(tgt, dmg, att);
    if (tgt.isHero) {
      this.stats.hitsTaken++;
      this.stats.damageTaken += real;
    } else this.stats.damageDealt += real;
    // rage
    if (att.isHero && !att.guest) this.gainRage(att, rageDealt(att, spec.mult, crit, !!tgt.boss, att.rageMod), 'hit');
    if (tgt.isHero && !tgt.guest) this.gainRage(tgt, rageTaken({ defId: tgt.defId, hp: before, maxHp: tgt.maxHp }, real, spec.hits, grade, tgt.rageMod), grade === 'none' ? 'hit' : `${grade} guard`);
    if (grade !== 'none') this.emit({ t: 'log', text: `${grade === 'perfect' ? 'Perfect' : 'Good'} Guard! ${tgt.name} takes ${real}.` });
    const killed = !tgt.alive;
    // reflect (Ki only)
    const rf = getStatus(tgt, 'reflect');
    if (rf && spec.element === 'ki' && !spec.isCounter && att.alive && real > 0) {
      this.removeStatus(tgt, 'reflect');
      const back = Math.max(1, Math.round(real * rf.power));
      this.log(`${tgt.name} reflects ${back} damage back at ${att.name}!`);
      this.emit({ t: 'hit', attacker: tgt.uid, target: att.uid, dmg: back, crit: false, hitIndex: 0, hits: 1, element: 'ki', guard: 'none', vfx: 'barrier', countered: true });
      this.applyDamage(att, back, tgt);
    }
    // counter
    const cs = getStatus(tgt, 'counter');
    if (cs && !spec.noCounter && !spec.isCounter && att.alive && tgt.alive && real > 0 && (cs.meta === 'any' || spec.element === 'phys')) {
      this.removeStatus(tgt, 'counter');
      this.log(`${tgt.name} counters!`);
      yield* this.hit(tgt, att, { mult: cs.power, element: 'phys', hitIndex: 0, hits: 1, vfx: 'impact-hit', label: 'Counter', isCounter: true, noRedirect: true });
    }
    return { dmg: real, landed: true, crit, target: tgt, killed };
  }

  /** applies final damage with barrier/endure; returns hp actually lost */
  private applyDamage(t: Fighter, dmg: number, src?: Fighter): number {
    let d = dmg;
    const b = getStatus(t, 'barrier');
    if (b) {
      const ab = Math.min(b.power, d);
      b.power -= ab;
      d -= ab;
      if (b.power <= 0) this.removeStatus(t, 'barrier');
      if (ab > 0) this.log(`${t.name}'s barrier absorbs ${ab}.`);
    }
    if (d >= t.hp && hasStatus(t, 'endure')) {
      d = t.hp - 1;
      this.removeStatus(t, 'endure');
      this.log(`${t.name} endures the blow with 1 HP!`);
    }
    const real = Math.min(t.hp, d);
    t.hp -= real;
    if (src && src.team !== t.team) t.lastAttackerUid = src.uid;
    if (t.hp <= 0) this.ko(t);
    else if (t.team === 'enemy') this.checkPhase(t);
    this.snap(t);
    return real;
  }

  private ko(t: Fighter) {
    t.hp = 0;
    t.alive = false;
    t.statuses = [];
    t.charging = undefined;
    t.sparkingTurns = 0;
    this.stats.ko++;
    this.emit({ t: 'ko', uid: t.uid });
    this.log(`${t.name} is defeated.`);
    if (t.team === 'enemy') this.defeatedIds.push(t.defId);
    // anyone held by this fighter is released
    for (const f of this.fighters) {
      const lock = f.statuses.find((s) => s.kind === 'absorbLock' && s.source === t.uid);
      if (lock) this.removeStatus(f, 'absorbLock');
    }
  }

  private checkPhase(e: Fighter) {
    const def = ENEMIES[e.defId];
    const ph = def?.phases?.[e.phaseIdx];
    if (!def || !ph || e.hp / e.maxHp > ph.at) return;
    e.phaseIdx++;
    this.log(ph.text);
    this.emit({ t: 'phase', uid: e.uid, text: ph.text, becomes: ph.becomes });
    if (ph.becomes) {
      const nd = ENEMIES[ph.becomes];
      const s = scaleEnemy(nd, e.p);
      e.defId = ph.becomes;
      e.name = nd.name;
      e.actor = nd.actor;
      e.maxHp = s.maxHp;
      e.hp = Math.max(1, Math.round(s.maxHp * (ph.hpFrac ?? 1)));
      e.atk = s.atk;
      e.def = s.def;
      e.spd = s.spd;
      e.phaseIdx = 0;
      e.statuses = e.statuses.filter((s2) => !NEGATIVE.has(s2.kind));
      e.charging = undefined;
      e.cooldowns = {};
    }
  }

  /* ------------------------------------------------------------------ statuses */
  applyStatus(t: Fighter, ap: StatusApply, source?: Fighter, extra: { source?: string; meta?: string } = {}): boolean {
    if (!t.alive) return false;
    let chance = ap.chance ?? 1;
    if (t.team === 'enemy' && DEBUFFS.has(ap.kind) && source && source.team !== t.team) {
      const resist = ENEMIES[t.defId]?.statusResist ?? 0;
      chance *= 1 - resist;
      if (t.defId === 'cell-perfect' || t.defId === 'cell-super-perfect') {
        if (ap.kind === 'stun') chance *= 0.5;
      }
    }
    if (chance < 1 && this.rng.next() > chance) {
      this.log(`${t.name} resists ${ap.kind}.`);
      return false;
    }
    const existing = t.statuses.find((s) => s.kind === ap.kind && (ap.kind !== 'cover' || s.source === extra.source));
    const power = ap.power ?? (ap.kind === 'blind' ? 0.5 : 0);
    if (existing) {
      existing.turns = Math.max(existing.turns, ap.turns);
      if (ap.kind === 'barrier') existing.power += power;
      else if (ap.kind === 'evade') existing.power = Math.min(3, existing.power + power);
      else existing.power = Math.max(existing.power, power);
      if (extra.meta) existing.meta = extra.meta;
    } else {
      t.statuses.push({ kind: ap.kind, turns: ap.turns, power, source: extra.source ?? (ap.kind === 'mine' ? source?.uid : undefined), meta: extra.meta, fresh: this.current === t && !TICK_AT_START.has(ap.kind) && ap.kind !== 'absorbing' ? true : undefined });
      this.emit({ t: 'status', uid: t.uid, kind: ap.kind, on: true });
    }
    if (ap.kind === 'stun') t.charging = undefined;
    return true;
  }

  removeStatus(t: Fighter, k: StatusKind) {
    const i = t.statuses.findIndex((s) => s.kind === k);
    if (i < 0) return;
    t.statuses.splice(i, 1);
    this.emit({ t: 'status', uid: t.uid, kind: k, on: false });
  }

  private healFighter(t: Fighter, amount: number) {
    const real = Math.min(t.maxHp - t.hp, amount);
    if (real <= 0) return;
    t.hp += real;
    this.emit({ t: 'heal', uid: t.uid, amount: real });
    this.snap(t);
  }
  private restoreKi(t: Fighter, amount: number) {
    const real = Math.min(t.maxKi - t.ki, amount);
    if (real <= 0) return;
    t.ki += real;
    this.emit({ t: 'ki', uid: t.uid, amount: real });
    this.snap(t);
  }
  gainRage(f: Fighter, amount: number, why: string) {
    if (f.guest || !f.isHero || amount <= 0) return;
    const used = this.actionRageGain.get(f.uid) ?? 0;
    const a = Math.min(amount, RAGE.PER_ACTION_CAP - used);
    if (a <= 0) return;
    this.actionRageGain.set(f.uid, used + a);
    const before = f.rage;
    f.rage = Math.min(100, f.rage + a);
    const real = f.rage - before;
    if (real > 0) {
      this.emit({ t: 'rage', uid: f.uid, amount: real, why });
      this.snap(f);
    }
  }

  /* ------------------------------------------------------------------ enemy AI */
  private whenOk(f: Fighter, w?: string): boolean {
    if (!w) return true;
    const frac = f.hp / f.maxHp;
    if (w.startsWith('hp<')) return frac < parseFloat(w.slice(3));
    if (w.startsWith('hp>')) return frac > parseFloat(w.slice(3));
    if (w.startsWith('round>')) return this.round > parseInt(w.slice(6), 10);
    if (w === 'alone') return this.livingEnemies().length === 1;
    if (w === 'ally>1') return this.livingEnemies().length > 1;
    return true;
  }

  private pickMove(f: Fighter): EnemyMove | null {
    const def = ENEMIES[f.defId];
    const sealed = hasStatus(f, 'seal');
    let c = def.moves.filter((m) => (f.cooldowns[m.id] ?? 0) <= 0 && this.whenOk(f, m.when) && (m.weight ?? 1) > 0);
    if (sealed) c = c.filter((m) => !m.special && !m.charge && m.element === 'phys');
    // do not re-enter a stance that is still active
    c = c.filter((m) => !(m.special === 'counterStance' && hasStatus(f, 'counter')) && !(m.special === 'teleportStance' && hasStatus(f, 'evade')) && !(m.special === 'absorbEnergyStance' && hasStatus(f, 'absorbing')) && !(m.special === 'selfBarrier' && hasStatus(f, 'barrier')));
    // a grabbing enemy does not grab twice
    c = c.filter((m) => !(m.special === 'absorbGrab' && this.fighters.some((x) => x.statuses.some((s) => s.kind === 'absorbLock' && s.source === f.uid))));
    if (!c.length) c = def.moves.filter((m) => !m.special && !m.charge && (m.weight ?? 1) > 0);
    if (!c.length) return null;
    return this.rng.weighted(c, (m) => m.weight ?? 1);
  }

  private pickTargets(f: Fighter, m: EnemyMove): Fighter[] {
    const foes = this.fighters.filter((x) => x.team !== f.team && x.alive);
    if (!foes.length) return [];
    switch (m.target) {
      case 'all': return foes;
      case 'lowestHp': return [foes.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b))];
      case 'highestRage': return [foes.reduce((a, b) => (a.rage >= b.rage ? a : b))];
      case 'highestKi': return [foes.reduce((a, b) => (a.ki >= b.ki ? a : b))];
      case 'lastAttacker': {
        const l = f.lastAttackerUid ? this.get(f.lastAttackerUid) : undefined;
        return [l && l.alive ? l : this.rng.pick(foes)];
      }
      default: return [this.rng.weighted(foes, (x) => 1 + (1 - x.hp / x.maxHp) * 1.2 + (x.isProtectee ? 0.8 : 0))];
    }
  }

  private *autoTurn(f: Fighter): Gen {
    const ch = f.charging!;
    f.charging = undefined;
    if (f.isHero) {
      const sk = getSkill(ch.skillId)!;
      let t = ch.targetUid ? this.get(ch.targetUid) : undefined;
      if (sk.target === 'enemy' && (!t || !t.alive)) t = this.opponents(f)[0];
      this.log(`${f.name} unleashes ${sk.name}!`);
      yield* this.useSkill(f, sk, t?.uid, { fromCharge: true });
    } else {
      const def = ENEMIES[f.defId];
      const m = def.moves.find((x) => x.id === ch.skillId);
      if (m) yield* this.useMove(f, m, true);
    }
  }

  private *enemyTurn(f: Fighter): Gen {
    const m = this.pickMove(f);
    if (!m) return;
    yield* this.useMove(f, m, false);
  }

  private *useMove(f: Fighter, m: EnemyMove, fromCharge: boolean): Gen {
    if (!fromCharge && m.cooldown) f.cooldowns[m.id] = m.cooldown;
    if (m.charge && !fromCharge) {
      f.charging = { skillId: m.id, turnsLeft: m.charge };
      this.emit({ t: 'telegraph', uid: f.uid, text: m.telegraph ?? `${f.name} is charging ${m.name}!` });
      this.emit({ t: 'clip', uid: f.uid, clip: 'charge', vfx: 'charge', sfx: 'telegraph' });
      this.log(`${f.name}: ${m.telegraph ?? `charges ${m.name}`}`);
      return;
    }
    const targets = this.pickTargets(f, m);
    if (m.telegraph && !fromCharge) {
      this.emit({ t: 'telegraph', uid: f.uid, text: m.telegraph, targetUid: targets[0]?.uid });
      this.log(`${f.name} ${m.telegraph}`);
    }
    this.emit({ t: 'announce', uid: f.uid, text: m.name });
    this.emit({ t: 'clip', uid: f.uid, clip: m.element === 'ki' ? 'beam' : 'melee', vfx: m.vfx ?? (m.element === 'ki' ? 'beam-red' : 'impact-hit'), sfx: m.sfx ?? (m.element === 'ki' ? 'hit-energy' : 'hit-melee'), targetUid: targets[0]?.uid });
    switch (m.special) {
      case 'selfBarrier':
        this.applyStatus(f, { kind: 'barrier', turns: 3, power: Math.round(f.maxHp * 0.12) }, f);
        this.log(`${f.name} raises a barrier!`);
        return;
      case 'regen': {
        const a = Math.round(f.maxHp * 0.08);
        this.healFighter(f, a);
        this.log(`${f.name} regenerates ${a} HP.`);
        return;
      }
      case 'counterStance':
        this.applyStatus(f, { kind: 'counter', turns: 2, power: 1.15 }, f, { meta: 'any' });
        return;
      case 'teleportStance':
        this.applyStatus(f, { kind: 'evade', turns: 2, power: 3 }, f);
        this.applyStatus(f, { kind: 'counter', turns: 2, power: 1.1 }, f, { meta: 'any' });
        return;
      case 'absorbEnergyStance':
        this.applyStatus(f, { kind: 'absorbing', turns: 2, power: 1 }, f);
        return;
      default: break;
    }
    const bonus = (m.power ?? 1) * (this.difficulty === 'easy' ? 1 : 1);
    const hits = m.hits;
    const struck: Fighter[] = [];
    let total = 0;
    for (let i = 0; i < hits.length; i++) {
      let tgts = targets;
      if (m.target === 'random') {
        const foes = this.opponents(f);
        if (!foes.length) break;
        tgts = [this.rng.weighted(foes, (x) => 1 + (x.isProtectee ? 0.8 : 0))];
      } else {
        tgts = targets.filter((t) => t.alive);
        if (!tgts.length && (m.target === 'one' || m.target === 'lowestHp' || m.target === 'highestRage' || m.target === 'lastAttacker' || m.target === 'highestKi')) {
          const foes = this.opponents(f);
          if (!foes.length) break;
          tgts = [foes[0]];
        }
      }
      for (const t of tgts) {
        if (!t.alive) continue;
        const isGrab = m.special === 'absorbGrab';
        const r = yield* this.hit(f, t, { mult: hits[i] * bonus, element: m.element, pierce: m.pierce, hitIndex: i, hits: hits.length, vfx: m.vfx ?? (m.element === 'ki' ? 'ball-red' : 'impact-hit'), label: m.name });
        if (r.landed) {
          struck.push(r.target);
          total += r.dmg;
        }
        if (isGrab) {
          this.finishGrab(f, t, r);
          return;
        }
        if (this.phase === 'ended') return;
      }
    }
    for (const ap of m.apply ?? []) for (const t of new Set(struck)) if (t.alive) this.applyStatus(t, ap, f);
    if (m.special === 'drain' || m.special === 'kiDrain') {
      for (const t of new Set(struck)) {
        if (!t.isHero) continue;
        const d = Math.min(t.ki, Math.round(12 * (1 - t.drainResist)));
        t.ki -= d;
        this.emit({ t: 'ki', uid: t.uid, amount: -d });
        if (m.special === 'drain' && total > 0) this.healFighter(f, Math.round(total * 0.3));
        if (d > 0) this.log(`${t.name}'s Ki is drained (-${d}).`);
      }
    }
  }

  private finishGrab(f: Fighter, t: Fighter, r: HitResult): void {
    const last = this.lastGrade;
    if (!r.landed) return;
    if (last === 'perfect') {
      this.log(`Perfect guard! ${t.name} breaks the tail grip — ${f.name} is staggered!`);
      this.applyStatus(f, { kind: 'stun', turns: 1 }, t);
      return;
    }
    if (last === 'good') {
      this.log(`${t.name} avoids being gripped.`);
      return;
    }
    if (!t.alive) return;
    t.statuses.push({ kind: 'absorbLock', turns: 99, power: f.hp, source: f.uid });
    this.emit({ t: 'status', uid: t.uid, kind: 'absorbLock', on: true });
    this.emit({ t: 'announce', uid: t.uid, text: 'Held!' });
    this.log(`${f.name}'s tail clamps onto ${t.name}! Deal at least 6% of Cell's max HP — or stun it — before its next turn, or ${t.name} will be absorbed!`);
    return;
  }

  private resolveAbsorbLocks(f: Fighter) {
    for (const v of this.fighters) {
      const lock = v.statuses.find((s) => s.kind === 'absorbLock' && s.source === f.uid);
      if (!lock) continue;
      const lost = lock.power - f.hp;
      const stunned = hasStatus(f, 'stun');
      if (!f.alive) {
        this.removeStatus(v, 'absorbLock');
        continue;
      }
      const lastStanding = this.heroes().filter((h) => h.alive).length <= 1;
      if (stunned || lost >= f.maxHp * 0.06) {
        this.removeStatus(v, 'absorbLock');
        this.log(`${v.name} tears free of ${f.name}'s tail!`);
        this.emit({ t: 'announce', uid: v.uid, text: 'Broke free!' });
      } else if (v.alive && lastStanding) {
        // the last fighter is never absorbed outright: Cell drains 60% of their HP and lets go
        this.removeStatus(v, 'absorbLock');
        const drained = Math.round(v.maxHp * 0.6);
        this.log(`${f.name} drains ${v.name} (-${drained} HP) but cannot hold on!`);
        this.applyDamage(v, Math.min(drained, v.hp - 1), f);
        this.healFighter(f, Math.round(f.maxHp * 0.08));
      } else if (v.alive) {
        this.removeStatus(v, 'absorbLock');
        const heal = Math.round(f.maxHp * 0.15);
        this.log(`${f.name} absorbs ${v.name}! ${f.name} recovers ${heal} HP.`);
        this.emit({ t: 'clip', uid: f.uid, clip: 'special', vfx: 'absorb', sfx: 'absorb' });
        this.healFighter(f, heal);
        this.ko(v);
      }
    }
  }

  /** compact state description for sims */
  summary(): string {
    return this.fighters.map((f) => `${f.name}:${f.hp}/${f.maxHp}${f.alive ? '' : '†'}`).join(' ');
  }

  heroResults() {
    return this.heroes().map((f) => ({ id: f.defId, hp: f.hp, ki: f.ki, rage: f.rage, alive: f.alive }));
  }
}

export { HEROES };
