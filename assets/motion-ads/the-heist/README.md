# THE HEIST

A 24-second Motion film (1920×1080, 60 fps): one 21-second unbroken camera shot followed by a 3-second "BREACHED." end card.

## Watch it

Open `preview/index.html` in Chrome, Edge or Safari. It is self-contained: the scene code and styles are inlined, so it runs straight from disk. Space plays and pauses; the left and right arrow keys step one frame.

The two typefaces (Michroma and Share Tech Mono) load from Google Fonts, so the preview needs an internet connection to show them; offline, it falls back to system fonts.

The preview is picture only. The score in `film/modules/score.js` is written for the Motion player's built-in synthesizer, so it plays on the artifact page and in its MP4 export, not here.

## What's in the folder

- `film/meta.json`: the title.
- `film/script.js`: the cut. It is one line that builds the timeline from `scenes.json`.
- `film/modules/scenes.json`: the scene list (ids, names, durations), palette and fonts.
- `film/modules/base.css`: the shared colors and type styles.
- `film/modules/scene-heist.js`: the continuous shot. The city, route, scanners, gates, vault and camera are drawn on a canvas in perspective, with an HTML overlay for the readouts.
- `film/modules/scene-breached.js`: the end card.
- `film/modules/score.js`: the music and sound effects, timed to the picture.
- `preview/index.html`: the standalone player, with a small stand-in for the Motion helper kit.

Every frame is a pure function of time, so the film scrubs and renders the same way each time. The main timing controls are in `scene-heist.js`: `sOf` is the signal's position along its route, and `kS`, `kP` and `kY` are the camera's zoom, tilt and heading. All are keyframe lists of `[seconds, value]`.

The MP4 comes from the Export button on the artifact page.
