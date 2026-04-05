import { useEffect, useRef, useMemo, useState } from 'react';

type PerspectiveMode = 'overview' | 'third-person' | 'first-person';

interface CasinoBackgroundProps {
  videoUrl?: string;
  opacity?: number;
}

export function CasinoBackground({ videoUrl, opacity = 0.35 }: CasinoBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [perspective, setPerspective] = useState<PerspectiveMode>('overview');
  const [showToggle, setShowToggle] = useState(false);

  const particles = useMemo(() => {
    return Array.from({ length: 80 }, () => ({
      x: Math.random() * 1920,
      y: Math.random() * 1080,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.6 - 0.1,
      size: Math.random() * 3 + 0.5,
      alpha: Math.random() * 0.35 + 0.05,
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
      bgGrad.addColorStop(0, 'rgba(18,10,2,0.85)');
      bgGrad.addColorStop(0.5, 'rgba(8,5,0,0.92)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const carpetSize = 36;
      ctx.save();
      ctx.globalAlpha = 0.045;
      for (let cx = 0; cx < w + carpetSize; cx += carpetSize) {
        for (let cy = 0; cy < h + carpetSize; cy += carpetSize) {
          ctx.fillStyle = (Math.floor(cx / carpetSize) + Math.floor(cy / carpetSize)) % 2 === 0
            ? 'rgba(20,60,20,0.9)' : 'rgba(15,45,15,0.9)';
          ctx.fillRect(cx, cy, carpetSize, carpetSize);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = 'rgba(212,175,55,0.5)';
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

    const drawThirdPerson = (w: number, h: number) => {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgba(5,2,12,0.98)');
      bgGrad.addColorStop(0.4, 'rgba(15,5,2,0.95)');
      bgGrad.addColorStop(0.7, 'rgba(8,20,8,0.92)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalAlpha = 0.08;
      const floorY = h * 0.65;
      const tileSize = 60;
      for (let tx = -tileSize; tx < w + tileSize; tx += tileSize) {
        for (let ty = floorY; ty < h + tileSize; ty += tileSize * 0.5) {
          const prog = (ty - floorY) / (h - floorY);
          const scaledTile = tileSize * (0.5 + prog * 2);
          const offsetX = ((tx / tileSize) % 2) * tileSize * 0.5;
          ctx.fillStyle = (Math.floor(tx / tileSize) + Math.floor((ty - floorY) / (tileSize * 0.5))) % 2 === 0
            ? 'rgba(30,80,30,1)' : 'rgba(20,55,20,1)';
          ctx.fillRect(tx + offsetX - scaledTile * 0.5, ty, scaledTile, scaledTile * 0.5);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.04;
      const wallY = h * 0.25;
      ctx.fillStyle = 'rgba(80,30,10,0.8)';
      ctx.fillRect(0, wallY, w, h * 0.4);
      ctx.globalAlpha = 0.06;
      for (let wx = 0; wx < w; wx += 80) {
        ctx.strokeStyle = 'rgba(212,175,55,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx, wallY);
        ctx.lineTo(wx, h * 0.65);
        ctx.stroke();
      }
      ctx.restore();

      const numTables = 3;
      for (let i = 0; i < numTables; i++) {
        const tx = (w / (numTables + 1)) * (i + 1);
        const ty = h * 0.62;
        const tw = 120 + Math.sin(t + i) * 5;
        const th = 60;
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.02 * Math.sin(t * 0.5 + i);
        const tGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, tw * 0.7);
        tGrad.addColorStop(0, 'rgba(10,80,10,0.9)');
        tGrad.addColorStop(0.7, 'rgba(5,50,5,0.9)');
        tGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = tGrad;
        ctx.ellipse(tx, ty, tw, th, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(212,175,55,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawFirstPerson = (w: number, h: number) => {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, 'rgba(3,1,8,0.99)');
      bgGrad.addColorStop(0.35, 'rgba(8,3,2,0.97)');
      bgGrad.addColorStop(0.5, 'rgba(5,15,5,0.97)');
      bgGrad.addColorStop(1, 'rgba(0,0,0,0.99)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const horizY = h * 0.42;
      const vanishX = w * 0.5 + Math.sin(t * 0.3) * w * 0.03;

      ctx.save();
      ctx.globalAlpha = 0.09;
      for (let lx = -w; lx < w * 2; lx += 80) {
        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizY);
        ctx.lineTo(lx, h);
        ctx.stroke();
      }
      for (let row = 0; row < 8; row++) {
        const yPct = horizY + (h - horizY) * (row / 8) ** 1.5;
        const spread = (yPct - horizY) / (h - horizY);
        ctx.beginPath();
        ctx.moveTo(vanishX - spread * w * 1.5, yPct);
        ctx.lineTo(vanishX + spread * w * 1.5, yPct);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.12;
      const tableW = w * 0.8;
      const tableH = h * 0.35;
      const tableX = (w - tableW) / 2;
      const tableY = horizY + 10;
      const tGrad = ctx.createRadialGradient(w * 0.5, tableY + tableH * 0.3, 10, w * 0.5, tableY + tableH * 0.5, tableW * 0.5);
      tGrad.addColorStop(0, 'rgba(15,90,15,0.9)');
      tGrad.addColorStop(0.6, 'rgba(8,60,8,0.9)');
      tGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, tableY + tableH * 0.5, tableW * 0.5, tableH * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(212,175,55,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.06;
      for (let ci = 0; ci < 5; ci++) {
        const cx2 = tableX + (ci + 0.5) * (tableW / 5);
        const cy2 = tableY + tableH * (0.3 + Math.sin(ci * 1.3) * 0.2);
        ctx.beginPath();
        ctx.arc(cx2, cy2, 8 + Math.sin(t + ci) * 1, 0, Math.PI * 2);
        ctx.strokeStyle = ci % 2 === 0 ? 'rgba(212,175,55,0.5)' : 'rgba(255,50,50,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = 'rgba(50,15,5,0.5)';
      ctx.fillRect(0, 0, w * 0.12, h * 0.8);
      ctx.fillRect(w * 0.88, 0, w * 0.12, h * 0.8);
      ctx.restore();
    };

    const animate = () => {
      t += 0.004;
      const w = canvas.width / devicePixelRatio;
      const h = canvas.height / devicePixelRatio;

      ctx.clearRect(0, 0, w, h);

      if (perspective === 'third-person') {
        drawThirdPerson(w, h);
      } else if (perspective === 'first-person') {
        drawFirstPerson(w, h);
      } else {
        drawOverview(w, h);
      }

      for (const spot of localSpots) {
        spot.angle += spot.speed;
        const sx = w * spot.x + Math.sin(spot.angle) * spot.radius;
        const sy = h * 0.2 + Math.cos(spot.angle * 0.7) * spot.radius * 0.5;
        const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 200 + Math.sin(t + spot.x * 3) * 40);
        spotGrad.addColorStop(0, `rgba(212,175,55,${0.05 + 0.03 * Math.sin(t * 1.3)})`);
        spotGrad.addColorStop(0.5, `rgba(180,130,20,0.02)`);
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
        p.alpha += (Math.random() - 0.5) * 0.008;
        p.alpha = Math.max(0.02, Math.min(0.4, p.alpha));
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
  }, [videoUrl, particles, spotlights, perspective]);

  const perspectiveLabels: Record<PerspectiveMode, string> = {
    'overview': '🗺️ Overview',
    'third-person': '👁️ 3rd Person',
    'first-person': '🎭 1st Person',
  };

  const nextPerspective: Record<PerspectiveMode, PerspectiveMode> = {
    'overview': 'third-person',
    'third-person': 'first-person',
    'first-person': 'overview',
  };

  const PerspectiveToggle = () => (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      {showToggle && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '8px',
            borderRadius: 12,
            background: 'rgba(10,5,20,0.95)',
            border: '1px solid rgba(212,175,55,0.3)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
          }}
        >
          {(['overview', 'third-person', 'first-person'] as PerspectiveMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setPerspective(mode); setShowToggle(false); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: perspective === mode ? '1px solid rgba(212,175,55,0.6)' : '1px solid rgba(255,255,255,0.1)',
                background: perspective === mode ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                color: perspective === mode ? '#D4AF37' : '#C0C0C0',
                fontSize: 12,
                fontWeight: perspective === mode ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {perspectiveLabels[mode]}
            </button>
          ))}
          <div style={{ fontSize: 10, color: '#606060', textAlign: 'center', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            Casino View Mode
          </div>
        </div>
      )}
      <button
        onClick={() => setShowToggle(prev => !prev)}
        title="Toggle casino view"
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          background: 'rgba(10,5,20,0.9)',
          border: '1px solid rgba(212,175,55,0.4)',
          color: '#D4AF37',
          fontSize: 12,
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.7), 0 0 15px rgba(212,175,55,0.1)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
        }}
      >
        <span>🎰</span>
        <span>{perspectiveLabels[perspective]}</span>
      </button>
    </div>
  );

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
        <PerspectiveToggle />
      </>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}
      />
      <CasinoOverlay />
      <PerspectiveToggle />
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
