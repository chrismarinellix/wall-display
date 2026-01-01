import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { proverbs } from '../../data/proverbs';

// Ink dots appear in place, then morph into calligraphy text
function InkDotsText({
  text,
  style = {},
  dotsDuration = 1500,    // How long dots phase lasts
  morphDuration = 2000,   // How long morph to text takes
}: {
  text: string;
  style?: React.CSSProperties;
  dotsDuration?: number;
  morphDuration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<'dots' | 'morphing' | 'complete'>('dots');
  const [dotsOpacity, setDotsOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Dot interface
  interface InkDot {
    x: number;
    y: number;
    size: number;
    delay: number;
  }

  const dotsRef = useRef<InkDot[]>([]);

  // Measure text and create canvas
  useEffect(() => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setCanvasSize({ width: rect.width + 40, height: rect.height + 40 });
  }, [text]);

  // Initialize dots and run animation
  useEffect(() => {
    if (canvasSize.width === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    ctx.scale(dpr, dpr);

    // Draw text to get pixel data
    ctx.font = `400 80px "Shippori Mincho", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(text, canvasSize.width / 2, canvasSize.height / 2);

    // Sample pixels to create dots - dots start at their final positions
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dots: InkDot[] = [];
    const sampleStep = 3;

    for (let y = 0; y < canvas.height; y += sampleStep * dpr) {
      for (let x = 0; x < canvas.width; x += sampleStep * dpr) {
        const i = (y * canvas.width + x) * 4;
        const alpha = imageData.data[i + 3];

        if (alpha > 50) {
          const posX = x / dpr + (Math.random() - 0.5) * 2;
          const posY = y / dpr + (Math.random() - 0.5) * 2;
          const baseSize = 1.5 + Math.random() * 2;

          dots.push({
            x: posX,
            y: posY,
            size: baseSize * (0.8 + Math.random() * 0.5),
            delay: Math.random() * 0.4, // Stagger appearance
          });
        }
      }
    }

    dotsRef.current = dots;
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Animation
    const startTime = performance.now();
    const totalDuration = dotsDuration + morphDuration;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      // Phase 1: Dots appear (0 to dotsDuration)
      if (elapsed < dotsDuration) {
        setPhase('dots');
        const dotsProgress = elapsed / dotsDuration;

        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        dotsRef.current.forEach(dot => {
          // Staggered fade in
          const dotProgress = Math.max(0, Math.min(1, (dotsProgress - dot.delay) / 0.5));
          if (dotProgress <= 0) return;

          const opacity = dotProgress * 0.9;

          // Draw dot with ink bleeding effect
          // Outer bleed
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(60, 50, 40, ${opacity * 0.15})`;
          ctx.fill();

          // Middle bleed
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(40, 35, 30, ${opacity * 0.35})`;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 12, 10, ${opacity * 0.95})`;
          ctx.fill();
        });

        setDotsOpacity(1);
        setTextOpacity(0);
      }
      // Phase 2: Morph - crossfade from dots to text
      else if (elapsed < totalDuration) {
        setPhase('morphing');
        const morphProgress = (elapsed - dotsDuration) / morphDuration;
        const eased = 1 - Math.pow(1 - morphProgress, 3); // Ease out

        // Fade out dots
        const dotsAlpha = 1 - eased;
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        dotsRef.current.forEach(dot => {
          const opacity = 0.9 * dotsAlpha;
          if (opacity < 0.01) return;

          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(60, 50, 40, ${opacity * 0.15})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(40, 35, 30, ${opacity * 0.35})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 12, 10, ${opacity * 0.95})`;
          ctx.fill();
        });

        setDotsOpacity(dotsAlpha);
        setTextOpacity(eased);
      }
      // Phase 3: Complete - show only text
      else {
        setPhase('complete');
        setDotsOpacity(0);
        setTextOpacity(1);
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        return; // Stop animation
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [canvasSize, text, dotsDuration, morphDuration]);

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Actual text - fades in during morph */}
      <div
        ref={textRef}
        style={{
          fontSize: 80,
          fontWeight: 400,
          fontFamily: '"Shippori Mincho", serif',
          letterSpacing: '0.2em',
          whiteSpace: 'nowrap',
          color: '#0a0806',
          opacity: textOpacity,
          transition: 'none',
          textShadow: `
            0 0 1px rgba(10, 8, 6, 0.8),
            0 0 3px rgba(30, 25, 20, 0.4),
            0 0 6px rgba(50, 40, 30, 0.2)
          `,
        }}
      >
        {text}
      </div>

      {/* Canvas for ink dots - overlaid on text, fades out */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasSize.width,
          height: canvasSize.height,
          opacity: dotsOpacity,
          pointerEvents: 'none',
          filter: 'blur(0.3px)',
        }}
      />
    </div>
  );
}

// Zen ripple circles - peaceful water ripples
function ZenRipples() {
  return (
    <>
      <style>{`
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'absolute',
        left: '20%',
        top: '30%',
        width: 100,
        height: 100,
        border: '1px solid rgba(180, 160, 140, 0.3)',
        borderRadius: '50%',
        animation: 'ripple 8s ease-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        left: '75%',
        top: '60%',
        width: 80,
        height: 80,
        border: '1px solid rgba(180, 160, 140, 0.25)',
        borderRadius: '50%',
        animation: 'ripple 10s ease-out 2s infinite',
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '80%',
        width: 60,
        height: 60,
        border: '1px solid rgba(180, 160, 140, 0.2)',
        borderRadius: '50%',
        animation: 'ripple 12s ease-out 4s infinite',
      }} />
    </>
  );
}

function getRandomProverb(excludeIndex?: number) {
  let index;
  do {
    index = Math.floor(Math.random() * proverbs.length);
  } while (index === excludeIndex && proverbs.length > 1);
  return { proverb: proverbs[index], index };
}

export function JapaneseScreen() {
  const [proverbData, setProverbData] = useState(() => getRandomProverb());
  const [refreshKey, setRefreshKey] = useState(0);

  // Get a new random proverb each time the screen becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        setProverbData(prev => getRandomProverb(prev.index));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Also refresh when component mounts (navigating to this screen)
  useEffect(() => {
    setProverbData(prev => getRandomProverb(prev.index));
  }, [refreshKey]);

  // Refresh on click anywhere on the screen
  const handleClick = useCallback(() => {
    setProverbData(prev => getRandomProverb(prev.index));
  }, []);

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 48px',
        background: '#faf8f5',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Decorative red seal/stamp in corner */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          right: 48,
          width: 48,
          height: 48,
          border: '2px solid #b8312f',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}
      >
        <span
          style={{
            fontFamily: '"Shippori Mincho", serif',
            fontSize: 20,
            color: '#b8312f',
            fontWeight: 600,
          }}
        >
          諺
        </span>
      </div>

      {/* Vertical decorative line */}
      <div
        style={{
          position: 'absolute',
          left: 48,
          top: '15%',
          bottom: '15%',
          width: 1,
          background: 'linear-gradient(to bottom, transparent, #d4c4b0 20%, #d4c4b0 80%, transparent)',
        }}
      />

      {/* Zen ripples background */}
      <ZenRipples />

      {/* Main content container */}
      <div style={{ position: 'relative', maxWidth: 700 }}>
        {/* Japanese calligraphy text with watercolor wash reveal */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 400,
            lineHeight: 1.4,
            fontFamily: '"Shippori Mincho", "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif',
            letterSpacing: '0.2em',
            marginBottom: 32,
            color: '#1a1a1a',
          }}
        >
          <InkDotsText text={proverbData.proverb.japanese} dotsDuration={1500} morphDuration={2000} />
        </div>

        {/* Romaji pronunciation */}
        <div
          style={{
            fontSize: 12,
            marginBottom: 32,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#8a7a6a',
            fontWeight: 400,
          }}
        >
          {proverbData.proverb.romaji}
        </div>

        {/* Decorative divider with diamond */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div style={{ width: 60, height: 1, background: '#d4c4b0' }} />
          <div
            style={{
              width: 8,
              height: 8,
              background: '#b8312f',
              transform: 'rotate(45deg)',
            }}
          />
          <div style={{ width: 60, height: 1, background: '#d4c4b0' }} />
        </div>

        {/* Meaning / Translation */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: '#2a2a2a',
            marginBottom: 24,
            fontStyle: 'italic',
            letterSpacing: '0.02em',
          }}
        >
          "{proverbData.proverb.meaning}"
        </div>

        {/* Explanation */}
        <div
          style={{
            fontSize: 14,
            color: '#6a6a6a',
            maxWidth: 500,
            lineHeight: 1.9,
            fontWeight: 300,
            margin: '0 auto',
          }}
        >
          {proverbData.proverb.explanation}
        </div>
      </div>

      {/* Bottom decorative element - ink brush stroke style */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 2,
            background: 'linear-gradient(to right, transparent, #c4b4a0)',
            borderRadius: 1,
          }}
        />
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#c4b4a0',
          }}
        />
        <div
          style={{
            width: 40,
            height: 2,
            background: 'linear-gradient(to left, transparent, #c4b4a0)',
            borderRadius: 1,
          }}
        />
      </div>
    </div>
  );
}
