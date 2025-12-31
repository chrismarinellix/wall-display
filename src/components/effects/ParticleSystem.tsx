import { useRef, useEffect, useMemo } from 'react';

// Particle types for different effects
type ParticleType = 'frost' | 'heat' | 'rain' | 'snow' | 'steam' | 'spark' | 'dust' | 'ink';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  type: ParticleType;
}

interface ParticleSystemProps {
  type: ParticleType;
  density?: number; // particles per frame
  width?: number;
  height?: number;
  color?: string;
  intensity?: number; // 0-1
  className?: string;
  style?: React.CSSProperties;
}

// Particle configurations per type
const particleConfigs: Record<ParticleType, {
  gravity: number;
  wind: number;
  friction: number;
  sizeRange: [number, number];
  speedRange: [number, number];
  lifeRange: [number, number];
  colors: string[];
  shape: 'circle' | 'crystal' | 'drop' | 'spark' | 'blob';
}> = {
  frost: {
    gravity: 0.02,
    wind: 0.5,
    friction: 0.99,
    sizeRange: [2, 8],
    speedRange: [0.5, 2],
    lifeRange: [100, 200],
    colors: ['#e0f7ff', '#b3ecff', '#80dfff', '#ffffff', '#cceeff'],
    shape: 'crystal',
  },
  heat: {
    gravity: -0.05, // rises
    wind: 0.3,
    friction: 0.98,
    sizeRange: [3, 12],
    speedRange: [1, 3],
    lifeRange: [60, 120],
    colors: ['#ff6b35', '#ff8c42', '#ffa62f', '#ffc93c', '#ff5722'],
    shape: 'blob',
  },
  rain: {
    gravity: 0.4,
    wind: 0.1,
    friction: 1,
    sizeRange: [1, 3],
    speedRange: [8, 15],
    lifeRange: [30, 60],
    colors: ['#6ec6ff', '#90caf9', '#64b5f6', '#42a5f5'],
    shape: 'drop',
  },
  snow: {
    gravity: 0.03,
    wind: 0.8,
    friction: 0.995,
    sizeRange: [2, 6],
    speedRange: [0.5, 1.5],
    lifeRange: [150, 300],
    colors: ['#ffffff', '#f0f8ff', '#e6f3ff', '#f5f5f5'],
    shape: 'circle',
  },
  steam: {
    gravity: -0.03,
    wind: 0.4,
    friction: 0.97,
    sizeRange: [8, 25],
    speedRange: [0.5, 2],
    lifeRange: [80, 150],
    colors: ['rgba(255,255,255,0.3)', 'rgba(240,240,240,0.2)', 'rgba(220,220,220,0.25)'],
    shape: 'blob',
  },
  spark: {
    gravity: 0.1,
    wind: 0.2,
    friction: 0.96,
    sizeRange: [1, 4],
    speedRange: [3, 8],
    lifeRange: [20, 50],
    colors: ['#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#ffffff'],
    shape: 'spark',
  },
  dust: {
    gravity: 0.005,
    wind: 0.6,
    friction: 0.995,
    sizeRange: [1, 3],
    speedRange: [0.2, 0.8],
    lifeRange: [200, 400],
    colors: ['rgba(139,119,101,0.4)', 'rgba(160,140,120,0.3)', 'rgba(180,160,140,0.35)'],
    shape: 'circle',
  },
  ink: {
    gravity: 0.08,
    wind: 0.1,
    friction: 0.985,
    sizeRange: [2, 8],
    speedRange: [1, 4],
    lifeRange: [60, 120],
    colors: ['#1a1a1a', '#333333', '#0d0d0d', '#262626'],
    shape: 'blob',
  },
};

export function ParticleSystem({
  type,
  density = 2,
  width = 200,
  height = 200,
  intensity = 1,
  className,
  style,
}: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const config = particleConfigs[type];

  // Create a new particle
  const createParticle = useMemo(() => () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);
    const life = config.lifeRange[0] + Math.random() * (config.lifeRange[1] - config.lifeRange[0]);

    let x = Math.random() * width;
    let y = Math.random() * height;

    // Spawn from edges for certain types
    if (type === 'rain') {
      y = -10;
    } else if (type === 'snow' || type === 'frost') {
      y = -10;
      x = Math.random() * width;
    } else if (type === 'heat' || type === 'steam') {
      y = height + 10;
    }

    return {
      x,
      y,
      vx: Math.cos(angle) * speed * 0.5,
      vy: type === 'rain' ? speed : Math.sin(angle) * speed,
      size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
      opacity: 0.5 + Math.random() * 0.5,
      life,
      maxLife: life,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      color: config.colors[Math.floor(Math.random() * config.colors.length)],
      type,
    };
  }, [type, width, height, config]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharpness
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const drawParticle = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity * (p.life / p.maxLife);

      switch (config.shape) {
        case 'crystal':
          // Six-pointed ice crystal
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x1 = Math.cos(angle) * p.size;
            const y1 = Math.sin(angle) * p.size;
            ctx.moveTo(0, 0);
            ctx.lineTo(x1, y1);
            // Add branches
            const bx = Math.cos(angle + 0.3) * p.size * 0.5;
            const by = Math.sin(angle + 0.3) * p.size * 0.5;
            ctx.moveTo(x1 * 0.6, y1 * 0.6);
            ctx.lineTo(x1 * 0.6 + bx * 0.4, y1 * 0.6 + by * 0.4);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.stroke();
          // Glow effect
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size;
          ctx.stroke();
          break;

        case 'drop':
          // Teardrop shape
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 2);
          ctx.quadraticCurveTo(p.size, 0, 0, p.size);
          ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          break;

        case 'spark':
          // Four-pointed star
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const x1 = Math.cos(angle) * p.size * 2;
            const y1 = Math.sin(angle) * p.size * 2;
            if (i === 0) ctx.moveTo(x1, y1);
            else ctx.lineTo(x1, y1);
            const midAngle = angle + Math.PI / 4;
            const mx = Math.cos(midAngle) * p.size * 0.5;
            const my = Math.sin(midAngle) * p.size * 0.5;
            ctx.lineTo(mx, my);
          }
          ctx.closePath();
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 2;
          ctx.fill();
          break;

        case 'blob':
          // Organic blob shape with gradient
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          break;

        default: // circle
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
      }

      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Add new particles based on density and intensity
      const particlesToAdd = Math.floor(density * intensity);
      for (let i = 0; i < particlesToAdd; i++) {
        if (Math.random() < 0.3) {
          particlesRef.current.push(createParticle());
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        // Update physics
        p.vy += config.gravity;
        p.vx += (Math.random() - 0.5) * config.wind;
        p.vx *= config.friction;
        p.vy *= config.friction;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.life--;

        // Draw if alive
        if (p.life > 0 && p.x > -20 && p.x < width + 20 && p.y > -20 && p.y < height + 20) {
          drawParticle(p);
          return true;
        }
        return false;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [type, width, height, density, intensity, config, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width,
        height,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

// Preset weather particle effects
export function FrostParticles({ width = 200, height = 100, intensity = 1 }: { width?: number; height?: number; intensity?: number }) {
  return <ParticleSystem type="frost" width={width} height={height} intensity={intensity} density={3} />;
}

export function HeatParticles({ width = 200, height = 100, intensity = 1 }: { width?: number; height?: number; intensity?: number }) {
  return <ParticleSystem type="heat" width={width} height={height} intensity={intensity} density={4} />;
}

export function RainParticles({ width = 200, height = 200, intensity = 1 }: { width?: number; height?: number; intensity?: number }) {
  return <ParticleSystem type="rain" width={width} height={height} intensity={intensity} density={8} />;
}

export function SnowParticles({ width = 200, height = 200, intensity = 1 }: { width?: number; height?: number; intensity?: number }) {
  return <ParticleSystem type="snow" width={width} height={height} intensity={intensity} density={3} />;
}

export function SteamParticles({ width = 200, height = 100, intensity = 1 }: { width?: number; height?: number; intensity?: number }) {
  return <ParticleSystem type="steam" width={width} height={height} intensity={intensity} density={2} />;
}

export function InkParticles({ width = 200, height = 100, intensity = 1 }: { width?: number; height?: number; intensity?: number }) {
  return <ParticleSystem type="ink" width={width} height={height} intensity={intensity} density={1} />;
}
