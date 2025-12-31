import { useRef, useEffect, useState, ReactNode } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';

// Magical ink reveal - text appears as if written by invisible quill
export function InkRevealText({
  children,
  delay = 0,
  duration = 2000,
  className,
  style,
}: {
  children: string;
  delay?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsRevealing(true);
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        setRevealProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay, duration]);

  const chars = children.split('');
  const charDelay = 0.6 / chars.length; // Stagger across 60% of duration

  return (
    <span className={className} style={{ display: 'inline', ...style }}>
      {chars.map((char, i) => {
        const charStart = i * charDelay;
        const charProgress = Math.max(0, Math.min(1, (revealProgress - charStart) / 0.4));
        const ease = 1 - Math.pow(1 - charProgress, 3);

        return (
          <motion.span
            key={i}
            style={{
              display: 'inline-block',
              opacity: ease,
              filter: ease < 1 ? `blur(${(1 - ease) * 2}px)` : 'none',
              transform: ease < 1 ? `translateY(${(1 - ease) * 5}px) scale(${0.9 + ease * 0.1})` : 'none',
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        );
      })}
    </span>
  );
}

// Parchment paper texture effect
export function ParchmentBackground({
  children,
  className,
  style,
  aged = true,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  aged?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Base parchment color
    ctx.fillStyle = '#f5f0e1';
    ctx.fillRect(0, 0, width, height);

    if (aged) {
      // Add noise texture
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 15;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }

      ctx.putImageData(imageData, 0, 0);

      // Add aged spots
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 5 + Math.random() * 30;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(139, 119, 101, 0.1)');
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add edge darkening (vignette)
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.8
      );
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(100, 80, 60, 0.15)');

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
  }, [aged]);

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          borderRadius: 'inherit',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// Animated wax seal
export function WaxSeal({
  letter = 'M',
  size = 60,
  color = '#8b0000',
}: {
  letter?: string;
  size?: number;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.5,
      }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}, ${adjustColor(color, -30)})`,
        boxShadow: `
          inset 2px 2px 5px rgba(255,255,255,0.2),
          inset -2px -2px 5px rgba(0,0,0,0.3),
          3px 3px 10px rgba(0,0,0,0.3)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: size * 0.5,
        fontWeight: 700,
        color: adjustColor(color, 50),
        textShadow: `1px 1px 2px ${adjustColor(color, -40)}`,
      }}
    >
      {letter}
    </motion.div>
  );
}

// Utility to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

// Floating newspaper headline with dramatic entrance
export function FloatingHeadline({
  children,
  delay = 0,
}: {
  children: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: -30 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 1.2,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.span
        animate={{
          textShadow: [
            '0 4px 8px rgba(0,0,0,0.1)',
            '0 8px 16px rgba(0,0,0,0.15)',
            '0 4px 8px rgba(0,0,0,0.1)',
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {children}
      </motion.span>
    </motion.div>
  );
}

// Typewriter effect
export function TypewriterText({
  text,
  speed = 50,
  delay = 0,
  cursor = true,
  onComplete,
  style,
}: {
  text: string;
  speed?: number;
  delay?: number;
  cursor?: boolean;
  onComplete?: () => void;
  style?: React.CSSProperties;
}) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);

    const startTimer = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [text, speed, delay, onComplete]);

  return (
    <span style={style}>
      {displayText}
      {cursor && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          style={{ display: 'inline-block', marginLeft: 2 }}
        >
          |
        </motion.span>
      )}
    </span>
  );
}

// Shimmer highlight effect (for important text)
export function ShimmerText({
  children,
  color = '#ffd700',
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <motion.span
      style={{
        display: 'inline-block',
        position: 'relative',
        background: `linear-gradient(
          90deg,
          currentColor 0%,
          ${color} 50%,
          currentColor 100%
        )`,
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      animate={{
        backgroundPosition: ['200% 0%', '-200% 0%'],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}

// Page turn effect container
export function PageTurn({
  children,
  isVisible = true,
  direction = 'right',
}: {
  children: ReactNode;
  isVisible?: boolean;
  direction?: 'left' | 'right';
}) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{
            rotateY: direction === 'right' ? -90 : 90,
            opacity: 0,
            transformOrigin: direction === 'right' ? 'left center' : 'right center',
          }}
          animate={{
            rotateY: 0,
            opacity: 1,
          }}
          exit={{
            rotateY: direction === 'right' ? 90 : -90,
            opacity: 0,
          }}
          transition={{
            duration: 0.6,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            perspective: '1500px',
            transformStyle: 'preserve-3d',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Glowing orb effect (for magical atmosphere)
export function GlowingOrb({
  color = '#4a90d9',
  size = 100,
  intensity = 1,
}: {
  color?: string;
  size?: number;
  intensity?: number;
}) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.6 * intensity, 0.9 * intensity, 0.6 * intensity],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}, transparent 70%)`,
        boxShadow: `
          0 0 ${size * 0.2}px ${color},
          0 0 ${size * 0.4}px ${color},
          0 0 ${size * 0.6}px ${adjustColor(color, -30)}
        `,
        filter: `blur(${size * 0.05}px)`,
      }}
    />
  );
}

// Animated border that draws itself
export function AnimatedBorder({
  children,
  color = '#333',
  thickness = 2,
  duration = 2,
  delay = 0,
  style,
}: {
  children: ReactNode;
  color?: string;
  thickness?: number;
  duration?: number;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      style={{
        position: 'relative',
        ...style,
      }}
    >
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <motion.rect
          x={thickness / 2}
          y={thickness / 2}
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={4}
          ry={4}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration,
            delay,
            ease: 'easeInOut',
          }}
        />
      </svg>
      {children}
    </motion.div>
  );
}

// Quill writing animation
export function QuillWriting({
  width = 30,
  height = 30,
  color = '#333',
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  return (
    <motion.svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      animate={{
        rotate: [0, 5, -5, 0],
        y: [0, -2, 0],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Quill feather */}
      <motion.path
        d="M20 2L4 18l-2 4 4-2L22 4c0-1.1-.9-2-2-2z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      {/* Ink drop */}
      <motion.circle
        cx="4"
        cy="20"
        r="1"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1, 0.8] }}
        transition={{ duration: 0.5, delay: 1 }}
      />
    </motion.svg>
  );
}
