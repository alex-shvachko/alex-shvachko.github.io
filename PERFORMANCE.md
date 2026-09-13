# Hero scene performance

Notes on what the three.js hero costs, what was cut, and how to check it on your
own machine. Everything here was measured rather than guessed.

## How to check it yourself

Open the site with `?debug`:

```
index.html?debug
```

A readout appears in the top-left corner:

```
60 fps   ratio 1.75
113 calls   532k tris
rays 0.50   smaa off
```

- **fps** - measured over the last half second.
- **ratio** - the current device pixel ratio. The scene lowers this on its own
  when frames get expensive, so a number below your display's ratio means it is
  already trading resolution to hold the frame rate.
- **calls / tris** - what the whole frame submits, every pass included.
- **rays** - the resolution the light shafts render at, relative to CSS pixels.
- **smaa** - whether the antialiasing pass is running.

If `fps` sits at 60 with `ratio` at its maximum, there is headroom to spare. If
`fps` is at 60 but `ratio` has dropped, it is holding 60 by rendering smaller.

## Where the frame actually goes

The scene draws itself more than once per frame, which is the thing to keep in
mind before optimising any single object:

| Pass | What it costs |
|---|---|
| Main render | the whole opaque scene, full resolution |
| Transmission | the opaque scene again, for the glass menu to refract (half res) |
| Pond reflection | the scene again from a mirrored camera, 256px |
| God-ray occlusion | canopy and trunk only, half res |
| Shadow map | rendered once at load, then frozen |
| Bloom, rays, grade, SMAA | full-screen passes |

So a triangle saved in the scene is a triangle saved three or four times over.

## What was changed

### The light shafts, which were the single most expensive thing on screen

The radial blur ran **96 texture fetches per pixel**. At a 1.75 pixel ratio on a
1440p display that is roughly 85 million fetches per frame for one soft glow.

It is now a two-pass separable blur: N samples at stride 1, then N samples at
stride N. Because the exponential falloff factorises as
`decay^(a + N*b) = decay^a * (decay^N)^b`, the two passes together cover an
`N*N`-long kernel. At N = 10 that is **20 fetches for a 100-sample reach** - a
4.8x cut, and slightly *longer* shafts than before.

The buffer is also now pinned to half the CSS size rather than half the device
size, so a high-DPI screen no longer blurs a 2000px buffer for an effect nobody
can resolve.

### Geometry

| | Before | After |
|---|---|---|
| Ground plane | 80,000 tris | 28,800 tris |
| Grass | 84,000 tris (14,000 blades) | 30,000 tris (5,000 blades) |
| **Scene total** | **311,126 tris** | **205,926 tris** |

The ground was 200x200 segments for a surface almost entirely hidden behind
grass, rocks or fog; the terrain detail it was resolving is a 0.011-unit ripple.

The grass is the more interesting one. Two thirds of a full disc of blades sits
behind the camera or off to the sides. Placement is now restricted to the view
wedge, so there are **fewer blades but more of them in frame** than before.

### Fewer full-resolution passes

- **Bloom** was tried at half resolution and put back to full. On paper it is
  free money: ten passes at a quarter of the pixels. Measured, it was worth
  about 2.5% of the frame, and the coarse bottom mip haloed the pinpoint
  highlight on each glass button bevel into a blocky white square sitting over
  the menu. Not a trade worth making.
- **SMAA** switches off once the pixel ratio is above 1.4, where the frame is
  already supersampled and the pass is softening edges that are no longer
  aliased.
- **The pond reflection** skips grass, motes, drifting leaves, the treeline, the
  glass menu and the robot. At 256px in dark water none of them read as anything
  but noise, and together they are most of the geometry.

### Adaptive quality

The controller samples frame time twice a second and steps the pixel ratio
between 0.75 and 1.75 to hold 60. Resolution is the first lever because it is
the one that scales every pixel cost at once. Only when resolution is already at
the floor and frames are still being missed does the grass start thinning, which
an `InstancedMesh` does for free by drawing fewer of its instances. It grows
back when the frame recovers.

## What was deliberately *not* changed

**The leaves.** Replacing the canopy was on the table, but measuring it settled
the question: the canopy is **8,166 triangles**, about 4% of the scene. Swapping
it would save almost nothing and would cost the two things it is carrying:

- the leaf-shaped shadows on the ground, which come from its alpha cutout, and
- the light shafts, which are built by pushing the sun through the real gaps in
  the real canopy texture.

The leaves are cheap and they are doing most of the visual work. The cost was
somewhere else.

**The robot.** At ~108,000 triangles he is the largest object in the scene, but
he is also the subject, and he is already one merged skinned mesh. He is skipped
in the pond reflection instead.

## Result

Measured at a pixel ratio of 1, 1280x720, software rasteriser (which weights
pixel work heavily, so it is a fair proxy for the fill-bound passes):

| | Median frame |
|---|---|
| Before | 704 ms |
| After | 524 ms |

**26% faster**, with per-frame submission down from 134 draw calls / 1.07M
triangles to 106 calls / 535k triangles.

The saving is larger on a real GPU at a high pixel ratio, because the biggest
cut - the ray blur - scales with pixel count, and because SMAA switches off
entirely above ratio 1.4.

## One more measured non-result

Dust motes are drawn as point sprites sized by distance. One drifting a couple
of metres from the lens was drawing a 20px sprite straight over the menu. They
now fade out closer than about 4.6 units and their sprite is capped at 10px:
nothing that close and that far out of focus should be legible at all.
