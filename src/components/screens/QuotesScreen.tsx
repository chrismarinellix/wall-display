import { useState, useEffect, useMemo, useRef } from 'react';
import { quotes } from '../../data/quotes';

// Magical Prophet Text - fog reveal that clears and stays visible
function MagicalQuoteText({
  text,
  style = {},
  revealDuration = 6000,
}: {
  text: string;
  style?: React.CSSProperties;
  revealDuration?: number;
}) {
  const [progress, setProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const charProps = useMemo(() =>
    text.split('').map((_, i) => ({
      revealStart: (i / text.length) * 0.7,
      randomDelay: Math.random() * 0.1,
      fogPhase: Math.random() * Math.PI * 2,
      fogAmplitude: 4 + Math.random() * 6,
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

  if (isRevealed) {
    return <span style={{ display: 'inline', ...style }}>{text}</span>;
  }

  return (
    <span style={{ display: 'inline', ...style }}>
      {text.split('').map((char, i) => {
        const props = charProps[i];
        const charStart = props.revealStart + props.randomDelay;
        const charProgress = Math.max(0, Math.min(1, (progress - charStart) / 0.3));
        const easeReveal = charProgress * charProgress * (3 - 2 * charProgress);

        const fogTime = performance.now() / 1000;
        const fogX = Math.sin(fogTime * 2 + props.fogPhase) * props.fogAmplitude * (1 - easeReveal);
        const fogY = Math.cos(fogTime * 1.5 + props.fogPhase) * (props.fogAmplitude * 0.5) * (1 - easeReveal);
        const blurAmount = (1 - easeReveal) * 6;
        const opacity = 0.05 + easeReveal * 0.95;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: easeReveal < 1 ? `translate(${fogX}px, ${fogY}px)` : 'none',
              filter: blurAmount > 0.1 ? `blur(${blurAmount}px)` : 'none',
              transition: 'none',
              whiteSpace: char === ' ' ? 'pre' : 'normal',
              willChange: easeReveal < 1 ? 'transform, opacity, filter' : 'auto',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
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
        @keyframes quillWrite {
          from { width: 0; }
          to { width: 80px; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* Newspaper header */}
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
          The Prophet's Quotations
        </h1>
        <div style={{
          fontSize: 8,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#888',
          marginTop: 6,
        }}>
          Timeless wisdom, magically revealed
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
          animation: 'fadeSlideUp 1s ease 0.5s both',
        }}>
          "
        </div>

        {/* Quote text with magical reveal */}
        <div
          key={key}
          style={{
            maxWidth: 750,
            textAlign: 'center',
          }}
        >
          <MagicalQuoteText
            text={quoteData.quote.text}
            revealDuration={5000}
            style={{
              fontSize: 32,
              fontWeight: 300,
              lineHeight: 1.6,
              letterSpacing: '0.01em',
              color: '#1a1a1a',
              fontFamily: '"Playfair Display", Georgia, serif',
            }}
          />
        </div>

        {/* Decorative divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 40,
          animation: 'fadeSlideUp 1s ease 3s both',
        }}>
          <div style={{
            width: 80,
            height: 1,
            background: 'linear-gradient(to right, transparent, #999)',
            animation: 'quillWrite 2s ease 4s both',
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
            animation: 'quillWrite 2s ease 4s both',
          }} />
        </div>

        {/* Author with magical reveal */}
        <div
          key={`author-${key}`}
          style={{
            marginTop: 24,
            animation: 'fadeSlideUp 1s ease 4.5s both',
          }}
        >
          <MagicalQuoteText
            text={`— ${quoteData.quote.author}`}
            revealDuration={2000}
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.25em',
              color: '#666',
              textTransform: 'uppercase',
              fontFamily: 'Georgia, serif',
            }}
          />
        </div>
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
