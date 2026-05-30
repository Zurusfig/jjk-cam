// Data-driven gesture -> orb config.
//
// Visual model: every orb is a glowing LIGHT SOURCE.
//   white-hot core -> saturated rim color, with a secondary tint at the outermost shell.
//   coreRadius / rimRadius  : [0..1] normalized radial positions for the gradient.
//   colorVariation          : per-particle brightness jitter (0 = flat).
//   outlineColor            : tint pushed into the explicit outer-shell ring (high aRadial).

const WHITE = '#FFFFFF';

export const GESTURES = {
  YUTA_VIOLET: {
    id: 'YUTA_VIOLET',
    label: 'Yuta Violet',
    coreColor: WHITE,
    color: '#F358F3',
    secondaryColor: '#6600AA',   // deep violet outline ring
    particleCount: 6000,
    orbRadius: 0.08,
    coreRadius: 0.15,
    rimRadius: 0.65,
    colorVariation: 0.14,
    behavior: 'neutral',
  },
  RYU_CYAN: {
    id: 'RYU_CYAN',
    label: 'Ryu Cyan',
    coreColor: WHITE,
    color: '#97F4EB',
    secondaryColor: '#00AACC',   // deeper teal outline
    particleCount: 5000,
    orbRadius: 0.07,
    coreRadius: 0.14,
    rimRadius: 0.62,
    colorVariation: 0.12,
    behavior: 'directional',
  },
  GOJO_RED: {
    id: 'GOJO_RED',
    label: 'Gojo Red',
    coreColor: WHITE,
    color: '#FD093F',
    secondaryColor: '#880010',   // dark crimson outline
    particleCount: 7000,
    orbRadius: 0.09,
    coreRadius: 0.15,
    rimRadius: 0.65,
    colorVariation: 0.18,
    behavior: 'repulsion',
  },
  GOJO_BLUE: {
    id: 'GOJO_BLUE',
    label: 'Gojo Blue',
    coreColor: WHITE,
    color: '#03CEDB',
    secondaryColor: '#0033CC',   // deep royal-blue outline
    particleCount: 7000,
    orbRadius: 0.10,
    coreRadius: 0.15,
    rimRadius: 0.65,
    colorVariation: 0.14,
    behavior: 'attraction',
  },
  HOLLOW_PURPLE: {
    id: 'HOLLOW_PURPLE',
    label: 'Hollow Purple',
    coreColor: WHITE,
    color: '#A844CC',
    secondaryColor: '#03CEDB',   // outer halo bleeds toward blue
    particleCount: 10000,
    orbRadius: 0.12,
    coreRadius: 0.16,
    rimRadius: 0.66,
    colorVariation: 0.20,
    behavior: 'oscillate',
  },
  // Full-screen effect — handled by VoidOverlay, not a localized orb.
  INFINITE_VOID: {
    id: 'INFINITE_VOID',
    label: 'Infinite Void',
    fullscreen: true,
  },
};
