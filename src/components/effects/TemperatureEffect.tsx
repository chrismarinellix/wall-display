import { useRef, useEffect, useState, useMemo } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { ParticleSystem } from './ParticleSystem';

interface TemperatureEffectProps {
  temperature: number;
  unit?: 'celsius' | 'fahrenheit';
  weatherCode?: number;
  size?: 'small' | 'medium' | 'large';
}

// Weather codes to condition mapping
function getWeatherCondition(code: number): 'freezing' | 'cold' | 'cool' | 'warm' | 'hot' | 'rain' | 'snow' | 'storm' {
  // WMO Weather codes
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 95 && code <= 99) return 'storm';
  if (code >= 51 && code <= 67) return 'rain';
  return 'cool'; // Default, will be overridden by temperature
}

function getTemperatureCondition(temp: number): 'freezing' | 'cold' | 'cool' | 'warm' | 'hot' {
  if (temp <= 0) return 'freezing';
  if (temp <= 10) return 'cold';
  if (temp <= 20) return 'cool';
  if (temp <= 30) return 'warm';
  return 'hot';
}

// Color schemes for different temperatures
const temperatureColors = {
  freezing: {
    primary: '#00d4ff',
    secondary: '#0099cc',
    glow: '#80eaff',
    text: '#e0f7ff',
    gradient: 'linear-gradient(180deg, #001f3f 0%, #003366 50%, #004080 100%)',
  },
  cold: {
    primary: '#4fc3f7',
    secondary: '#29b6f6',
    glow: '#81d4fa',
    text: '#e1f5fe',
    gradient: 'linear-gradient(180deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
  },
  cool: {
    primary: '#81c784',
    secondary: '#66bb6a',
    glow: '#a5d6a7',
    text: '#e8f5e9',
    gradient: 'linear-gradient(180deg, #1b5e20 0%, #2e7d32 50%, #388e3c 100%)',
  },
  warm: {
    primary: '#ffb74d',
    secondary: '#ffa726',
    glow: '#ffcc80',
    text: '#fff3e0',
    gradient: 'linear-gradient(180deg, #e65100 0%, #f57c00 50%, #fb8c00 100%)',
  },
  hot: {
    primary: '#ff5722',
    secondary: '#f44336',
    glow: '#ff8a65',
    text: '#ffebee',
    gradient: 'linear-gradient(180deg, #b71c1c 0%, #c62828 50%, #d32f2f 100%)',
  },
};

export function TemperatureEffect({
  temperature,
  unit = 'celsius',
  weatherCode,
  size = 'large',
}: TemperatureEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  // Determine condition based on weather code and temperature
  const weatherCondition = weatherCode ? getWeatherCondition(weatherCode) : null;
  const tempCondition = getTemperatureCondition(temperature);
  const condition = weatherCondition === 'rain' || weatherCondition === 'snow' || weatherCondition === 'storm'
    ? weatherCondition
    : tempCondition;

  // Get colors for current condition
  const colors = temperatureColors[tempCondition];

  // Animated spring for temperature changes
  const springTemp = useSpring(temperature, { stiffness: 50, damping: 20 });
  const displayTemp = useTransform(springTemp, (v) => Math.round(v));

  // Size configurations
  const sizeConfig = {
    small: { fontSize: 48, width: 120, height: 80 },
    medium: { fontSize: 72, width: 180, height: 120 },
    large: { fontSize: 120, width: 300, height: 200 },
  }[size];

  // Drip/melt effect for the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = sizeConfig.width * dpr;
    canvas.height = sizeConfig.height * dpr;
    ctx.scale(dpr, dpr);

    interface Drip {
      x: number;
      y: number;
      vy: number;
      size: number;
      opacity: number;
      color: string;
    }

    const drips: Drip[] = [];

    const createDrip = () => {
      const isFreezing = tempCondition === 'freezing' || tempCondition === 'cold';
      return {
        x: Math.random() * sizeConfig.width,
        y: isFreezing ? sizeConfig.height + 10 : -10,
        vy: isFreezing ? -0.5 - Math.random() * 1 : 0.5 + Math.random() * 1.5,
        size: 2 + Math.random() * 4,
        opacity: 0.3 + Math.random() * 0.5,
        color: colors.primary,
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, sizeConfig.width, sizeConfig.height);

      // Add new drips occasionally
      if (Math.random() < 0.1) {
        drips.push(createDrip());
      }

      // Draw and update drips
      for (let i = drips.length - 1; i >= 0; i--) {
        const drip = drips[i];
        drip.y += drip.vy;
        drip.vy += tempCondition === 'hot' ? 0.05 : 0.02; // Gravity

        // Draw drip
        ctx.beginPath();
        ctx.ellipse(drip.x, drip.y, drip.size * 0.5, drip.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = drip.color;
        ctx.globalAlpha = drip.opacity;
        ctx.fill();

        // Add glow
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = drip.size * 2;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Remove if off screen
        if (drip.y > sizeConfig.height + 20 || drip.y < -20) {
          drips.splice(i, 1);
        }
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    setIsVisible(true);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [tempCondition, colors, sizeConfig]);

  // Particle effect based on condition
  const renderParticles = () => {
    switch (condition) {
      case 'freezing':
      case 'cold':
        return (
          <ParticleSystem
            type="frost"
            width={sizeConfig.width}
            height={sizeConfig.height}
            intensity={condition === 'freezing' ? 1.5 : 0.8}
            density={4}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        );
      case 'hot':
        return (
          <ParticleSystem
            type="heat"
            width={sizeConfig.width}
            height={sizeConfig.height}
            intensity={1.2}
            density={5}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        );
      case 'warm':
        return (
          <ParticleSystem
            type="steam"
            width={sizeConfig.width}
            height={sizeConfig.height}
            intensity={0.6}
            density={2}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        );
      case 'rain':
        return (
          <ParticleSystem
            type="rain"
            width={sizeConfig.width}
            height={sizeConfig.height}
            intensity={1}
            density={6}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        );
      case 'snow':
        return (
          <ParticleSystem
            type="snow"
            width={sizeConfig.width}
            height={sizeConfig.height}
            intensity={1}
            density={4}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        );
      default:
        return null;
    }
  };

  // Ice crystals for freezing effect
  const IceCrystals = useMemo(() => {
    if (tempCondition !== 'freezing' && tempCondition !== 'cold') return null;

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        viewBox={`0 0 ${sizeConfig.width} ${sizeConfig.height}`}
      >
        {[...Array(tempCondition === 'freezing' ? 8 : 4)].map((_, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.6, 0.3],
              scale: [0.5, 1.2, 1],
              rotate: [0, 30, 0],
            }}
            transition={{
              duration: 3,
              delay: i * 0.3,
              repeat: Infinity,
              repeatDelay: 2,
            }}
            style={{
              transformOrigin: 'center',
              transform: `translate(${20 + (i % 4) * 70}px, ${20 + Math.floor(i / 4) * 60}px)`,
            }}
          >
            {/* Six-pointed crystal */}
            {[0, 60, 120, 180, 240, 300].map((angle) => (
              <line
                key={angle}
                x1="0"
                y1="0"
                x2={Math.cos((angle * Math.PI) / 180) * 15}
                y2={Math.sin((angle * Math.PI) / 180) * 15}
                stroke={colors.glow}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ))}
          </motion.g>
        ))}
      </svg>
    );
  }, [tempCondition, colors.glow, sizeConfig]);

  // Heat shimmer effect
  const HeatShimmer = useMemo(() => {
    if (tempCondition !== 'hot' && tempCondition !== 'warm') return null;

    return (
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: `linear-gradient(
            0deg,
            transparent 0%,
            rgba(255, 100, 50, 0.1) 25%,
            transparent 50%,
            rgba(255, 150, 50, 0.08) 75%,
            transparent 100%
          )`,
          backgroundSize: '100% 40px',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '0% 100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    );
  }, [tempCondition]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isVisible ? 1 : 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'relative',
        width: sizeConfig.width,
        height: sizeConfig.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 16,
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: colors.gradient,
          opacity: 0.3,
          borderRadius: 16,
        }}
      />

      {/* Drip/melt canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: sizeConfig.width,
          height: sizeConfig.height,
          pointerEvents: 'none',
        }}
      />

      {/* Particles */}
      {renderParticles()}

      {/* Ice crystals overlay */}
      {IceCrystals}

      {/* Heat shimmer overlay */}
      {HeatShimmer}

      {/* Temperature display */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 200,
          color: colors.text,
          textShadow: `0 0 30px ${colors.glow}, 0 0 60px ${colors.primary}`,
        }}
      >
        <motion.span
          style={{ fontSize: sizeConfig.fontSize }}
        >
          {displayTemp}
        </motion.span>
        <span
          style={{
            fontSize: sizeConfig.fontSize * 0.3,
            marginTop: sizeConfig.fontSize * 0.1,
            opacity: 0.8,
          }}
        >
          °{unit === 'celsius' ? 'C' : 'F'}
        </span>
      </motion.div>

      {/* Frosted glass effect for cold */}
      {(tempCondition === 'freezing' || tempCondition === 'cold') && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(200, 230, 255, 0.15) 100%)',
            backdropFilter: 'blur(1px)',
            pointerEvents: 'none',
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
}

// Simple animated temperature number with particle effects
export function AnimatedTemperature({
  temperature,
  weatherCode: _weatherCode,
  showParticles = true,
}: {
  temperature: number;
  weatherCode?: number;
  showParticles?: boolean;
}) {
  void _weatherCode; // Reserved for future use
  const springTemp = useSpring(temperature, { stiffness: 100, damping: 20 });
  const displayTemp = useTransform(springTemp, (v) => Math.round(v));
  const [display, setDisplay] = useState(Math.round(temperature));

  useEffect(() => {
    const unsubscribe = displayTemp.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [displayTemp]);

  const tempCondition = getTemperatureCondition(temperature);
  const colors = temperatureColors[tempCondition];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {showParticles && (
        <div style={{ position: 'absolute', inset: -20, pointerEvents: 'none', overflow: 'hidden' }}>
          {tempCondition === 'freezing' && <ParticleSystem type="frost" width={100} height={60} intensity={0.5} density={2} />}
          {tempCondition === 'hot' && <ParticleSystem type="heat" width={100} height={60} intensity={0.5} density={2} />}
        </div>
      )}
      <motion.span
        style={{
          color: colors.primary,
          textShadow: `0 0 20px ${colors.glow}`,
          position: 'relative',
          zIndex: 1,
        }}
        animate={{
          textShadow: [
            `0 0 20px ${colors.glow}`,
            `0 0 40px ${colors.glow}`,
            `0 0 20px ${colors.glow}`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {display}°
      </motion.span>
    </div>
  );
}
