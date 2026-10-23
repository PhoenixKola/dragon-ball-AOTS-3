import type { GuardGrade } from '../../types';

export interface GuardSettings {
  perfectMs: number; // +/- window around impact
  goodMs: number;
  cooldownMs: number; // presses ignored for this long after a press (anti-mash)
}
export const GUARD_PRESETS: Record<'standard' | 'relaxed' | 'assist', GuardSettings> = {
  standard: { perfectMs: 85, goodMs: 210, cooldownMs: 320 },
  relaxed: { perfectMs: 130, goodMs: 300, cooldownMs: 260 },
  assist: { perfectMs: 190, goodMs: 420, cooldownMs: 200 },
};

interface Press {
  t: number;
  used: boolean;
}

/**
 * Per-defender timed guard. The clock is the caller's own accumulated battle time (not wall time),
 * so pausing freezes windows and tests can drive it with fake time.
 */
export class GuardTracker {
  private presses = new Map<string, Press[]>();
  private lastPress = new Map<string, number>();
  constructor(public settings: GuardSettings = GUARD_PRESETS.standard) {}

  /** the cue stays open this long after the impact so late presses can still count */
  get lateMs() {
    return Math.round(this.settings.goodMs * 0.6);
  }

  press(uid: string, now: number): boolean {
    const last = this.lastPress.get(uid);
    if (last !== undefined && now - last < this.settings.cooldownMs) return false;
    this.lastPress.set(uid, now);
    const list = this.presses.get(uid) ?? [];
    list.push({ t: now, used: false });
    this.presses.set(uid, list);
    return true;
  }

  /** Grade the press nearest the impact for this defender and consume it. Presses far outside the window are ignored. */
  grade(uid: string, impactAt: number): GuardGrade {
    const list = this.presses.get(uid) ?? [];
    let best: Press | null = null;
    for (const p of list) {
      if (p.used) continue;
      if (!best || Math.abs(p.t - impactAt) < Math.abs(best.t - impactAt)) best = p;
    }
    if (!best) return 'none';
    const d = Math.abs(best.t - impactAt);
    if (d > this.settings.goodMs) return 'none';
    best.used = true;
    return d <= this.settings.perfectMs ? 'perfect' : 'good';
  }

  clear(uid?: string) {
    if (uid) {
      this.presses.delete(uid);
      this.lastPress.delete(uid);
    } else {
      this.presses.clear();
      this.lastPress.clear();
    }
  }
}

export const widen = (s: GuardSettings, factor: number): GuardSettings => ({
  perfectMs: Math.round(s.perfectMs * (1 + factor)),
  goodMs: Math.round(s.goodMs * (1 + factor)),
  cooldownMs: s.cooldownMs,
});
