import { useState, useEffect, useMemo } from 'react';

interface DispersionTextProps {
  text: string;
  isVisible: boolean;
  className?: string;
  style?: React.CSSProperties;
  delay?: number; // stagger delay between characters
  duration?: number; // animation duration
}

export function DispersionText({
  text,
  isVisible,
  className = '',
  style = {},
  delay = 30,
  duration = 600,
}: DispersionTextProps) {
  const [shouldRender, setShouldRender] = useState(isVisible);

  // Generate random offsets for each character (memoized so they're consistent)
  const charOffsets = useMemo(() => {
    return text.split('').map(() => ({
      x: (Math.random() - 0.5) * 100, // -50 to 50px
      y: (Math.random() - 0.5) * 60,  // -30 to 30px
      rotate: (Math.random() - 0.5) * 40, // -20 to 20deg
      scale: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
    }));
  }, [text]);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      // Delay unmount to allow exit animation
      const timer = setTimeout(() => setShouldRender(false), duration + (text.length * delay));
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, delay, text.length]);

  if (!shouldRender) return null;

  return (
    <span className={className} style={{ display: 'inline-block', ...style }}>
      {text.split('').map((char, i) => {
        const offset = charOffsets[i];
        const charDelay = i * delay;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: 0,
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rotate}deg) scale(${offset.scale})`,
              animation: isVisible
                ? `disperseIn ${duration}ms ease-out ${charDelay}ms forwards`
                : `disperseOut ${duration}ms ease-in ${charDelay}ms forwards`,
              whiteSpace: char === ' ' ? 'pre' : 'normal',
              minWidth: char === ' ' ? '0.3em' : undefined,
            }}
          >
            {char}
          </span>
        );
      })}
      <style>{`
        @keyframes disperseIn {
          0% {
            opacity: 0;
            transform: translate(var(--offset-x, 0), var(--offset-y, 0)) rotate(var(--offset-rotate, 0)) scale(var(--offset-scale, 0.5));
            filter: blur(4px);
          }
          60% {
            opacity: 1;
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
            filter: blur(0);
          }
        }
        @keyframes disperseOut {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
            filter: blur(0);
          }
          40% {
            opacity: 0.8;
            filter: blur(1px);
          }
          100% {
            opacity: 0;
            transform: translate(var(--offset-x, 50px), var(--offset-y, -30px)) rotate(var(--offset-rotate, 20deg)) scale(0.3);
            filter: blur(4px);
          }
        }
      `}</style>
    </span>
  );
}
