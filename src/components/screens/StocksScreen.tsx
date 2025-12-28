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

// Responsive styles
const stockStyles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'clamp(12px, 3vw, 16px)',
    flexWrap: 'wrap',
    gap: 8,
  },
  ticker: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: '#666',
  },
  priceSection: {
    marginBottom: 'clamp(12px, 3vw, 16px)',
  },
  currentPrice: {
    fontSize: 'clamp(36px, 12vw, 56px)',
    fontWeight: 200,
  },
  priceChange: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: '#666',
    marginTop: 4,
  },
  rangeButton: {
    background: 'none',
    cursor: 'pointer',
    padding: 'clamp(3px, 1vw, 4px) clamp(6px, 2vw, 10px)',
    fontSize: 'clamp(9px, 2.3vw, 11px)',
  },
  positionContainer: {
    display: 'flex',
    gap: 'clamp(16px, 4vw, 24px)',
  },
  positionSection: {
    flex: 1,
  },
  positionLabel: {
    marginBottom: 8,
    fontSize: 'clamp(8px, 2vw, 10px)',
  },
  positionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  positionRowLabel: {
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    color: '#666',
  },
  positionRowValue: {
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    fontWeight: 500,
  },
  currentValue: {
    fontSize: 'clamp(18px, 5vw, 24px)',
    fontWeight: 500,
    marginBottom: 4,
  },
  profitLoss: {
    fontSize: 'clamp(12px, 3vw, 14px)',
    fontWeight: 500,
  },
};

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

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
    <div style={stockStyles.container}>
      {/* Header */}
      <div style={stockStyles.header}>
        <div>
          <div className="label" style={stockStyles.ticker}>AAPL</div>
          <div style={stockStyles.subtitle}>{isMobile ? 'Apple' : 'Apple Inc. · NASDAQ'}</div>
        </div>
        <div className="flex gap--small" style={{ alignItems: 'center' }}>
          {isPositive ? <TrendingUp size={isMobile ? 14 : 18} /> : <TrendingDown size={isMobile ? 14 : 18} />}
          <span className="label" style={{ color: isPositive ? '#000' : '#666' }}>
            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Current Price */}
      <div style={stockStyles.priceSection}>
        <div className="value" style={stockStyles.currentPrice}>
          ${stock.price.toFixed(2)}
        </div>
        <div style={stockStyles.priceChange}>
          {isPositive ? '+' : ''}${stock.change.toFixed(2)} today
        </div>
      </div>

      {/* Time Range Buttons */}
      <div className="flex gap--small" style={{ marginBottom: 'clamp(8px, 2vw, 12px)', flexWrap: 'wrap' }}>
        {TIME_RANGES.map((range) => (
          <button
            key={range.key}
            onClick={() => handleRangeChange(range.key)}
            className={`label ${timeRange === range.key ? '' : 'label--gray'}`}
            style={{
              ...stockStyles.rangeButton,
              border: timeRange === range.key ? '1px solid #000' : '1px solid #e5e5e5',
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
            padding: 'clamp(3px, 1vw, 4px) clamp(6px, 1.5vw, 8px)',
            display: 'flex',
            alignItems: 'center',
            marginLeft: 'auto',
            borderRadius: 4,
          }}
          title="Refresh data"
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Full-Width Chart - breaks out of container to edge of screen */}
      <div style={{
        marginLeft: isMobile ? -16 : -32,
        marginRight: isMobile ? -16 : -32,
        marginBottom: 'clamp(12px, 3vw, 16px)',
      }}>
        <StockChart
          data={stock.history}
          positive={chartPositive}
          width={chartWidth}
        />
      </div>

      {/* Data Source & Last Update */}
      <div className="flex flex--between" style={{ marginBottom: 'clamp(12px, 3vw, 16px)', fontSize: 'clamp(9px, 2.3vw, 11px)', color: '#999', flexWrap: 'wrap', gap: 4 }}>
        <span>Source: {stock.dataSource}</span>
        <span>Updated: {formatTime(stock.lastUpdate)}</span>
      </div>

      <div className="divider" style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }} />

      {/* Your Position - Responsive layout */}
      <div style={{ ...stockStyles.positionContainer, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={stockStyles.positionSection}>
          <div className="label label--gray" style={stockStyles.positionLabel}>YOUR POSITION</div>
          <div style={stockStyles.positionRow}>
            <span style={stockStyles.positionRowLabel}>Shares</span>
            <span style={stockStyles.positionRowValue}>{SHARES}</span>
          </div>
          <div style={stockStyles.positionRow}>
            <span style={stockStyles.positionRowLabel}>Avg Cost</span>
            <span style={stockStyles.positionRowValue}>${COST_BASIS.toFixed(2)}</span>
          </div>
          <div style={stockStyles.positionRow}>
            <span style={stockStyles.positionRowLabel}>Total Cost</span>
            <span style={stockStyles.positionRowValue}>${TOTAL_COST.toLocaleString()}</span>
          </div>
        </div>

        {!isMobile && <div style={{ width: 1, background: '#e5e5e5' }} />}
        {isMobile && <div style={{ height: 1, background: '#e5e5e5', margin: '12px 0' }} />}

        <div style={stockStyles.positionSection}>
          <div className="label label--gray" style={stockStyles.positionLabel}>CURRENT VALUE</div>
          <div style={stockStyles.currentValue}>
            ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div style={{
            ...stockStyles.profitLoss,
            color: isProfitable ? '#000' : '#666'
          }}>
            {isProfitable ? '+' : ''}${profitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span style={{ fontSize: 'clamp(10px, 2.5vw, 12px)', marginLeft: 6 }}>
              ({isProfitable ? '+' : ''}{profitLossPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
