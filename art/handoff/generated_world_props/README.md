# Generated world landmarks

These three transparent sprites were generated with the built-in ImageGen workflow for the world-art follow-up batch. `tools/art_worlds_handoff.py` trims alpha below 24, crops to the alpha-32 visible bounds, and uses Lanczos downsampling to fit the runtime map footprint. Rebuild with `python tools/build_art.py --only worlds,worldextras,cinematics,atmosphere`.

| Source | Map prop | Target source width | Footprint | Notes |
|---|---|---:|---:|---|
| `future_landing_scout_ship.png` | Future Landing `ship` | 320 px | 6 x 4, solid | Pearl-and-violet crescent scout cruiser with landing struts. |
| `gingertown_time_machine.png` | Ginger Town `timemachine` | 160 px | 3 x 2, solid | Rose-trimmed capsule time machine with a glass canopy and visible landing feet. |
| `android_island_pavilion.png` | Android Island `pavilion` | 215 px | 4 x 3, decorative | Weathered coastal research pavilion with broken stone and teal glass. |

The generated sprites are candidates and remain unapproved until human art review. Runtime copies are under `public/assets/worlds/<map>/props/`; registry provenance points back to these source PNGs.
