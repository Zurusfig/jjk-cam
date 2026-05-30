import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbParticleSystem } from '../three/OrbParticleSystem';

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

function getOrbSourcePoint(gestureId, landmarks) {
  if (!landmarks || landmarks.length === 0) return null;
  const lm = landmarks[0];

  switch (gestureId) {
    case 'YUTA_VIOLET': {
      // midpoint between thumb tip (4) and index tip (8)
      return {
        x: (lm[4].x + lm[8].x) / 2,
        y: (lm[4].y + lm[8].y) / 2,
        z: (lm[4].z + lm[8].z) / 2,
      };
    }
    case 'RIKA_CYAN': return lm[8]; // index tip
    case 'GOJO_RED': return lm[8]; // index tip
    case 'GOJO_BLUE': {
      if (landmarks.length < 2) return lm[0];
      const lm2 = landmarks[1];
      return {
        x: (lm[0].x + lm2[0].x) / 2,
        y: (lm[0].y + lm2[0].y) / 2,
        z: (lm[0].z + lm2[0].z) / 2,
      };
    }
    case 'HOLLOW_PURPLE': return lm[9]; // middle MCP = palm center
    default: return lm[0];
  }
}

export function OrbOverlay({ gesture, landmarks }) {
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

    stateRef.current = { gesture: null, landmarks: null };

    function animate() {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const { gesture, landmarks } = stateRef.current;

      // Spawn or update active orb
      if (gesture) {
        if (!orbSystems[gesture]) {
          orbSystems[gesture] = new OrbParticleSystem(scene, gesture);
        }
        const orb = orbSystems[gesture];
        const srcLm = getOrbSourcePoint(gesture, landmarks);
        if (srcLm) {
          const worldPos = landmarkToWorld(srcLm, camera);
          if (!orb.isAlive) {
            orb.spawn(worldPos);
          } else {
            orb.update(dt, now / 1000, worldPos);
          }
        }
      }

      // Fade out orbs that are no longer active
      for (const [id, orb] of Object.entries(orbSystems)) {
        if (id !== gesture && orb.isAlive && !orb._fading) {
          orb.fadeOut(0.5);
        }
        if (orb._fading) orb.updateFade(dt);
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
  }, [gesture, landmarks]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
