import { useRef, useState, useCallback, useEffect } from 'react';
import { WebcamCapture } from './components/WebcamCapture';
import { OrbOverlay } from './components/OrbOverlay';
import { VoidOverlay } from './components/VoidOverlay';
import { DebugLandmarks } from './components/DebugLandmarks';
import { useHandTracking } from './hooks/useHandTracking';
import { useFaceTracking } from './hooks/useFaceTracking';
import { useGestureClassifier } from './hooks/useGestureClassifier';

const FINGER_NAMES = ['T', 'I', 'M', 'R', 'P'];

// Highlights a value green/red against a threshold so it's easy to see how
// close a metric is to flipping a gesture on/off while tuning live.
function Metric({ label, value, ok, hint }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ color: ok === undefined ? '#0ff' : ok ? '#5f5' : '#f77' }}>
        {value}{hint ? <span style={{ color: '#555' }}> {hint}</span> : null}
      </span>
    </div>
  );
}

function DebugPanel({ visible, gesture, headPoint, debug }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16,
      background: 'rgba(0,0,0,0.72)', color: '#0ff',
      padding: '10px 14px', borderRadius: 8,
      fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5,
      zIndex: 10, pointerEvents: 'none', minWidth: 210,
    }}>
      <div style={{ fontSize: 13 }}>
        Gesture: <b style={{ color: '#f0f' }}>{gesture ?? 'none'}</b>
      </div>
      <div style={{ borderTop: '1px solid #333', margin: '6px 0' }} />
      {debug ? (
        <>
          <Metric label="hands" value={debug.hands} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#888' }}>extended</span>
            <span>
              {debug.ext.map((e, i) => (
                <span key={i} style={{ color: e ? '#5f5' : '#555' }}>{FINGER_NAMES[i]}</span>
              ))}
            </span>
          </div>
          <Metric label="raw" value={debug.raw ?? '—'} />
          <Metric
            label="thumb·index"
            value={debug.thumbIndexDist.toFixed(2)}
            ok={debug.thumbIndexDist < 0.35}
            hint="<.35 Void"
          />
          <Metric
            label="index horiz"
            value={debug.indexHorizontal ? 'yes' : 'no'}
            hint={debug.indexHorizontal ? 'Ryu' : 'Yuta'}
          />
          <Metric label="flat / palm" value={`${debug.flat ? 'F' : '-'} ${debug.openPalm ? 'P' : '-'}`} />
          <Metric
            label="flick"
            value={debug.growth.toFixed(2)}
            ok={debug.growth > 1.2}
            hint=">1.2 Purple"
          />
          <Metric label="latched" value={debug.latched ? 'yes' : 'no'} />
        </>
      ) : (
        <div style={{ color: '#666' }}>no hand detected</div>
      )}
      <Metric label="head pt" value={headPoint ? 'tracked' : 'none'} ok={!!headPoint} />
      <div style={{ color: '#666', marginTop: 6 }}>D panel · L dots</div>
    </div>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const [debugVisible, setDebugVisible] = useState(true);
  const [landmarksVisible, setLandmarksVisible] = useState(true);

  const { landmarks } = useHandTracking(videoRef);
  const headPoint = useFaceTracking(videoRef, videoReady);
  const { gesture, debug } = useGestureClassifier(landmarks);

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
          <VoidOverlay active={gesture === 'INFINITE_VOID'} />
          <OrbOverlay gesture={gesture} landmarks={landmarks} headPoint={headPoint} />
          <DebugLandmarks landmarks={landmarks} visible={landmarksVisible && debugVisible} />
          <DebugPanel visible={debugVisible} gesture={gesture} headPoint={headPoint} debug={debug} />
        </>
      )}
    </div>
  );
}
