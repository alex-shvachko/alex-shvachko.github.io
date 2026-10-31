# THE BLACK BOX — OBSIDIAN X-01

A 25-second, 1920×1080, 60 fps motion film written entirely as code. Every frame is a pure
function of time, so any moment can be rendered on its own.

## Open it

Open `preview.html` in a desktop browser. It is self-contained (all code inlined) and plays
the picture without sound. Space plays or pauses, the arrow keys step one frame, and
`preview.html#t=17.3` opens paused on that second. The typefaces (Michroma, Barlow,
Azeret Mono) load from Google Fonts, so they need a connection; offline, system fonts stand in.

## What's inside

| File | What it is |
|---|---|
| `modules/shared.js` | The device engine: the one OBSIDIAN X-01 model, its camera and the whole timeline |
| `modules/scene-*.js` | One module per shot, each adding its overlays (scan line, call-outs, energy pattern, title) |
| `modules/base.css` | Palette as CSS variables, type stacks, call-out styles |
| `modules/scenes.json` | Shot list (ids, names, durations), size, fps, fonts |
| `modules/score.js` | The score, as note and sound-effect events |
| `film/script.js`, `film/meta.json` | The film's entry point and title |
| `preview.html` | Standalone player built from the files above |

## How the engine works

- **One object, one world.** The monolith is 800 × 120 × 520 world units, centred on the origin.
  Every part (shell walls, cover, locks, plates, boards, modules, rings, processor, chassis) is
  defined once with its assembled position, so the exploded view and the reassembly use the same
  coordinates.
- **One timeline.** Each scene calls `dev.render(G)` with `G` = film seconds, so the object never
  jumps at a cut. To retime the mechanics, edit these tables in `shared.js`:
  - `EX`: when each part opens and closes
  - `DY`: how far each part travels
  - `CP`: the camera poses
  - `RK`: the rings' speed profile
- **The 3D is simulated on vector graphics.** It is perspective-projected and drawn in SVG:
  - **Box faces** are projected exactly, corner by corner.
  - **Surface detail** (traces, ticks, engravings) is drawn flat and mapped onto each face with an affine transform.
  - **Paint order** goes from low to high, because the camera is always above the stack.
  - **Generated detail:** the circuit traces and other surface detail are generated from fixed seeds, so they are identical on every load.
- **The freeze.** `M(G)` is a motion clock that stops for 0.3 s after the core pulse, which is
  how everything holds still at 17.2 s.

## Running the modules elsewhere

The scene modules expect a small `kit` object from their host player:

- **Building the scene:** `kit.stage`, `kit.h(html)`, `kit.css(text)`, `kit.scene(id, {init, render})` and `kit.start`.
- **Easing helpers:** `seg`, `lerp`, `eo` and `eio`.

`preview.html` contains a minimal implementation of it to copy from.

## Limits of the preview

- **No sound.** `score.js` is written for the Motion player's built-in synthesizer; for sound,
  use the original artifact or its MP4 export.
- **Fonts aren't included.** Michroma, Barlow and Azeret Mono are under the SIL Open Font
  License; download them from Google Fonts if you want them local.
