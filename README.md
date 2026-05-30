# JJK Cursed Energy Hand-Tracking

Webcam-based particle orb system inspired by Jujutsu Kaisen cursed energy.

## Run
```
npm install
npm run dev
```
Then open http://localhost:5173 and allow camera access.

## Gesture Cheat Sheet
| Gesture | Detection | Spawns |
|---|---|---|
| Yuta Violet | Index + thumb extended (others curled), index pointing up | Midpoint of thumb + index tips |
| Ryu Cyan | Finger-gun: index + thumb out, index pointing sideways | **Above your head** (face tracking) |
| Gojo Red | Thumb only extended (thumbs-up), 4 fingers curled | Thumb tip |
| Gojo Blue | **Both** hands, open palms held apart | Gap between the two palms |
| Hollow Purple | Flat hand thrust **forward** toward the camera (flick motion) | Palm center |
| Infinite Void | Index + thumb crossed / tips touching | Full-screen darkness + starfield |

> Detection thresholds are heuristic and webcam/lighting dependent — tune them
> in `src/hooks/useGestureClassifier.js` if a gesture misfires. The
> Yuta↔Ryu split is index-vertical vs index-horizontal; Yuta↔Void is whether
> the thumb and index tips are touching.

## Visual / Orb Look
All orbs render as a glowing **light source**: a white-hot core with the
saturated color appearing only toward the rim (`white → color` radial gradient
in `orb.vert.glsl`), plus per-particle brightness jitter.

## Tweak Orb Params
Edit `src/config/gestures.js`:
- `coreColor` / `color` / `secondaryColor` — white center, rim color, outer-halo tint
- `coreRadius` / `rimRadius` — where the white→color gradient sits ([0..1])
- `colorVariation` — per-particle brightness jitter
- `particleCount`, `orbRadius`, `behavior`

`behavior` flavors (driven in `orb.vert.glsl`): `repulsion` (push out),
`attraction` (pull in), `oscillate` (violent), `directional`, `neutral`.

Press `D` to toggle debug panel. Press `L` to toggle landmark dots.

## How It Works
- `useHandTracking` — MediaPipe `HandLandmarker` (21 landmarks, 2 hands)
- `useFaceTracking` — MediaPipe `FaceLandmarker`, forehead point for Ryu Cyan
- `useGestureClassifier` — landmarks → gesture (with motion + debounce)
- `OrbParticleSystem` / shaders — Three.js additive-blended particle orb
- `VoidOverlay` — full-screen Infinite Void effect (darkness flood + stars)
