import { useState, useEffect, useMemo, useRef } from 'react';
import { quotes } from '../../data/quotes';

// Cycling quote with fog reveal and dissolve
function CyclingQuote({
  quote,
  author,
  onCycleComplete,
  revealDuration = 4000,
  visibleDuration = 5000,
  dissolveDuration = 3000,
}: {
  quote: string;
  author: string;
  onCycleComplete: () => void;
  revealDuration?: number;
  visibleDuration?: number;
  dissolveDuration?: number;
}) {
  const [phase, setPhase] = useState<'revealing' | 'visible' | 'dissolving'>('revealing');
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const charProps = useMemo(() =>
    quote.split('').map((_, i) => ({
      revealStart: (i / quote.length) * 0.7,
      randomDelay: Math.random() * 0.1,
      fogPhase: Math.random() * Math.PI * 2,
      fogAmplitude: 4 + Math.random() * 6,
    })), [quote]
  );

  useEffect(() => {
    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const totalDuration = revealDuration + visibleDuration + dissolveDuration;

      if (elapsed < revealDuration) {
        setPhase('revealing');
        setProgress(elapsed / revealDuration);
      } else if (elapsed < revealDuration + visibleDuration) {
        setPhase('visible');
        setProgress(1);
      } else if (elapsed < totalDuration) {
        setPhase('dissolving');
        setProgress(1 - (elapsed - revealDuration - visibleDuration) / dissolveDuration);
      } else {
        onCycleComplete();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [revealDuration, visibleDuration, dissolveDuration, onCycleComplete]);

  const renderText = (text: string, isAuthor = false) => {
    const props = isAuthor ? charProps.slice(0, text.length) : charProps;

    return (
      <span style={{ display: 'inline' }}>
        {text.split('').map((char, i) => {
          const charProp = props[i % props.length];
          let charProgress: number;

          if (phase === 'revealing') {
            const charStart = charProp.revealStart + charProp.randomDelay;
            charProgress = Math.max(0, Math.min(1, (progress - charStart) / 0.3));
          } else if (phase === 'visible') {
            charProgress = 1;
          } else {
            // Dissolving - reverse the reveal
            charProgress = progress;
          }

          const easeProgress = charProgress * charProgress * (3 - 2 * charProgress);
          const fogTime = performance.now() / 1000;
          const fogX = Math.sin(fogTime * 2 + charProp.fogPhase) * charProp.fogAmplitude * (1 - easeProgress);
          const fogY = Math.cos(fogTime * 1.5 + charProp.fogPhase) * (charProp.fogAmplitude * 0.5) * (1 - easeProgress);
          const blurAmount = (1 - easeProgress) * 6;
          const opacity = 0.05 + easeProgress * 0.95;
          const drift = phase === 'dissolving' ? (1 - easeProgress) * 15 : 0;

          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity,
                transform: `translate(${fogX}px, ${fogY - drift}px)`,
                filter: blurAmount > 0.1 ? `blur(${blurAmount}px)` : 'none',
                transition: 'none',
                whiteSpace: char === ' ' ? 'pre' : 'normal',
                willChange: 'transform, opacity, filter',
              }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <>
      <div style={{
        maxWidth: 750,
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: 32,
          fontWeight: 300,
          lineHeight: 1.6,
          letterSpacing: '0.01em',
          color: '#1a1a1a',
          fontFamily: '"Playfair Display", Georgia, serif',
        }}>
          {renderText(quote)}
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginTop: 40,
        opacity: phase === 'visible' ? 1 : progress,
        transition: 'opacity 0.5s ease',
      }}>
        <div style={{
          width: 80,
          height: 1,
          background: 'linear-gradient(to right, transparent, #999)',
        }} />
        <div style={{
          width: 6,
          height: 6,
          background: '#b8312f',
          transform: 'rotate(45deg)',
        }} />
        <div style={{
          width: 80,
          height: 1,
          background: 'linear-gradient(to left, transparent, #999)',
        }} />
      </div>

      <div style={{ marginTop: 24 }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.25em',
          color: '#666',
          textTransform: 'uppercase',
          fontFamily: 'Georgia, serif',
        }}>
          {renderText(`— ${author}`, true)}
        </span>
      </div>
    </>
  );
}

function getRandomQuote() {
  const index = Math.floor(Math.random() * quotes.length);
  return { quote: quotes[index], index };
}

export function QuotesScreen() {
  const [quoteData, setQuoteData] = useState(getRandomQuote);
  const [key, setKey] = useState(0);

  // Get a new random quote each time the component mounts (screen shown)
  useEffect(() => {
    setQuoteData(getRandomQuote());
    setKey(k => k + 1);
  }, []);

  // Handle cycling to next quote
  const handleCycleComplete = () => {
    setQuoteData(prev => {
      // Get a new quote, avoiding the current one
      let newData;
      do {
        newData = getRandomQuote();
      } while (newData.index === prev.index && quotes.length > 1);
      return newData;
    });
    setKey(k => k + 1);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #f8f6f0 0%, #ebe8e0 100%)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '20px 32px 16px',
        borderBottom: '3px double #000',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.5)',
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: '#666',
          marginBottom: 8,
        }}>
          Words of Wisdom
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          margin: 0,
          color: '#000',
          fontFamily: '"Playfair Display", Georgia, serif',
        }}>
          Daily Inspiration
        </h1>
        <div style={{
          fontSize: 8,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#888',
          marginTop: 6,
        }}>
          Timeless wisdom for your day
        </div>
      </div>

      {/* Main quote area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 60px',
        position: 'relative',
      }}>
        {/* Decorative corner flourishes */}
        <div style={{
          position: 'absolute',
          top: 30,
          left: 40,
          fontSize: 48,
          color: 'rgba(0,0,0,0.08)',
          fontFamily: 'Georgia, serif',
          transform: 'rotate(-10deg)',
        }}>❧</div>
        <div style={{
          position: 'absolute',
          bottom: 30,
          right: 40,
          fontSize: 48,
          color: 'rgba(0,0,0,0.08)',
          fontFamily: 'Georgia, serif',
          transform: 'rotate(170deg)',
        }}>❧</div>

        {/* Large decorative quote mark */}
        <div style={{
          fontSize: 120,
          fontWeight: 200,
          lineHeight: 0.5,
          color: 'rgba(0,0,0,0.08)',
          fontFamily: '"Playfair Display", Georgia, serif',
          marginBottom: -20,
        }}>
          "
        </div>

        {/* Cycling quote with fog reveal and dissolve */}
        <CyclingQuote
          key={key}
          quote={quoteData.quote.text}
          author={quoteData.quote.author}
          onCycleComplete={handleCycleComplete}
          revealDuration={4000}
          visibleDuration={5000}
          dissolveDuration={3000}
        />
      </div>

      {/* Footer flourish */}
      <div style={{
        padding: '16px 32px',
        borderTop: '1px solid #ddd',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.3)',
      }}>
        <div style={{
          fontSize: 10,
          fontStyle: 'italic',
          color: '#888',
          animation: 'gentlePulse 4s ease-in-out infinite',
        }}>
          "Words have magic — let them transform your day"
        </div>
      </div>
    </div>
  );
}
