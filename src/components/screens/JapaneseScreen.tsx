import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { proverbs } from '../../data/proverbs';

// Ink dots forming text - dots appear scattered and gradually form letters
function InkDotsText({
  text,
  style = {},
  revealDuration = 5000,
}: {
  text: string;
  style?: React.CSSProperties;
  revealDuration?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Generate ink dot particles
  interface InkDot {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    size: number;
    opacity: number;
    delay: number;
    settled: boolean;
  }

  const dotsRef = useRef<InkDot[]>([]);

  // Measure text and create canvas
  useEffect(() => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setCanvasSize({ width: rect.width + 40, height: rect.height + 40 });
  }, [text]);

  // Initialize dots when canvas is ready
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

    // Sample pixels to create dots
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dots: InkDot[] = [];
    const sampleStep = 3; // Sample every N pixels

    for (let y = 0; y < canvas.height; y += sampleStep * dpr) {
      for (let x = 0; x < canvas.width; x += sampleStep * dpr) {
        const i = (y * canvas.width + x) * 4;
        const alpha = imageData.data[i + 3];

        if (alpha > 50) {
          // This pixel is part of the text
          const targetX = x / dpr;
          const targetY = y / dpr;

          // Start position - scattered around
          const angle = Math.random() * Math.PI * 2;
          const distance = 50 + Math.random() * 150;
          const startX = targetX + Math.cos(angle) * distance;
          const startY = targetY + Math.sin(angle) * distance;

          dots.push({
            x: startX,
            y: startY,
            targetX,
            targetY,
            size: 1.5 + Math.random() * 2,
            opacity: 0,
            delay: Math.random() * 0.6, // Stagger over 60% of duration
            settled: false,
          });
        }
      }
    }

    dotsRef.current = dots;

    // Clear canvas for animation
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Animation
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / revealDuration);

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

      let allSettled = true;

      dotsRef.current.forEach(dot => {
        // Calculate dot's individual progress
        const dotStart = dot.delay;
        const dotProgress = Math.max(0, Math.min(1, (progress - dotStart) / 0.4));

        if (dotProgress > 0) {
          // Ease out cubic
          const ease = 1 - Math.pow(1 - dotProgress, 3);

          // Move towards target
          dot.x = dot.x + (dot.targetX - dot.x) * ease * 0.15;
          dot.y = dot.y + (dot.targetY - dot.y) * ease * 0.15;
          dot.opacity = Math.min(1, dotProgress * 2);

          // Check if settled
          const distX = Math.abs(dot.x - dot.targetX);
          const distY = Math.abs(dot.y - dot.targetY);
          dot.settled = distX < 0.5 && distY < 0.5;

          if (!dot.settled) allSettled = false;

          // Draw dot
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(26, 26, 26, ${dot.opacity})`;
          ctx.fill();
        } else {
          allSettled = false;
        }
      });

      if (progress < 1 || !allSettled) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Final state - draw crisp text
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.font = `400 80px "Shippori Mincho", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(text, canvasSize.width / 2, canvasSize.height / 2);
        setIsComplete(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [canvasSize, text, revealDuration]);

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Hidden text for measurement */}
      <div
        ref={textRef}
        style={{
          visibility: 'hidden',
          position: 'absolute',
          fontSize: 80,
          fontWeight: 400,
          fontFamily: '"Shippori Mincho", serif',
          letterSpacing: '0.2em',
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </div>

      {/* Canvas for ink dots animation */}
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
          display: 'block',
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
          <InkDotsText text={proverbData.proverb.japanese} revealDuration={4000} />
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
