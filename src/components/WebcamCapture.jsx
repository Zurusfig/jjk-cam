import { useEffect, useRef, useState } from 'react';

export function WebcamCapture({ onVideoReady }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } })
      .then(stream => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          v.play();
          onVideoReady?.(v);
        };
      })
      .catch(err => setError(err.message));
  }, [onVideoReady]);

  if (error) return (
    <div style={{ color: 'white', padding: 32, textAlign: 'center' }}>
      <h2>Camera access denied</h2>
      <p>{error}</p>
      <p>Please allow camera access and reload.</p>
    </div>
  );

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        objectFit: 'cover',
        transform: 'scaleX(-1)', // mirror
      }}
    />
  );
}
