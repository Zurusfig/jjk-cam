import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbParticleSystem } from '../three/OrbParticleSystem';
import { GESTURES } from '../config/gestures';

// Convert normalized landmark coords (0-1) to Three.js world coords
// Video is mirrored, so x is flipped
function landmarkToWorld(lm, camera) {
  // NDC: mirror x
  const ndcX = -(lm.x * 2 - 1); // flip for mirror
  const ndcY = -(lm.y * 2 - 1);
  // Unproject at z=0.5 (mid-frustum)
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
  vec.unproject(camera);
  const dir = vec.sub(camera.position).normalize();
  const dist = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(dist));
}

function getOrbSourcePoint(gestureId, landmarks, headPoint) {
  if (!landmarks || landmarks.length === 0) return null;
  const lm = landmarks[0];
  // Dynamic hand height in normalised coords (used for offsets below).
  const handH = Math.abs(lm[0].y - lm[9].y) || 0.10;

  switch (gestureId) {
    case 'YUTA_VIOLET':
      // Slightly above the index fingertip.
      return { x: lm[8].x, y: lm[8].y - handH * 0.5, z: lm[8].z };
    case 'RYU_CYAN':
      // Forehead/above-head via FaceLandmarker. Fall back to above wrist.
      return headPoint ?? { x: lm[0].x, y: lm[0].y - handH * 2.0, z: lm[0].z };
    case 'GOJO_RED':
      // Well above the index fingertip (user asked for higher spawn).
      return { x: lm[8].x, y: lm[8].y - handH * 1.4, z: lm[8].z };
    case 'GOJO_BLUE': {
      if (landmarks.length < 2) return lm[9];
      const lm2 = landmarks[1];
      return {
        x: (lm[9].x + lm2[9].x) / 2,
        y: (lm[9].y + lm2[9].y) / 2,
        z: (lm[9].z + lm2[9].z) / 2,
      };
    }
    case 'HOLLOW_PURPLE':
      // Above the palm (above wrist, scaled to hand size).
      return { x: lm[9].x, y: lm[9].y - handH * 1.8, z: lm[9].z };
    default:
      return lm[9];
  }
}

export function OrbOverlay({ gesture, landmarks, headPoint }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.01, 100);
    camera.position.z = 1;

    const orbSystems = {}; // gestureId -> OrbParticleSystem

    let lastTime = performance.now();
    let animId;

    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    stateRef.current = { gesture: null, landmarks: null, headPoint: null };

    function animate() {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const { gesture, landmarks, headPoint } = stateRef.current;
      // Full-screen gestures (e.g. INFINITE_VOID) are not localized orbs.
      const orbGesture = gesture && !GESTURES[gesture]?.fullscreen ? gesture : null;

      // Spawn or update active orb
      if (orbGesture) {
        if (!orbSystems[orbGesture]) {
          orbSystems[orbGesture] = new OrbParticleSystem(scene, orbGesture);
        }
        const orb = orbSystems[orbGesture];
        const srcLm = getOrbSourcePoint(orbGesture, landmarks, headPoint);
        if (srcLm) {
          const worldPos = landmarkToWorld(srcLm, camera);
          if (!orb.isAlive) {
            orb.spawn(worldPos);
          } else {
            orb.update(dt, now / 1000, worldPos);
          }
        }
      }

      // Retire orbs that are no longer the active gesture.
      for (const [id, orb] of Object.entries(orbSystems)) {
        if (id !== orbGesture && orb.isAlive && !orb._fading && !orb._launching) {
          if (orb.formProgress >= 0.8) {
            orb.launchRelease(); // stable — blast toward camera
          } else {
            orb.fadeOut(0.4);   // still forming — dissolve quietly
          }
        }
        if (orb._fading) orb.updateFade(dt);
        if (orb._launching) orb.updateLaunch(dt);
      }

      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      for (const orb of Object.values(orbSystems)) orb.dispose();
      renderer.dispose();
    };
  }, []);

  // Update state without re-running effect
  useEffect(() => {
    stateRef.current.gesture = gesture;
    stateRef.current.landmarks = landmarks;
    stateRef.current.headPoint = headPoint;
  }, [gesture, landmarks, headPoint]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    />
  );
}
