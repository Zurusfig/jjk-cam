import { useMemo, useRef } from 'react';

const TIPS = [4, 8, 12, 16, 20];
const PIPS = [3, 7, 11, 15, 19];
const WRIST = 0;
const INDEX_MCP = 5;
const MIDDLE_MCP = 9;

function dist2(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function handScale(lm) {
  return dist2(lm[WRIST], lm[MIDDLE_MCP]) || 1e-4;
}

function fingerExtended(lm, finger) {
  if (finger === 0) {
    return dist2(lm[4], lm[INDEX_MCP]) > 0.75 * handScale(lm);
  }
  const tip = lm[TIPS[finger]];
  const pip = lm[PIPS[finger]];
  return dist2(lm[WRIST], tip) > dist2(lm[WRIST], pip) + 0.04 * handScale(lm);
}

function extendedFlags(lm) {
  return [0, 1, 2, 3, 4].map((f) => fingerExtended(lm, f));
}

function indexIsHorizontal(lm) {
  const dx = lm[8].x - lm[INDEX_MCP].x;
  const dy = lm[8].y - lm[INDEX_MCP].y;
  return Math.abs(dx) > Math.abs(dy);
}

function isOpenPalm(lm) {
  const ext = extendedFlags(lm);
  return ext[1] && ext[2] && ext[3] && ext[4];
}

function classifyStatic(lm, thumbIndexDistNorm) {
  const ext = extendedFlags(lm);
  const T = ext[0], I = ext[1], M = ext[2], R = ext[3], P = ext[4];

  // HOLLOW_PURPLE: all four fingers (IMRP) extended AND thumb held low/inward
  // (thumb-index dist < 0.35) so a casual open hand doesn't accidentally trigger.
  if (I && M && R && P && thumbIndexDistNorm < 0.35) return 'HOLLOW_PURPLE';

  // INFINITE_VOID: peace/scissors sign — I+M extended, R+P curled,
  // thumb-index gap 0.45-0.80 (the open V shape).
  if (I && M && !R && !P && thumbIndexDistNorm >= 0.45 && thumbIndexDistNorm <= 0.80) {
    return 'INFINITE_VOID';
  }

  // YUTA_VIOLET: T+I extended, others curled, thumb-index open (not touching).
  if (T && I && !M && !R && !P && thumbIndexDistNorm > 0.40) return 'YUTA_VIOLET';

  // GOJO_RED: only index extended.
  if (!T && I && !M && !R && !P) return 'GOJO_RED';

  // RYU_CYAN: only thumb extended (thumbs-up, other fingers curled).
  if (T && !I && !M && !R && !P) return 'RYU_CYAN';

  return null;
}

export function useGestureClassifier(landmarks) {
  const historyRef = useRef([]);
  const motionRef = useRef({ scale: null, t: 0, growth: 0 });
  const latchRef = useRef({ gesture: null, until: 0 });
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

    // Two hands -> GOJO_BLUE.
    if (landmarks.length >= 2) {
      const a = landmarks[0];
      const b = landmarks[1];
      const apart = dist2(a[WRIST], b[WRIST]) > 0.9 * handScale(a);
      if (apart && isOpenPalm(a) && isOpenPalm(b)) raw = 'GOJO_BLUE';
    }

    if (!raw) {
      const lm = landmarks[0];
      const s = handScale(lm);
      const tid = dist2(lm[4], lm[8]) / s;

      raw = classifyStatic(lm, tid);

      // HOLLOW_PURPLE forward-thrust latch: if the hand is in the HOLLOW_PURPLE
      // pose AND growing in apparent size (moving toward camera), latch the
      // gesture for 1.4 s so the orb has time to form after the flick.
      if (raw === 'HOLLOW_PURPLE') {
        const scale = handScale(lm);
        const m = motionRef.current;
        if (m.scale != null) {
          const dt = Math.max((now - m.t) / 1000, 1e-3);
          m.growth = (scale - m.scale) / m.scale / dt;
          if (m.growth > 0.8) {
            latchRef.current = { gesture: 'HOLLOW_PURPLE', until: now + 1400 };
          }
        }
        m.scale = scale;
        m.t = now;
      } else {
        motionRef.current.scale = null;
        motionRef.current.growth = 0;
        // Keep latch alive even if pose briefly drops.
        if (!raw && latchRef.current.gesture === 'HOLLOW_PURPLE' && now < latchRef.current.until) {
          raw = 'HOLLOW_PURPLE';
        }
      }
    }

    const history = historyRef.current;
    history.push(raw);
    if (history.length > STABLE_FRAMES) history.shift();
    const stable = history.length === STABLE_FRAMES && history.every((g) => g === raw);
    const gesture = stable ? raw : history[0] ?? null;

    // Live diagnostics
    const lm0 = landmarks[0];
    const s = handScale(lm0);
    const debug = {
      hands: landmarks.length,
      ext: extendedFlags(lm0),
      scale: s,
      indexHorizontal: indexIsHorizontal(lm0),
      thumbIndexDist: dist2(lm0[4], lm0[8]) / s,
      openPalm: isOpenPalm(lm0),
      growth: motionRef.current.growth,
      raw,
      latched: latchRef.current.gesture === 'HOLLOW_PURPLE' && now < latchRef.current.until,
    };

    return { gesture, debug };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landmarks]);
}
