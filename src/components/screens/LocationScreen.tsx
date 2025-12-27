import { useState, useEffect } from 'react';

// Australia map using coordinate-based drawing
// Bounds: lat -10 to -44, lon 113 to 154
const BOUNDS = { minLat: -44, maxLat: -10, minLon: 113, maxLon: 154 };
const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 330;

function toXY(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * VIEW_WIDTH;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VIEW_HEIGHT;
  return { x, y };
}

// Simplified but recognizable Australia coastline points [lon, lat]
const AUSTRALIA: [number, number][] = [
  [142.5, -10.7], [143.5, -12.5], [145.5, -14.8], [146.3, -18.8], [149.2, -21.1],
  [150.5, -23.4], [153.0, -27.5], [153.6, -28.8], [153.2, -30.3], [152.5, -32.0],
  [151.2, -33.9], [150.7, -35.1], [150.0, -37.0], [147.5, -38.4], [145.0, -38.3],
  [143.8, -38.7], [141.0, -38.1], [139.7, -36.9], [138.6, -35.0], [137.0, -35.7],
  [136.5, -34.0], [134.2, -32.5], [131.0, -31.5], [128.0, -31.8], [124.0, -33.0],
  [120.0, -33.8], [115.8, -32.0], [114.5, -28.8], [113.5, -26.0], [114.0, -22.5],
  [116.0, -20.5], [119.0, -18.0], [123.5, -16.0], [128.0, -15.0], [130.8, -12.5],
  [135.5, -12.2], [139.5, -17.2], [140.8, -17.5], [141.5, -12.5], [142.5, -10.7],
];

const TASMANIA: [number, number][] = [
  [145.5, -41.0], [148.0, -40.5], [148.3, -42.0], [147.5, -43.5],
  [146.0, -43.6], [144.7, -41.5], [145.5, -41.0],
];

function pointsToPath(points: [number, number][]): string {
  return points.map((p, i) => {
    const { x, y } = toXY(p[1], p[0]);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

// Cities with actual coordinates
const CITIES = [
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'Brisbane', lat: -27.47, lon: 153.03 },
  { name: 'Perth', lat: -31.95, lon: 115.86 },
  { name: 'Adelaide', lat: -34.93, lon: 138.60 },
  { name: 'Darwin', lat: -12.46, lon: 130.85 },
  { name: 'Hobart', lat: -42.88, lon: 147.33 },
  { name: 'Canberra', lat: -35.28, lon: 149.13 },
];

const MELBOURNE = { lat: -37.81, lon: 144.96 };

export function LocationScreen() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const melbournePos = toXY(MELBOURNE.lat, MELBOURNE.lon);

  return (
    <div className="flex flex--col flex--center" style={{ height: '100%' }}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        style={{ width: '100%', maxWidth: 500, height: 'auto' }}
      >
        {/* Definitions */}
        <defs>
          <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#ebebeb" />
          </linearGradient>
          <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.1"/>
          </filter>
        </defs>

        {/* Australia mainland */}
        <path
          d={pointsToPath(AUSTRALIA)}
          fill="url(#landGradient)"
          stroke="#444"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#shadow)"
        />

        {/* Tasmania */}
        <path
          d={pointsToPath(TASMANIA)}
          fill="url(#landGradient)"
          stroke="#444"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#shadow)"
        />

        {/* Other cities - subtle dots */}
        {CITIES.map(city => {
          const pos = toXY(city.lat, city.lon);
          return (
            <g key={city.name}>
              <circle cx={pos.x} cy={pos.y} r="3" fill="#bbb" />
              <text
                x={pos.x + 6}
                y={pos.y + 4}
                fontSize="10"
                fill="#999"
                fontWeight="400"
              >
                {city.name}
              </text>
            </g>
          );
        })}

        {/* Melbourne - pulsing home location */}
        <circle cx={melbournePos.x} cy={melbournePos.y} r="5" fill="#000" />

        {/* Ping animation - first ring */}
        <circle
          cx={melbournePos.x}
          cy={melbournePos.y}
          fill="none"
          stroke="#000"
          strokeWidth="1.5"
        >
          <animate attributeName="r" from="8" to="30" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite" />
        </circle>

        {/* Ping animation - second ring */}
        <circle
          cx={melbournePos.x}
          cy={melbournePos.y}
          fill="none"
          stroke="#000"
          strokeWidth="1"
        >
          <animate attributeName="r" from="8" to="45" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
        </circle>

        {/* Melbourne label */}
        <text
          x={melbournePos.x + 10}
          y={melbournePos.y + 5}
          fontSize="14"
          fontWeight="600"
          fill="#000"
        >
          Melbourne
        </text>
      </svg>

      {/* Location info */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
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
