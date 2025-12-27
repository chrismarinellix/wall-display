import { useState, useEffect } from 'react';

// Accurate Australia SVG path (simplified from natural earth data)
const AUSTRALIA_PATH = "M89.2,82.5l1.5-2.8l2.2-1.5l1.8,0.3l1.2,1.8l-0.5,2.5l-2.8,1.5l-2.2-0.3L89.2,82.5z M77.8,77.2l3.2-0.8l2.5,1.2l0.8,2.8l-1.5,2.2l-3.2,0.5l-2.5-1.5l-0.5-2.5L77.8,77.2z M43.5,3.8l2.8,1.2l3.5,0.2l2.8,2.5l1.2,3.8l-0.5,4.2l1.8,3.2l3.2,2.2l4.5,1.5l3.8,3.2l2.2,4.5l0.2,5.2l1.5,4.2l3.8,2.8l4.2,0.8l3.5,2.2l2.2,3.8l3.5,2.5l4.8,0.5l3.8,1.8l2.5,3.5l1.2,4.2l-0.8,4.5l0.5,4.2l2.8,3.2l1.5,4.5l-0.2,5.2l-2.2,4.2l-3.8,2.8l-2.5,4.2l-0.8,5.2l-2.8,4.2l-4.5,2.2l-4.2,3.2l-2.2,4.8l-3.8,3.5l-5.2,1.2l-4.5,2.5l-3.2,4.2l-4.8,2.8l-5.5,0.5l-4.8-1.8l-5.2,0.8l-4.5,2.8l-5.2,1.2l-5.5-0.8l-4.8-2.5l-5.2-1.2l-5.5,0.2l-5.2-1.8l-4.2-3.5l-5.2-2.2l-4.8-3.2l-3.5-4.5l-1.8-5.2l0.5-5.5l-1.2-5.2l-3.2-4.2l-1.5-5.2l1.2-5.2l-0.8-5.2l-2.8-4.5l-0.5-5.5l1.8-4.8l-0.2-5.2l-2.2-4.8l0.2-5.2l2.5-4.5l0.8-5.2l-1.2-4.8l1.5-4.5l3.8-3.2l2.2-4.5l4.2-2.8l4.8-1.2l4.2-2.8l3.2-4.2l4.8-2.2l5.2-0.2l4.5-2.2l3.2-4.2l4.8-2.5l5.5,0.2l5.2-1.5l4.2-3.5l5.2-1.8L43.5,3.8z";

// Tasmania path
const TASMANIA_PATH = "M78.5,88.2l2.8,0.8l2.5,2.2l0.8,3.2l-1.2,3.5l-3.2,2.2l-3.8,0.2l-2.8-2.2l-0.5-3.5l1.5-3.2l2.8-2.5L78.5,88.2z";

// Melbourne position in the SVG viewBox (approximate)
const MELBOURNE_POS = { x: 80, y: 78 };

// Other cities (approximate positions)
const CITIES = [
  { name: 'Sydney', x: 91, y: 68 },
  { name: 'Brisbane', x: 95, y: 52 },
  { name: 'Perth', x: 15, y: 62 },
  { name: 'Adelaide', x: 60, y: 68 },
  { name: 'Darwin', x: 55, y: 12 },
  { name: 'Hobart', x: 79, y: 94 },
  { name: 'Canberra', x: 87, y: 72 },
];

export function LocationScreen() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex--col flex--center" style={{ height: '100%' }}>
      <svg
        viewBox="0 0 110 100"
        style={{ width: '100%', maxWidth: 480, height: 'auto' }}
      >
        {/* Subtle gradient background */}
        <defs>
          <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#e8e8e8" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="1" dy="1" stdDeviation="1.5" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Australia mainland */}
        <path
          d={AUSTRALIA_PATH}
          fill="url(#landGradient)"
          stroke="#333"
          strokeWidth="0.8"
          filter="url(#shadow)"
        />

        {/* Tasmania */}
        <path
          d={TASMANIA_PATH}
          fill="url(#landGradient)"
          stroke="#333"
          strokeWidth="0.8"
          filter="url(#shadow)"
        />

        {/* Other cities - subtle dots */}
        {CITIES.map(city => (
          <g key={city.name}>
            <circle cx={city.x} cy={city.y} r="1.2" fill="#aaa" />
            <text
              x={city.x + 2.5}
              y={city.y + 0.8}
              fontSize="3.5"
              fill="#999"
              fontWeight="400"
            >
              {city.name}
            </text>
          </g>
        ))}

        {/* Melbourne - pulsing home location */}
        <circle cx={MELBOURNE_POS.x} cy={MELBOURNE_POS.y} r="2" fill="#000" />

        {/* Ping animation - first ring */}
        <circle
          cx={MELBOURNE_POS.x}
          cy={MELBOURNE_POS.y}
          fill="none"
          stroke="#000"
          strokeWidth="0.6"
        >
          <animate attributeName="r" from="3" to="12" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite" />
        </circle>

        {/* Ping animation - second ring */}
        <circle
          cx={MELBOURNE_POS.x}
          cy={MELBOURNE_POS.y}
          fill="none"
          stroke="#000"
          strokeWidth="0.4"
        >
          <animate attributeName="r" from="3" to="18" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
        </circle>

        {/* Melbourne label */}
        <text
          x={MELBOURNE_POS.x + 4}
          y={MELBOURNE_POS.y + 1}
          fontSize="4.5"
          fontWeight="600"
          fill="#000"
        >
          Melbourne
        </text>
      </svg>

      {/* Location info */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
          37.8136°S, 144.9631°E
        </div>
        <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.15em' }}>
          VICTORIA, AUSTRALIA
        </div>
      </div>
    </div>
  );
}
