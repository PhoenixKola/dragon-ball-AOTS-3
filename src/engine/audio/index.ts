import { AudioEngine } from './engine';

export { AudioEngine } from './engine';
export { buildTrack, SPECS, midiToHz } from './tracks';
export { SFX_DEFS, sfxDuration } from './sfx';
export { VoiceLimiter, planMusic, finishFade, initialMusicState, collectDue, MAX_SFX_VOICES, MIN_SAME_SFX_GAP_MS } from './logic';
export { MUSIC_KEYS, SFX_KEYS } from './types';
export type { MusicKey, SfxKey, AudioSettings, TrackDef, NoteEvent, SfxDef, SfxLayer } from './types';

export const audio = new AudioEngine();
