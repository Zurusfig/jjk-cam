import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export function useHandTracking(videoRef) {
  const handLandmarkerRef = useRef(null);
  const [landmarks, setLandmarks] = useState(null); // array of hands, each is array of 21 {x,y,z}
  const [handedness, setHandedness] = useState(null);
  const animFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const hl = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      if (!cancelled) handLandmarkerRef.current = hl;
    }

    init().catch(console.error);
    return () => { cancelled = true; };
  }, []);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const hl = handLandmarkerRef.current;
    if (!video || !hl || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const now = performance.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = hl.detectForVideo(video, now);
      if (result.landmarks.length > 0) {
        setLandmarks(result.landmarks);
        setHandedness(result.handedness);
      } else {
        setLandmarks(null);
        setHandedness(null);
      }
    }
    animFrameRef.current = requestAnimationFrame(detect);
  }, [videoRef]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(detect);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [detect]);

  return { landmarks, handedness };
}
