import type { MusicKey, NoteEvent, TrackDef } from './types';

export const MAX_SFX_VOICES = 14;
export const MIN_SAME_SFX_GAP_MS = 35;

/** Pure voice limiter: caps concurrent voices and rate-limits identical effects. */
export class VoiceLimiter {
  private active: number[] = [];
  private last = new Map<string, number>();
  constructor(public readonly maxVoices = MAX_SFX_VOICES, public readonly minGapMs = MIN_SAME_SFX_GAP_MS) {}
  tryAcquire(key: string, nowMs: number, durMs: number): boolean {
    this.active = this.active.filter((end) => end > nowMs);
    const prev = this.last.get(key);
    if (prev !== undefined && nowMs - prev < this.minGapMs) return false;
    if (this.active.length >= this.maxVoices) return false;
    this.last.set(key, nowMs);
    this.active.push(nowMs + Math.max(0, durMs));
    return true;
  }
  activeCount(nowMs: number): number { return this.active.filter((end) => end > nowMs).length; }
  reset() { this.active = []; this.last.clear(); }
}

export interface MusicState { current: MusicKey | null; fadingOut: MusicKey[] }
export type MusicPlan =
  | { action: 'noop'; state: MusicState }
  | { action: 'switch'; state: MusicState; fadeOut: MusicKey | null; start: MusicKey }
  | { action: 'stop'; state: MusicState; fadeOut: MusicKey | null };

export const initialMusicState = (): MusicState => ({ current: null, fadingOut: [] });

/** Pure crossfade state machine: only one track is ever "current"; same-key requests are no-ops. */
export function planMusic(state: MusicState, request: MusicKey | null): MusicPlan {
  if (request === state.current) return { action: 'noop', state };
  const fadeOut = state.current;
  const fadingOut = fadeOut ? [...state.fadingOut, fadeOut] : state.fadingOut;
  if (request === null) return { action: 'stop', fadeOut, state: { current: null, fadingOut } };
  return { action: 'switch', fadeOut, start: request, state: { current: request, fadingOut } };
}
export function finishFade(state: MusicState, key: MusicKey): MusicState {
  const i = state.fadingOut.indexOf(key);
  if (i < 0) return state;
  const fadingOut = state.fadingOut.slice();
  fadingOut.splice(i, 1);
  return { ...state, fadingOut };
}

export interface SeqCursor { loop: number; index: number }
/** Returns events whose absolute time (loopStart + loop*seconds + t) lies in [.., until). Pure; advances cursor. */
export function collectDue(track: TrackDef, cursor: SeqCursor, loopStart: number, until: number): { at: number; ev: NoteEvent }[] {
  const out: { at: number; ev: NoteEvent }[] = [];
  for (;;) {
    if (cursor.index >= track.events.length) {
      if (!track.loop) { cursor.loop = Number.POSITIVE_INFINITY; return out; }
      cursor.loop += 1; cursor.index = 0;
    }
    const ev = track.events[cursor.index];
    const at = loopStart + cursor.loop * track.seconds + ev.t;
    if (at >= until) return out;
    out.push({ at, ev });
    cursor.index += 1;
  }
}
