import { useEffect, useRef } from 'react';

// INFINITE_VOID full-screen effect (fallback variant — no person segmentation).
// A wall of darkness floods inward from the screen edges, leaving a drifting
// starfield like deep space. Fades in while the gesture is held, out on release.
export function VoidOverlay({ active }) {
  const canvasRef = useRef(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');

    let w = 0;
    let h = 0;
    const stars = [];
    let intensity = 0; // 0 -> clear, 1 -> full void
    let animId;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const target = Math.floor((w * h) / 6000);
      stars.length = 0;
      for (let i = 0; i < target; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.3,
          tw: Math.random() * Math.PI * 2, // twinkle phase
          vx: (Math.random() - 0.5) * 0.08, // slow drift
          vy: (Math.random() - 0.5) * 0.08,
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);

    function frame(now) {
      animId = requestAnimationFrame(frame);
      const target = activeRef.current ? 1 : 0;
      // Ease intensity toward target (slightly faster fade-out feel).
      intensity += (target - intensity) * (target > intensity ? 0.04 : 0.08);

      ctx.clearRect(0, 0, w, h);
      if (intensity < 0.01) return;

      // Darkness floods from edges inward: a radial mask that opens up as
      // intensity rises, so the center darkens last.
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(cx, cy);
      const clearR = maxR * (1 - intensity); // radius still showing the feed
      const grad = ctx.createRadialGradient(cx, cy, clearR * 0.5, cx, cy, maxR);
      grad.addColorStop(0, `rgba(2,2,10,${0.4 * intensity})`);
      grad.addColorStop(1, `rgba(0,0,4,${0.97 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Drifting twinkling stars over the darkness.
      const t = now * 0.003;
      for (const s of stars) {
        s.x = (s.x + s.vx + w) % w;
        s.y = (s.y + s.vy + h) % h;
        const tw = 0.5 + 0.5 * Math.sin(t + s.tw);
        ctx.globalAlpha = intensity * tw;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = '#cfe3ff';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
