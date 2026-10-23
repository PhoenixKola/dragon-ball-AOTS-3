import { describe, expect, it } from 'vitest';
import {
  audio, buildTrack, collectDue, finishFade, initialMusicState, MUSIC_KEYS, planMusic, SFX_DEFS, SFX_KEYS, sfxDuration, VoiceLimiter,
  MAX_SFX_VOICES,
} from '../../src/engine/audio';

describe('audio definitions', () => {
  it('has a track for every music key with sane data', () => {
    expect(MUSIC_KEYS.length).toBe(22);
    for (const key of MUSIC_KEYS) {
      const t = buildTrack(key);
      expect(t.key).toBe(key);
      expect(t.bars).toBeGreaterThanOrEqual(4);
      expect(t.seconds).toBeGreaterThan(3);
      expect(t.events.length).toBeGreaterThan(20);
      expect(t.mood.length).toBeGreaterThan(5);
      const voices = new Set(t.events.map((e) => e.v));
      expect(voices.has('bass') || voices.has('pad')).toBe(true);
      for (const e of t.events) {
        expect(Number.isFinite(e.t) && Number.isFinite(e.d) && Number.isFinite(e.f) && Number.isFinite(e.g)).toBe(true);
        expect(e.t).toBeGreaterThanOrEqual(0);
        expect(e.t).toBeLessThan(t.seconds);
        expect(e.d).toBeGreaterThan(0);
        expect(e.t + e.d).toBeLessThanOrEqual(t.seconds + 1e-6);
        expect(e.f).toBeGreaterThan(15);
        expect(e.f).toBeLessThan(12000);
        expect(e.g).toBeGreaterThan(0);
        expect(e.g).toBeLessThan(0.6);
      }
    }
  });

  it('is deterministic and keeps full tracks at 16 bars; victory is a one-shot', () => {
    expect(JSON.stringify(buildTrack('battle'))).toBe(JSON.stringify(buildTrack('battle')));
    for (const k of MUSIC_KEYS) if (k !== 'victory') { expect(buildTrack(k).bars).toBe(16); expect(buildTrack(k).loop).toBe(true); }
    expect(buildTrack('victory').loop).toBe(false);
  });

  it('tracks differ in tempo/event content', () => {
    const sigs = new Set(MUSIC_KEYS.map((k) => { const t = buildTrack(k); return `${t.bpm}:${t.events.length}:${Math.round(t.events.reduce((s, e) => s + e.f, 0))}`; }));
    expect(sigs.size).toBe(MUSIC_KEYS.length);
    expect(buildTrack('finalBeam').events.filter((e) => e.v === 'arp').at(-1)!.g).toBeGreaterThan(buildTrack('finalBeam').events.find((e) => e.v === 'arp')!.g);
  });

  it('has an SFX definition for every key', () => {
    expect(SFX_KEYS.length).toBe(36);
    for (const k of SFX_KEYS) {
      const d = SFX_DEFS[k];
      expect(d, k).toBeTruthy();
      expect(d.layers.length).toBeGreaterThan(0);
      expect(sfxDuration(d)).toBeGreaterThan(0.02);
      expect(sfxDuration(d)).toBeLessThan(2);
      for (const l of d.layers) {
        expect(Number.isFinite(l.f0) && Number.isFinite(l.f1) && Number.isFinite(l.dur) && Number.isFinite(l.gain)).toBe(true);
        expect(l.f0).toBeGreaterThan(19); expect(l.f1).toBeGreaterThan(19); expect(l.gain).toBeGreaterThan(0);
      }
    }
  });
});

describe('voice limiter', () => {
  it('rate-limits identical effects to >=35ms', () => {
    const v = new VoiceLimiter();
    expect(v.tryAcquire('hit', 0, 100)).toBe(true);
    expect(v.tryAcquire('hit', 20, 100)).toBe(false);
    expect(v.tryAcquire('hit', 35, 100)).toBe(true);
  });
  it('caps concurrent voices and frees them when finished', () => {
    const v = new VoiceLimiter();
    let ok = 0;
    for (let i = 0; i < 40; i++) if (v.tryAcquire(`k${i}`, i, 1000)) ok++;
    expect(ok).toBe(MAX_SFX_VOICES);
    expect(v.activeCount(40)).toBe(MAX_SFX_VOICES);
    expect(v.tryAcquire('later', 2000, 100)).toBe(true);
    expect(v.activeCount(2000)).toBe(1);
  });
});

describe('music state machine', () => {
  it('same key is a no-op; switching fades the old track exactly once', () => {
    let s = initialMusicState();
    let p = planMusic(s, 'hub');
    expect(p.action).toBe('switch'); s = p.state;
    expect(planMusic(s, 'hub').action).toBe('noop');
    p = planMusic(s, 'battle');
    expect(p.action === 'switch' && p.fadeOut).toBe('hub');
    s = p.state;
    expect(s.current).toBe('battle');
    expect(s.fadingOut).toEqual(['hub']);
    s = finishFade(s, 'hub');
    expect(s.fadingOut).toEqual([]);
    const stop = planMusic(s, null);
    expect(stop.action).toBe('stop');
    expect(stop.state.current).toBeNull();
    expect(planMusic(stop.state, null).action).toBe('noop');
  });
});

describe('sequencer', () => {
  it('emits each event once per loop, in order, with no duplicates across windows', () => {
    const t = buildTrack('hub');
    const cur = { loop: 0, index: 0 };
    const all: number[] = [];
    for (let now = 0.15; now < t.seconds * 2.2; now += 0.15) for (const d of collectDue(t, cur, 0, now)) all.push(d.at);
    expect(all.length).toBeGreaterThanOrEqual(t.events.length * 2);
    for (let i = 1; i < all.length; i++) expect(all[i]).toBeGreaterThanOrEqual(all[i - 1] - 1e-9);
    const first = all.slice(0, t.events.length);
    expect(first.length).toBe(t.events.length);
  });
  it('one-shot tracks stop after one pass', () => {
    const t = buildTrack('victory');
    const cur = { loop: 0, index: 0 };
    const n1 = collectDue(t, cur, 0, t.seconds + 1).length;
    const n2 = collectDue(t, cur, 0, t.seconds * 5).length;
    expect(n1).toBe(t.events.length);
    expect(n2).toBe(0);
  });
});

describe('singleton without AudioContext', () => {
  it('is a safe no-op but stores settings', () => {
    expect(() => {
      audio.installUnlockListeners();
      audio.unlock();
      audio.playMusic('title');
      audio.playMusic('title', { fadeMs: 100 });
      audio.sfx('hit-melee', { volume: 0.5, pitch: 1.2 });
      audio.suspend(); audio.resume();
    }).not.toThrow();
    expect(audio.currentMusic()).toBe('title');
    audio.setSettings({ master: 0.3, music: 2, sfx: -1, muted: true });
    expect(audio.getSettings()).toEqual({ master: 0.3, music: 1, sfx: 0, muted: true });
    audio.stopMusic();
    expect(audio.currentMusic()).toBeNull();
    expect(() => audio.dispose()).not.toThrow();
  });
});
