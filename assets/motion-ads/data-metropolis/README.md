# Data Metropolis — source

A 22-second, 1920×1080 motion film: a bar chart (2019 20 · 2020 32 · 2021 48 · 2022 65 · 2023 83 · 2024 100)
becomes a city and folds back into the chart. Everything is drawn in code as a pure function of time.

## Play it

Open `index.html` in any modern browser. Space plays and pauses, the arrow keys step one frame, the slider scrubs.
It loads Unbounded, JetBrains Mono and Space Grotesk from Google Fonts; offline it falls back to system faces.
This standalone page is silent: the score only plays in the Motion player.

## Files

- `index.html` — standalone player: a minimal version of the Motion kit plus every module below, inlined.
- `film/film.json`, `film/cut.js` — the film as the Motion player stores it.
- `film/modules/scenes.json` — scene list and timing, palette, fonts.
- `film/modules/base.css` — colours and type classes.
- `film/modules/shared.js` — the engine: camera, perspective projection, the chart-to-city geometry, windows,
  streets, particles, labels and callouts. Every cue is a film-time constant in `TT` near the top.
- `film/modules/scene-*.js` — the six shots; each hands its time to the engine, the last one adds the title.
- `film/modules/score.js` — the original score as note events, for the Motion player's synth.

## Where to change things

- Data: `VALS` and `YEARS` in `shared.js` (tower height = value × `HS`). The display rows (`GROW`) and the
  callout text in `drawLabels` repeat the data, so update them together.
- Camera: `orbitAB` (0–7 s), the flight keys `FK` (7–16 s), the crane keys `DK` and final framing `DF` (16–22 s).
- Colours: `CY`, `AM`, `IV`, `NV`, `BK` in `shared.js`, and the variables in `base.css`.
- Canvas resolution: `PXR` in `shared.js` (2 = drawn at 3840×2160).
