# The Chain Reaction

A 35-second motion piece: one red marble sets off a machine of dominoes, gears, pigment, a turbine and a pinball table, and ends as the words EVERYTHING CONNECTS.

## Run it

Open `index.html` in a browser. No build step and no server needed. The typefaces (Archivo, Archivo Black, IBM Plex Mono) load from Google Fonts; offline, the film falls back to system fonts.

Keys: Space plays or pauses, ← and → step one frame (Shift for one second), Home and End jump to the start and the end. Drag the bar to scrub, or click a shot name to jump to it.

## How it is built

Everything is SVG and HTML drawn by plain JavaScript. There are no dependencies.

- `player.js` lays the shots end to end on a 1920×1080 stage, scales it to the window, and runs playback and the controls.
- `film/base.css` holds the palette and shared classes.
- `film/shared.js` is the drawing kit: gears that mesh correctly, the marble, dominoes, the camera, motion paths, and the machine sections that more than one shot shows.
- `film/shots/` has one file per shot, in order:
  1. `1-drop.js`, The first marble (3 s): A clamp opens, the red marble drops, bounces, rolls a curved rail and clicks the first lever.
  2. `2-dominoes.js`, Domino cathedral (4 s): Dominoes fall in growing, colored chains that converge on a brass lever, which unlocks a giant gear.
  3. `3-gears.js`, Clockwork (4 s): Meshed gears cascade into motion, drive a conveyor that carries the marble up while an arm unfolds.
  4. `4-cascade.js`, Color cascade (6 s): The marble trips the arm, valves pour cyan, magenta and yellow through tubes into a turbine that spins up.
  5. `5-pinball.js`, Impossible pinball (8 s): The turbine cocks a spring launcher; the marble rockets up a ramp, off a bumper, through a loop and paddles, into the air.
  6. `6-switch.js`, Master switch (5 s): At the apex the camera pulls back to the whole machine; the marble falls on the red switch and a wave wakes everything.
  7. `7-connects.js`, Everything connects (5 s): Rails, gears and plates lock into the words EVERYTHING CONNECTS.; the marble rolls in as the final period.

Each shot registers `{ init, render }`. `init(kit)` builds its SVG once. `render(t)` positions everything for time `t` in seconds, as a pure function of `t`, so every frame can be drawn on its own. Shots share one world layout, which is why the camera move and the marble carry straight across the cuts.

To change a shot, edit its file and reload. To change a shot's length, change the number in its `FILM.add(...)` call.

## Credits

Typefaces: Archivo and Archivo Black (The Archivo Project Authors) and IBM Plex Mono (IBM), all under the SIL Open Font License 1.1.
