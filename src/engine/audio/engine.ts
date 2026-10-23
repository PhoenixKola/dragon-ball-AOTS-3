import { SFX_DEFS, sfxDuration } from './sfx';
import { buildTrack } from './tracks';
import { collectDue, finishFade, initialMusicState, planMusic, VoiceLimiter, type MusicState, type SeqCursor } from './logic';
import type { AudioSettings, MusicKey, NoteEvent, SfxKey, TrackDef } from './types';

const LOOKAHEAD = 0.15;
const TICK_MS = 25;
const DEFAULT_FADE = 0.9;

interface Playing {
  key: MusicKey; track: TrackDef; gain: GainNode; cursor: SeqCursor; loopStart: number; timer: ReturnType<typeof setInterval> | null;
}

type CtxCtor = new () => AudioContext;
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

export class AudioEngine {
  private settings: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private limiter = new VoiceLimiter();
  private musicState: MusicState = initialMusicState();
  private playing = new Map<MusicKey, Playing>();
  private wantMusic: MusicKey | null = null;
  private trackCache = new Map<MusicKey, TrackDef>();
  private listenersInstalled = false;
  private manualSuspend = false;
  private unlocked = false;
  private visHandler: (() => void) | null = null;
  private gestureHandler: (() => void) | null = null;

  get available(): boolean { return this.ctx !== null; }

  /** 'unsupported' = no Web Audio, 'locked' = waiting for a user gesture, 'running' = audible graph, 'suspended' = context paused (tab hidden/blur) */
  status(): 'unsupported' | 'locked' | 'running' | 'suspended' {
    if (typeof globalThis === 'undefined') return 'unsupported';
    const g = globalThis as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
    if (!g.AudioContext && !g.webkitAudioContext) return 'unsupported';
    if (!this.ctx || !this.unlocked) return 'locked';
    return this.ctx.state === 'running' ? 'running' : 'suspended';
  }
  /** how many music tracks currently have live nodes (must never exceed 2 during a crossfade) */
  liveTracks(): number { return this.playing.size; }

  private getTrack(key: MusicKey): TrackDef {
    let t = this.trackCache.get(key);
    if (!t) { t = buildTrack(key); this.trackCache.set(key, t); }
    return t;
  }

  private ensureContext(): boolean {
    if (this.ctx) return true;
    try {
      const g = globalThis as unknown as { AudioContext?: CtxCtor; webkitAudioContext?: CtxCtor };
      const C = g.AudioContext ?? g.webkitAudioContext;
      if (!C) return false;
      const ctx = new C();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14; compressor.knee.value = 18; compressor.ratio.value = 6;
      compressor.attack.value = 0.004; compressor.release.value = 0.2;
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      music.connect(master); sfx.connect(master); master.connect(compressor); compressor.connect(ctx.destination);
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.ctx = ctx; this.master = master; this.musicBus = music; this.sfxBus = sfx; this.noiseBuf = buf;
      this.applySettings();
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  installUnlockListeners(): void {
    if (this.listenersInstalled || typeof window === 'undefined' || typeof document === 'undefined') return;
    this.listenersInstalled = true;
    this.gestureHandler = () => {
      this.unlock();
      if (this.unlocked && this.gestureHandler) {
        window.removeEventListener('pointerdown', this.gestureHandler);
        window.removeEventListener('keydown', this.gestureHandler);
      }
    };
    window.addEventListener('pointerdown', this.gestureHandler);
    window.addEventListener('keydown', this.gestureHandler);
    this.visHandler = () => { if (document.hidden) this.suspendInternal(); else if (!this.manualSuspend) this.resumeInternal(); };
    document.addEventListener('visibilitychange', this.visHandler);
  }

  unlock(): void {
    if (!this.ensureContext() || !this.ctx) return;
    this.unlocked = true;
    if (this.ctx.state === 'suspended' && !this.manualSuspend) void this.ctx.resume().catch(() => undefined);
    if (this.wantMusic && !this.playing.has(this.wantMusic)) this.startMusic(this.wantMusic, DEFAULT_FADE);
  }

  setSettings(s: Partial<AudioSettings>): void {
    this.settings = {
      master: s.master !== undefined ? clamp01(s.master) : this.settings.master,
      music: s.music !== undefined ? clamp01(s.music) : this.settings.music,
      sfx: s.sfx !== undefined ? clamp01(s.sfx) : this.settings.sfx,
      muted: s.muted !== undefined ? !!s.muted : this.settings.muted,
    };
    this.applySettings();
  }
  getSettings(): AudioSettings { return { ...this.settings }; }

  private applySettings(): void {
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const m = this.settings.muted ? 0 : this.settings.master;
    this.master.gain.setTargetAtTime(m, t, 0.02);
    this.musicBus.gain.setTargetAtTime(this.settings.music, t, 0.02);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, t, 0.02);
  }

  currentMusic(): MusicKey | null { return this.musicState.current; }

  playMusic(key: MusicKey, opts?: { fadeMs?: number }): void {
    const plan = planMusic(this.musicState, key);
    if (plan.action === 'noop') return;
    this.musicState = plan.state;
    this.wantMusic = key;
    if (plan.action === 'switch') {
      if (plan.fadeOut) this.fadeOutTrack(plan.fadeOut, (opts?.fadeMs ?? DEFAULT_FADE * 1000) / 1000);
      this.startMusic(key, (opts?.fadeMs ?? DEFAULT_FADE * 1000) / 1000);
    }
  }

  stopMusic(fadeMs = 600): void {
    const plan = planMusic(this.musicState, null);
    this.wantMusic = null;
    if (plan.action === 'noop') return;
    this.musicState = plan.state;
    if (plan.action === 'stop' && plan.fadeOut) this.fadeOutTrack(plan.fadeOut, fadeMs / 1000);
  }

  private startMusic(key: MusicKey, fade: number): void {
    if (!this.ctx || !this.musicBus || !this.unlocked) return;
    if (this.playing.has(key)) {
      // a previous instance is still fading out: drop it so no duplicates overlap
      this.killTrack(key);
    }
    const ctx = this.ctx;
    const track = this.getTrack(key);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + Math.max(0.05, fade));
    gain.connect(this.musicBus);
    const p: Playing = { key, track, gain, cursor: { loop: 0, index: 0 }, loopStart: ctx.currentTime + 0.06, timer: null };
    this.playing.set(key, p);
    const tick = () => {
      if (!this.ctx) return;
      const due = collectDue(p.track, p.cursor, p.loopStart, this.ctx.currentTime + LOOKAHEAD);
      for (const { at, ev } of due) this.playNote(p, ev, Math.max(at, this.ctx.currentTime));
    };
    tick();
    p.timer = setInterval(tick, TICK_MS);
  }

  private fadeOutTrack(key: MusicKey, fade: number): void {
    const p = this.playing.get(key);
    if (!p || !this.ctx) return;
    if (p.timer) { clearInterval(p.timer); p.timer = null; }
    const t = this.ctx.currentTime;
    p.gain.gain.cancelScheduledValues(t);
    p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), t);
    p.gain.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
    setTimeout(() => {
      if (this.playing.get(key) === p) this.killTrack(key);
      this.musicState = finishFade(this.musicState, key);
    }, fade * 1000 + 250);
  }

  private killTrack(key: MusicKey): void {
    const p = this.playing.get(key);
    if (!p) return;
    if (p.timer) clearInterval(p.timer);
    try { p.gain.disconnect(); } catch { /* already disconnected */ }
    this.playing.delete(key);
  }

  private playNote(p: Playing, ev: NoteEvent, at: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const out = p.gain;
    const g = ctx.createGain();
    g.connect(out);
    const end = at + ev.d;
    const env = (a: number, peak: number, rel: number) => {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(peak, at + a);
      g.gain.setValueAtTime(peak, Math.max(at + a, end - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, end + 0.02);
    };
    const osc = (type: OscillatorType, f: number, detune = 0) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f; o.detune.value = detune;
      o.connect(g); o.start(at); o.stop(end + 0.06);
    };
    switch (ev.v) {
      case 'pad': env(0.25, ev.g, 0.3); osc('triangle', ev.f); osc('sine', ev.f * 2, 6); break;
      case 'bass': env(0.01, ev.g, 0.06); osc('sawtooth', ev.f); osc('square', ev.f / 2); break;
      case 'lead': env(0.02, ev.g, 0.08); osc('square', ev.f); osc('triangle', ev.f * 2, 8); break;
      case 'arp': env(0.005, ev.g, 0.04); osc('triangle', ev.f); osc('square', ev.f, -6); break;
      case 'kick': {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(40, at + 0.1);
        g.gain.setValueAtTime(ev.g, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
        o.connect(g); o.start(at); o.stop(at + 0.16);
        break;
      }
      case 'tom': {
        const o = ctx.createOscillator();
        o.type = 'sine'; o.frequency.setValueAtTime(ev.f * 1.6, at); o.frequency.exponentialRampToValueAtTime(ev.f, at + 0.12);
        g.gain.setValueAtTime(ev.g, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
        o.connect(g); o.start(at); o.stop(at + 0.22);
        break;
      }
      case 'snare': this.noiseHit(g, at, 0.14, 'highpass', 1500, ev.g); { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = ev.f; o.connect(g); o.start(at); o.stop(at + 0.1); } break;
      case 'hat': this.noiseHit(g, at, 0.05, 'highpass', 7000, ev.g); break;
      case 'crash': this.noiseHit(g, at, 1.1, 'highpass', 4500, ev.g); break;
    }
  }

  private noiseHit(g: GainNode, at: number, dur: number, type: BiquadFilterType, f: number, peak: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = type; filt.frequency.value = f;
    g.gain.setValueAtTime(peak, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filt); filt.connect(g);
    src.start(at, Math.random() * 0.5); src.stop(at + dur + 0.02);
  }

  sfx(key: SfxKey, opts?: { volume?: number; pitch?: number }): void {
    const def = SFX_DEFS[key];
    if (!def || !this.ctx || !this.sfxBus || !this.noiseBuf || !this.unlocked) return;
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const nowMs = ctx.currentTime * 1000;
    if (!this.limiter.tryAcquire(key, nowMs, sfxDuration(def) * 1000)) return;
    const vol = Math.max(0, Math.min(1.5, opts?.volume ?? 1)) * def.gain;
    const pitch = opts?.pitch && opts.pitch > 0 ? opts.pitch : 1;
    const t0 = ctx.currentTime;
    for (const l of def.layers) {
      const at = t0 + (l.delay ?? 0);
      const g = ctx.createGain();
      const a = l.attack ?? 0.004;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, l.gain * vol), at + a);
      g.gain.exponentialRampToValueAtTime(0.0001, at + l.dur);
      if (l.kind === 'tone') {
        const o = ctx.createOscillator();
        o.type = l.wave;
        o.frequency.setValueAtTime(l.f0 * pitch, at);
        if (l.f1 !== l.f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, l.f1 * pitch), at + l.dur);
        o.detune.value = l.detune ?? 0;
        o.connect(g); o.start(at); o.stop(at + l.dur + 0.05);
      } else {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf; src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = l.filter; f.Q.value = l.q ?? 1;
        f.frequency.setValueAtTime(l.f0 * pitch, at);
        if (l.f1 !== l.f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, l.f1 * pitch), at + l.dur);
        src.connect(f); f.connect(g);
        src.start(at, Math.random() * 0.5); src.stop(at + l.dur + 0.05);
      }
      g.connect(this.sfxBus);
    }
  }

  private suspendInternal(): void { if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => undefined); }
  private resumeInternal(): void { if (this.ctx && this.unlocked && this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined); }
  suspend(): void { this.manualSuspend = true; this.suspendInternal(); }
  resume(): void { this.manualSuspend = false; this.resumeInternal(); }

  dispose(): void {
    for (const k of [...this.playing.keys()]) this.killTrack(k);
    if (typeof window !== 'undefined' && this.gestureHandler) {
      window.removeEventListener('pointerdown', this.gestureHandler);
      window.removeEventListener('keydown', this.gestureHandler);
    }
    if (typeof document !== 'undefined' && this.visHandler) document.removeEventListener('visibilitychange', this.visHandler);
    this.listenersInstalled = false; this.gestureHandler = null; this.visHandler = null;
    this.musicState = initialMusicState(); this.wantMusic = null; this.limiter.reset();
    const c = this.ctx;
    this.ctx = null; this.master = null; this.musicBus = null; this.sfxBus = null; this.noiseBuf = null; this.unlocked = false;
    if (c) void c.close().catch(() => undefined);
  }
}
