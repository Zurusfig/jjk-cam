// Data-driven gesture -> orb config.
//
// Visual model (iteration 2): every orb reads as a glowing LIGHT SOURCE.
//   - coreColor  : the white-hot center
//   - color      : the saturated rim/outline color (color only appears at the edge)
//   - secondaryColor : optional outer-halo tint (e.g. Hollow Purple bleeds toward blue)
//   - coreRadius / rimRadius : normalized [0..1] radial positions controlling the
//                              white -> color gradient (see orb.vert.glsl)
//   - colorVariation : per-particle hue/brightness jitter for depth (0 = flat)
//
// Spawn points & detection live in useGestureClassifier.js / OrbOverlay.jsx.

const WHITE = '#FFFFFF';

export const GESTURES = {
  YUTA_VIOLET: {
    id: 'YUTA_VIOLET',
    label: 'Yuta Violet',
    coreColor: WHITE,
    color: '#F358F3',
    secondaryColor: null,
    particleCount: 3000,
    orbRadius: 0.08,
    coreRadius: 0.22,
    rimRadius: 0.85,
    colorVariation: 0.14,
    behavior: 'neutral',
  },
  RYU_CYAN: {
    id: 'RYU_CYAN',
    label: 'Ryu Cyan',
    coreColor: WHITE,
    color: '#97F4EB',
    secondaryColor: null,
    particleCount: 2600,
    orbRadius: 0.07,
    coreRadius: 0.20,
    rimRadius: 0.80,
    colorVariation: 0.12,
    behavior: 'directional',
  },
  GOJO_RED: {
    id: 'GOJO_RED',
    label: 'Gojo Red',
    coreColor: WHITE,
    color: '#FD093F',
    secondaryColor: null,
    particleCount: 3000,
    orbRadius: 0.09,
    coreRadius: 0.24,
    rimRadius: 0.88,
    colorVariation: 0.16,
    behavior: 'repulsion',
  },
  GOJO_BLUE: {
    id: 'GOJO_BLUE',
    label: 'Gojo Blue',
    coreColor: WHITE,
    color: '#03CEDB',
    secondaryColor: null,
    particleCount: 3500,
    orbRadius: 0.10,
    coreRadius: 0.24,
    rimRadius: 0.88,
    colorVariation: 0.14,
    behavior: 'attraction',
  },
  HOLLOW_PURPLE: {
    id: 'HOLLOW_PURPLE',
    label: 'Hollow Purple',
    coreColor: WHITE,
    color: '#A844CC',
    secondaryColor: '#03CEDB', // outer halo blends toward blue
    particleCount: 5000,
    orbRadius: 0.12,
    coreRadius: 0.26,
    rimRadius: 0.92,
    colorVariation: 0.18,
    behavior: 'oscillate',
  },
  // Full-screen effect, not a localized orb (handled by VoidOverlay).
  INFINITE_VOID: {
    id: 'INFINITE_VOID',
    label: 'Infinite Void',
    fullscreen: true,
  },
};
