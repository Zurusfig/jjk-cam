import { useMemo, useRef } from 'react';

// Landmark indices
const FINGER_TIPS = [4, 8, 12, 16, 20];
const FINGER_PIPS = [3, 7, 11, 15, 19];

function isFingerExtended(lm, fingerIdx) {
  // fingerIdx: 0=thumb,1=index,2=middle,3=ring,4=pinky
  if (fingerIdx === 0) {
    // Thumb: compare tip x vs MCP x (for right hand, tip should be more left/right)
    return Math.abs(lm[4].x - lm[2].x) > 0.04;
  }
  const tip = lm[FINGER_TIPS[fingerIdx]];
  const pip = lm[FINGER_PIPS[fingerIdx]];
  // Extended if tip y is above (less than) pip y (normalized coords, y increases down)
  return tip.y < pip.y - 0.02;
}

function fingersTogether(lm) {
  // Check spread between index,middle,ring,pinky tips
  const tips = [8, 12, 16, 20].map(i => lm[i]);
  for (let i = 0; i < tips.length - 1; i++) {
    const dx = tips[i].x - tips[i+1].x;
    const dy = tips[i].y - tips[i+1].y;
    if (Math.sqrt(dx*dx + dy*dy) > 0.06) return false;
  }
  return true;
}

function palmFacingCamera(lm) {
  // Wrist=0, indexMCP=5, pinkyMCP=17
  // Cross product of (5-0) x (17-0) should have positive z for camera-facing
  const w = lm[0], iMcp = lm[5], pMcp = lm[17];
  const ax = iMcp.x - w.x, ay = iMcp.y - w.y;
  const bx = pMcp.x - w.x, by = pMcp.y - w.y;
  const cross = ax * by - ay * bx;
  return cross > 0;
}

function classifyOneHand(lm) {
  const extended = [0,1,2,3,4].map(i => isFingerExtended(lm, i));
  // YUTA_VIOLET: thumb + index extended, others curled
  if (extended[0] && extended[1] && !extended[2] && !extended[3] && !extended[4]) {
    return 'YUTA_VIOLET';
  }
  // HOLLOW_PURPLE: 4 fingers extended + together, palm facing
  if (!extended[0] && extended[1] && extended[2] && extended[3] && extended[4]
      && fingersTogether(lm) && palmFacingCamera(lm)) {
    return 'HOLLOW_PURPLE';
  }
  // RIKA_CYAN vs GOJO_RED: only index extended
  if (!extended[0] && extended[1] && !extended[2] && !extended[3] && !extended[4]) {
    // Pointing up (y of tip < y of wrist) vs pointing outward
    const tipY = lm[8].y;
    const wristY = lm[0].y;
    if (tipY < wristY - 0.15) return 'GOJO_RED';
    return 'RIKA_CYAN';
  }
  return null;
}

export function useGestureClassifier(landmarks, handedness) {
  const historyRef = useRef([]);
  const STABLE_FRAMES = 4;

  return useMemo(() => {
    if (!landmarks || landmarks.length === 0) {
      historyRef.current = [];
      return null;
    }

    let gesture = null;

    if (landmarks.length >= 2) {
      // GOJO_BLUE: both hands, fingers spread, wrists apart
      const lm0 = landmarks[0], lm1 = landmarks[1];
      const dx = lm0[0].x - lm1[0].x;
      const wristDist = Math.abs(dx);
      if (wristDist > 0.3) {
        const allExtended0 = [1,2,3,4].every(i => isFingerExtended(lm0, i));
        const allExtended1 = [1,2,3,4].every(i => isFingerExtended(lm1, i));
        if (allExtended0 && allExtended1) {
          gesture = 'GOJO_BLUE';
        }
      }
    }

    if (!gesture && landmarks.length >= 1) {
      gesture = classifyOneHand(landmarks[0]);
    }

    // Debounce: require stable for N frames
    const history = historyRef.current;
    history.push(gesture);
    if (history.length > STABLE_FRAMES) history.shift();

    const stable = history.length === STABLE_FRAMES && history.every(g => g === gesture);
    return stable ? gesture : (history[0] ?? null);
  }, [landmarks, handedness]);
}
