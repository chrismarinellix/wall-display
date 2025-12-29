import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { proverbs } from '../../data/proverbs';

// Ink brush stroke reveal - characters appear as if painted with calligraphy brush
function InkBrushText({
  text,
  style = {},
  revealDuration = 4000,
}: {
  text: string;
  style?: React.CSSProperties;
  revealDuration?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  // Generate unique properties for each character
  const charProps = useMemo(() =>
    text.split('').map((_, i) => ({
      // Staggered reveal - each character starts at different time
      revealStart: (i / text.length) * 0.8,
      // Random brush stroke angle
      brushAngle: -15 + Math.random() * 30,
      // Ink splatter delay
      inkDelay: Math.random() * 0.2,
    })), [text]
  );

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const p = Math.min(1, elapsed / revealDuration);
      setProgress(p);

      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRevealed(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [revealDuration, text]);

  // Once revealed, show static text
  if (isRevealed) {
    return <span style={{ display: 'inline', ...style }}>{text}</span>;
  }

  return (
    <span style={{ display: 'inline', ...style }}>
      {text.split('').map((char, i) => {
        const props = charProps[i];

        // Character reveal progress (0 = invisible, 1 = fully painted)
        const charProgress = Math.max(0, Math.min(1,
          (progress - props.revealStart) / 0.25
        ));

        // Brush stroke effect - scale from thin line to full character
        const scaleY = 0.1 + charProgress * 0.9;
        const scaleX = charProgress < 0.3 ? 0.5 + charProgress * 1.7 : 1;

        // Opacity builds up like ink saturating paper
        const opacity = Math.pow(charProgress, 0.5);

        // Slight rotation as brush lifts
        const rotation = props.brushAngle * (1 - charProgress);

        // Ink spread blur at start
        const blur = (1 - charProgress) * 3;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `scaleX(${scaleX}) scaleY(${scaleY}) rotate(${rotation}deg)`,
              transformOrigin: 'bottom center',
              filter: blur > 0.1 ? `blur(${blur}px)` : 'none',
              transition: 'none',
              willChange: 'transform, opacity, filter',
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

// Floating ink drops decoration
function InkDrops() {
  const drops = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      size: 3 + Math.random() * 8,
      delay: i * 0.5,
      duration: 3 + Math.random() * 2,
    })), []
  );

  return (
    <>
      <style>{`
        @keyframes inkDrop {
          0% { opacity: 0; transform: scale(0); }
          20% { opacity: 0.3; transform: scale(1); }
          80% { opacity: 0.3; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
      `}</style>
      {drops.map((drop, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            width: drop.size,
            height: drop.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(26,26,26,0.4) 0%, rgba(26,26,26,0) 70%)',
            animation: `inkDrop ${drop.duration}s ease-in-out ${drop.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
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

      {/* Floating ink drops */}
      <InkDrops />

      {/* Main content container */}
      <div style={{ position: 'relative', maxWidth: 700 }}>
        {/* Japanese calligraphy text with ink brush reveal */}
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
          <InkBrushText text={proverbData.proverb.japanese} revealDuration={3000} />
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
