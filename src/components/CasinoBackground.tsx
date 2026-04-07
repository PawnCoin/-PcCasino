import { useEffect, useRef, useMemo } from 'react';

interface CasinoBackgroundProps {
  videoUrl?: string;
  opacity?: number;
}

export function CasinoBackground({ videoUrl, opacity = 0.35 }: CasinoBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const particles = useMemo(() => {
    return Array.from({ length: 120 }, () => ({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.6 - 0.1,
      size: Math.random() * 4 + 0.8,
      alpha: Math.random() * 0.5 + 0.08,
      type: Math.random() < 0.3 ? 'suit' : 'chip',
      suit: ['♠', '♥', '♦', '♣'][Math.floor(Math.random() * 4)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      color: ['rgba(212,175,55,', 'rgba(255,215,0,', 'rgba(180,140,40,', 'rgba(255,180,0,'][Math.floor(Math.random() * 4)],
    }));
  }, []);

  const spotlights = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      x: 0.1 + i * 0.2,
      angle: Math.random() * Math.PI * 2,
      speed: (Math.random() - 0.5) * 0.004,
      radius: 80 + Math.random() * 60,
    }));
  }, []);

  useEffect(() => {
    if (videoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const localParticles = particles.map(p => ({ ...p }));
    const localSpots = spotlights.map(s => ({ ...s }));

    const drawOverview = (w: number, h: number) => {
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.8);
      bgGrad.addColorStop(0, 'rgba(18,10,2,0.5)');
      bgGrad.addColorStop(0.5, 'rgba(8,5,0,0.6)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const carpetSize = 36;
      ctx.save();
      ctx.globalAlpha = 0.08;
      for (let cx = 0; cx < w + carpetSize; cx += carpetSize) {
        for (let cy = 0; cy < h + carpetSize; cy += carpetSize) {
          ctx.fillStyle = (Math.floor(cx / carpetSize) + Math.floor(cy / carpetSize)) % 2 === 0
            ? 'rgba(20,60,20,0.9)' : 'rgba(15,45,15,0.9)';
          ctx.fillRect(cx, cy, carpetSize, carpetSize);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = 'rgba(212,175,55,0.7)';
      ctx.lineWidth = 1;
      const lineSpacing = 80;
      for (let lx = -lineSpacing; lx < w + lineSpacing; lx += lineSpacing) {
        const perspective = lx - w / 2;
        ctx.beginPath();
        ctx.moveTo(w / 2 + perspective * 0.05, h * 0.38);
        ctx.lineTo(lx, h);
        ctx.stroke();
      }
      ctx.restore();
    };

    const animate = () => {
      t += 0.004;
      const w = canvas.width / devicePixelRatio;
      const h = canvas.height / devicePixelRatio;

      ctx.clearRect(0, 0, w, h);
      drawOverview(w, h);

      for (const spot of localSpots) {
        spot.angle += spot.speed;
        const sx = w * spot.x + Math.sin(spot.angle) * spot.radius;
        const sy = h * 0.2 + Math.cos(spot.angle * 0.7) * spot.radius * 0.5;
        const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 250 + Math.sin(t + spot.x * 3) * 60);
        spotGrad.addColorStop(0, `rgba(212,175,55,${0.12 + 0.06 * Math.sin(t * 1.3)})`);
        spotGrad.addColorStop(0.5, `rgba(180,130,20,0.05)`);
        spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, w, h);
      }

      const centerGlow = ctx.createRadialGradient(w * 0.5, h * 0.55, 0, w * 0.5, h * 0.5, w * 0.4);
      centerGlow.addColorStop(0, `rgba(212,175,55,${0.04 + 0.02 * Math.sin(t * 0.5)})`);
      centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, w, h);

      const leftGlow = ctx.createRadialGradient(0, h * 0.5, 0, 0, h * 0.5, w * 0.3);
      leftGlow.addColorStop(0, `rgba(100,20,180,${0.06 + 0.03 * Math.sin(t * 0.8)})`);
      leftGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, w, h);

      const rightGlow = ctx.createRadialGradient(w, h * 0.5, 0, w, h * 0.5, w * 0.3);
      rightGlow.addColorStop(0, `rgba(180,20,60,${0.06 + 0.03 * Math.sin(t * 0.9 + 1)})`);
      rightGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(0, 0, w, h);

      for (const p of localParticles) {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += (Math.random() - 0.5) * 0.01;
        p.alpha = Math.max(0.04, Math.min(0.6, p.alpha));
        p.rotation += p.rotSpeed;
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'suit') {
          ctx.font = `${p.size * 5}px serif`;
          ctx.fillStyle = p.color + p.alpha + ')';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.suit, 0, 0);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color + p.alpha + ')';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = p.color + (p.alpha * 0.12) + ')';
          ctx.fill();
        }
        ctx.restore();
      }

      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, w * 0.75);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [videoUrl, particles, spotlights]);

  if (videoUrl) {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
          <video
            src={videoUrl}
            autoPlay loop muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity }}
          />
          <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${1 - opacity * 0.6})` }} />
          <CasinoOverlay />
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none',
        backgroundImage: 'url(/images/casino-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.28,
      }} />
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
      />
      <CasinoOverlay />
    </>
  );
}

function CasinoOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.3) 20%, rgba(212,175,55,0.6) 50%, rgba(212,175,55,0.3) 80%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.2) 30%, rgba(212,175,55,0.4) 50%, rgba(212,175,55,0.2) 70%, transparent 100%)',
      }} />
      <div style={{ position: 'absolute', top: '15%', left: '2%', opacity: 0.07, fontSize: 11, color: '#D4AF37', fontFamily: 'serif', letterSpacing: '0.4em', writingMode: 'vertical-rl', transform: 'rotate(180deg)', userSelect: 'none' }}>
        ♠ ♥ ♦ ♣ ♠ ♥ ♦ ♣ ♠ ♥
      </div>
      <div style={{ position: 'absolute', top: '15%', right: '2%', opacity: 0.07, fontSize: 11, color: '#D4AF37', fontFamily: 'serif', letterSpacing: '0.4em', writingMode: 'vertical-rl', userSelect: 'none' }}>
        ♣ ♦ ♥ ♠ ♣ ♦ ♥ ♠ ♣ ♦
      </div>
    </div>
  );
}
