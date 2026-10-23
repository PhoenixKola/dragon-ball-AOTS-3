# Audio notes

Fully synthesized, offline Web Audio. No audio files, no network. Code: `src/engine/audio/`.

- `tracks.ts` (`buildTrack`, pure): seeded composition per MusicKey -> note-event data (pad, bass, arp, lead, kick/snare/hat/tom/crash). 16 bars each (victory: 4-bar one-shot).
- `sfx.ts` (`SFX_DEFS`): data-driven layered tone/noise recipes, one per SfxKey.
- `logic.ts`: pure `VoiceLimiter` (14 voices, identical SFX >= 35 ms apart), crossfade state machine (`planMusic`), sequencer (`collectDue`).
- `engine.ts`: lookahead sequencer (25 ms timer, 150 ms window on AudioContext time); master -> DynamicsCompressor; separate music/sfx buses; tab-blur suspend/resume; safe no-op when AudioContext is missing.

Verification status: unit tests cover data, limiter, state machine and sequencer. Listening quality is NOT verified (no audio hardware in CI); not mastered.

## Music keys
| key | tempo | mood |
|---|---|---|
| title | 84 | Wistful heroic A minor, slow march |
| hub | 104 | Warm relaxed C major, walking bass |
| tension | 92 | Low pulsing D minor, heartbeat kick |
| mystery | 66 | Eerie sparse E locrian, minor-second clash tones |
| androidBoss | 140 | Cold mechanical G phrygian, industrial drums |
| training | 124 | Energetic B dorian rock groove |
| cellGames | 100 | Heroic/ominous F minor march |
| perfectCell | 132 | Menacing C harmonic minor, epic drums |
| awakening | 150 | Rising E minor anthem, crescendo |
| finalBeam | 120 | A major, rising layered arpeggio crescendo |
| victory | 132 | Bright C major fanfare, one-shot then silence |
| credits | 72 | Slow warm G major loop |
| battle | 148 | Driving E dorian |
| bossBattle | 156 | Heavy D phrygian, octave bass, epic drums |
| sacrifice | 58 | Tragic G minor lament, drone + heartbeat |
| lab | 96 | Cold synthetic F minor |
| island | 112 | Breezy D mixolydian |
| lookout | 76 | Serene D lydian |
| chamber | 80 | C# dorian drone, slow arp |
| city | 118 | Uneasy Bb mixolydian |
| wasteland | 88 | Barren E phrygian |
| epilogue | 80 | Gentle hopeful C major |
