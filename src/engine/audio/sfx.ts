import type { SfxDef, SfxKey, SfxLayer } from './types';

const tone = (wave: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0, extra: Partial<Extract<SfxLayer, { kind: 'tone' }>> = {}): SfxLayer =>
  ({ kind: 'tone', wave, f0, f1, dur, gain, delay, ...extra });
const noise = (filter: BiquadFilterType, f0: number, f1: number, dur: number, gain: number, delay = 0, q = 1): SfxLayer =>
  ({ kind: 'noise', filter, f0, f1, dur, gain, delay, q });

export const SFX_DEFS: Record<SfxKey, SfxDef> = {
  'ui-move': { gain: 0.5, layers: [tone('square', 660, 700, 0.04, 0.12)] },
  'ui-confirm': { gain: 0.6, layers: [tone('square', 520, 520, 0.06, 0.14), tone('square', 780, 780, 0.09, 0.14, 0.05)] },
  'ui-cancel': { gain: 0.55, layers: [tone('square', 520, 300, 0.1, 0.14)] },
  'ui-error': { gain: 0.6, layers: [tone('sawtooth', 160, 130, 0.14, 0.16), tone('sawtooth', 150, 120, 0.14, 0.16, 0.12)] },
  step: { gain: 0.35, layers: [noise('lowpass', 500, 200, 0.06, 0.3)] },
  chest: { gain: 0.7, layers: [tone('triangle', 330, 330, 0.12, 0.2), tone('triangle', 495, 495, 0.12, 0.2, 0.1), tone('triangle', 660, 660, 0.25, 0.2, 0.2), noise('highpass', 6000, 6000, 0.2, 0.05, 0.2)] },
  heal: { gain: 0.6, layers: [tone('sine', 523, 523, 0.18, 0.2), tone('sine', 659, 659, 0.18, 0.2, 0.08), tone('sine', 784, 784, 0.18, 0.2, 0.16), tone('sine', 1047, 1047, 0.35, 0.18, 0.24)] },
  levelup: { gain: 0.7, layers: [tone('square', 392, 392, 0.1, 0.14), tone('square', 523, 523, 0.1, 0.14, 0.1), tone('square', 659, 659, 0.1, 0.14, 0.2), tone('square', 784, 784, 0.4, 0.16, 0.3), tone('triangle', 1568, 1568, 0.4, 0.1, 0.3)] },
  'guard-perfect': { gain: 0.8, layers: [tone('sine', 1320, 1320, 0.14, 0.22), tone('sine', 1980, 1980, 0.3, 0.2, 0.07), noise('highpass', 7000, 7000, 0.08, 0.08)] },
  'guard-good': { gain: 0.65, layers: [tone('triangle', 880, 880, 0.12, 0.2), tone('triangle', 660, 660, 0.12, 0.12, 0.05)] },
  'guard-miss': { gain: 0.55, layers: [tone('sawtooth', 200, 90, 0.2, 0.18), noise('lowpass', 800, 200, 0.15, 0.15)] },
  'hit-melee': { gain: 0.7, layers: [noise('bandpass', 1800, 600, 0.1, 0.35, 0, 1.2), tone('square', 180, 70, 0.1, 0.2)] },
  'hit-energy': { gain: 0.7, layers: [tone('sawtooth', 900, 200, 0.18, 0.2), noise('bandpass', 3000, 800, 0.18, 0.22, 0, 2)] },
  'hit-crit': { gain: 0.85, layers: [noise('bandpass', 2200, 500, 0.2, 0.4, 0, 1), tone('square', 240, 50, 0.22, 0.3), tone('sine', 1760, 1760, 0.15, 0.15, 0.02)] },
  beam: { gain: 0.75, layers: [tone('sawtooth', 180, 1400, 0.8, 0.2), tone('sawtooth', 183, 1410, 0.8, 0.14), noise('bandpass', 400, 4000, 0.8, 0.22, 0, 1.5)] },
  absorb: { gain: 0.65, layers: [tone('sine', 1200, 200, 0.7, 0.2), tone('triangle', 600, 100, 0.7, 0.15, 0.05, { detune: 20 }), noise('lowpass', 2500, 300, 0.6, 0.12)] },
  charge: { gain: 0.6, layers: [tone('sawtooth', 90, 500, 0.7, 0.14), tone('square', 180, 1000, 0.7, 0.08), noise('highpass', 800, 5000, 0.7, 0.1)] },
  transform: { gain: 0.85, layers: [tone('sawtooth', 70, 900, 1.1, 0.22), tone('sawtooth', 140, 1800, 1.1, 0.12), noise('bandpass', 300, 6000, 1.1, 0.22, 0, 0.8), tone('sine', 1760, 1760, 0.5, 0.12, 0.9)] },
  hurt: { gain: 0.7, layers: [tone('sawtooth', 300, 110, 0.18, 0.22), noise('bandpass', 1200, 400, 0.12, 0.2)] },
  ko: { gain: 0.75, layers: [tone('sawtooth', 400, 50, 0.7, 0.22), noise('lowpass', 1500, 100, 0.6, 0.2), tone('triangle', 100, 40, 0.5, 0.2, 0.1)] },
  'boss-in': { gain: 0.85, layers: [tone('sawtooth', 55, 55, 0.9, 0.3), tone('sawtooth', 58, 58, 0.9, 0.22), noise('lowpass', 400, 80, 0.8, 0.25), tone('square', 110, 220, 0.6, 0.12, 0.3)] },
  item: { gain: 0.55, layers: [tone('triangle', 988, 988, 0.08, 0.18), tone('triangle', 1319, 1319, 0.2, 0.18, 0.07)] },
  flee: { gain: 0.6, layers: [noise('bandpass', 500, 3000, 0.45, 0.2, 0, 1), tone('square', 200, 500, 0.4, 0.1)] },
  quest: { gain: 0.65, layers: [tone('triangle', 440, 440, 0.12, 0.2), tone('triangle', 554, 554, 0.12, 0.2, 0.12), tone('triangle', 659, 659, 0.12, 0.2, 0.24), tone('triangle', 880, 880, 0.35, 0.2, 0.36)] },
  save: { gain: 0.55, layers: [tone('sine', 784, 784, 0.1, 0.18), tone('sine', 1047, 1047, 0.2, 0.18, 0.09)] },
  door: { gain: 0.6, layers: [noise('lowpass', 900, 250, 0.25, 0.3), tone('square', 120, 80, 0.2, 0.14)] },
  teleport: { gain: 0.7, layers: [tone('sine', 2200, 400, 0.25, 0.18), tone('sine', 400, 2400, 0.2, 0.14, 0.18), noise('highpass', 5000, 5000, 0.1, 0.12, 0.17)] },
  explosion: { gain: 0.9, layers: [noise('lowpass', 2500, 80, 1.0, 0.5), tone('sine', 120, 30, 0.8, 0.4), tone('sawtooth', 200, 40, 0.5, 0.15)] },
  victory: { gain: 0.75, layers: [tone('square', 523, 523, 0.14, 0.15), tone('square', 659, 659, 0.14, 0.15, 0.14), tone('square', 784, 784, 0.14, 0.15, 0.28), tone('square', 1047, 1047, 0.5, 0.17, 0.42)] },
  defeat: { gain: 0.7, layers: [tone('triangle', 392, 392, 0.25, 0.2), tone('triangle', 330, 330, 0.25, 0.2, 0.25), tone('triangle', 262, 262, 0.25, 0.2, 0.5), tone('triangle', 196, 196, 0.7, 0.2, 0.75)] },
  lightning: { gain: 0.8, layers: [noise('highpass', 3500, 1500, 0.35, 0.4), tone('sawtooth', 1500, 90, 0.3, 0.2), tone('square', 60, 60, 0.4, 0.2, 0.1)] },
  telegraph: { gain: 0.8, layers: [tone('square', 880, 880, 0.08, 0.2), tone('square', 660, 660, 0.12, 0.2, 0.12)] },
  'cell-hiss': { gain: 0.65, layers: [noise('bandpass', 7000, 2500, 0.7, 0.3, 0, 3), tone('sawtooth', 140, 100, 0.7, 0.1), tone('sawtooth', 147, 106, 0.7, 0.1, 0, { detune: 35 })] },
  'dialogue-blip': { gain: 0.3, layers: [tone('square', 440, 460, 0.03, 0.1)] },
  sparking: { gain: 0.75, layers: [tone('sawtooth', 220, 880, 0.35, 0.18), tone('square', 330, 1320, 0.35, 0.1), noise('highpass', 4000, 8000, 0.3, 0.15), tone('sine', 1760, 1760, 0.3, 0.14, 0.3)] },
  'rage-ready': { gain: 0.7, layers: [tone('square', 660, 660, 0.07, 0.16), tone('square', 880, 880, 0.07, 0.16, 0.08), tone('square', 1320, 1320, 0.2, 0.18, 0.16)] },
};

export function sfxDuration(def: SfxDef): number {
  return def.layers.reduce((m, l) => Math.max(m, (l.delay ?? 0) + l.dur), 0);
}
