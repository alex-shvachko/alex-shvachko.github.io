# Website implementation and motion review

Reviewed 2026-10-04 on `next-gen-rework`. Scope: Home, Journey, Projects and Contact, preserving the existing UI. Impeccable's audit, animate, optimize and polish guidance informed the work.

## Implementation integrity verdict

**Pass for a coherent portfolio mockup; further work required before presenting it as a finished professional portfolio.** The incumbent Anton display typography, blue/pink accents, cut panels, illustrated environments, skill orbit and four-stage sequence form a consistent visual identity. This pass preserves that identity and all factual copy, control labels, images and layout. The production content concern below remains explicit.

## Audit health score

These are implementation review scores, not a WCAG certification or a Lighthouse result.

| Dimension | Score / 4 | Evidence and limitation |
| --- | ---: | --- |
| Accessibility | 2 | Native controls, keyboard focus, motion preference and status announcements work; blue display text has insufficient contrast against the solid fallback green. |
| Performance | 2 | Offscreen work is bounded, Journey is deferred, images are losslessly smaller; the video payload is still substantial. |
| Responsive design | 3 | Desktop and 390 × 844 layouts pass overflow and interaction checks; small navigation and crowded orbit labels remain. Physical touch was not tested. |
| Theming | 2 | Global/accent variables exist, but many component colors remain literal. The supplied design intentionally uses one visual theme. |
| Implementation integrity | 3 | Consistent authored world and functioning navigation; timeline and project case studies still contain explicitly labeled mock content. |
| **Total** | **12 / 20** | **Acceptable: address accessibility, payload and publication content next.** |

Remaining findings: **0 P0, 2 P1, 3 P2, 1 P3**. The required motion repair and the scoped enhancements are complete. Remaining visual/content changes were documented because the brief preserves the UI.

## Motion changes completed

| Surface | Result |
| --- | --- |
| Home | A single 650 ms heading reveal followed by short copy/CTA/topic fades. Visible defaults remain readable, and reduced motion skips the entrance. |
| Journey | Orbit settling uses elapsed time rather than frames, preserving timing across refresh rates. Video preloads near the section after opening geometry settles. Offscreen/hidden work stops. Lost pointer capture clears the drag. Focusing an unrevealed card makes its content readable. |
| Projects | Filtering and sorting animate existing tile positions for 280 ms and fade newly visible tiles for 180 ms. Rapid input cancels previous motion before measuring positions. Reduced motion uses a short opacity change. Native disclosure content receives a short fade. |
| Controls | Existing arrows respond to hover and keyboard focus; filter buttons have press feedback. Manual and OS reduced motion suppress spatial feedback. |
| Projects → Contact and back | A shared scroll position selects the same frame in both directions. Endpoint holds accompany smooth fades. Re-entry seeks the appropriate endpoint before exposing video; an endpoint poster prevents a stale-frame flash. Overlapping the transition with the adjacent sections removes the extra gap and completes the handoff even at page end. |
| Contact | The smaller sky loop plays continuously while exposed, pauses behind the transition/offscreen/when hidden, and preserves time during scroll. It uses a viewport-sized sticky frame on tall mobile layouts. |
| Section links | Anchor landings use the section top, preventing a partially visible transition from covering Projects after direct navigation. |

Animation uses existing CSS, requestAnimationFrame and the browser's Web Animations API. No framework or production dependency was added. Static GitHub Pages deployment remains supported through relative assets.

## Measured asset improvement

Eight PNGs were converted to lossless WebP. Decoded RGBA frame hashes match for every pair, so the images retain their pixels and dimensions. Original files are preserved.

- Combined image payload: **16.14 MiB → 9.57 MiB**, a **40.7%** reduction.
- Home's initial settled state has no Journey video source assigned. Journey's 23.31 MiB video is assigned when approaching its warm range.
- All assets referenced by HTML/CSS total **83.7 MiB**, including lazy media and fallback references. This is a disk-size inventory, not a measured first-load transfer.
- Detailed per-image evidence: `output/image-optimization.json`.

Current video files remain large:

| Video | Size |
| --- | ---: |
| Home scroll | 15.37 MiB |
| Journey scroll | 23.31 MiB |
| Journey → Projects transition | 8.88 MiB |
| Projects → Contact transition | 11.30 MiB |
| Contact loop | 4.36 MiB |

## Remaining findings

### [P1] Blue display text lacks contrast on the fallback green

**Location:** `assets/motion/home.css:3`, `assets/motion/home.css:9`; Journey heading rules in `assets/motion/journey.css:1`. **Category:** Accessibility.

The detector measures blue `#0759ff` against green `#153b2e` at about **2.3:1**, below WCAG 1.4.3's **3:1** requirement for large text. Journey's solid fallback green is about **2.5:1**; its actual moving image varies behind the text. The preserved hero screenshot also shows the blue word over the dark green area. Some navigation over bright imagery needs a separate contrast review.

**Recommendation:** In a future visual pass, adjust the text/backdrop pairing to meet the contrast threshold in both video and fallback states. The palette was preserved in this motion pass. Suggested command: `/impeccable colorize`.

### [P1] Mock claims and case studies require publication review

**Location:** `index.html:34`–`38`, `index.html:54`; `CONTENT.md:15`–`29`, `CONTENT.md:69`–`71`. **Category:** Implementation integrity.

The sample timeline includes “B.Sc. Computer Science” and sample roles/dates, while preserved content lists a Diploma in Data Engineering and different experience. Project descriptions explicitly call themselves preview slots. Existing mock labels and the page description correctly disclose this state, but it is not finished professional portfolio content.

**Recommendation:** Before promoting this branch to the production site, reconcile the timeline and add approved, verified case-study content. Do not infer credentials or replace claims automatically. Suggested command: `/impeccable clarify`.

### [P2] Video transfer remains expensive on mobile connections

**Location:** media references in `index.html:24`, `index.html:30`, `index.html:48`, `index.html:57`, `index.html:72`. **Category:** Performance.

The main scroll footage still totals tens of MiB. Deferring below-fold media reduces startup competition, but cannot remove bandwidth/decode cost when those scenes are visited. A fast local preview does not establish mobile frame rate or Core Web Vitals.

**Recommendation:** Evaluate smaller alternative encodes against the existing visual quality, with real-network/device measurements and poster-first delivery. Suggested command: `/impeccable optimize`.

### [P2] Navigation and supporting labels are small

**Location:** `assets/motion/home.css:4`, its mobile rules; `assets/motion/projects.css:1`. **Category:** Accessibility / Responsive design.

Home navigation uses 10 px text without a generous hit area; mobile topic labels use 7 px. Projects navigation measures 35 px high on desktop, below the 44 px ergonomic target. Existing controls remain keyboard accessible, but these areas are less comfortable to read or tap. Small text alone is not an automatic WCAG failure; target spacing/exceptions need assessment.

**Recommendation:** A future UI pass should expand hit areas and reassess label sizes without crowding the header. Suggested command: `/impeccable adapt`.

### [P2] Mobile orbit labels overlap heavily

**Location:** `assets/motion/journey.js:34`, sphere rules in `assets/motion/journey.css:1` and `:3`. **Category:** Responsive design.

The 390 × 844 capture shows multiple front/rear labels overlapping inside the preserved orbit. Perspective and rear opacity make the spatial effect clear, but reduce quick scanning. The DOM exposes all skill labels, and chapter controls offer a non-drag way to select groups.

**Recommendation:** If UI changes become permitted, reduce visible density or provide a flat skill presentation on small screens. Physical touch/drag behavior still needs device testing. Suggested command: `/impeccable adapt`.

### [P3] Component colors are only partially tokenized

**Location:** `assets/motion/portfolio.css:1`, `assets/motion/projects.css:1`, `assets/motion/contact.css`. **Category:** Theming.

Accent variables coexist with repeated literal blue, pink, ink and white values. This increases maintenance effort; it does not imply that a theme switch is needed.

**Recommendation:** Consolidate equivalent values when a broader maintenance pass is authorized. Suggested command: `/impeccable extract`.

## Detector findings interpreted in context

The bundled detector ran once after implementation. Its raw report is `output/impeccable-audit.json`: 70 notices across 12 categories. Notices are not 70 independently verified defects.

- **Verified:** insufficient blue/green contrast and small functional text.
- **False background inference:** repeated Contact contrast reports pair dark ink with the footer's dark backdrop. Actual copy sits on white panel pseudo-elements, as the desktop/mobile screenshots show.
- **False content inference:** icon-only arrow wrappers are not cramped paragraphs; hidden transition images are intentionally absent at rest and visible during handoff; topic labels are informational, not controls; date-range dashes are not a prose-writing defect.
- **Preserved art direction:** offset shadows, angular cuts, uppercase/monospace labels, dark text shadows and the quote accent belong to the incumbent design. They were not replaced to satisfy generic style heuristics.

Skiper's free component catalog was inspected. Available examples such as its [theme button](https://skiper-ui.com/v1/skiper26) use React/Motion and introduce controls or dependencies that do not fit this vanilla, UI-preserving pass. No component was imported. [Catalog](https://skiper-ui.com/components), [terms](https://skiper-ui.com/docs/terms-of-service).

## Verification and evidence

- `node tools/check_site.mjs`: 26 unique IDs, internal navigation targets and all 32 local HTML/CSS assets resolve.
- `node tools/check_transitions.cjs`: reverse entry, decoded-frame gating, endpoint poster, direction symmetry, latest seek target, offscreen cleanup and reduced motion pass.
- `node tools/check_journey.cjs`: startup layout, lazy warm range, one-time load, reduced mode and offscreen scheduling pass.
- `node output/contact-loop-check.cjs`: continuous loop, preserved time on reverse scroll, re-entry, hidden tab, reduced mode and offscreen pause pass.
- Every current motion JS file passes `node --check`; existing hero/Robot Atom/model checks also pass. Those older checks are regressions for archived code, not evidence of an active 3D scene.
- Browser inspection covered all four sections in Chrome at the normal desktop viewport and an emulated 390 × 844 viewport. No horizontal overflow was found. Category filtering, A–Z/reverse sorting, keyboard disclosure and keyboard Journey chapter selection work.
- Final Contact loop is playing on desktop and mobile. Projects/Contact have zero layout gap. At the same mobile transition position, forward and reverse both select **2.541666 s**; leaving toward Projects selects **0 s** and hides the overlay.
- Manual reduced motion pauses all five videos and hides both transition stages. Source inspection verifies OS preference is combined with the same reduced state; OS/device emulation was not available in the browser control tool.
- Browser error/warning log is empty in the captured session. Screenshot/state evidence is stored under `output/review-*` and `output/review-browser-verification.json`.
- No package/build target exists: this is a static HTML/CSS/JS site. Frame rate, Lighthouse, physical touch, Safari/Firefox and a formal screen-reader audit were not measured.

The preview server supports byte ranges and image/font MIME types. Earlier `output/contact-performance-fix.png` and `output/performance-scroll-verification.json` are preserved historical artifacts; the `review-*` files are the evidence for this pass.

## Delivery scope

All outstanding website implementation/media work is retained for commit and push on `next-gen-rework`. Secrets remain ignored. GitHub Pages is configured to serve `main` at the repository root, so pushing this branch alone does not deploy these changes to the public site.
