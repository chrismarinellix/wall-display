import { useState, useEffect, useCallback } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { useNews } from '../../hooks/useNews';
import { generateDailySummary } from '../../services/aiService';
import { weatherCodeToDescription } from '../../types/weather';

interface Summary {
  greeting: string;
  weatherSummary: string;
  daySummary: string;
  marketSummary: string;
  newsSummary: string;
  advice: string;
}

export function SummaryScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { current: weather, forecast } = useWeather();
  const { events } = useCalendar();
  const { crypto } = useStocks();
  const { items: news } = useNews();

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const generateSummary = useCallback(async () => {
    if (!groqApiKey) {
      setError('Groq API key not configured. Add VITE_GROQ_API_KEY to your environment.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = {
        weather: weather ? {
          temperature: weather.temperature,
          condition: weatherCodeToDescription[weather.weatherCode] || 'Unknown',
          forecast: forecast.slice(0, 3).map(f =>
            `${f.date.toLocaleDateString('en-US', { weekday: 'short' })}: ${f.tempMax}°/${f.tempMin}°`
          ),
        } : undefined,
        calendar: {
          events: events.slice(0, 5).map(e => ({
            title: e.title,
            time: e.allDay ? 'All day' : e.start.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            }),
            isAllDay: e.allDay,
          })),
        },
        stocks: {
          crypto: crypto.map(c => ({
            name: c.name,
            price: c.price,
            change: c.change24h,
          })),
        },
        news: news.slice(0, 5).map(n => ({
          title: n.title,
          source: n.source,
        })),
      };

      const result = await generateDailySummary(data, groqApiKey);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [weather, forecast, events, crypto, news, groqApiKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateSummary();
    }, 2000);
    return () => clearTimeout(timer);
  }, [generateSummary]);

  useEffect(() => {
    const interval = setInterval(generateSummary, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [generateSummary]);

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  if (loading && !summary) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #eee',
            borderTopColor: '#000',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: 24, color: '#999', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Preparing briefing
        </p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          background: '#fff',
        }}
      >
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
          {error}
        </div>
        <button
          onClick={generateSummary}
          style={{
            marginTop: 24,
            padding: '12px 32px',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: '#000',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Hero Header */}
      <div
        style={{
          padding: '40px 48px 32px',
          background: '#000',
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 200,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {timeStr}
          </div>
          <div
            style={{
              textAlign: 'right',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                opacity: 0.5,
                marginBottom: 4,
              }}
            >
              Daily Briefing
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 400,
                opacity: 0.8,
              }}
            >
              {dateStr}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 300,
            lineHeight: 1.4,
            opacity: 0.95,
            maxWidth: 600,
          }}
        >
          {summary?.greeting || 'Welcome to your daily briefing.'}
        </div>
      </div>

      {/* Content Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: '1fr 1fr',
          overflow: 'hidden',
        }}
      >
        <SummaryCard
          number="01"
          label="Weather"
          content={summary?.weatherSummary || 'Weather data loading...'}
          position="top-left"
        />
        <SummaryCard
          number="02"
          label="Schedule"
          content={summary?.daySummary || 'Calendar data loading...'}
          position="top-right"
        />
        <SummaryCard
          number="03"
          label="Markets"
          content={summary?.marketSummary || 'Market data loading...'}
          position="bottom-left"
        />
        <SummaryCard
          number="04"
          label="Headlines"
          content={summary?.newsSummary || 'News loading...'}
          position="bottom-right"
        />
      </div>

      {/* Footer Advice */}
      <div
        style={{
          padding: '20px 48px',
          background: '#fafafa',
          borderTop: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 4,
            height: 4,
            background: '#000',
            borderRadius: '50%',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: '#333',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {summary?.advice || 'Have a productive day ahead.'}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  number,
  label,
  content,
  position,
}: {
  number: string;
  label: string;
  content: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const borderStyles: Record<string, React.CSSProperties> = {
    'top-left': { borderRight: '1px solid #eee', borderBottom: '1px solid #eee' },
    'top-right': { borderBottom: '1px solid #eee' },
    'bottom-left': { borderRight: '1px solid #eee' },
    'bottom-right': {},
  };

  return (
    <div
      style={{
        background: '#fff',
        padding: '28px 36px',
        display: 'flex',
        flexDirection: 'column',
        ...borderStyles[position],
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#ccc',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {number}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#000',
          }}
        >
          {label}
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          color: '#444',
          fontWeight: 400,
          flex: 1,
        }}
      >
        {content}
      </div>
    </div>
  );
}
