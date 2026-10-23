import type { MusicKey, MusicVoice, NoteEvent, TrackDef } from './types';

type Mode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'harmonicMinor' | 'locrian';
const SCALES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11], locrian: [0, 1, 3, 5, 6, 8, 10],
};
type Bass = 'none' | 'root' | 'pulse' | 'walk' | 'octave' | 'drone';
type Drums = 'none' | 'soft' | 'march' | 'rock' | 'epic' | 'industrial' | 'heartbeat';
type Arp = 'none' | 'up' | 'pluck' | 'fast' | 'rise';
type Lead = 'none' | 'sparse' | 'melodic' | 'heroic';

interface Spec {
  root: number;
  mode: Mode; bpm: number; bars: number; prog: number[];
  pad: boolean; bass: Bass; drums: Drums; arp: Arp; lead: Lead;
  seed: number; loop?: boolean; mood: string;
  clash?: number;
  crescendo?: boolean;
}

const S = (s: Spec) => s;
export const SPECS: Record<MusicKey, Spec> = {
  title: S({ root: 45, mode: 'minor', bpm: 84, bars: 16, prog: [0, 5, 2, 6], pad: true, bass: 'root', drums: 'soft', arp: 'pluck', lead: 'heroic', seed: 11, mood: 'Wistful heroic theme, A minor, slow march' }),
  hub: S({ root: 48, mode: 'major', bpm: 104, bars: 16, prog: [0, 4, 5, 3], pad: true, bass: 'walk', drums: 'soft', arp: 'pluck', lead: 'melodic', seed: 23, mood: 'Warm, relaxed Capsule Corp home base, C major' }),
  tension: S({ root: 38, mode: 'minor', bpm: 92, bars: 16, prog: [0, 0, 5, 4], pad: true, bass: 'pulse', drums: 'heartbeat', arp: 'none', lead: 'sparse', seed: 31, mood: 'Low pulsing D minor dread' }),
  mystery: S({ root: 40, mode: 'locrian', bpm: 66, bars: 16, prog: [0, 1, 0, 4], pad: true, bass: 'drone', drums: 'none', arp: 'pluck', lead: 'sparse', seed: 43, clash: 1, mood: 'Eerie sparse E locrian with minor-second clashes' }),
  androidBoss: S({ root: 43, mode: 'phrygian', bpm: 140, bars: 16, prog: [0, 1, 0, 6], pad: false, bass: 'octave', drums: 'industrial', arp: 'fast', lead: 'melodic', seed: 57, mood: 'Cold mechanical G phrygian, industrial drive' }),
  training: S({ root: 47, mode: 'dorian', bpm: 124, bars: 16, prog: [0, 3, 0, 4], pad: false, bass: 'pulse', drums: 'rock', arp: 'up', lead: 'melodic', seed: 61, mood: 'Energetic B dorian workout groove' }),
  cellGames: S({ root: 41, mode: 'minor', bpm: 100, bars: 16, prog: [0, 5, 6, 4], pad: true, bass: 'walk', drums: 'march', arp: 'none', lead: 'heroic', seed: 71, mood: 'Heroic yet ominous F minor tournament march' }),
  perfectCell: S({ root: 36, mode: 'harmonicMinor', bpm: 132, bars: 16, prog: [0, 5, 3, 4], pad: true, bass: 'octave', drums: 'epic', arp: 'fast', lead: 'heroic', seed: 83, mood: 'Menacing C harmonic-minor boss theme' }),
  awakening: S({ root: 40, mode: 'minor', bpm: 150, bars: 16, prog: [0, 6, 5, 6], pad: true, bass: 'octave', drums: 'epic', arp: 'rise', lead: 'heroic', seed: 97, crescendo: true, mood: 'Explosive rising E minor transformation anthem' }),
  finalBeam: S({ root: 45, mode: 'major', bpm: 120, bars: 16, prog: [0, 4, 5, 3], pad: true, bass: 'pulse', drums: 'epic', arp: 'rise', lead: 'heroic', seed: 101, crescendo: true, mood: 'Rising layered A major arpeggio crescendo' }),
  victory: S({ root: 48, mode: 'major', bpm: 132, bars: 4, prog: [0, 3, 4, 0], pad: true, bass: 'root', drums: 'march', arp: 'none', lead: 'heroic', seed: 113, loop: false, mood: 'Short bright C major fanfare, one-shot' }),
  credits: S({ root: 43, mode: 'major', bpm: 72, bars: 16, prog: [0, 5, 3, 4], pad: true, bass: 'root', drums: 'soft', arp: 'pluck', lead: 'melodic', seed: 127, mood: 'Slow warm G major credits loop' }),
  battle: S({ root: 40, mode: 'dorian', bpm: 148, bars: 16, prog: [0, 3, 0, 6], pad: false, bass: 'pulse', drums: 'rock', arp: 'fast', lead: 'melodic', seed: 131, mood: 'Driving E dorian battle theme' }),
  bossBattle: S({ root: 38, mode: 'phrygian', bpm: 156, bars: 16, prog: [0, 1, 5, 4], pad: true, bass: 'octave', drums: 'epic', arp: 'fast', lead: 'heroic', seed: 149, mood: 'Heavy D phrygian boss battle, aggressive' }),
  sacrifice: S({ root: 43, mode: 'minor', bpm: 58, bars: 16, prog: [0, 5, 2, 4], pad: true, bass: 'drone', drums: 'heartbeat', arp: 'pluck', lead: 'sparse', seed: 157, mood: 'Slow tragic G minor lament' }),
  lab: S({ root: 41, mode: 'minor', bpm: 96, bars: 16, prog: [0, 6, 0, 5], pad: true, bass: 'pulse', drums: 'industrial', arp: 'pluck', lead: 'sparse', seed: 163, mood: 'Cold synthetic F minor laboratory hum' }),
  island: S({ root: 50, mode: 'mixolydian', bpm: 112, bars: 16, prog: [0, 6, 3, 0], pad: true, bass: 'walk', drums: 'soft', arp: 'up', lead: 'melodic', seed: 173, mood: 'Breezy D mixolydian shoreline travel' }),
  lookout: S({ root: 50, mode: 'lydian', bpm: 76, bars: 16, prog: [0, 1, 4, 0], pad: true, bass: 'root', drums: 'none', arp: 'pluck', lead: 'melodic', seed: 181, mood: 'Serene D lydian temple heights' }),
  chamber: S({ root: 37, mode: 'dorian', bpm: 80, bars: 16, prog: [0, 0, 3, 0], pad: true, bass: 'drone', drums: 'heartbeat', arp: 'up', lead: 'sparse', seed: 191, mood: 'Endless white void, C# dorian drone and slow arp' }),
  city: S({ root: 46, mode: 'mixolydian', bpm: 118, bars: 16, prog: [0, 3, 4, 3], pad: false, bass: 'walk', drums: 'rock', arp: 'pluck', lead: 'melodic', seed: 193, mood: 'Busy Bb mixolydian city, uneasy swing' }),
  wasteland: S({ root: 40, mode: 'phrygian', bpm: 88, bars: 16, prog: [0, 1, 0, 6], pad: true, bass: 'drone', drums: 'soft', arp: 'none', lead: 'sparse', seed: 197, mood: 'Barren E phrygian wind and distant drums' }),
  epilogue: S({ root: 48, mode: 'major', bpm: 80, bars: 16, prog: [0, 4, 5, 2], pad: true, bass: 'root', drums: 'none', arp: 'pluck', lead: 'melodic', seed: 199, mood: 'Gentle hopeful C major farewell' }),
};

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function buildTrack(key: MusicKey): TrackDef {
  const sp = SPECS[key];
  const rnd = mulberry(sp.seed);
  const beat = 60 / sp.bpm, bar = beat * 4, sc = SCALES[sp.mode];
  const deg = (d: number, oct = 0) => sp.root + sc[((d % 7) + 7) % 7] + 12 * (Math.floor(d / 7) + oct);
  const ev: NoteEvent[] = [];
  const total = sp.bars * bar;
  const add = (t: number, d: number, m: number, v: MusicVoice, g: number, hz = false) => {
    if (t >= total - 1e-9) return;
    ev.push({ t, d: Math.min(d, total - t), f: hz ? m : midiToHz(m), v, g });
  };
  const chord = (d: number) => [d, d + 2, d + 4];
  const density = { none: 0, sparse: 0.35, melodic: 0.7, heroic: 0.6 }[sp.lead];
  const mkPhrase = (): { b: number; d: number; len: number }[] => {
    const out: { b: number; d: number; len: number }[] = [];
    let cur = 7 + Math.floor(rnd() * 3), b = 0;
    while (b < 16) {
      const len = sp.lead === 'heroic' ? (rnd() < 0.5 ? 2 : 1) : rnd() < 0.5 ? 1 : 0.5;
      if (rnd() < density) {
        cur = Math.max(4, Math.min(13, cur + Math.round((rnd() - 0.5) * 4)));
        out.push({ b, d: cur, len: Math.max(0.5, len) });
      }
      b += Math.max(0.5, len);
    }
    return out;
  };
  const phraseA = mkPhrase(), phraseB = mkPhrase();

  for (let i = 0; i < sp.bars; i++) {
    const t0 = i * bar;
    const root = sp.prog[i % sp.prog.length];
    const cr = chord(root);
    const cresc = sp.crescendo ? 0.45 + 0.55 * (i / Math.max(1, sp.bars - 1)) : 1;
    if (sp.pad) {
      for (const d of cr) add(t0, bar * 0.98, deg(d, 0), 'pad', 0.07 * cresc);
      if (sp.clash) add(t0, bar * 0.98, deg(root, 0) + sp.clash + 12, 'pad', 0.05);
    }
    const bn = deg(root, -2);
    switch (sp.bass) {
      case 'root': add(t0, beat * 2, bn, 'bass', 0.2); add(t0 + beat * 2, beat * 2, bn + (i % 2 ? 7 : 0), 'bass', 0.17); break;
      case 'drone': add(t0, bar, bn, 'bass', 0.18); break;
      case 'pulse': for (let k = 0; k < 8; k++) add(t0 + (k * beat) / 2, beat * 0.45, bn + (k === 7 ? 7 : 0), 'bass', k % 2 ? 0.12 : 0.2); break;
      case 'walk': { const w = [0, 7, 12, 7]; for (let k = 0; k < 4; k++) add(t0 + k * beat, beat * 0.9, bn + w[k], 'bass', 0.19); break; }
      case 'octave': for (let k = 0; k < 8; k++) add(t0 + (k * beat) / 2, beat * 0.42, bn + (k % 2 ? 12 : 0), 'bass', 0.18); break;
      default: break;
    }
    if (sp.arp !== 'none') {
      const steps = sp.arp === 'fast' || sp.arp === 'rise' ? 16 : 8;
      const stepLen = bar / steps;
      const tones = [...cr, cr[0] + 7, cr[2] + 7, cr[1] + 7];
      for (let k = 0; k < steps; k++) {
        let idx = k % 6;
        if (sp.arp === 'rise') idx = Math.floor((k / steps) * 6 + (i % 4) * 0.5) % 6;
        if (sp.arp === 'pluck' && k % 2 === 1 && rnd() < 0.4) continue;
        add(t0 + k * stepLen, stepLen * 0.9, deg(tones[idx], 1), 'arp', (sp.arp === 'pluck' ? 0.07 : 0.055) * cresc);
      }
    }
    if (sp.lead !== 'none') {
      const block = Math.floor(i / 4) % 4;
      const phrase = block === 2 ? phraseB : phraseA;
      const local = (i % 4) * 4;
      for (const n of phrase) {
        if (n.b >= local && n.b < local + 4) {
          const dd = n.d + (block === 3 ? 1 : 0) + (root === 5 || root === 6 ? -1 : 0);
          add(t0 + (n.b - local) * beat, n.len * beat * 0.95, deg(dd, 0), 'lead', 0.1 * cresc);
        }
      }
    }
    const q = beat / 4;
    const kick = (s: number, g = 0.34) => add(t0 + s * q, 0.12, 55, 'kick', g, true);
    const snare = (s: number, g = 0.2) => add(t0 + s * q, 0.14, 190, 'snare', g, true);
    const hat = (s: number, g = 0.07) => add(t0 + s * q, 0.05, 8000, 'hat', g, true);
    const tom = (s: number, f: number, g = 0.22) => add(t0 + s * q, 0.18, f, 'tom', g, true);
    switch (sp.drums) {
      case 'soft': kick(0, 0.2); kick(8, 0.16); for (let s = 0; s < 16; s += 4) hat(s, 0.04); break;
      case 'march': kick(0); kick(8); snare(4); snare(12); snare(14, 0.12); for (let s = 0; s < 16; s += 2) hat(s, 0.05); break;
      case 'rock': kick(0); kick(6); kick(8); kick(11, 0.25); snare(4); snare(12); for (let s = 0; s < 16; s += 2) hat(s); break;
      case 'epic':
        kick(0); kick(8); kick(10, 0.26); snare(4, 0.24); snare(12, 0.24); tom(13, 110); tom(14, 90); tom(15, 70);
        if (i % 4 === 0) add(t0, 1.2, 5000, 'crash', 0.1, true);
        for (let s = 0; s < 16; s += 2) hat(s, 0.05);
        break;
      case 'industrial': for (let s = 0; s < 16; s += 4) kick(s, 0.3); snare(4, 0.16); snare(12, 0.16); for (let s = 1; s < 16; s += 2) hat(s, 0.06); break;
      case 'heartbeat': kick(0, 0.3); kick(3, 0.2); if (i % 2) kick(8, 0.16); break;
      default: break;
    }
  }
  ev.sort((a, b) => a.t - b.t || a.f - b.f);
  return { key, bpm: sp.bpm, bars: sp.bars, seconds: total, loop: sp.loop !== false, events: ev, mood: sp.mood };
}
