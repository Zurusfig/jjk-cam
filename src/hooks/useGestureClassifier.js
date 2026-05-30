import { useMemo, useRef } from 'react';

// MediaPipe 21-landmark indices
const TIPS = [4, 8, 12, 16, 20];
const PIPS = [3, 7, 11, 15, 19];
const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Hand scale: wrist -> middle-finger MCP. Used to normalize all thresholds so
// detection is roughly distance-from-camera independent.
function handScale(lm) {
  return dist2(lm[WRIST], lm[MIDDLE_MCP]) || 1e-4;
}

// Orientation-independent finger extension: a finger is extended when its tip
// sits clearly farther from the wrist than its PIP joint. Works regardless of
// which way the hand points (unlike a raw y-comparison).
function fingerExtended(lm, finger) {
  if (finger === 0) {
    // Thumb: tip splayed away from the index MCP relative to hand size.
    return dist2(lm[4], lm[INDEX_MCP]) > 0.75 * handScale(lm);
  }
  const tip = lm[TIPS[finger]];
  const pip = lm[PIPS[finger]];
  return dist2(lm[WRIST], tip) > dist2(lm[WRIST], pip) + 0.04 * handScale(lm);
}

// The four non-thumb fingertips bunched close together (flat-hand / chop pose).
function fingersTogether(lm) {
  const s = handScale(lm);
  const tips = [8, 12, 16, 20].map((i) => lm[i]);
  for (let i = 0; i < tips.length - 1; i++) {
    if (dist2(tips[i], tips[i + 1]) > 0.45 * s) return false;
  }
  return true;
}

function extendedFlags(lm) {
  return [0, 1, 2, 3, 4].map((f) => fingerExtended(lm, f));
}

// Index pointing roughly horizontal (finger-gun) vs roughly vertical (pinch/up).
function indexIsHorizontal(lm) {
  const dx = lm[8].x - lm[INDEX_MCP].x;
  const dy = lm[8].y - lm[INDEX_MCP].y;
  return Math.abs(dx) > Math.abs(dy);
}

// --- single-hand static classification (no motion/latch logic) ----------------
function classifyStatic(lm) {
  const ext = extendedFlags(lm);
  const s = handScale(lm);
  const thumbIndexTouch = dist2(lm[4], lm[8]) < 0.35 * s;

  const indexThumbOnly =
    ext[1] && ext[0] && !ext[2] && !ext[3] && !ext[4];

  // INFINITE_VOID: index + thumb crossed / overlapping (tips touching).
  if (ext[1] && !ext[2] && !ext[3] && !ext[4] && thumbIndexTouch) {
    return 'INFINITE_VOID';
  }

  // YUTA vs RYU: both share index+thumb extended, others curled.
  if (indexThumbOnly && !thumbIndexTouch) {
    return indexIsHorizontal(lm) ? 'RYU_CYAN' : 'YUTA_VIOLET';
  }

  // GOJO_RED: thumb ONLY extended (thumbs-up), all four fingers curled.
  if (ext[0] && !ext[1] && !ext[2] && !ext[3] && !ext[4]) {
    return 'GOJO_RED';
  }

  return null;
}

// Flat open hand: all four fingers extended and roughly together.
function isFlatHand(lm) {
  const ext = extendedFlags(lm);
  return ext[1] && ext[2] && ext[3] && ext[4] && fingersTogether(lm);
}

// Open palm (spread): all four fingers extended (spread tolerated). Used for the
// two-hand Gojo Blue cupping pose.
function isOpenPalm(lm) {
  const ext = extendedFlags(lm);
  return ext[1] && ext[2] && ext[3] && ext[4];
}

export function useGestureClassifier(landmarks) {
  const historyRef = useRef([]);
  const motionRef = useRef({ scale: null, t: 0 });
  const latchRef = useRef({ gesture: null, until: 0 });
  const STABLE_FRAMES = 3;

  // Keyed on landmarks so it runs once per detection frame (not per render),
  // which keeps the cross-frame motion sampling + debounce history consistent.
  return useMemo(() => {
  if (!landmarks || landmarks.length === 0) {
    historyRef.current = [];
    motionRef.current.scale = null;
    return null;
  }

  const now = performance.now();
  let raw = null;

  // 1) Two hands -> GOJO_BLUE (both open palms, held apart).
  if (landmarks.length >= 2) {
    const a = landmarks[0];
    const b = landmarks[1];
    const apart = dist2(a[WRIST], b[WRIST]) > 0.9 * handScale(a);
    if (apart && isOpenPalm(a) && isOpenPalm(b)) {
      raw = 'GOJO_BLUE';
    }
  }

  // 2) Single-hand poses + Hollow Purple motion.
  if (!raw) {
    const lm = landmarks[0];

    // HOLLOW_PURPLE: flat hand thrusting FORWARD (toward camera) -> hand grows.
    if (isFlatHand(lm)) {
      const scale = handScale(lm);
      const m = motionRef.current;
      if (m.scale != null) {
        const dt = Math.max((now - m.t) / 1000, 1e-3);
        const growthRate = (scale - m.scale) / m.scale / dt; // relative growth/sec
        if (growthRate > 1.2) {
          // latch so the orb has time to form + project after the flick
          latchRef.current = { gesture: 'HOLLOW_PURPLE', until: now + 1400 };
        }
      }
      m.scale = scale;
      m.t = now;
    } else {
      motionRef.current.scale = null;
    }

    if (latchRef.current.gesture === 'HOLLOW_PURPLE' && now < latchRef.current.until) {
      raw = 'HOLLOW_PURPLE';
    } else {
      raw = classifyStatic(lm);
    }
  }

  // 3) Debounce static gestures so they don't flicker. The Hollow Purple latch
  //    already provides persistence, so it passes the stability check quickly.
  const history = historyRef.current;
  history.push(raw);
  if (history.length > STABLE_FRAMES) history.shift();

  const stable =
    history.length === STABLE_FRAMES && history.every((g) => g === raw);
  return stable ? raw : history[0] ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks]);
}
