import { useEffect, useRef } from 'react';

interface CasinoBackgroundProps {
  videoUrl?: string;
  opacity?: number;
}

export function CasinoBackground({ videoUrl, opacity = 0.35 }: CasinoBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (videoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];
    const colors = ['rgba(212,175,55,', 'rgba(255,215,0,', 'rgba(192,160,50,', 'rgba(150,130,40,'];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * 1920, y: Math.random() * 1080,
        vx: (Math.random() - 0.5) * 0.4, vy: -Math.random() * 0.5 - 0.1,
        size: Math.random() * 2.5 + 0.5, alpha: Math.random() * 0.3 + 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      t += 0.005;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createRadialGradient(w * 0.5, h * 0.6, 0, w * 0.5, h * 0.5, w * 0.7);
      grad.addColorStop(0, 'rgba(20,14,4,0.0)');
      grad.addColorStop(0.4, 'rgba(10,8,2,0.0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pulse = 0.5 + Math.sin(t * 0.7) * 0.5;
      const spotGrad = ctx.createRadialGradient(w * 0.5, h * 0.3 + Math.sin(t * 0.3) * h * 0.05, 0, w * 0.5, h * 0.5, w * 0.4);
      spotGrad.addColorStop(0, `rgba(212,175,55,${0.03 * pulse})`);
      spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += (Math.random() - 0.5) * 0.008;
        p.alpha = Math.max(0.02, Math.min(0.35, p.alpha));
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha * 0.15})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [videoUrl]);

  if (videoUrl) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
        <video
          src={videoUrl}
          autoPlay loop muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', opacity }}
        />
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${1 - opacity * 0.6})` }} />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
    />
  );
}
