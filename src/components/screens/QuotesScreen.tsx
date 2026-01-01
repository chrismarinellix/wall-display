import { useState, useEffect, useMemo, useRef } from 'react';
import { quotes } from '../../data/quotes';
import { useSettings } from '../../contexts/SettingsContext';

// Generate ink splatter dots for a character
function generateInkDots(charIndex: number, totalChars: number) {
  const seed = charIndex * 7919; // Prime for pseudo-randomness
  const dots = [];
  const numDots = 8 + Math.floor((seed % 5));

  for (let i = 0; i < numDots; i++) {
    const angle = ((seed * (i + 1)) % 360) * Math.PI / 180;
    const distance = 3 + ((seed * (i + 2)) % 12);
    dots.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 2 + ((seed * (i + 3)) % 4),
      delay: (i / numDots) * 0.3 + (charIndex / totalChars) * 0.5,
    });
  }
  return dots;
}

// Split text into words while preserving spaces
function splitIntoWords(text: string): { word: string; isSpace: boolean }[] {
  const result: { word: string; isSpace: boolean }[] = [];
  let current = '';
  let isCurrentSpace = false;

  for (const char of text) {
    const charIsSpace = char === ' ';
    if (current === '') {
      current = char;
      isCurrentSpace = charIsSpace;
    } else if (charIsSpace === isCurrentSpace) {
      current += char;
    } else {
      result.push({ word: current, isSpace: isCurrentSpace });
      current = char;
      isCurrentSpace = charIsSpace;
    }
  }
  if (current) {
    result.push({ word: current, isSpace: isCurrentSpace });
  }
  return result;
}

// Animated quote with ink dots morphing into calligraphy - stays visible after animation
function AnimatedQuote({
  quote,
  author,
  einkMode = false,
  dotsDuration = 2500,
  morphDuration = 3000,
}: {
  quote: string;
  author: string;
  einkMode?: boolean;
  dotsDuration?: number;
  morphDuration?: number;
}) {
  const [phase, setPhase] = useState<'dots' | 'morphing' | 'visible'>(einkMode ? 'visible' : 'dots');
  const [progress, setProgress] = useState(einkMode ? 1 : 0);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  const charProps = useMemo(() =>
    quote.split('').map((_, i) => ({
      revealStart: (i / quote.length) * 0.6,
      randomDelay: Math.random() * 0.15,
      inkDots: generateInkDots(i, quote.length),
      brushStroke: Math.random() * 0.3,
      inkSpread: 0.8 + Math.random() * 0.4,
    })), [quote]
  );

  useEffect(() => {
    // E-ink mode: just show static text
    if (einkMode) {
      return;
    }

    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;

      if (elapsed < dotsDuration) {
        setPhase('dots');
        setProgress(elapsed / dotsDuration);
      } else if (elapsed < dotsDuration + morphDuration) {
        setPhase('morphing');
        setProgress((elapsed - dotsDuration) / morphDuration);
      } else {
        // Animation complete - stay visible (no more cycling)
        setPhase('visible');
        setProgress(1);
        return; // Stop animation loop
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [dotsDuration, morphDuration, einkMode]);

  const renderText = (text: string, isAuthor = false) => {
    // E-ink mode: simple static text
    if (einkMode) {
      return <span>{text}</span>;
    }

    const props = isAuthor ? charProps.slice(0, text.length) : charProps;
    const words = splitIntoWords(text);
    let globalCharIndex = 0;

    return (
      <span style={{ display: 'inline' }}>
        {words.map((wordObj, wordIndex) => {
          const wordChars = wordObj.word.split('').map((char, localIndex) => {
            const i = globalCharIndex + localIndex;
            const charProp = props[i % props.length];
            const charStart = charProp.revealStart + charProp.randomDelay;

            // Calculate phase-specific progress for this character
            let dotsProgress = 0;
            let morphProgress = 0;
            let charOpacity = 0;

            if (phase === 'dots') {
              dotsProgress = Math.max(0, Math.min(1, (progress - charStart) / 0.4));
              charOpacity = 0;
            } else if (phase === 'morphing') {
              dotsProgress = 1;
              morphProgress = Math.max(0, Math.min(1, (progress - charProp.brushStroke) / 0.7));
              charOpacity = morphProgress;
            } else {
              // Visible
              dotsProgress = 1;
              morphProgress = 1;
              charOpacity = 1;
            }

            // Smooth easing
            const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
            const easedDots = easeOut(dotsProgress);
            const easedMorph = easeOut(morphProgress);

            // Ink bleeding effect during morphing
            const inkBleed = phase === 'morphing' ? Math.sin(morphProgress * Math.PI) * 0.5 : 0;
            const textShadow = phase === 'morphing' || phase === 'visible'
              ? `0 0 ${2 + inkBleed * 3}px rgba(20, 20, 20, ${0.3 + inkBleed * 0.3})`
              : 'none';

            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  position: 'relative',
                }}
              >
                {/* Ink dots layer - appear instantly during dots phase */}
                {char !== ' ' && (phase === 'dots' || (phase === 'morphing' && morphProgress < 0.5)) && (
                  <span style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: phase === 'morphing' ? 1 - easedMorph * 2 : (dotsProgress > 0.1 ? 1 : 0),
                  }}>
                    {charProp.inkDots.slice(0, 5).map((dot, dotIndex) => (
                      <span
                        key={dotIndex}
                        style={{
                          position: 'absolute',
                          width: dot.size,
                          height: dot.size,
                          borderRadius: '50%',
                          background: 'rgba(30, 25, 20, 0.7)',
                          transform: `translate(${dot.x * 0.6}px, ${dot.y * 0.6}px)`,
                        }}
                      />
                    ))}
                  </span>
                )}

                {/* Character layer - calligraphy style with watercolor ink bleeding */}
                <span
                  style={{
                    opacity: charOpacity,
                    color: phase === 'visible' ? '#1a1512' : '#1a1a1a',
                    textShadow: phase === 'visible'
                      ? `
                        0 0 8px rgba(40, 30, 20, 0.4),
                        0 0 16px rgba(60, 45, 30, 0.25),
                        2px 2px 4px rgba(30, 25, 20, 0.3),
                        -1px 1px 6px rgba(80, 60, 40, 0.2),
                        0 0 24px rgba(100, 80, 60, 0.15)
                      `
                      : textShadow,
                    transform: phase === 'morphing'
                      ? `scale(${0.95 + easedMorph * 0.05})`
                      : phase === 'visible'
                        ? `rotate(${(charProp.randomDelay - 0.075) * 3}deg)`
                        : 'none',
                    transition: phase === 'visible' ? 'all 1.2s ease-out' : 'none',
                    willChange: 'transform, opacity',
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              </span>
            );
          });

          globalCharIndex += wordObj.word.length;

          // Wrap words (non-spaces) in nowrap spans to prevent breaking within words
          if (wordObj.isSpace) {
            return <span key={wordIndex} style={{ display: 'inline' }}>{wordChars}</span>;
          }
          return (
            <span key={wordIndex} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {wordChars}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <>
      <div style={{
        maxWidth: '90%',
        textAlign: 'center',
      }}>
        <span style={{
          fontSize: 'clamp(28px, 6vw, 52px)',
          fontWeight: phase === 'visible' ? 400 : 300,
          lineHeight: 1.6,
          letterSpacing: phase === 'visible' ? '0.05em' : '0.02em',
          color: '#1a1a1a',
          fontFamily: phase === 'visible'
            ? '"Noto Serif JP", "Hiragino Mincho Pro", "Yu Mincho", "Shippori Mincho", Georgia, serif'
            : '"Noto Serif JP", "Hiragino Mincho Pro", "Yu Mincho", "Playfair Display", Georgia, serif',
          fontStyle: 'normal',
          // Subtle watercolor wash effect on container
          filter: phase === 'visible' ? 'contrast(1.05)' : 'none',
          transition: 'all 1s ease-out',
        }}>
          {renderText(quote)}
        </span>
      </div>

      {/* Decorative ink brush stroke divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginTop: 'clamp(24px, 5vw, 40px)',
        opacity: phase === 'visible' ? 1 : Math.min(1, progress * 2),
        transition: 'opacity 0.8s ease',
      }}>
        <div style={{
          width: 'clamp(40px, 10vw, 80px)',
          height: 2,
          background: 'linear-gradient(to right, transparent, rgba(40,35,30,0.4))',
          borderRadius: 1,
        }} />
        <div style={{
          width: 8,
          height: 8,
          background: 'radial-gradient(circle, #8b0000 0%, #5c0000 100%)',
          borderRadius: '50%',
          boxShadow: '0 0 8px rgba(139,0,0,0.3)',
        }} />
        <div style={{
          width: 'clamp(40px, 10vw, 80px)',
          height: 2,
          background: 'linear-gradient(to left, transparent, rgba(40,35,30,0.4))',
          borderRadius: 1,
        }} />
      </div>

      {/* Author with brush stroke aesthetic */}
      <div style={{ marginTop: 'clamp(16px, 3vw, 28px)' }}>
        <span style={{
          fontSize: 'clamp(14px, 2.5vw, 20px)',
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: '#555',
          textTransform: 'uppercase',
          fontFamily: '"Noto Sans JP", "Hiragino Sans", Georgia, serif',
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
  const { settings } = useSettings();

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
        // Old Japanese paper texture aesthetic
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(245,240,230,0.8) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(235,225,210,0.6) 0%, transparent 40%),
          linear-gradient(180deg, #f5f0e6 0%, #ebe5d8 30%, #e8e0d0 70%, #ddd5c5 100%)
        `,
        fontFamily: '"Noto Serif JP", Georgia, serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Paper texture overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            rgba(200,190,175,0.03) 2px,
            rgba(200,190,175,0.03) 4px
          ),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(180,170,155,0.02) 3px,
            rgba(180,170,155,0.02) 6px
          )
        `,
        pointerEvents: 'none',
      }} />

      {/* Subtle paper grain */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.3,
        background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        backgroundSize: '150px 150px',
        pointerEvents: 'none',
      }} />

      {/* Aged paper edges/vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        boxShadow: 'inset 0 0 100px rgba(180,160,130,0.3), inset 0 0 200px rgba(160,140,110,0.15)',
        pointerEvents: 'none',
      }} />

      {/* Top brush stroke border */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, transparent 5%, rgba(60,50,40,0.2) 20%, rgba(40,35,30,0.4) 50%, rgba(60,50,40,0.2) 80%, transparent 95%)',
        margin: '0 10%',
      }} />

      {/* Main quote area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'clamp(30px, 6vw, 60px)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Decorative ink wash corners */}
        <div style={{
          position: 'absolute',
          top: 20,
          left: 20,
          width: 40,
          height: 40,
          borderTop: '2px solid rgba(60,50,40,0.15)',
          borderLeft: '2px solid rgba(60,50,40,0.15)',
          borderRadius: '4px 0 0 0',
        }} />
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderTop: '2px solid rgba(60,50,40,0.15)',
          borderRight: '2px solid rgba(60,50,40,0.15)',
          borderRadius: '0 4px 0 0',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          width: 40,
          height: 40,
          borderBottom: '2px solid rgba(60,50,40,0.15)',
          borderLeft: '2px solid rgba(60,50,40,0.15)',
          borderRadius: '0 0 0 4px',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 40,
          height: 40,
          borderBottom: '2px solid rgba(60,50,40,0.15)',
          borderRight: '2px solid rgba(60,50,40,0.15)',
          borderRadius: '0 0 4px 0',
        }} />

        {/* Large decorative ink brush quote mark */}
        <div style={{
          fontSize: 'clamp(80px, 15vw, 140px)',
          fontWeight: 200,
          lineHeight: 0.5,
          color: 'rgba(60,50,40,0.06)',
          fontFamily: '"Noto Serif JP", Georgia, serif',
          marginBottom: -10,
          textShadow: '2px 2px 4px rgba(0,0,0,0.02)',
        }}>
          "
        </div>

        {/* Animated quote with ink dots morphing to calligraphy - stays visible */}
        <AnimatedQuote
          key={key}
          quote={quoteData.quote.text}
          author={quoteData.quote.author}
          einkMode={settings.einkMode}
          dotsDuration={2500}
          morphDuration={3000}
        />
      </div>

      {/* Bottom brush stroke border */}
      <div style={{
        height: 2,
        background: 'linear-gradient(90deg, transparent 5%, rgba(60,50,40,0.15) 20%, rgba(40,35,30,0.3) 50%, rgba(60,50,40,0.15) 80%, transparent 95%)',
        margin: '0 10%',
      }} />

      {/* Subtle seal/stamp in corner */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 40,
        height: 40,
        borderRadius: 4,
        background: 'radial-gradient(circle, rgba(139,26,26,0.08) 0%, rgba(139,26,26,0.04) 60%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: 'rotate(-5deg)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '1px solid rgba(139,26,26,0.15)',
          borderRadius: 3,
        }} />
      </div>
    </div>
  );
}
