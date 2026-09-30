# Rover forest transition — canonical story and generation prompt

Updated: 2026-09-30

## Purpose and acceptance
This is part of the personal website UI. The opening transitions from the homepage into Work Experience and Education. In the second phase, the trail on the LEFT is the fixed timeline and ONE rover traveling DOWN it is the progress marker. Text and milestones belong to the website layer; do not bake invented career or education content into video.

The final forest framing, trail, pond and lighting must remain stationary. Exactly one consistent rover must drive forward from top to bottom. Reject duplicate rovers, reversed travel, robot replacement, background drift, camera tracking, changing scale in the locked phase, and corner sun/glow. A draft passing only duration or upload checks is not accepted.

## What failed in the September 30 first clip
Inspected 6.0–9.75 seconds at four samples per second in `draft-2026-09-30-no-corner-sun/qa-end-dense.jpg`.
Around 7.0 seconds, the earlier rover stays on the lower trail while a second rover appears near the upper trail. Two bodies remain visible through the overhead segment. The apparent cause is conflicting close-view trajectory and an imposed upper-position ending reference; that cause is an inference, while the two bodies are directly visible.
The edited ending also dissolves the generated robot position into the reference robot position. This can cause an additional ghost/reset and is not a continuity fix.
Earlier statements that the retry had one rover and a clean handoff were overstated. Do not use those claims as approval.

## Reference mapping
- 01_paper-rover-opening.png: opening.
- 02_white-frame-front-rover.png: front view after white takeover.
- 03_camera-orbit-right-inbetween.png: camera passes right side.
- 04_rear-view-greenery-ground.png: rear camera, forward movement away.
- 05_more-greenery-trees-begin.png: growing greenery and young trees.
- 06_camera-rises-trees-spread.png: rising camera.
- Create-a-farther-zoomed-out-version-of-t-065.png: extra 06.5 beat.
- 07_high-zoomout-rover-forest.png: higher forest beat. This is byte-identical to extra06.5; supply it once to avoid redundant conditioning, while retaining both story beats in the prompt.
- 08_aerial-rover-starts-downtrail.png / requested-end-frame.png: clean aerial composition, upper rover position. For the WHOLE story this is an intermediate landmark where the locked UI phase starts, not a final-position constraint.
- 10_aerial-rover-lowertrail.png: final route-position guide; ignore its differing camera crop.
- 09_aerial-rover-midtrail.png: do not supply for this attempt because it contains corner illumination that previous generations copied.

## Single reusable prompt
Use the following as the authoritative story prompt. For a different duration, scale all times proportionally without changing the order or requirements.

```text
Create one uninterrupted 20-second cinematic website transition starring ONE physical four-wheel exploration rover. This is the visual journey from the homepage into the Work Experience and Education section. In the final aerial phase the fixed winding trail on the LEFT functions as the website timeline, and the SINGLE rover's forward travel DOWN it functions as the user's progress marker. Preserve a stable landscape so website content can be placed beside it later. Do not generate words, dates, labels, milestone graphics, logos or interface panels.

ONE SUBJECT, ONE TRAJECTORY: Track the original rover continuously from the opening photograph through the forest into the overhead view. White solid chassis and roof, four rugged black wheels, black suspension, roof lidar, rear antenna, black FRONT face with two cyan ring eyes remain consistent. The front always leads; the rear follows. The camera travels around this same rover; the robot never turns into another subject. As the camera climbs, the original rover gets smaller continuously. An upper-trail reference is a future view of THIS rover, never a new rover to introduce. Never keep the close rover in the foreground while creating an aerial rover. Never crossfade between independently placed robots. Never teleport the rover up the trail to satisfy a reference.

REFERENCES: In order, opening01; front02; side03; rear04; plants05; rising06; extra06.5; higher07; clean overhead08; then progression toward lower trail10. They are landmarks within one moving world, not separate scenes. Extra06.5 and07 are identical files and may be supplied once as one visual landmark spanning both beats. The clean overhead08 defines the locked forest composition and illumination. Lower-trail10 guides position along the path; its different crop is not permission to move the camera. Omit sun-glow reference09. The overhead08 is an intermediate stage, not the final rover position of the complete story.

0–2s: Original rover sits on a tilted white paper panel on a deep emerald page. Paper expands smoothly toward viewer until its edges pass outside the screen and white fills the viewport. Camera smoothly begins moving around the rover's right side.
2–5s: Continue the same camera arc through right side to rear. Moss and tiny plants spread over ground. The same rover begins rolling forward away from the rear camera, grounded with natural wheel rotation.
5–8s: Greenery thickens and saplings grow. Camera rises and pulls back while continuing one consistent arc around toward the rover's front. Keep the white roof and body unchanged. White recedes completely into dense forest.
8–10s: Pass the extra farther forest view and high zoom-out stage. Camera continues climbing with continuous parallax. Keep tracking the one original rover and its world position; do not spawn a replacement near the trail's top. Reveal the winding trail as one connected route beneath it.
10–12s: Resolve into clean overhead08 composition. By this moment the same rover occupies the UPPER trail, its cyan-eyed nose oriented DOWN the road. Resolve the camera position smoothly, then lock it completely. The lower area of the trail is EMPTY until this single rover reaches it. No second approaching vehicle.
12–19s: Camera and forest are fixed. ONLY the original rover and attached contact shadow move. It drives FORWARD from the upper trail through its middle toward the lower trail, front leading downward. Follow bends with smooth steering, natural wheel rotation and constant apparent rover scale. Screen progress goes top to bottom, never reverse or upward. Forest, trail, pond, rocks, vegetation, lighting and all frame edges stay in exactly the same positions. No zoom or tracking. Keep the trail on the left and the pond to its right.
19–20s: Ease the rover to its lower milestone while staying fully visible and facing down the trail. Hold camera and landscape without resetting the rover to the upper starting point.

Controlled daylight with light source outside the image. All four corners contain normally exposed, detailed forest: no visible sun disk, top-right glow, bloom, flare, rays or golden corner wash. Stable color and exposure. Crisp mechanical and leaf detail, restrained blur, smooth acceleration, coherent scale and geometry. No cuts, dissolves, teleportation, duplicate bodies, extra wheels, robot deformation, changing background, water animation or foliage drift. Exactly one visible rover in every frame from beginning to end.
```

## Seedance 2.0 Mini production format
Live model catalog checked September 30: duration 4–15 seconds, resolution 480p/720p. A native single 20-second Mini generation is unsupported. Do not send duration20 and describe a coerced15 result as native20.
The next attempt generates ONE 15-second take at720p, high bitrate,16:9, silent, using timestamps scaled by0.75; a uniform playback slowdown to20 seconds may then produce a review draft. This slows the motion and does not add new generated frames or guarantee smoothness.
Input roles through Higgsfield: start_image01, image references02–06,07/extra06.5 once,08, and end_image10. Generic image is mapped by Higgsfield to Seedance image_references.
For a future native20-second generation choose a model supporting20 only with user authorization to change models.

## Verification before calling it clean
Inspect the full pullback densely and count bodies, not just rover coordinates. Check cyan-eyed front, rear antenna, wheel/contact motion, continuous trajectory, no upper-position reset, no second rover arriving from below, all four corners, static background throughout the locked phase, and the final output duration.
A website implementation must connect rover progress to actual scroll progress; an autoplaying video alone is not a working timeline UI. Static GitHub Pages compatibility remains required.

