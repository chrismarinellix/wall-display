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

  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
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
          background: '#faf9f6',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid #ddd',
            borderTopColor: '#000',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: 24, color: '#666', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>
          Composing Edition
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
          background: '#faf9f6',
        }}
      >
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', maxWidth: 360, lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
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
        background: '#faf9f6',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Masthead */}
      <div
        style={{
          padding: '24px 40px 16px',
          borderBottom: '3px double #000',
        }}
      >
        {/* Top line with date and time */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid #ccc',
          }}
        >
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>
            {dateStr}
          </span>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>
            {timeStr}
          </span>
        </div>

        {/* Newspaper Title */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          <h1
            style={{
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
              fontFamily: '"Times New Roman", Georgia, serif',
              color: '#000',
            }}
          >
            The Daily Briefing
          </h1>
        </div>

        {/* Tagline */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#888',
          }}
        >
          All the news that fits your morning
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 2fr 1fr',
          overflow: 'hidden',
        }}
      >
        {/* Left Column - Weather & Markets */}
        <div
          style={{
            borderRight: '1px solid #ddd',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <NewspaperSection title="Weather">
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0 }}>
              {summary?.weatherSummary || 'Weather data loading...'}
            </p>
          </NewspaperSection>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
            <NewspaperSection title="Markets">
              <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0 }}>
                {summary?.marketSummary || 'Market data loading...'}
              </p>
            </NewspaperSection>
          </div>
        </div>

        {/* Center Column - Main Story (Greeting/Schedule) */}
        <div
          style={{
            padding: '20px 32px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Lead Story / Greeting */}
          <div style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.2,
                margin: '0 0 16px 0',
                color: '#000',
              }}
            >
              {summary?.greeting || 'Welcome to your daily briefing.'}
            </h2>
            <div
              style={{
                width: 60,
                height: 3,
                background: '#000',
                marginBottom: 16,
              }}
            />
          </div>

          {/* Schedule Section */}
          <NewspaperSection title="Today's Schedule">
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: 0, textAlign: 'justify' }}>
              {summary?.daySummary || 'Calendar data loading...'}
            </p>
          </NewspaperSection>

          {/* Quote/Advice at bottom of center column */}
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 20,
              borderTop: '1px solid #ddd',
            }}
          >
            <blockquote
              style={{
                fontSize: 14,
                fontStyle: 'italic',
                color: '#555',
                margin: 0,
                paddingLeft: 16,
                borderLeft: '3px solid #ccc',
                lineHeight: 1.6,
              }}
            >
              {summary?.advice || 'Have a productive day ahead.'}
            </blockquote>
          </div>
        </div>

        {/* Right Column - Headlines */}
        <div
          style={{
            borderLeft: '1px solid #ddd',
            padding: '20px 24px',
          }}
        >
          <NewspaperSection title="Headlines">
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0 }}>
              {summary?.newsSummary || 'News loading...'}
            </p>
          </NewspaperSection>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 40px',
          borderTop: '1px solid #ddd',
          background: '#f5f4f1',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#999',
          }}
        >
          Updated every 30 minutes
        </span>
      </div>
    </div>
  );
}

function NewspaperSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          margin: '0 0 12px 0',
          paddingBottom: 6,
          borderBottom: '2px solid #000',
          display: 'inline-block',
          color: '#000',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
