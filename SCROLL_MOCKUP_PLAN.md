# Rover scroll portfolio mockup

## Homepage reference update — September 30

Homepage design follows the image in Miro's ChatGPT Space, Screen 1 - Home: https://miro.com/app/board/uXjVHnk0h-g=/?moveToWidget=3458764685147206844 . Condensed Anton headline, electric-blue italic playful, pink accent, blue Explore my work CTA and five topic labels are live HTML. The existing clean rover footage stays underneath and the entire hero UI fades with the opening chapter. Anton is stored locally with its OFL license. Desktop and 390px mobile inspected; no horizontal overflow, and CTA navigation into the forest still works. Screenshot: assets/motion/miro-home-desktop.png.

Space listing still returns Access forbidden, but direct board search and canvas/image reading now work. No Miro board content was modified for this homepage request.

The homepage is a static GitHub Pages mockup. Experience, education and project copy is explicitly sample content, pending replacement with approved portfolio content.

The clean single-take video remains free of baked-in UI. HTML contains the navigation, headings, milestones and contact link. One sticky scene maps the entire journey's scroll position to video time, including reverse scrolling. On phones the full landscape frame stays visible above the content so the trail is not cropped away. No autoplay or looping.

`assets/motion/rover-scroll.mp4` is the 20-second review draft re-encoded with a keyframe every six frames and fast-start metadata for seeking. The source and generation references remain in `assets/redesign/rover-forest-transition`. No second robot overlay is added. The generated camera movement remains part of the supplied draft; this implementation does not correct its background drift or certify every generated frame.

Reduced-motion preference or the Reduce motion button uses a static poster and normal document flow. Failed media and disabled JavaScript retain readable content. Core functionality needs no API, server runtime or external library.

Verified in the browser: desktop opening and forest milestone, forward seeking (15.3s) and reverse seeking (12.5s), 390px mobile with full landscape visible, and Reduce motion returning to normal document flow. JavaScript syntax and diff whitespace checks pass. Local Python preview lacked byte-range responses and stalled video seeking; the preview launcher now uses a small Node static server supporting ranges. GitHub Pages supplies media directly; Node is needed only for this local preview. Missing-media fallback is implemented but was not simulated in this browser pass.

The transition covers video seconds 0–14 before the experience section starts. The milestone scroll then covers 14–20. This aligns the content with the actual draft's aerial segment rather than the idealized timestamps in the generation prompt.

Miro ChatGPT space update requested September 30: space discovery returned Access forbidden. No Miro changes were made. Once access is restored, copy this agreed plan into the existing ChatGPT space overview; do not mark implementation or QA complete without checking the actual result.
