import type { BattleView, FighterView, GuardCue, Settings } from '../../app/store';
import type { BattleAction, BattleEvent, ClipId, Fighter, FormId, GuardGrade, StatusKind } from '../../types';
import { buildCommands } from './commands';
import { Battle } from './engine';
import { GUARD_PRESETS, GuardTracker, widen, type GuardSettings } from './guard';

/** Time source owned by the presentation layer (scene clock). Pausing freezes it; tests drive it manually. */
export interface Clock {
  now(): number;
  wait(ms: number): Promise<void>;
}

/** Visual side of a battle. Implemented by the Phaser BattleScene (and by a recording fake in tests). */
export interface BattleStage {
  setup(fighters: FighterView[]): Promise<void>;
  clip(uid: string, clip: ClipId, vfx: string, sfx: string, targetUid?: string): Promise<void>;
  /** attacker starts moving toward the target; contact happens `ms` later */
  approach(attackerUid: string, targetUid: string, ms: number, label: string): void;
  hit(e: Extract<BattleEvent, { t: 'hit' }>): Promise<void>;
  miss(attacker: string, target: string, reason: string): Promise<void>;
  heal(uid: string, amount: number): Promise<void>;
  ki(uid: string, amount: number): Promise<void>;
  ko(uid: string): Promise<void>;
  revive(uid: string): Promise<void>;
  status(uid: string, kind: StatusKind, on: boolean): void;
  form(uid: string, form: FormId, actor: string): Promise<void>;
  phase(uid: string, text: string, actor?: string): Promise<void>;
  banner(text: string): Promise<void>;
  telegraph(uid: string, text: string, targetUid?: string): Promise<void>;
  guardCue(cue: GuardCue | null): void;
  guardResult(uid: string, grade: GuardGrade): void;
  rage(uid: string, amount: number): void;
  turn(uid: string | null): void;
  end(outcome: 'victory' | 'defeat' | 'fled'): Promise<void>;
  setFast(skip: boolean): void;
}

export interface DirectorHost {
  setView(v: BattleView): void;
  settings(): Settings;
  /** resolves with the player's next command (already routed by the UI) */
  nextAction(): Promise<BattleAction>;
  tutorial(id: string, text: string): Promise<void>;
  /** report a rejected command back to the player */
  rejected(reason: string): void;
}

export const LEAD_MS = 760;

function toView(f: Fighter): FighterView {
  return {
    uid: f.uid, team: f.team, defId: f.defId, name: f.name, actor: f.actor, hp: f.hp, maxHp: f.maxHp, ki: f.ki, maxKi: f.maxKi, rage: Math.floor(f.rage), level: f.level, form: f.form,
    statuses: f.statuses.map((s) => ({ kind: s.kind, turns: s.turns, power: s.power })), alive: f.alive, sparking: f.sparkingTurns, charging: !!f.charging, isHero: f.isHero,
    boss: !!f.boss, guest: !!f.guest, isProtectee: !!f.isProtectee,
  };
}

export class BattleDirector {
  private fighters = new Map<string, FighterView>();
  private log: string[] = [];
  private view: BattleView;
  private tracker: GuardTracker;
  private cueSeq = 1;
  private currentCue: GuardCue | null = null;
  private skipAnim = false;
  paused = false;
  /** number of Active Guard cues shown (for tutorials) */
  private firstGuardShown = false;
  private readyTold = new Set<string>();
  private turnOrder: string[] = [];

  constructor(
    public battle: Battle, private stage: BattleStage, private clock: Clock, private host: DirectorHost, private kind: BattleView['kind'], private tutorialsSeen: Set<string>,
  ) {
    this.tracker = new GuardTracker(this.guardSettings());
    this.view = {
      stageId: battle.stage.id, stageName: battle.stage.name, kind, hint: battle.stage.hint, mode: battle.stage.mode, round: 0, roundsGoal: battle.stage.rounds, fighters: [], phase: 'anim',
      currentUid: null, turnOrder: [], log: [], guard: null, commands: null, paused: false, banner: null, tutorial: null, battleClock: 0, outcome: null,
    };
  }

  private guardSettings(): GuardSettings {
    const base = GUARD_PRESETS[this.host.settings().guardMode];
    return this.battle.guardAssist > 0 ? widen(base, this.battle.guardAssist) : base;
  }

  private speed(): number {
    return this.host.settings().battleSpeed;
  }
  private async wait(ms: number) {
    if (this.skipAnim || ms <= 0) return;
    await this.clock.wait(ms / this.speed());
  }

  skip(on = true) {
    this.skipAnim = on;
    this.stage.setFast(on);
  }

  pushView(patch: Partial<BattleView> = {}) {
    this.view = { ...this.view, ...patch, fighters: [...this.fighters.values()], log: this.log.slice(-60), turnOrder: this.turnOrder, battleClock: this.clock.now(), paused: this.paused, round: this.battle.round };
    this.host.setView(this.view);
  }

  /** the UI pressed the guard key/button of hero slot n (1..3) */
  guardPress(slot: number) {
    const cue = this.currentCue;
    if (!cue || this.paused) return;
    const mode = this.host.settings().guardMode;
    // assist mode: any slot guards the targeted fighter; otherwise only the targeted hero's own key counts
    if (mode !== 'assist' && slot !== cue.slot) return;
    this.tracker.press(cue.targetUid, this.clock.now());
  }

  async run(): Promise<void> {
    const b = this.battle;
    for (const f of b.fighters) this.fighters.set(f.uid, toView(f));
    this.turnOrder = [];
    await this.stage.setup([...this.fighters.values()]);
    this.pushView({ phase: 'anim' });
    b.start();
    for (let guard = 0; guard < 100000; guard++) {
      await this.play(b.drainEvents());
      if (b.ended) break;
      if (b.phase === 'guard' && b.pending) {
        await this.guardWindow();
        continue;
      }
      if (b.phase === 'input') {
        await this.playerTurn();
        continue;
      }
      throw new Error(`director stuck in phase ${b.phase}`);
    }
    await this.play(b.drainEvents());
    const outcome = b.outcome!;
    this.pushView({ phase: 'ended', outcome, commands: null, guard: null });
    await this.stage.end(outcome.outcome);
  }

  private async playerTurn() {
    const b = this.battle;
    const f = b.current!;
    await this.maybeTutorials(f);
    this.stage.turn(f.uid);
    for (;;) {
      this.pushView({ phase: 'input', currentUid: f.uid, commands: buildCommands(b), banner: null });
      const action = await this.host.nextAction();
      const res = b.submit(action);
      if (res.ok) break;
      this.host.rejected(res.reason ?? 'That cannot be done.');
    }
    this.stage.turn(null);
    this.pushView({ phase: 'anim', commands: null, currentUid: null });
  }

  private async maybeTutorials(f: Fighter) {
    if (!this.host.settings().showTutorials) return;
    const t = async (id: string, text: string) => {
      if (this.tutorialsSeen.has(id)) return;
      this.tutorialsSeen.add(id);
      this.pushView({ phase: 'input', tutorial: text, commands: null });
      await this.host.tutorial(id, text);
      this.pushView({ tutorial: null });
    };
    if (f.rage >= 60 && !f.guest && f.sparkingTurns === 0) await t('tut:sparking', 'Sparking: at 60 Rage you can go Sparking for 3 turns (ATK x1.25, Ki costs halved, 10% less damage taken). A full 100 Rage unlocks your Rage Art instead — a once-per-meter finisher.');
    if (f.rage >= 100 && !f.guest) await t('tut:rage', 'Your Rage meter is full! Choose "Rage Art" for a powerful signature attack. It uses the whole meter.');
    if (this.stage_isFormHero(f)) await t('tut:form', 'You can transform! Forms boost your stats but drain Ki every turn and end when Ki runs out. Each hero has independent forms.');
  }
  private stage_isFormHero(f: Fighter): boolean {
    if (f.guest) return false;
    const c = buildCommands(this.battle);
    return !!c && c.forms.some((x) => x.ok && x.form !== 'base');
  }

  /* ------------------------------------------------------------------ guard window */
  private async guardWindow() {
    const b = this.battle;
    const p = b.pending!;
    const target = this.fighters.get(p.targetUid)!;
    const heroes = b.heroes();
    const slot = Math.max(1, heroes.findIndex((h) => h.uid === p.targetUid) + 1);
    if (!this.tutorialsSeen.has('tut:guard') && this.host.settings().showTutorials) {
      this.tutorialsSeen.add('tut:guard');
      this.pushView({ phase: 'guard', tutorial: 'Active Guard: when an enemy attack is about to land on a fighter, press that fighter\'s number key (1/2/3 — or X/Y/RB on a gamepad, or the on-screen button) just as the ring closes. Good = half damage, Perfect = almost none. It also builds Rage!' });
      await this.host.tutorial('tut:guard', '');
      this.pushView({ tutorial: null });
    }
    const speed = this.speed();
    const lead = this.skipAnim ? 520 : Math.round(LEAD_MS / speed) + 120;
    const openAt = this.clock.now();
    const impactAt = openAt + lead;
    const closeAt = impactAt + this.tracker.lateMs;
    const cue: GuardCue = { id: this.cueSeq++, targetUid: p.targetUid, attackerUid: p.attackerUid, label: p.label, openAt, impactAt, closeAt, slot, hitIndex: p.hitIndex, hits: p.hits };
    this.currentCue = cue;
    this.tracker.clear(p.targetUid);
    this.pushView({ phase: 'guard', guard: cue, commands: null });
    this.stage.guardCue(cue);
    this.stage.approach(p.attackerUid, p.targetUid, lead, p.label);
    // wait until the cue closes, on the pausable battle clock (never on setTimeout cascades)
    while (this.clock.now() < closeAt) {
      await this.clock.wait(16);
      this.pushView({});
    }
    const grade = this.tracker.grade(p.targetUid, impactAt);
    this.currentCue = null;
    this.stage.guardCue(null);
    this.stage.guardResult(p.targetUid, grade);
    this.pushView({ phase: 'anim', guard: null });
    void target;
    b.provideGuard(grade);
  }

  /* ------------------------------------------------------------------ event playback */
  private async play(events: BattleEvent[]) {
    for (const e of events) await this.playOne(e);
  }

  private upd(uid: string, fn: (f: FighterView) => void) {
    const f = this.fighters.get(uid);
    if (f) fn(f);
  }

  private async playOne(e: BattleEvent): Promise<void> {
    switch (e.t) {
      case 'log':
        this.log.push(e.text);
        this.pushView();
        return;
      case 'round':
        this.pushView();
        return;
      case 'turn': {
        this.turnOrder = [];
        this.pushView();
        return;
      }
      case 'announce':
        this.pushView({ banner: e.text });
        await this.stage.banner(e.text);
        await this.wait(120);
        this.pushView({ banner: null });
        return;
      case 'telegraph':
        this.pushView({ banner: e.text });
        await this.stage.telegraph(e.uid, e.text, e.targetUid);
        await this.wait(260);
        this.pushView({ banner: null });
        return;
      case 'clip':
        await this.stage.clip(e.uid, e.clip, e.vfx, e.sfx, e.targetUid);
        return;
      case 'hit':
        await this.stage.hit(e);
        await this.wait(e.hits > 1 ? 90 : 160);
        return;
      case 'miss':
        await this.stage.miss(e.attacker, e.target, e.reason);
        await this.wait(200);
        return;
      case 'heal':
        await this.stage.heal(e.uid, e.amount);
        return;
      case 'ki':
        await this.stage.ki(e.uid, e.amount);
        return;
      case 'rage':
        this.stage.rage(e.uid, e.amount);
        return;
      case 'status':
        this.upd(e.uid, (f) => {
          if (e.on) {
            if (!f.statuses.some((s) => s.kind === e.kind)) f.statuses = [...f.statuses, { kind: e.kind, turns: 1, power: 0 }];
          } else f.statuses = f.statuses.filter((s) => s.kind !== e.kind);
        });
        this.stage.status(e.uid, e.kind, e.on);
        this.pushView();
        return;
      case 'ko':
        this.upd(e.uid, (f) => {
          f.alive = false;
          f.hp = 0;
          f.statuses = [];
        });
        await this.stage.ko(e.uid);
        this.pushView();
        return;
      case 'revive':
        this.upd(e.uid, (f) => (f.alive = true));
        await this.stage.revive(e.uid);
        return;
      case 'form':
        this.upd(e.uid, (f) => (f.form = e.form));
        this.pushView();
        return;
      case 'phase':
        this.pushView({ banner: e.text });
        await this.stage.phase(e.uid, e.text, e.becomes);
        await this.wait(500);
        this.pushView({ banner: null });
        return;
      case 'snap': {
        const prev = this.fighters.get(e.uid);
        const statuses = this.battle.get(e.uid)?.statuses.map((s) => ({ kind: s.kind, turns: s.turns, power: s.power })) ?? prev?.statuses ?? [];
        if (prev) {
          const formChanged = prev.form !== e.form || prev.actor !== e.actor;
          Object.assign(prev, { hp: e.hp, maxHp: e.maxHp, ki: e.ki, maxKi: e.maxKi, rage: e.rage, alive: e.alive, form: e.form, actor: e.actor, name: e.name, sparking: e.sparking, charging: e.charging, statuses });
          if (formChanged) await this.stage.form(e.uid, e.form, e.actor);
        }
        this.pushView();
        return;
      }
      case 'end':
        return;
    }
  }
}
