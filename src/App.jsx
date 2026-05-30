import { useRef, useState, useCallback, useEffect } from 'react';
import { WebcamCapture } from './components/WebcamCapture';
import { OrbOverlay } from './components/OrbOverlay';
import { DebugLandmarks } from './components/DebugLandmarks';
import { useHandTracking } from './hooks/useHandTracking';
import { useGestureClassifier } from './hooks/useGestureClassifier';

function DebugPanel({ visible, gesture, landmarks }) {
  if (!visible) return null;
  const handCount = landmarks?.length ?? 0;
  const lmCount = landmarks ? landmarks.reduce((s, h) => s + h.length, 0) : 0;
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16,
      background: 'rgba(0,0,0,0.7)', color: '#0ff',
      padding: '8px 14px', borderRadius: 8,
      fontFamily: 'monospace', fontSize: 13, zIndex: 10,
      pointerEvents: 'none',
    }}>
      <div>Gesture: <b style={{ color: '#f0f' }}>{gesture ?? 'none'}</b></div>
      <div>Hands: {handCount} | Landmarks: {lmCount}</div>
      <div style={{ color: '#888', marginTop: 4 }}>Press D to toggle</div>
    </div>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [debugVisible, setDebugVisible] = useState(true);
  const [landmarksVisible, setLandmarksVisible] = useState(true);

  const { landmarks, handedness } = useHandTracking(videoRef);
  const gesture = useGestureClassifier(landmarks, handedness);

  const handleVideoReady = useCallback((v) => {
    videoRef.current = v;
    setVideoReady(true);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'd' || e.key === 'D') setDebugVisible(v => !v);
      if (e.key === 'l' || e.key === 'L') setLandmarksVisible(v => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (gesture) console.log('[Gesture]', gesture);
  }, [gesture]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>
      <WebcamCapture onVideoReady={handleVideoReady} />
      {videoReady && (
        <>
          <OrbOverlay gesture={gesture} landmarks={landmarks} />
          <DebugLandmarks landmarks={landmarks} visible={landmarksVisible && debugVisible} />
          <DebugPanel visible={debugVisible} gesture={gesture} landmarks={landmarks} />
        </>
      )}
    </div>
  );
}
