import { useEffect, useRef, useState, useCallback } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Tracks the user's head and exposes an "above the head" point in normalized
// coords, used as the spawn anchor for RYU_CYAN. Runs its own lightweight
// per-frame loop on the same <video>. Gracefully returns null when no face is
// found, so callers can fall back to a hand-relative point.
export function useFaceTracking(videoRef, enabled = true) {
  const landmarkerRef = useRef(null);
  const animRef = useRef(null);
  const lastTimeRef = useRef(-1);
  const [headPoint, setHeadPoint] = useState(null); // { x, y, z } normalized

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const fl = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      if (!cancelled) landmarkerRef.current = fl;
    }
    init().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const fl = landmarkerRef.current;
    if (video && fl && video.readyState >= 2 && video.currentTime !== lastTimeRef.current) {
      lastTimeRef.current = video.currentTime;
      const res = fl.detectForVideo(video, performance.now());
      const face = res.faceLandmarks?.[0];
      if (face) {
        // Landmark 10 = mid-forehead (top of face). Offset upward so the orb
        // floats above the head rather than on the forehead.
        const fh = face[10];
        const chin = face[152];
        const faceH = Math.abs(chin.y - fh.y) || 0.15;
        // 0.25 sits the orb just above the forehead rather than high above the head
        setHeadPoint({ x: fh.x, y: fh.y - faceH * 0.25, z: fh.z });
      } else {
        setHeadPoint(null);
      }
    }
    animRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    if (!enabled) return undefined;
    animRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animRef.current);
  }, [detect, enabled]);

  return headPoint;
}
