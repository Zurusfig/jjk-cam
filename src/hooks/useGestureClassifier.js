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

// Hand scale: wrist -> middle-finger MCP. Normalises all thresholds so
// detection is roughly distance-from-camera independent.
function handScale(lm) {
  return dist2(lm[WRIST], lm[MIDDLE_MCP]) || 1e-4;
}

// Orientation-independent: a finger is extended when its tip is clearly farther
// from the wrist than its PIP joint, regardless of hand orientation.
function fingerExtended(lm, finger) {
  if (finger === 0) {
    // Thumb: tip splayed away from the index MCP.
    return dist2(lm[4], lm[INDEX_MCP]) > 0.75 * handScale(lm);
  }
  const tip = lm[TIPS[finger]];
  const pip = lm[PIPS[finger]];
  return dist2(lm[WRIST], tip) > dist2(lm[WRIST], pip) + 0.04 * handScale(lm);
}

function extendedFlags(lm) {
  return [0, 1, 2, 3, 4].map((f) => fingerExtended(lm, f));
}

// The four non-thumb fingertips bunched close together.
function fingersTogether(lm) {
  const s = handScale(lm);
  const tips = [8, 12, 16, 20].map((i) => lm[i]);
  for (let i = 0; i < tips.length - 1; i++) {
    if (dist2(tips[i], tips[i + 1]) > 0.45 * s) return false;
  }
  return true;
}

// Open palm (spread), all four fingers extended. Used for two-hand Gojo Blue.
function isOpenPalm(lm) {
  const ext = extendedFlags(lm);
  return ext[1] && ext[2] && ext[3] && ext[4];
}

// Classify a single hand from its landmarks.
// Returns a gesture ID string or null.
function classifyOneHand(lm) {
  const ext = extendedFlags(lm);
  const s = handScale(lm);
  const tiDist = dist2(lm[4], lm[8]) / s; // normalised thumb-index tip distance

  // --- priority order: most specific first -----------------------------------

  // HOLLOW_PURPLE: all five fingers extended (palm-open single hand).
  if (ext[0] && ext[1] && ext[2] && ext[3] && ext[4]) {
    return 'HOLLOW_PURPLE';
  }

  // INFINITE_VOID: index + middle extended, others curled,
  // thumb-index normalised dist 0.5–0.7 (scissors / peace-like, not pinched).
  if (!ext[0] && ext[1] && ext[2] && !ext[3] && !ext[4]
      && tiDist >= 0.5 && tiDist <= 0.75) {
    return 'INFINITE_VOID';
  }

  // YUTA_VIOLET: thumb + index extended, others curled.
  if (ext[0] && ext[1] && !ext[2] && !ext[3] && !ext[4]) {
    return 'YUTA_VIOLET';
  }

  // GOJO_RED: only index extended (pointing finger), others including thumb curled.
  if (!ext[0] && ext[1] && !ext[2] && !ext[3] && !ext[4]) {
    return 'GOJO_RED';
  }

  // RYU_CYAN: only thumb extended (thumbs-up / gun sign).
  if (ext[0] && !ext[1] && !ext[2] && !ext[3] && !ext[4]) {
    return 'RYU_CYAN';
  }

  return null;
}

export function useGestureClassifier(landmarks) {
  const historyRef = useRef([]);
  const motionRef = useRef({ scale: null, t: 0, growth: 0 });
  const STABLE_FRAMES = 3;

  return useMemo(() => {
    if (!landmarks || landmarks.length === 0) {
      historyRef.current = [];
      motionRef.current.scale = null;
      motionRef.current.growth = 0;
      return { gesture: null, debug: null };
    }

    const now = performance.now();
    let raw = null;

    // 1) Two hands, both open palms held apart -> GOJO_BLUE.
    if (landmarks.length >= 2) {
      const a = landmarks[0];
      const b = landmarks[1];
      const apart = dist2(a[WRIST], b[WRIST]) > 0.9 * handScale(a);
      if (apart && isOpenPalm(a) && isOpenPalm(b)) {
        raw = 'GOJO_BLUE';
      }
    }

    // 2) Single-hand static classification.
    if (!raw) {
      raw = classifyOneHand(landmarks[0]);
    }

    // 3) Debounce: require stable for N frames to avoid flicker.
    const history = historyRef.current;
    history.push(raw);
    if (history.length > STABLE_FRAMES) history.shift();

    const stable = history.length === STABLE_FRAMES && history.every((g) => g === raw);
    const gesture = stable ? raw : history[0] ?? null;

    // Live diagnostics for on-screen threshold tuning.
    const lm0 = landmarks[0];
    const s = handScale(lm0);
    const ext = extendedFlags(lm0);
    const tiDist = dist2(lm0[4], lm0[8]) / s;

    const debug = {
      hands: landmarks.length,
      ext,
      scale: s,
      thumbIndexDist: tiDist,       // 0.5–0.75 zone => Void
      flat: ext[1] && ext[2] && ext[3] && ext[4] && fingersTogether(lm0),
      openPalm: isOpenPalm(lm0),
      growth: motionRef.current.growth,
      raw,
      latched: false,
    };

    return { gesture, debug };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks]);
}
