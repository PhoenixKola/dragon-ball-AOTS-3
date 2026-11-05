# Audio mix and arrangement notes — Batch E/F

## Arrangement

- All music remains original Web Audio synthesis; no commercial or Dragon Ball recordings are included. `src/engine/audio/tracks.ts` now gives all 22 track keys a stable authored four-bar melody in the track's scale, with a rotated middle variation and a held cadence. Bass, pads, arpeggios and drum patterns continue to follow the per-track arrangement data.
- This removes the randomized lead-note sequence that made repeated listens change and weakened theme identity. The seeded arpeggio ornament and percussion remain deterministic for each named track.
- Transformation audio now has separate charge, release and impact envelopes. These are fired across the matching visual phases; Cell/Kami absorption uses the existing drain cue and green energy staging.

## World beds and routing

- Seven subtle, generated-noise region beds are available: open wind, quiet air, abandoned city, lab hum, shoreline, chamber void and arena wind. They are synthesized locally, follow the music slider/mute state, crossfade on map changes and stop during battles/cutscenes. Browser visibility suspension still suspends the shared Web Audio context.
- Bed peak gain targets range from 0.003 to 0.010 before the music bus. They are deliberately below the composed music and are not intended to sound like continuous loud static.
- Existing start-gesture unlock, saved master/music/SFX sliders, mute, offline routing and music crossfades are preserved. The master compressor remains at a -14 dB threshold, 6:1 ratio, 4 ms attack and 200 ms release.

## Review status

Track events, durations, voice envelopes and routing can be checked programmatically. A human did not listen to or master this build on speakers/headphones, so the subjective balance, translation across devices and final audio sign-off remain **HUMAN / PENDING**. No LUFS/true-peak measurement is claimed.
