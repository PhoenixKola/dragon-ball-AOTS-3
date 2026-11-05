# Production VFX art

## Tien's Neo Tri-Beam

- Source: `neo-tri-beam-source.png`, isolated native Codex ImageGen RGBA artwork.
- Prompt: three tapered energy prongs converge around a brilliant ivory core, lime-gold and pale cyan 16-bit palette; projectile head oriented right, transparent background, no character/text/trail.
- Source SHA-256: `c0350d6143c7dbd25fd3e3d2274bd50d2e98e8f126782437a4be96fa8cb3135b`.
- Build: `python tools/build_art.py --only vfx`. The pipeline alpha-crops and nearest-neighbour fits the head to 116px inside a transparent 128px frame.
- Runtime: `public/assets/vfx/beam-neo-tri/0.png`; Tien's `tien_2` launches the three-pronged head on the existing ki-contact timeline with a matching lime core.
- Approval: candidate. Human art approval remains pending.

## Piccolo's Hellzone Grenade

- Source: `hellzone-grenade-source.png`, isolated native Codex ImageGen RGBA artwork.
- Prompt: compact emerald ki orb with a luminous lime core, cyan-green shell and three tiny orbiting sparks; 16-bit anime game palette, readable at 48px, transparent background, no character or text.
- Source SHA-256: `6b569f7a143b812f8205c231a661201a2d31c8f94a6f92dde293da12ac9c47c8`.
- Build: `python tools/build_art.py --only vfx`. The pipeline crops alpha bounds and nearest-neighbour fits the projectile to 116px inside a transparent 128px frame.
- Runtime: `public/assets/vfx/hellzone-grenade/0.png`; Piccolo's five-hit random-spread `piccolo_1` fires this distinct projectile for each authoritative hit event.
- Approval: candidate. Human art approval remains pending.

## Cell's absorption drain

- Source: `absorb-drain-source.png`, native Codex ImageGen RGBA artwork with four equal horizontal temporal cells.
- Prompt: compact emerald energy-drain vortex; loose sparks, inward curl, tight spiral, contraction/fade; dark green outlines and lime/emerald pixel clusters; transparent background; no character or text.
- Source SHA-256: `500D3E8C6AFF2F4F07F71E525EDC209205FA1E6ACB4C535FB915C913E9832906`.
- Build: `python tools/build_art.py --only vfx`. The pipeline alpha-crops each source cell independently, nearest-neighbour fits it inside 128px, and keeps a common center.
- Runtime: `public/assets/vfx/absorb/0.png` through `3.png`; Cell's energy absorption uses the green temporal drain on its real absorbed-hit event.
- Approval: candidate. Human art approval remains pending.

## Hex barrier formation and impact

- Source: `barrier-formation-source.png`, native Codex ImageGen RGBA artwork using the installed `public/assets/vfx/barrier/0.png` as its AOTS3 style reference.
- Prompt: four equal temporal phases of a blue hexagonal shield: forming rim, closed shield, impact pulse, and fractured hex sparks; retain the installed shield motif and pixel scale; transparent background; no characters or text.
- Source SHA-256: `C27875D9C4E1CFB63210FA5FCF4BF046AED88E2A18F9FBF17B0D2CAE2941AC20`.
- Build: `python tools/build_art.py --only vfx`. The pipeline alpha-crops each source cell independently and nearest-neighbour fits it inside a shared 128px canvas.
- Runtime: `public/assets/vfx/barrier/0.png` through `3.png`; guard stances, counter stances and visible status resistance use the registered temporal shield sequence.
- Approval: candidate. Human art approval remains pending.

## Piccolo's Special Beam Cannon

- Source: `special-beam-cannon-source.png`, an isolated native Codex ImageGen RGBA output based on the supplied Special Beam Cannon effect reference.
- Prompt: compact centered projectile head; bright pale mint core; green spiral drill arcs; crisp pixel edges; transparent padding; no extending beam, text, or panel.
- Source SHA-256: `DB532CEA67F6F59CFD9220AFF9808E57BE6BD84393190D39E73A402EB20B4256`.
- Build: `python tools/build_art.py --only vfx`. The pipeline alpha-crops, nearest-neighbour fits to 96px inside a centered 128px canvas, and derives eight true angular frames at 45-degree increments.
- Runtime: `public/assets/vfx/special-beam-cannon/0.png` through `7.png`, registered as a green beam family temporal sequence and used by Piccolo's `piccolo_0` skill.
- Approval: candidate. Human art approval remains pending.

## Tien's Telekinetic Pin

- Source: `telekinetic-pin-source.png`, native Codex ImageGen RGBA artwork referencing the installed cyan barrier glyph.
- Prompt: target restraint glyph of three luminous cyan energy bands with angular force tethers and a bright center knot; crisp pixel shading; isolated on transparency, no figure/text/UI/background.
- Source SHA-256: `436DD39545E9CA2C70707425562C00A2C107B77F5E59174593AD99BA1E49F69D`.
- Build: `python tools/build_art.py --only vfx`. The pipeline alpha-crops and nearest-neighbour fits it to 128px, then derives five closure/settle stages.
- Runtime: `public/assets/vfx/telekinetic-pin/0.png` through `4.png`; Tien's real `tien_5` cast places the sequence on its selected target.
- Approval: candidate. Human art approval remains pending.

## Goku's Spirit Bomb

- Source: spirit-bomb-source.png, a native Codex ImageGen RGBA output using AOTS3's blue energy orb as its style reference.
- Prompt: large azure-white spirit sphere with layered sky-blue flame wisps, pale core, cobalt rim and contained star glints; crisp pixel-art clusters; transparent padding; no figure, text or beam.
- Source SHA-256: 5C6E67A9F031074033A4401A05AF514AA9B31FF35299CE857E69E12954DA8508.
- Build: python tools/build_art.py --only vfx. The pipeline normalizes the alpha bounds to a 128px canvas and derives six nearest-neighbour charge-growth frames.
- Runtime: public/assets/vfx/spirit-bomb/0.png through 5.png; the held charge sphere grows above Goku and the release launches the oversized sphere at every target, synchronized with real hit events.
- Approval: candidate. Human art approval remains pending.

## Transformation shockwave

- Source: `transform-shockwave-source.png`, native Codex ImageGen RGBA artwork. The first generated four-cell sheet was rejected for color fringing and inconsistent geometry; only the cleaner single-ring source is retained.
- Prompt: isolated gold-white circular ki shockwave ring for a 16-bit anime JRPG, warm gold palette, coherent hollow center, clean transparency, no figure or text. The source is used as one authored sprite and is expanded/faded by the runtime; it is not presented as a multi-frame animation.
- Source SHA-256: `FB1A3874DC75BED39128931B251AC7177BCDB14E57176793F52DEAD3274B2542`.
- Build: `python tools/build_art.py --only vfx`. The pipeline removes alpha fringe below 24, crops visible bounds, and nearest-neighbour fits the ring to a transparent 128px canvas.
- Runtime: `vfx:transform-shockwave:0`, expanded behind the fighter during the form reveal. Story and battle stages use the same charge/release/impact sound cues. Candidate; human art approval pending.
