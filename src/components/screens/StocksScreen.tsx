import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

type TimeRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y';

interface StockData {
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  history: number[];
  timestamps: number[];
  dataSource: string;
  lastUpdate: Date;
}

// Your position
const SHARES = 100;
const COST_BASIS = 273;
const TOTAL_COST = SHARES * COST_BASIS;

const TIME_RANGES: { key: TimeRange; label: string; interval: string }[] = [
  { key: '1d', label: '1D', interval: '5m' },
  { key: '5d', label: '1W', interval: '15m' },
  { key: '1mo', label: '1M', interval: '1d' },
  { key: '3mo', label: '3M', interval: '1d' },
  { key: '6mo', label: '6M', interval: '1d' },
  { key: '1y', label: '1Y', interval: '1wk' },
];

async function fetchAAPLData(range: TimeRange): Promise<StockData | null> {
  const rangeConfig = TIME_RANGES.find(r => r.key === range) || TIME_RANGES[2];
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=${rangeConfig.interval}&range=${range}`;

  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl);

      if (response.ok) {
        const data = await response.json();
        if (data?.chart?.result?.[0]) {
          const result = data.chart.result[0];
          const quote = result.meta;
          const closes = result.indicators?.quote?.[0]?.close || [];
          const timestamps = result.timestamp || [];

          // Filter out null values but keep corresponding timestamps
          const validData: { close: number; timestamp: number }[] = [];
          closes.forEach((c: number | null, i: number) => {
            if (c !== null && timestamps[i]) {
              validData.push({ close: c, timestamp: timestamps[i] });
            }
          });

          return {
            price: quote.regularMarketPrice,
            change: quote.regularMarketPrice - quote.previousClose,
            changePercent: ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose) * 100,
            previousClose: quote.previousClose,
            history: validData.map(d => d.close),
            timestamps: validData.map(d => d.timestamp),
            dataSource: 'Yahoo Finance',
            lastUpdate: new Date(),
          };
        }
      }
    } catch (e) {
      console.log(`Proxy failed: ${proxyUrl}`, e);
    }
  }

  // Fallback to Alpha Vantage for price (no history)
  const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`
      );
      const data = await response.json();
      const quote = data['Global Quote'];

      if (quote && quote['05. price']) {
        return {
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
          previousClose: parseFloat(quote['08. previous close']),
          history: [],
          timestamps: [],
          dataSource: 'Alpha Vantage',
          lastUpdate: new Date(),
        };
      }
    } catch (e) {
      console.error('Alpha Vantage failed:', e);
    }
  }

  // Last resort: return placeholder with no live data
  console.log('All stock APIs failed, using placeholder');
  return {
    price: 250.00,
    change: 0,
    changePercent: 0,
    previousClose: 250.00,
    history: [],
    timestamps: [],
    dataSource: 'Offline',
    lastUpdate: new Date(),
  };
}

function StockChart({ data, positive, width }: { data: number[]; positive: boolean; width: number }) {
  if (data.length < 2) {
    return (
      <div style={{
        height: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: 14,
      }}>
        No chart data available
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 180;
  const padding = { top: 20, bottom: 30, left: 60, right: 40 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  const points = data.map((val, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - min) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  // Create fill polygon
  const fillPoints = `${padding.left},${height - padding.bottom} ` + points + ` ${width - padding.right},${height - padding.bottom}`;

  // Grid lines for y-axis
  const yGridLines = [0, 0.25, 0.5, 0.75, 1];
  const priceLabels = yGridLines.map(pct => min + (max - min) * pct);

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {yGridLines.map((pct, i) => (
        <g key={pct}>
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - pct)}
            x2={width - padding.right}
            y2={padding.top + chartHeight * (1 - pct)}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
          <text
            x={padding.left - 8}
            y={padding.top + chartHeight * (1 - pct) + 4}
            textAnchor="end"
            fill="#999"
            fontSize="10"
          >
            ${priceLabels[i].toFixed(0)}
          </text>
        </g>
      ))}
      {/* Fill area */}
      <polygon
        points={fillPoints}
        fill={positive ? 'rgba(0,0,0,0.05)' : 'rgba(102,102,102,0.05)'}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#000' : '#666'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width - padding.right}
        cy={padding.top + chartHeight - ((data[data.length - 1] - min) / range) * chartHeight}
        r="4"
        fill={positive ? '#000' : '#666'}
      />
      {/* Start dot */}
      <circle
        cx={padding.left}
        cy={padding.top + chartHeight - ((data[0] - min) / range) * chartHeight}
        r="3"
        fill={positive ? '#000' : '#666'}
        opacity="0.5"
      />
    </svg>
  );
}

export function StocksScreen() {
  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1mo');
  const [chartWidth, setChartWidth] = useState(600);

  const fetchData = useCallback(async (range: TimeRange) => {
    setLoading(true);
    const data = await fetchAAPLData(range);
    setStock(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(timeRange);

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetchData(timeRange);
    }, 300000);

    return () => clearInterval(interval);
  }, [timeRange, fetchData]);

  // Get container width for full-width chart
  useEffect(() => {
    const updateWidth = () => {
      // Full screen width (will use negative margins to break out of container)
      setChartWidth(window.innerWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleRefresh = () => {
    fetchData(timeRange);
  };

  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  if (!stock) {
    return <div className="flex flex--center flex-1"><span className="description">Loading AAPL...</span></div>;
  }

  const currentValue = SHARES * stock.price;
  const profitLoss = currentValue - TOTAL_COST;
  const profitLossPercent = (profitLoss / TOTAL_COST) * 100;
  const isPositive = stock.change >= 0;
  const isProfitable = profitLoss >= 0;

  // Calculate chart performance (first vs last)
  const chartChange = stock.history.length >= 2
    ? stock.history[stock.history.length - 1] - stock.history[0]
    : stock.change;
  const chartPositive = chartChange >= 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex flex--between" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 4 }}>AAPL</div>
          <div style={{ fontSize: 13, color: '#666' }}>Apple Inc. · NASDAQ</div>
        </div>
        <div className="flex gap--small" style={{ alignItems: 'center' }}>
          {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          <span className="label" style={{ color: isPositive ? '#000' : '#666' }}>
            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Current Price */}
      <div style={{ marginBottom: 16 }}>
        <div className="value" style={{ fontSize: 56, fontWeight: 200 }}>
          ${stock.price.toFixed(2)}
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          {isPositive ? '+' : ''}${stock.change.toFixed(2)} today
        </div>
      </div>

      {/* Time Range Buttons */}
      <div className="flex gap--small" style={{ marginBottom: 12 }}>
        {TIME_RANGES.map((range) => (
          <button
            key={range.key}
            onClick={() => handleRangeChange(range.key)}
            className={`label ${timeRange === range.key ? '' : 'label--gray'}`}
            style={{
              background: 'none',
              border: timeRange === range.key ? '1px solid #000' : '1px solid #e5e5e5',
              cursor: 'pointer',
              padding: '4px 10px',
              fontSize: 11,
            }}
          >
            {range.label}
          </button>
        ))}
        <button
          onClick={handleRefresh}
          style={{
            background: 'none',
            border: '1px solid #e5e5e5',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            marginLeft: 'auto',
          }}
          title="Refresh data"
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Full-Width Chart - breaks out of container to edge of screen */}
      <div style={{
        marginLeft: -32,
        marginRight: -32,
        marginBottom: 16,
      }}>
        <StockChart
          data={stock.history}
          positive={chartPositive}
          width={chartWidth}
        />
      </div>

      {/* Data Source & Last Update */}
      <div className="flex flex--between" style={{ marginBottom: 16, fontSize: 11, color: '#999' }}>
        <span>Source: {stock.dataSource}</span>
        <span>Updated: {formatTime(stock.lastUpdate)}</span>
      </div>

      <div className="divider" style={{ marginBottom: 16 }} />

      {/* Your Position - Compact */}
      <div className="flex flex--between" style={{ gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div className="label label--gray" style={{ marginBottom: 8, fontSize: 10 }}>YOUR POSITION</div>
          <div className="flex flex--between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#666' }}>Shares</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{SHARES}</span>
          </div>
          <div className="flex flex--between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#666' }}>Avg Cost</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>${COST_BASIS.toFixed(2)}</span>
          </div>
          <div className="flex flex--between">
            <span style={{ fontSize: 12, color: '#666' }}>Total Cost</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>${TOTAL_COST.toLocaleString()}</span>
          </div>
        </div>

        <div style={{ width: 1, background: '#e5e5e5' }} />

        <div style={{ flex: 1 }}>
          <div className="label label--gray" style={{ marginBottom: 8, fontSize: 10 }}>CURRENT VALUE</div>
          <div style={{ fontSize: 24, fontWeight: 500, marginBottom: 4 }}>
            ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: isProfitable ? '#000' : '#666'
          }}>
            {isProfitable ? '+' : ''}${profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 12, marginLeft: 6 }}>
              ({isProfitable ? '+' : ''}{profitLossPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
