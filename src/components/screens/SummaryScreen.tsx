import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dumbbell, Bike, Beef, Salad, Droplet, Moon, Check } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { useNews } from '../../hooks/useNews';
import { useSettings } from '../../contexts/SettingsContext';
import { generateDailySummary } from '../../services/aiService';
import { weatherCodeToDescription } from '../../types/weather';
import { getDailyHabits, toggleHabit, subscribeToHabits, DailyHabit, getCalendarEvents, CalendarEventRecord } from '../../services/supabase';

interface Summary {
  greeting: string;
  weatherSummary: string;
  daySummary: string;
  marketSummary: string;
  newsSummary: string;
  advice: string;
}

// Dispersion text component - text explodes/coalesces character by character
function DispersionText({
  text,
  isVisible,
  style = {},
  charDelay = 20,
  duration = 500,
}: {
  text: string;
  isVisible: boolean;
  style?: React.CSSProperties;
  charDelay?: number;
  duration?: number;
}) {
  const offsets = useMemo(() =>
    text.split('').map(() => ({
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 50,
      r: (Math.random() - 0.5) * 40,
    })), [text]
  );

  return (
    <span style={{ display: 'inline', ...style }}>
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

// Animated spotlight that cycles through live data items
function LiveDataSpotlight({
  items,
}: {
  items: { label: string; value: string; sublabel?: string }[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (items.length === 0) return;

    const cycleDuration = 4000;
    const animDuration = 600;

    const cycle = () => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsVisible(true);
      }, animDuration + 200);
    };

    const timer = setInterval(cycle, cycleDuration);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[currentIndex];

  return (
    <div
      style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #f8f7f4 0%, #f0efe8 100%)',
        borderLeft: '4px solid #000',
        marginBottom: 16,
        minHeight: 70,
      }}
    >
      <div style={{ marginBottom: 4 }}>
        <DispersionText
          text={current.label.toUpperCase()}
          isVisible={isVisible}
          charDelay={15}
          duration={400}
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: '#888',
            fontFamily: 'system-ui, sans-serif',
          }}
        />
      </div>
      <div>
        <DispersionText
          text={current.value}
          isVisible={isVisible}
          charDelay={25}
          duration={500}
          style={{
            fontSize: 22,
            fontWeight: 400,
            color: '#000',
            fontFamily: 'Georgia, serif',
          }}
        />
      </div>
      {current.sublabel && (
        <div style={{ marginTop: 4 }}>
          <DispersionText
            text={current.sublabel}
            isVisible={isVisible}
            charDelay={20}
            duration={450}
            style={{
              fontSize: 11,
              color: '#666',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
            }}
          />
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {items.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 16 : 6,
              height: 6,
              borderRadius: 3,
              background: i === currentIndex ? '#000' : '#ccc',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SummaryScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [customEvents, setCustomEvents] = useState<CalendarEventRecord[]>([]);

  // Load habits from Supabase on mount
  useEffect(() => {
    getDailyHabits().then(setHabits);
  }, []);

  // Load custom calendar events from Supabase
  useEffect(() => {
    getCalendarEvents().then(setCustomEvents);
  }, []);

  // Subscribe to realtime habit changes
  useEffect(() => {
    const unsubscribe = subscribeToHabits((updatedHabits) => {
      setHabits(updatedHabits);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleHabitToggle = async (habitId: string) => {
    const updated = await toggleHabit(habitId, habits);
    setHabits(updated);
  };

  const getHabitIcon = (icon: string) => {
    const iconProps = { size: 14, strokeWidth: 1.5 };
    switch (icon) {
      case 'dumbbell': return <Dumbbell {...iconProps} />;
      case 'bike': return <Bike {...iconProps} />;
      case 'beef': return <Beef {...iconProps} />;
      case 'salad': return <Salad {...iconProps} />;
      case 'droplet': return <Droplet {...iconProps} />;
      case 'moon': return <Moon {...iconProps} />;
      default: return <Check {...iconProps} />;
    }
  };

  const { current: weather, forecast } = useWeather();
  const { events } = useCalendar();
  const { crypto } = useStocks();
  const { items: news } = useNews();
  const { settings } = useSettings();

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Build live data items from real data
  const liveDataItems = useMemo(() => {
    const items: { label: string; value: string; sublabel?: string }[] = [];

    // Weather
    if (weather) {
      const condition = weatherCodeToDescription[weather.weatherCode] || 'Clear';
      items.push({
        label: 'Weather',
        value: `${Math.round(weather.temperature)}° ${condition}`,
        sublabel: forecast[0] ? `High ${forecast[0].tempMax}° / Low ${forecast[0].tempMin}°` : undefined,
      });
    }

    // Crypto prices
    if (crypto.length > 0) {
      const btc = crypto.find(c => c.symbol === 'BTC');
      if (btc) {
        items.push({
          label: 'Bitcoin',
          value: `$${btc.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          sublabel: `${btc.change24h >= 0 ? '+' : ''}${btc.change24h.toFixed(1)}% today`,
        });
      }
      const eth = crypto.find(c => c.symbol === 'ETH');
      if (eth) {
        items.push({
          label: 'Ethereum',
          value: `$${eth.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          sublabel: `${eth.change24h >= 0 ? '+' : ''}${eth.change24h.toFixed(1)}% today`,
        });
      }
    }

    // Next calendar event
    const todayEvents = events.filter(e => {
      const today = new Date();
      return e.start.toDateString() === today.toDateString();
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    const nextEvent = todayEvents.find(e => e.start > new Date());
    if (nextEvent) {
      const timeUntil = Math.round((nextEvent.start.getTime() - Date.now()) / 60000);
      items.push({
        label: 'Next Event',
        value: nextEvent.title.length > 20 ? nextEvent.title.slice(0, 20) + '...' : nextEvent.title,
        sublabel: timeUntil < 60 ? `in ${timeUntil} minutes` : `at ${nextEvent.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      });
    }

    // Countdown from settings
    if (settings.countdown?.targetDate) {
      const target = new Date(settings.countdown.targetDate);
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff > 0) {
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        items.push({
          label: 'Countdown',
          value: `${days} day${days !== 1 ? 's' : ''}`,
          sublabel: `until ${settings.countdown.label || 'target date'}`,
        });
      }
    }

    return items;
  }, [weather, forecast, crypto, events, settings.countdown]);

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
          events: [
            // Events from Google/Outlook calendar hook
            ...events.map(e => ({
              title: e.title,
              time: e.allDay ? 'All day' : e.start.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              }),
              isAllDay: e.allDay,
              start: e.start,
            })),
            // Custom events from Supabase
            ...customEvents.map(e => {
              // Handle timezone - if stored as local time without Z suffix, don't convert
              const startDate = e.start_date.endsWith('Z') || e.start_date.includes('+')
                ? new Date(e.start_date)
                : new Date(e.start_date + '+11:00'); // Melbourne time
              return {
                title: e.title,
                time: e.all_day ? 'All day' : startDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                }),
                isAllDay: e.all_day,
                start: startDate,
              };
            }),
          ]
            .filter(e => {
              // Filter to today's events only
              const today = new Date();
              const eventDate = e.start;
              return eventDate.toDateString() === today.toDateString();
            })
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, 8)
            .map(({ title, time, isAllDay }) => ({ title, time, isAllDay })),
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
  }, [weather, forecast, events, customEvents, crypto, news, groqApiKey]);

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
        overflow: 'auto',
        fontFamily: 'Georgia, "Times New Roman", serif',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* CSS Keyframes for dispersion animation */}
      <style>{`
        @keyframes coalesce {
          0% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(0.5);
            filter: blur(6px);
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
            filter: blur(6px);
          }
        }
      `}</style>

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
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          overflow: 'visible',
          minHeight: 'min-content',
        }}
      >
        {/* Left Column - Live Data Spotlight & Weather */}
        <div
          style={{
            borderRight: '1px solid #ddd',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Live animated data spotlight */}
          {liveDataItems.length > 0 && (
            <LiveDataSpotlight items={liveDataItems} />
          )}

          <NewspaperSection title="Weather">
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0 }}>
              {summary?.weatherSummary || 'Weather data loading...'}
            </p>
          </NewspaperSection>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: 16 }}>
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

        {/* Right Column - Headlines & Habits */}
        <div
          style={{
            borderLeft: '1px solid #ddd',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <NewspaperSection title="Headlines">
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0 }}>
              {summary?.newsSummary || 'News loading...'}
            </p>
          </NewspaperSection>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
            <NewspaperSection title="Daily Habits">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    onClick={() => handleHabitToggle(habit.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      background: habit.completed ? '#f0f5f0' : '#fafafa',
                      border: habit.completed ? '1px solid #c4d4c4' : '1px solid #eee',
                      borderRadius: 4,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 3,
                        border: habit.completed ? '2px solid #5a8a5a' : '2px solid #ccc',
                        background: habit.completed ? '#5a8a5a' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {habit.completed && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>

                    {/* Icon */}
                    <span style={{ color: habit.completed ? '#5a8a5a' : '#666', flexShrink: 0 }}>
                      {getHabitIcon(habit.icon)}
                    </span>

                    {/* Label */}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: habit.completed ? '#888' : '#333',
                        textDecoration: habit.completed ? 'line-through' : 'none',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {habit.name}
                    </span>

                    {/* Time completed */}
                    {habit.completed && habit.completedAt && (
                      <span
                        style={{
                          fontSize: 9,
                          color: '#999',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {new Date(habit.completedAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </NewspaperSection>
          </div>
        </div>
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
