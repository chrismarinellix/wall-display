import { useState, useEffect, useCallback } from 'react';
import { DispersionText } from './DispersionText';

interface BriefingItem {
  label: string;
  value: string;
  sublabel?: string;
}

interface AnimatedBriefingProps {
  items: BriefingItem[];
  displayTime?: number; // How long each item shows (ms)
  transitionTime?: number; // Animation duration (ms)
}

export function AnimatedBriefing({
  items,
  displayTime = 4000,
  transitionTime = 800,
}: AnimatedBriefingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const cycleToNext = useCallback(() => {
    // Start exit animation
    setIsVisible(false);

    // After exit animation, switch to next item and start enter animation
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setIsVisible(true);
    }, transitionTime + 200); // Wait for exit + small gap
  }, [items.length, transitionTime]);

  useEffect(() => {
    const timer = setInterval(cycleToNext, displayTime + transitionTime + 200);
    return () => clearInterval(timer);
  }, [cycleToNext, displayTime, transitionTime]);

  const currentItem = items[currentIndex];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        padding: 40,
        textAlign: 'center',
      }}
    >
      {/* Label */}
      <div style={{ marginBottom: 12, minHeight: 24 }}>
        <DispersionText
          text={currentItem.label}
          isVisible={isVisible}
          delay={25}
          duration={500}
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#888',
          }}
        />
      </div>

      {/* Main Value */}
      <div style={{ minHeight: 80 }}>
        <DispersionText
          text={currentItem.value}
          isVisible={isVisible}
          delay={20}
          duration={600}
          style={{
            fontSize: 48,
            fontWeight: 300,
            color: '#222',
            letterSpacing: '-0.02em',
          }}
        />
      </div>

      {/* Sublabel */}
      {currentItem.sublabel && (
        <div style={{ marginTop: 12, minHeight: 20 }}>
          <DispersionText
            text={currentItem.sublabel}
            isVisible={isVisible}
            delay={30}
            duration={500}
            style={{
              fontSize: 14,
              color: '#666',
            }}
          />
        </div>
      )}

      {/* Progress dots */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginTop: 40,
        opacity: 0.5,
      }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: i === currentIndex ? '#333' : '#ddd',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
