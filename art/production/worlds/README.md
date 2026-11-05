# Production world art

## Ginger Town evacuation shuttle

- File: `gingertown-evacuation-shuttle.png`
- Generated with native Codex ImageGen using `art/handoff/worlds/ginger_town_tileset.png` as the visual reference.
- Subject: a damaged cream-and-coral civilian evacuation shuttle, viewed from above/front-side, with teal windows and amber beacon.
- Source SHA-256: `3ff90ebc1a8662b40552d43fcccd0f78d6bd6854e49e701416a90e5fd6d99c5b`.
- Export: true transparent RGBA; `tools/art_worlds_handoff.py` trims transparent padding and scales it to the authored 3-by-2-tile map footprint.
- Runtime map: Ginger Town, beside the evacuation driver. Decorative only; collision and quest triggers stay unchanged.
- Approval: candidate. Human art approval remains pending.

## Batch D terrain and interaction art

These bitmap sources were generated with native Codex ImageGen, then integrated reproducibly by `tools/art_worlds_extra.py`. Terrain exports are four cropped, 32Ã—32 candidates per biome with deterministic selection per map tile. Glyphs that represent one continuous ground material share a family to avoid checkerboard patches. They are intentionally small in the runtime bundle; the source PNGs are retained here for rebuilding. The generated art is candidate material, not human-approved final art.

| Source | Native prompt intent | Runtime use | Source SHA-256 |
|---|---|---|---|
| `capsule-corp-grass-source.png` | clipped lawn, clover and sparse blossoms for Capsule Corporation | Capsule Corp floor variants | `EBFF7AA16F496DA7BAFA0859CDFC90E9646E82CF836FD30773A47EA0D5F97B53` |
| `capsule-corp-courtyard-source.png` | seamless pale blue-gray aggregate paving for the Capsule Corp courtyard | Capsule Corp courtyard path variants | `9E632D7C04FF2DC3F145058A40354A750E23218CD4E00482FA455CBB958C1529` |
| `rocky-outskirts-soil-source.png` | warm ochre canyon soil with fine slate pebbles and sparse dry grass | Rocky Outskirts connected ground variants | `BD43D589D4B8DED810CAF7E40E0B255D9D2CDC96426F626E306394B8EEA73DCF` |
| `mountain-lab-ground-source.png` | isolated high-altitude scree with sparse alpine grass | Mountain Lab floor variants | `937980FA3F4A43270653ABF3E95616086A232AAB9E91BF50B7D706A42E69B463` |
| `lab-interior-floor-source.png` | worn cool-gray laboratory metal with fine panel seams | Lab Interior floor variants | `2461C65120828A2D64F19AB077EDBD4F08E47F6252573360E0DC260570EA52D3` |
| `android-island-grass-source.png` | tropical grass, warm sand flecks and fallen palm leaves | Android Island floor variants | `F6CCF32E1091747A9436E9C3B7A9EE32424B529FC908774FAB5D3D04AF2BA91C` |
| `lookout-marble-floor-source.png` | airy ivory and blue-gray cloud-palace marble | Kami's Lookout floor variants | `B6B56A71DEA2F36BF55B86447613662F65187076ABAD01C86E175816E283F76B` |
| `time-chamber-ground-source.png` | near-blank ivory surface with sparse hairline cracks | Time Chamber floor and variants | `72FDD98DCB62A3269F0704031128BF7597632523A9345DF9CCD23D6D42A73A6A` |
| `cell-games-arena-stone-source.png` | pale worn tournament paving with scuffs and cracks | Cell Games Arena floor variants | `E00F56A760D47BFE60F5138E4386F22CCAFAED2521D5A8FB448CFB01BF8F11BD` |
| `navigation-sign-source.png` | transparent timber-and-enamel guidance sign | landing/tutorial sign interaction | `6124854D254297508D17119BF306449FED2FC643EA3730D67E4BC10E8BACF34F` |
| `capsule-flyer-source.png` | transparent compact two-seat Capsule Flyer | travel points that previously showed a purple marker | `BEE84EB3115D3F5B2E226FADBED0E68091DE1D21230F593D2955CD8EDD82BCAE` |

Terrain prompts request top-down 16-bit game art with no characters, labels, interface, or unrelated props. Transparent sign and flyer outputs were verified to carry real alpha (not a checkerboard). The flyer/sign runtime PNGs are cropped and downscaled by the build script. All map collision, paths, exits, quests, and story predicates are unchanged by these visual exports.
