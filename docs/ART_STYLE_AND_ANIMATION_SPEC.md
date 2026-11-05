# Art style and animation specification

Use the installed hero and Cell sheets as the identity reference: dark confident outlines, controlled pixel/cel shading, distinct form palettes, readable silhouette and grounded feet. Preserve one actor/form per sheet. No text, borders or unrelated characters in runtime exports. Character, VFX, object and icon PNGs require genuine RGBA alpha; stage backdrops are opaque. Render nearest-neighbor and use recorded `feet` pivots from `artRegistry.generated.json`.

## Runtime contract

### Transformation identity and staging

Transformation sequences reuse the installed, identity-matched form sheets rather than generating a second face or costume interpretation. The base sprite supplies anticipation; the registered form sprite supplies the reveal. Story dialogue can explicitly select the matching form portrait (`portrait` on a cutscene line), as in Trunks' SSJ reveal. Aura art is a rear layer at actor scale, with variants kept static unless their registry note identifies a true temporal sequence. The transformation shockwave is one sprite with a stable pivot, expanded and faded at runtime; it is not represented as a frame animation.

| Asset | Existing contract | Review rule |
|---|---|---|
| Battle actor | Eight named pose slots; per-frame pixel dimensions, bbox and feet anchor; per-actor `displayHeight` | All poses retain character scale and feet line; a pose is not a motion sequence |
| Overworld actor | Four directions, idle plus walk frame list; `owHeight` | Direction and cadence visibly change, no size jump |
| VFX | Frame refs, fps, loop and family | `variants_not_sequence` plays only one variant pulse until true temporal frames exist |
| Tiles/props | 32 px terrain tiles, bottom-anchored props | Seams, depth and collision footprint agree in Phaser |
| UI icons | 64×64 transparent PNG | Centered, border clear and semantic mapping verified |
| Cinematic | Opaque wide PNG, loaded at story step | Cropped to cover 1280×720 with a 250 ms fade; no dialogue baked into art |

Seven wide-screen candidate story stills (mostly 1672×941; Goku's sacrifice frame is 1774×887) now appear at their authored story beats. They are opaque, identity-referenced native generations retained in `art/production/cinematics/`; each is pending human art approval. Regenerate runtime copies with `python tools/build_art.py --only cinematics`; no paid service or API key is needed for a rebuild from retained PNGs.

The Father–Son Kamehameha keyframe uses the same wide opaque format. Its source SHA-256 is `f769bb03c37b54c64530f7c350e8b3c35472f5a67f48ac6d0aa019cf9627d6c1`.

Ginger Town mist is a 2172×724 transparent RGBA atmosphere sprite with SHA-256 `831f369ab0d8689d90359a460e71693f113aa699b00f5052286607f5e0482207`. Phaser renders it at 0.28 scale and 0.19 alpha in three slow drifting, noninteractive layers; reduced-motion mode freezes their drift. The original PNG is retained without conversion.

Animation direction: anticipation, travel/extension, contact, reaction and recovery must correspond to authoritative combat events. Damage text and sound belong at `hit`, not at action selection. Scene teardown must flush clock waits and settle animation promises. Reduced-motion mode avoids camera movement and excessive flashes.

The common blue melee contact burst is a four-stage native-generated candidate (`art/handoff/generated_vfx/impact-blue-contact-4f.png`): tight contact flash, expansion, breaking sparks, and fade. `tools/art_vfx.py` crops the equal-width source cells, aligns them on a shared 128px canvas with nearest-neighbor scaling, and registers a true `temporal_sequence`. The runtime steps those frames at hit contact; reduced-motion mode uses only the first contact frame. Source prompt/checksum are in `art/handoff/generated_vfx/README.md`. Human art approval remains pending.
