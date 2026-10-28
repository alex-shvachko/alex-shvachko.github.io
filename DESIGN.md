---
name: Alex Shvachko — hairline portfolio
description: A personal card drawn in hairline, one isometric line world that answers the pointer.
colors:
  paper: "#ffffff"
  stone: "#f4f4f5"
  plate: "#ffffff"
  ink: "#0a0a0a"
  ink-2: "#3f3f46"
  muted: "#696972"
  faint: "#a1a1aa"
  accent: "#0759ff"
  line-hi: "#141416"
  line-edge: "#6b6b74"
  line-mid: "#9d9da6"
  line-lo: "#d8d8dd"
  paper-dark: "#08090a"
  stone-dark: "#121315"
  plate-dark: "#0e0f11"
  ink-dark: "#ededef"
  ink-2-dark: "#c4c6cc"
  muted-dark: "#83858d"
  accent-dark: "#4d8dff"
  line-hi-dark: "#f4f4f6"
  line-edge-dark: "#a3a3ad"
  line-mid-dark: "#6c6c75"
  line-lo-dark: "#38383f"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.4rem, 7.2vw, 6rem)"
    fontWeight: 520
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  display-accent:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.18em"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 4.1vw, 4.6rem)"
    fontWeight: 520
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 560
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  chip: "7px"
  control: "10px"
  button: "12px"
  card: "14px"
  tile: "16px"
  sheet: "20px"
  panel: "22px"
  pill: "999px"
spacing:
  gutter: "clamp(18px, 4.5vw, 64px)"
  topbar: "56px"
  grid-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    height: "46px"
    padding: "0 16px 0 20px"
  card:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
  tile:
    backgroundColor: "{colors.plate}"
    rounded: "{rounded.tile}"
  segmented:
    backgroundColor: "{colors.stone}"
    rounded: "{rounded.control}"
    height: "36px"
  tag:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  tag-focused:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
---

## Overview

The site is a personal card drawn in the language of [hairline](https://github.com/lucasmarkes/hairline): isometric line drawings built from rounded solids, drawn as one silhouette plus one dim crease, that answer the pointer. One fixed SVG world (`assets/hairline/world.js`, on the hairline kernel) sits behind all four stages and replaces the old scroll-scrubbed film. Scroll steers its camera through four places: the **studio** (a rover on a plinth, Home), the **path** (an aerial trail through a hand-drawn line forest, `assets/hairline/forest.js`, with a marker beside each Journey card), the **archive** (the world quiets behind Projects) and the **signal** (the floor falls away into a drawn night sky of planets, moons, constellations and shooting stars above Contact, where a hairline dish follows the pointer). The site opens in light for every visitor; the switch in the top bar turns it dark, and that choice is remembered.

## Colors

Restrained: chroma-free greys plus one accent. `paper` is the ground; `plate` is every card, tile and panel; `stone` is the recessed surface (segmented bars, icon wells, hover rows). The line world uses its own four strokes, after the hairline palette but set darker (lighter in dark mode) and drawn at 1.2px so the drawing reads at a glance: `line-hi` (the only bright stroke), `line-edge` (silhouettes, leaders, links), `line-mid` (creases and plates), `line-lo` (the floor grid and the globe's far side). The two hairline package figures take the same palette and weight. Plates in the world are filled with `paper`, so a nearer solid hides a farther one.

Electric blue (`accent`) marks only the live point: the rover's eyes, the active Journey marker and card number, the location pin and text selection. Every dark value has a counterpart (`*-dark`); the switch swaps the whole set at once.

## Typography

Geist for everything readable, set tight (display tracking −0.04em, never tighter). One Instrument Serif italic word per heading carries the voice: *Shvachko*, *so far*. Geist Mono only for measurements and read-outs: dates, numbers, the stage index, labels such as `MY BACKGROUND`, and the corner read-outs (`rover · rest`, `signal · az 78 · el 31`). Numerals in those places are tabular.

## Layout

Four stages, unchanged in order and content: Home, Journey, Projects, Contact. A 56px top bar floats over everything and holds only two switches, sound (off until turned on; nothing plays yet) and theme, in a pill that is clear over the hero and frosts once the headline leaves. Home puts the name left and the rover right (above the copy on phones). Journey pins for 540svh on wide screens with the cards in two staggered columns and the trail down the gutter between them; below 1100px it stacks. Projects is a centred 1240px column. Contact is one wide plate of three columns that collapses to two, then one.

## Elevation & Depth

A plate is drawn by its shadow alone: `--card` (a 1px ring plus two soft drops) and, when it should float, `--lift` or `--lift-lg` (an offset, long, soft shadow). No hard offset shadows, no glows. Blur appears only where it does a job: the frosted top bar, the project number chips over imagery, and the sheet's backdrop.

## Shapes

Every corner is round. Chips 7px, controls 10px, buttons 12px, cards 14px, tiles 16px, the sheet 20px, the contact panel 22px; small action buttons and globe tags are circles or pills. Icons are drawn lines at about 1.2–1.5px, round caps and joins.

## Components

- **The forest**: groves of pines and spruces (scalloped tiers with drooping tips, a ridge and two branch strokes each), broadleaf trees with cloud crowns drawn as bulging scallops, birches with bark ticks, saplings at the groves' edges, an understory of bushes, stones and fallen logs showing their rings, thickets and boulders in the open, mushrooms, dense grass and pebbles, and a river with shallows, ripples, stones and reeds crossed by a wide plank bridge on two beams with a post rail each side. Everything is placed against the Journey camera so it fills the visible frame while the rover's way and the stage's text stay clear, painted back to front with the rover slotted in by depth, and grown outward from the studio as the camera rises (each piece scales up from its foot). The pointer is a wind: it pushes trees, bushes and grass outward and gusts them the way it sweeps, and they spring back; the rover stirs them as it passes. Once the world has faded behind Projects the wind drops and the rover stops following the pointer. The floor grid steps back to 42% over it.
- **The signal sky** (`assets/hairline/cosmos.js`): what the floor falls away into above Contact, drawn in the same line. A ringed giant (cloud bands, a spot, thirteen ring strokes split into a back half behind the body and a front half across it, a hatched shadow limb), a dark cratered world with a thin bright limb and a compass ring, a small ringed planet, a far limb at the edge, a crescent, moons on dashed orbits, three constellations of nodes joined by hairlines, great dashed orbits, and a stippled band of galaxy over fine dust. Four-point sparks pulse; the biggest carry a burst of fine rays. Every few seconds a shooting star crosses down and left, its head the one blue point. It is three layers so nothing repaints needlessly: `far` (dust, guides, constellations), `near` (the planets, drawn once) and `fx` (sparks, moons, shooting stars). The sky rises into place as the floor falls away, the nearer layer further, and the three lean to the pointer by different amounts. Its loop runs only while the sky is shown. Reduced motion never shows the sky. The contact stage opens on roughly one screen of it, the dish in the middle, before the panel.
- **The signal instrument** (`assets/hairline/signal.js`, markup in `.contact-signal`): the dish at the middle of a hairline trace, with noise running in from the left and a clean pulse train running out on the right, a mono read-out (`signal ── az 76 · el 31 ── snr +19.1 dB ── locked`), a twenty-tick meter and, beneath, the statement *I turn noise into signal.* How well it is locked on, 0 to 1, sets how much noise is left on the right, how tall the pulse stands, the SNR and the status (searching, tracking, locked). The lock is found by aiming at the beacon, the brightest burst in the sky, whose reticle closes round it as it locks (the dish follows the pointer), and rises on its own as the stage reaches the middle of the screen. The one blue point on the page is the trace's live end, and the status turns blue when locked. The block sits directly above the panel so it is still on screen at full scroll; the sky recedes to a faint backdrop as the page is read, the beacon staying bright, and stars and constellations keep out of the text column. Reduced motion draws one still frame, locked on.
- **The rover's head**: a rounded box held between the two arms of a yoke. The yoke stands on a notched turntable that turns toward the pointer, and the head nods up and down to it on a pivot disc in each arm whose marks turn with the nod; nothing props it from below. Its front is a dark screen with a glare stroke, where two accent eyes morph between moods (open, wide, intent, glad, a wink, drowsy) and blink: glad and facing you with the pointer on its head, intent while it hurries along the trail, drowsy after six idle seconds, with a passing mood of its own now and then.
- **The rover's wheels and burnout**: six lugged tyres (a chevron tread that runs down each shoulder) round dished five-spoke rims with a bolted hub standing proud. Spun faster than a frame can show, the lugs, spokes and bolts blur into rings. A click on a wheel (the pointer turns to a hand over one) does a burnout on that axle: its pair spins up while the others hold the rover in place, the body shudders and slews a little, the antenna whips, the face goes intent and then glad, and the tyres throw back a cloud of smoke (puffs drawn as one outlined cloud) and leave grey rubber that fades. More clicks keep it going, up to a few seconds. Reduced motion has no burnout.
- **Primary button**: ink plate, paper text, arrow that slides 3px on hover; presses scale to 0.97.
- **Topic pin**: an ink dot with a soft pulse on a rover part, a hairline leader, a plate label. Placed live from the world's camera (`connectors.js`).
- **Journey card**: plate with ring and lift; mono meta row; the active card gets an ink ring and an accent number. Unrevealed cards are clipped, blurred and dimmed until the scroll reaches them; a curved hairline link reaches the marker beside each card.
- **Skill globe**: a plate holding a wireframe sphere (near half brighter than the far half, a dashed orbit ring) with pill tags that turn with it; the focused chapter's tags fill with ink.
- **Project archive** (the default Projects view): hairline's tray of folders, drawn large and centred on the same kernel (`assets/hairline/archive.js`). There is one tray per category, in the filter's order, standing in a row; the first holds every project. Each tray's category and count are lettered on its front wall, either side of the handle. Choosing a category slides the row to its tray (the tray it leaves lays its folders back down, and a project that was out stays out if the new tray holds it); the trays to either side wait dimmed, and a click on one, or a swipe on touch, brings it in front through its filter button. Every folder wears its project's picture; the folder under the pointer, or chosen with the arrow keys, stands up out of the tray and plays its preview (the project's video where it has one), and the caption under the tray names it with an Open button. A tap picks a folder on touch; a second tap or a click opens the sheet. A view switch beside the sort turns it into the grid of tiles; the filter and sort drive both.
- **Segmented filter**: stone bar, a plate that slides to the pressed button.
- **Project tile**: plate with the image inset 6px; leans up to 6° toward the pointer with a soft light following it; the arrow turns 45° on hover. Opening a tile moves its picture into the sheet with a view transition.
- **Contact rows**: icon in a stone well, title and detail, a round go-button that fills with ink on hover.

Motion: discrete changes use a long ease-out (`cubic-bezier(.32,.72,0,1)`, 450–700ms); continuous pointer input uses springs; entrances use `cubic-bezier(.16,1,.3,1)`. The one authored moment is the opening: the plinth and the rover draw themselves line by line, then the rover opens its eyes and the topic pins arrive. Every effect has a `prefers-reduced-motion` path: the world holds a still studio, nothing autoplays, and state changes stay as fades.

## Do's and Don'ts

- Do draw new illustration in the world's grammar: rounded solids, one silhouette and one crease, `line-hi` for at most one thing at a time.
- Do keep blue for the single live point; use weight and ink for emphasis everywhere else.
- Do keep every figure and the world's loop asleep when off screen or at rest.
- Do redraw only what changed: write a path only when its `d` differs, leave fades and camera moves to the compositor (the world's three layers carry the camera between redraws), and never set a value that changes per frame on `<html>`, which restyles the whole page.
- Don't add fills, gradients, glows or coloured shadows to line drawings.
- Don't put words inside drawings; names go to labels and read-outs outside them.
- Don't use monospace as decoration; it is for measures and read-outs.
- Don't change the four stages or their content when restyling.
