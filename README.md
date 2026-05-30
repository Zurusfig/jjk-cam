# JJK Cursed Energy Hand-Tracking

Webcam-based particle orb system inspired by Jujutsu Kaisen cursed energy.

## Run
```
npm install
npm run dev
```
Then open http://localhost:5173 and allow camera access.

## Gesture Cheat Sheet
| Gesture | Detection |
|---|---|
| Yuta Violet | Thumb + index extended, others curled |
| Rika Cyan | Only index extended, pointing sideways |
| Gojo Red | Only index extended, pointing up |
| Gojo Blue | Both hands spread apart, fingers open |
| Hollow Purple | Flat hand, 4 fingers together, palm facing camera |

## Tweak Orb Params
Edit `src/config/gestures.js` to change colors, particle counts, orb radius.
Edit shader uniforms in `src/three/OrbParticleSystem.js`.
Press `D` to toggle debug panel. Press `L` to toggle landmark dots.
