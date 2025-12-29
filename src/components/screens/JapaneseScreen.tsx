import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { proverbs } from '../../data/proverbs';

// Magical shimmer text for Japanese characters - ink forming from ethereal mist
function ShimmeringText({
  text,
  style = {},
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  const [time, setTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate unique properties for each character
  const charProps = useMemo(() =>
    text.split('').map(() => ({
      // Phase offsets for varied movement
      shimmerPhase: Math.random() * Math.PI * 2,
      shimmerSpeed: 0.3 + Math.random() * 0.4,
      // Ink flow effect
      inkPhase: Math.random() * Math.PI * 2,
      inkFlow: 0.8 + Math.random() * 0.4,
      // Subtle movement
      driftX: Math.random() * Math.PI * 2,
      driftY: Math.random() * Math.PI * 2,
      driftAmount: 1 + Math.random() * 2,
      // Glow intensity
      glowPhase: Math.random() * Math.PI * 2,
      glowIntensity: 0.5 + Math.random() * 0.5,
    })), [text]
  );

  // Animation loop
  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      setTime(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const t = time / 1000; // Time in seconds

  return (
    <span style={{ display: 'inline', ...style }}>
      {text.split('').map((char, i) => {
        const props = charProps[i];

        // Shimmer wave - opacity varies sinusoidally
        const shimmerWave = Math.sin(t * props.shimmerSpeed + props.shimmerPhase);
        const opacity = 0.7 + shimmerWave * 0.3;

        // Ink flow - subtle blur oscillation like ink spreading
        const inkWave = Math.sin(t * 0.5 * props.inkFlow + props.inkPhase);
        const blur = Math.max(0, inkWave * 0.5);

        // Subtle drift
        const driftX = Math.sin(t * 0.3 + props.driftX) * props.driftAmount * 0.3;
        const driftY = Math.cos(t * 0.25 + props.driftY) * props.driftAmount * 0.3;

        // Glow pulse
        const glowWave = Math.sin(t * 0.4 + props.glowPhase);
        const glowOpacity = 0.1 + glowWave * 0.1 * props.glowIntensity;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: `translate(${driftX}px, ${driftY}px)`,
              filter: blur > 0.1 ? `blur(${blur}px)` : 'none',
              textShadow: `0 0 20px rgba(26, 26, 26, ${glowOpacity}), 0 0 40px rgba(184, 49, 47, ${glowOpacity * 0.3})`,
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

      {/* Main content container */}
      <div style={{ position: 'relative', maxWidth: 700 }}>
        {/* Japanese calligraphy text with magical shimmer */}
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
          <ShimmeringText text={proverbData.proverb.japanese} />
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
