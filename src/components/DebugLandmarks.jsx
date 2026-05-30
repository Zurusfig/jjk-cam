export function DebugLandmarks({ landmarks, visible }) {
  if (!visible || !landmarks) return null;

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {landmarks.flatMap((hand, hi) =>
        hand.map((lm, li) => (
          <circle
            key={`${hi}-${li}`}
            // Mirror x because video is mirrored
            cx={`${(1 - lm.x) * 100}%`}
            cy={`${lm.y * 100}%`}
            r={4}
            fill={hi === 0 ? '#00FF00' : '#FF8800'}
            opacity={0.8}
          />
        ))
      )}
    </svg>
  );
}
