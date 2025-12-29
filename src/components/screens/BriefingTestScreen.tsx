import { useState, useEffect, useMemo } from 'react';
import { Cloud, TrendingUp, Calendar, Clock } from 'lucide-react';

// Dispersion text component - text explodes/coalesces
function DispersionText({
  text,
  isVisible,
  style = {},
  charDelay = 25,
  duration = 600,
}: {
  text: string;
  isVisible: boolean;
  style?: React.CSSProperties;
  charDelay?: number;
  duration?: number;
}) {
  // Random offsets for each character
  const offsets = useMemo(() =>
    text.split('').map(() => ({
      x: (Math.random() - 0.5) * 120,
      y: (Math.random() - 0.5) * 80,
      r: (Math.random() - 0.5) * 60,
    })), [text]
  );

  return (
    <span style={{ display: 'inline-block', ...style }}>
      {text.split('').map((char, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            animation: isVisible
              ? `coalesce ${duration}ms cubic-bezier(0.23, 1, 0.32, 1) ${i * charDelay}ms forwards`
              : `disperse ${duration}ms cubic-bezier(0.55, 0.055, 0.675, 0.19) ${i * charDelay}ms forwards`,
            opacity: isVisible ? 0 : 1,
            whiteSpace: char === ' ' ? 'pre' : 'normal',
            ['--tx' as string]: `${offsets[i].x}px`,
            ['--ty' as string]: `${offsets[i].y}px`,
            ['--tr' as string]: `${offsets[i].r}deg`,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
}

interface DataItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
}

export function BriefingTestScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Sample data to cycle through
  const items: DataItem[] = [
    {
      icon: <Cloud size={24} strokeWidth={1.5} />,
      label: 'Weather',
      value: '24°C Sunny',
      sublabel: 'Perfect day ahead',
      color: '#4A90D9',
    },
    {
      icon: <TrendingUp size={24} strokeWidth={1.5} />,
      label: 'Bitcoin',
      value: '$94,235',
      sublabel: '+2.4% today',
      color: '#F7931A',
    },
    {
      icon: <Calendar size={24} strokeWidth={1.5} />,
      label: 'Next Event',
      value: 'Team Standup',
      sublabel: 'in 45 minutes',
      color: '#34A853',
    },
    {
      icon: <Clock size={24} strokeWidth={1.5} />,
      label: 'Countdown',
      value: '12 days',
      sublabel: 'until Summer Holiday',
      color: '#EA4335',
    },
  ];

  // Cycle through items
  useEffect(() => {
    const cycleDuration = 5000; // Show each item for 5s
    const animDuration = 800;

    const cycle = () => {
      // Disperse out
      setIsVisible(false);

      // After disperse, change item and coalesce in
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % items.length);
        setIsVisible(true);
      }, animDuration + 300);
    };

    const timer = setInterval(cycle, cycleDuration);
    return () => clearInterval(timer);
  }, [items.length]);

  const current = items[activeIndex];

  return (
    <div
      style={{
        height: '100%',
        background: 'linear-gradient(180deg, #faf9f6 0%, #f5f4f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Animation keyframes */}
      <style>{`
        @keyframes coalesce {
          0% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(0.5);
            filter: blur(8px);
          }
          50% {
            opacity: 0.8;
            filter: blur(2px);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
            filter: blur(0);
          }
        }
        @keyframes disperse {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
            filter: blur(0);
          }
          50% {
            opacity: 0.5;
            filter: blur(2px);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(0.3);
            filter: blur(8px);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>

      {/* Icon */}
      <div
        style={{
          marginBottom: 24,
          color: current.color,
          animation: isVisible ? 'fadeIn 0.5s ease-out' : 'fadeOut 0.3s ease-in',
        }}
      >
        {current.icon}
      </div>

      {/* Label */}
      <div style={{ marginBottom: 16, minHeight: 20 }}>
        <DispersionText
          text={current.label.toUpperCase()}
          isVisible={isVisible}
          charDelay={20}
          duration={500}
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: '#999',
          }}
        />
      </div>

      {/* Main Value */}
      <div style={{ minHeight: 72, marginBottom: 16 }}>
        <DispersionText
          text={current.value}
          isVisible={isVisible}
          charDelay={30}
          duration={700}
          style={{
            fontSize: 48,
            fontWeight: 300,
            color: '#222',
            letterSpacing: '-0.02em',
          }}
        />
      </div>

      {/* Sublabel */}
      {current.sublabel && (
        <div style={{ minHeight: 24 }}>
          <DispersionText
            text={current.sublabel}
            isVisible={isVisible}
            charDelay={25}
            duration={600}
            style={{
              fontSize: 15,
              color: '#666',
              fontStyle: 'italic',
            }}
          />
        </div>
      )}

      {/* Progress indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          display: 'flex',
          gap: 12,
        }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              width: i === activeIndex ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === activeIndex ? '#333' : '#ddd',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        ))}
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.15em',
          color: '#333',
          textTransform: 'uppercase',
        }}
      >
        Daily Briefing
      </div>
    </div>
  );
}
