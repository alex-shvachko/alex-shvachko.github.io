# Main page to Experience transition

## Intent

Move from the portfolio's quiet green main page into **Experience** as one clear transformation: the rover's white paper frame grows into the world it will explore.

## Locked assets

- `generated-4k/opening-4k.png` — opening paper-frame composition.
- `generated-4k/experience-final-4k.png` — final aerial forest composition.
- `locked-final-frame.png` — the approved forest composition reference.
- `source-and-validation/` — earlier references, tests, motion checks, and rejected attempts. These are retained for traceability and are not production assets.

## Storyboard

1. **Main page — rover on paper**
   The opening holds the deep-green page and a slightly angled white paper frame. The rover is the only focal object; sparse sprouts stay inside the paper.

2. **White frame takes over**
   After an explicit Experience click or deliberate scroll threshold, the white paper scales outward until it fills the viewport. The green page remains visible only as the paper edges pass it.

3. **The forest grows in place**
   Sprouts, moss, and ground texture spread from the rover outward across the now full-screen white field. This is a single focused reveal, not many decorative effects.

4. **Lift into Experience**
   The camera appears to rise from the forest floor into the aerial composition. The forest gains fine trail branches, water, rocks, roots, and canopy detail while keeping the trail readable.

5. **Experience arrives**
   The aerial forest becomes the Experience section backdrop. One rover is already on the trail near the top and drives **forward toward the bottom of the screen**; its cyan-eyed front, wheel direction, and trail progression must all agree. The Experience content then fades in without covering the rover.

## Interaction and build rules

- Keep the core page static and GitHub Pages compatible; the transition must not require a server or 3D runtime.
- Trigger the sequence from the Experience link or a clear scroll action. Do not autoplay a long looping sequence.
- Use pre-rendered image/video media for the forest transformation. Animate only `transform` and `opacity` in the page layer.
- Preload the two 4K stills and supply compressed responsive derivatives before implementation. Do not load the full 4K originals on small screens.
- Honor `prefers-reduced-motion`: replace the expanding frame and camera lift with a short cross-fade from the paper frame to the aerial Experience scene. Keep focus and navigation state visible.
- Provide a visible “Skip transition” control whenever the full sequence is running.

## Acceptance checks

- The white paper—not a hard cut—visibly becomes the full screen before the forest appears.
- Greenery begins inside the former white-paper region and grows into the forest.
- Exactly one rover appears in the final aerial scene.
- The final rover drives top-to-bottom in real world-facing direction, verified from its cyan-eyed front, rear antenna, wheels, and trail marks—not position alone.
- The Experience section remains readable at desktop and mobile widths, and the reduced-motion path is tested separately.
