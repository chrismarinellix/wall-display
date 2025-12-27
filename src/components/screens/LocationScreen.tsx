import { useState, useEffect } from 'react';

// Major Australian cities
const CITIES = {
  melbourne: { name: 'Melbourne', lat: -37.8136, lon: 144.9631, isHome: true },
  sydney: { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  brisbane: { name: 'Brisbane', lat: -27.4705, lon: 153.0260 },
  perth: { name: 'Perth', lat: -31.9523, lon: 115.8613 },
  adelaide: { name: 'Adelaide', lat: -34.9289, lon: 138.6010 },
  darwin: { name: 'Darwin', lat: -12.4634, lon: 130.8456 },
  hobart: { name: 'Hobart', lat: -42.8821, lon: 147.3272 },
  canberra: { name: 'Canberra', lat: -35.2809, lon: 149.1300 },
};

// High-detail Australia outline with smooth curves
// Using more points for a smoother, more accurate coastline
const AUSTRALIA_COORDS: [number, number][] = [
  // Cape York and East Coast
  [142.5, -10.7], [142.8, -11.2], [143.2, -11.8], [143.5, -12.5], [144.2, -13.5],
  [145.2, -14.5], [145.5, -14.8], [145.8, -16.5], [146.3, -18.8], [147.0, -19.5],
  [148.2, -20.0], [149.2, -21.1], [149.8, -22.0], [150.5, -23.4], [151.0, -24.5],
  [152.0, -25.5], [152.8, -26.5], [153.0, -27.5], [153.4, -28.0], [153.6, -28.8],
  [153.4, -29.5], [153.2, -30.3], [153.0, -31.0], [152.5, -32.0], [151.8, -33.0],
  [151.2, -33.9], [151.0, -34.5], [150.7, -35.1], [150.2, -36.0], [150.0, -37.0],
  [149.5, -37.5], [148.5, -37.8], [147.5, -38.4], [146.5, -38.6], [145.5, -38.5],
  [145.0, -38.3], [144.5, -38.1], [144.0, -38.5], [143.8, -38.7], [143.0, -38.6],
  [142.0, -38.3], [141.0, -38.1], [140.5, -37.8], [140.0, -37.2], [139.7, -36.9],
  [139.0, -36.0], [138.6, -35.0], [138.0, -34.5], [137.8, -34.5], [137.5, -35.0],
  [137.0, -35.7], [136.8, -35.0], [136.5, -34.0], [136.0, -34.2], [135.8, -34.5],
  [135.0, -34.0], [134.2, -32.5], [132.5, -32.0], [131.0, -31.5], [129.5, -31.8],
  [128.0, -31.8], [126.0, -32.5], [124.0, -33.0], [122.0, -33.8], [120.0, -33.8],
  [118.0, -34.0], [116.5, -33.5], [115.8, -32.0], [115.5, -31.0], [115.0, -30.0],
  [114.5, -28.8], [114.0, -27.0], [113.5, -26.0], [113.2, -24.5], [113.8, -23.0],
  [114.0, -22.5], [114.5, -21.5], [116.0, -20.5], [117.5, -19.5], [119.0, -18.0],
  [120.5, -17.0], [122.0, -16.2], [123.5, -16.0], [125.0, -15.5], [127.0, -14.5],
  [128.0, -15.0], [129.0, -14.5], [129.8, -13.5], [130.8, -12.5], [131.5, -12.0],
  [132.5, -11.8], [134.0, -12.0], [135.5, -12.2], [136.8, -12.0], [137.5, -12.5],
  [138.5, -14.5], [139.0, -16.0], [139.5, -17.2], [140.2, -17.5], [140.8, -17.5],
  [141.2, -16.0], [141.5, -14.0], [141.5, -12.5], [142.0, -11.5], [142.5, -10.7],
];

// More detailed Tasmania outline
const TASMANIA_COORDS: [number, number][] = [
  [145.0, -40.8], [145.5, -41.0], [146.5, -41.0], [147.5, -40.8], [148.0, -40.5],
  [148.3, -41.0], [148.3, -42.0], [148.0, -42.8], [147.5, -43.5], [146.5, -43.6],
  [145.5, -43.2], [145.0, -42.5], [144.7, -41.5], [145.0, -40.8],
];

// Australia bounds for coordinate conversion
const BOUNDS = {
  minLat: -44.5,
  maxLat: -9.5,
  minLon: 112,
  maxLon: 155,
};

// Convert lat/lon to SVG coordinates
function toSvgCoords(lat: number, lon: number, width: number, height: number) {
  const x = ((lon - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * width;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * height;
  return { x, y };
}

// Convert coordinate array to smooth SVG path using Catmull-Rom to Bezier
function coordsToSmoothPath(coords: [number, number][], width: number, height: number): string {
  const points = coords.map(coord => toSvgCoords(coord[1], coord[0], width, height));

  if (points.length < 3) return '';

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? points.length - 2 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? (i + 2) % points.length : i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path + ' Z';
}

export function LocationScreen() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const svgWidth = 450;
  const svgHeight = 360;
  const australiaPath = coordsToSmoothPath(AUSTRALIA_COORDS, svgWidth, svgHeight);
  const tasmaniaPath = coordsToSmoothPath(TASMANIA_COORDS, svgWidth, svgHeight);

  // Get city positions
  const cityPositions = Object.entries(CITIES).map(([key, city]) => ({
    key,
    ...city,
    ...toSvgCoords(city.lat, city.lon, svgWidth, svgHeight),
  }));

  const melbourne = cityPositions.find(c => c.key === 'melbourne')!;

  return (
    <div className="flex flex--col flex--center" style={{ height: '100%' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', maxWidth: 520, height: 'auto' }}
      >
        {/* Subtle gradient background */}
        <defs>
          <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8f8f8" />
            <stop offset="100%" stopColor="#f0f0f0" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.1"/>
          </filter>
        </defs>

        {/* Australia - filled with subtle gradient and shadow */}
        <path
          d={australiaPath}
          fill="url(#landGradient)"
          stroke="#333"
          strokeWidth="1.2"
          filter="url(#shadow)"
        />

        {/* Tasmania */}
        <path
          d={tasmaniaPath}
          fill="url(#landGradient)"
          stroke="#333"
          strokeWidth="1.2"
          filter="url(#shadow)"
        />

        {/* Other cities - subtle dots */}
        {cityPositions.filter(c => !c.isHome).map(city => (
          <g key={city.key}>
            <circle cx={city.x} cy={city.y} r="2.5" fill="#999" />
            <text
              x={city.x + 6}
              y={city.y + 3}
              fontSize="8"
              fill="#999"
              fontWeight="400"
            >
              {city.name}
            </text>
          </g>
        ))}

        {/* Melbourne - pulsing home location */}
        <circle cx={melbourne.x} cy={melbourne.y} r="5" fill="#000" />

        {/* Ping animation - first ring */}
        <circle
          cx={melbourne.x}
          cy={melbourne.y}
          fill="none"
          stroke="#000"
          strokeWidth="1.5"
        >
          <animate attributeName="r" from="8" to="30" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2.5s" repeatCount="indefinite" />
        </circle>

        {/* Ping animation - second ring */}
        <circle
          cx={melbourne.x}
          cy={melbourne.y}
          fill="none"
          stroke="#000"
          strokeWidth="1"
        >
          <animate attributeName="r" from="8" to="45" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.3" to="0" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
        </circle>

        {/* Ping animation - third ring */}
        <circle
          cx={melbourne.x}
          cy={melbourne.y}
          fill="none"
          stroke="#000"
          strokeWidth="0.5"
        >
          <animate attributeName="r" from="8" to="60" dur="2.5s" begin="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.2" to="0" dur="2.5s" begin="1.6s" repeatCount="indefinite" />
        </circle>

        {/* Melbourne label */}
        <text
          x={melbourne.x + 10}
          y={melbourne.y + 4}
          fontSize="12"
          fontWeight="600"
          fill="#000"
        >
          Melbourne
        </text>
      </svg>

      {/* Location info */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>
          {Math.abs(CITIES.melbourne.lat).toFixed(4)}°S, {CITIES.melbourne.lon.toFixed(4)}°E
        </div>
        <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.15em' }}>
          VICTORIA, AUSTRALIA
        </div>
      </div>
    </div>
  );
}
