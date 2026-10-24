import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Zap, Eye, EyeOff } from 'lucide-react';

interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  color: string;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  color: string;
  tailWidth: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const StarfallBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [starCount, setStarCount] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const tokyoColors = ['#bb9af7', '#7aa2f7', '#7dcfff', '#c0caf5', '#ff9e64', '#9ece6a'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate static/twinkling stars
    const numStars = Math.floor((width * height) / 4500);
    const stars: Star[] = Array.from({ length: numStars }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.8 + 0.2,
      twinkleSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      color: tokyoColors[Math.floor(Math.random() * tokyoColors.length)]
    }));

    // Natural random shooting star timer
    let lastSpawn = Date.now();
    const spawnInterval = 2800 / speedMultiplier;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Tokyo Night Deep Space Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#16161e');
      gradient.addColorStop(0.5, '#1a1b26');
      gradient.addColorStop(1, '#13141c');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle Nebula Glow
      const nebula = ctx.createRadialGradient(width * 0.7, height * 0.2, 50, width * 0.7, height * 0.2, width * 0.6);
      nebula.addColorStop(0, 'rgba(187, 154, 247, 0.08)');
      nebula.addColorStop(0.5, 'rgba(122, 162, 247, 0.04)');
      nebula.addColorStop(1, 'transparent');
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Twinkling Stars
      stars.forEach(star => {
        star.alpha += star.twinkleSpeed;
        if (star.alpha > 0.95 || star.alpha < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(1, star.alpha));
        ctx.shadowBlur = 6;
        ctx.shadowColor = star.color;
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // 3. Natural Shooting Star Spawner
      const now = Date.now();
      if (now - lastSpawn > spawnInterval / speedMultiplier) {
        lastSpawn = now;
        shootingStarsRef.current.push({
          x: Math.random() * width + 200,
          y: Math.random() * (height * 0.4) - 100,
          length: Math.random() * 120 + 80,
          speed: (Math.random() * 8 + 12) * speedMultiplier,
          angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1), // ~45 degrees diagonal
          opacity: 1,
          color: tokyoColors[Math.floor(Math.random() * tokyoColors.length)],
          tailWidth: Math.random() * 2 + 1.2
        });
      }

      // 4. Update & Draw Shooting Stars (ดาวตก)
      for (let i = shootingStarsRef.current.length - 1; i >= 0; i--) {
        const star = shootingStarsRef.current[i];
        star.x -= Math.cos(star.angle) * star.speed;
        star.y += Math.sin(star.angle) * star.speed;
        star.opacity -= 0.012;

        if (star.opacity <= 0 || star.x < -200 || star.y > height + 200) {
          shootingStarsRef.current.splice(i, 1);
          continue;
        }

        const tailX = star.x + Math.cos(star.angle) * star.length;
        const tailY = star.y - Math.sin(star.angle) * star.length;

        const starGrad = ctx.createLinearGradient(star.x, star.y, tailX, tailY);
        starGrad.addColorStop(0, '#ffffff');
        starGrad.addColorStop(0.2, star.color);
        starGrad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = starGrad;
        ctx.lineWidth = star.tailWidth;
        ctx.lineCap = 'round';
        ctx.globalAlpha = Math.max(0, star.opacity);
        ctx.shadowBlur = 14;
        ctx.shadowColor = star.color;
        ctx.stroke();

        // Bright Head
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.tailWidth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.restore();
      }

      // 5. Update & Draw Interactive Click Particles (Stardust)
      for (let j = particlesRef.current.length - 1; j >= 0; j--) {
        const p = particlesRef.current[j];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.radius *= 0.98;

        if (p.alpha <= 0) {
          particlesRef.current.splice(j, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [speedMultiplier]);

  // Interactive Click on Background: Spawns Meteor & Stardust
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Spawn 2 shooting stars crossing near click
    const angle = Math.PI / 4 + (Math.random() * 0.3 - 0.15);
    shootingStarsRef.current.push({
      x: clickX + 180,
      y: clickY - 180,
      length: 140,
      speed: 18 * speedMultiplier,
      angle,
      opacity: 1,
      color: tokyoColors[Math.floor(Math.random() * tokyoColors.length)],
      tailWidth: 2.5
    });

    // Spawn 16 starburst particles
    for (let k = 0; k < 18; k++) {
      const partAngle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      particlesRef.current.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(partAngle) * speed,
        vy: Math.sin(partAngle) * speed,
        radius: Math.random() * 2.5 + 1,
        alpha: 1,
        color: tokyoColors[Math.floor(Math.random() * tokyoColors.length)]
      });
    }

    setStarCount(prev => prev + 1);
  };

  const triggerMeteorShower = (e: React.MouseEvent) => {
    e.stopPropagation();
    for (let s = 0; s < 7; s++) {
      setTimeout(() => {
        shootingStarsRef.current.push({
          x: Math.random() * window.innerWidth + 300,
          y: Math.random() * 250 - 100,
          length: Math.random() * 140 + 100,
          speed: (Math.random() * 10 + 15) * speedMultiplier,
          angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
          opacity: 1,
          color: tokyoColors[Math.floor(Math.random() * tokyoColors.length)],
          tailWidth: Math.random() * 2.5 + 1.5
        });
        setStarCount(prev => prev + 1);
      }, s * 140);
    }
  };

  return (
    <>
      {/* Background Interactive Layer */}
      <div
        onClick={handleCanvasClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          cursor: 'crosshair',
          overflow: 'hidden'
        }}
        title="คลิกที่ใดก็ได้บนท้องฟ้าเพื่อปล่อยดาวตกและละอองดาว!"
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      </div>

      {/* Interactive Starfall Controller Pill (Floating Bottom Right) */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(26, 27, 38, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(187, 154, 247, 0.3)',
        borderRadius: '999px',
        padding: '6px 14px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 16px rgba(187, 154, 247, 0.25)',
        fontSize: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="#bb9af7" />
          <span style={{ color: '#c0caf5', fontWeight: 600 }}>Tokyo Night Starfall</span>
          <span style={{
            fontSize: 10,
            backgroundColor: 'rgba(187, 154, 247, 0.2)',
            color: '#bb9af7',
            padding: '1px 6px',
            borderRadius: 999,
            fontWeight: 700
          }}>
            {starCount} ดวง
          </span>
        </div>

        <button
          onClick={triggerMeteorShower}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            backgroundColor: 'rgba(122, 162, 247, 0.2)',
            color: '#7dcfff',
            border: '1px solid rgba(125, 207, 255, 0.4)',
            borderRadius: 999,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title="ปล่อยฝนดาวตกชุดใหญ่"
        >
          <Zap size={12} />
          <span>ฝนดาวตก 🌠</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSpeedMultiplier(prev => (prev === 1 ? 2 : prev === 2 ? 0.5 : 1));
          }}
          style={{
            backgroundColor: 'transparent',
            color: '#a9b1d6',
            border: 'none',
            fontSize: 11,
            padding: '2px 6px',
            cursor: 'pointer'
          }}
          title="ปรับความถี่ดาวตก"
        >
          ความเร็ว: {speedMultiplier}x
        </button>
      </div>
    </>
  );
};
