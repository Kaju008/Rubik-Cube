import { useEffect, useRef } from 'react';

const COLORS = ['#FFD93B', '#FF3B4E', '#FF8A1F', '#22D17A', '#2F7BFF', '#F4F1EA', '#FF4FD8'];

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    resize();
    addEventListener('resize', resize);
    const parts = Array.from({ length: 160 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.45,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 6,
      s: 6 + Math.random() * 9, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.roundRect(-p.s / 2, -p.s / 2, p.s, p.s, 2); ctx.fill(); ctx.restore();
      }
      if (now - start < 4500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="confetti" aria-hidden="true" />;
}
