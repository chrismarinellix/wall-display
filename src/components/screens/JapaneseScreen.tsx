import { useState, useEffect } from 'react';
import { proverbs } from '../../data/proverbs';

function getDailyProverb() {
  // Change proverb once per day based on date
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % proverbs.length;
  return proverbs[index];
}

export function JapaneseScreen() {
  const [currentProverb, setCurrentProverb] = useState(getDailyProverb);

  useEffect(() => {
    // Check for new day every minute
    const interval = setInterval(() => {
      setCurrentProverb(getDailyProverb());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Japanese mountain painting background - SVG */}
      <svg
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '55%',
          opacity: 0.06,
        }}
        viewBox="0 0 800 300"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* Distant mountains */}
        <path
          d="M0 300 L0 180 Q100 120 200 160 Q280 100 350 140 Q420 80 500 130 Q580 70 650 120 Q720 90 800 150 L800 300 Z"
          fill="#000"
        />
        {/* Mid mountains */}
        <path
          d="M0 300 L0 220 Q80 170 150 200 Q220 150 300 190 Q380 130 450 180 Q530 140 600 175 Q680 150 750 190 Q780 170 800 200 L800 300 Z"
          fill="#000"
          opacity="0.7"
        />
        {/* Near hills */}
        <path
          d="M0 300 L0 260 Q100 230 200 250 Q300 220 400 245 Q500 225 600 255 Q700 235 800 260 L800 300 Z"
          fill="#000"
          opacity="0.4"
        />
        {/* Mist layers */}
        <rect x="0" y="160" width="800" height="20" fill="#fff" opacity="0.3" />
        <rect x="0" y="200" width="800" height="15" fill="#fff" opacity="0.2" />
      </svg>

      {/* Content */}
      <div className="flex flex--col flex--center" style={{ height: '100%', position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 48px' }}>
        {/* Japanese text */}
        <div style={{
          fontSize: 44,
          fontWeight: 400,
          lineHeight: 1.4,
          fontFamily: '"Hiragino Kaku Gothic Pro", "Yu Gothic", "Noto Sans JP", serif',
          letterSpacing: '0.1em',
          marginBottom: 24,
        }}>
          {currentProverb.japanese}
        </div>

        {/* Romaji */}
        <div className="label label--gray" style={{ fontSize: 11, marginBottom: 20, letterSpacing: '0.15em' }}>
          {currentProverb.romaji}
        </div>

        {/* Meaning */}
        <div className="flex gap--medium" style={{ alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 40, height: 1, background: '#ccc' }} />
          <span style={{ fontSize: 18, fontWeight: 400 }}>
            {currentProverb.meaning}
          </span>
          <div style={{ width: 40, height: 1, background: '#ccc' }} />
        </div>

        {/* Explanation */}
        <div style={{
          fontSize: 13,
          color: '#666',
          maxWidth: 480,
          lineHeight: 1.6,
          fontWeight: 300,
        }}>
          {currentProverb.explanation}
        </div>
      </div>
    </div>
  );
}
