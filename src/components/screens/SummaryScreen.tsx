import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dumbbell, Bike, Beef, Salad, Droplet, Moon, Check } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { useNews } from '../../hooks/useNews';
import { generateDailySummary } from '../../services/aiService';
import { weatherCodeToDescription } from '../../types/weather';
import { getDailyHabits, toggleHabit, subscribeToHabits, DailyHabit, getCalendarEvents, CalendarEventRecord, getCountdowns, CountdownEvent } from '../../services/supabase';
import { proverbs } from '../../data/proverbs';

interface Summary {
  greeting: string;
  weatherSummary: string;
  daySummary: string;
  marketSummary: string;
  newsSummary: string;
  advice: string;
}

// Gentle ink-fade text component - text materializes like ink on parchment
function DispersionText({
  text,
  isVisible,
  style = {},
  charDelay = 40,
  duration = 1200,
}: {
  text: string;
  isVisible: boolean;
  style?: React.CSSProperties;
  charDelay?: number;
  duration?: number;
}) {
  const offsets = useMemo(() =>
    text.split('').map(() => ({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 6 + 2,
      r: (Math.random() - 0.5) * 3,
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
              ? `inkFadeIn ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * charDelay}ms forwards`
              : `inkFadeOut ${duration}ms cubic-bezier(0.55, 0.085, 0.68, 0.53) ${i * charDelay}ms forwards`,
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

// A magic spot that cycles through items independently
function MagicSpot({
  items,
  cycleTime = 12000,
  startDelay = 0,
  style = {},
  labelStyle = {},
  valueStyle = {},
  sublabelStyle = {},
}: {
  items: { label?: string; value: string; sublabel?: string }[];
  cycleTime?: number;
  startDelay?: number;
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
  sublabelStyle?: React.CSSProperties;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;

    // Initial delay before starting
    const startTimer = setTimeout(() => {
      setHasStarted(true);
      setIsVisible(true);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [items.length, startDelay]);

  useEffect(() => {
    if (!hasStarted || items.length === 0) return;

    const animDuration = 2500;

    const cycle = () => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setIsVisible(true);
      }, animDuration + 800);
    };

    const timer = setInterval(cycle, cycleTime);
    return () => clearInterval(timer);
  }, [hasStarted, items.length, cycleTime]);

  if (items.length === 0 || !hasStarted) return <div style={style} />;

  const current = items[currentIndex];

  return (
    <div style={{ minHeight: 40, ...style }}>
      {current.label && (
        <div style={{ marginBottom: 4 }}>
          <DispersionText
            text={current.label}
            isVisible={isVisible}
            charDelay={50}
            duration={1800}
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: '#888',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
              ...labelStyle,
            }}
          />
        </div>
      )}
      <div>
        <DispersionText
          text={current.value}
          isVisible={isVisible}
          charDelay={45}
          duration={2000}
          style={{
            fontSize: 18,
            fontWeight: 400,
            color: '#222',
            fontFamily: 'Georgia, serif',
            ...valueStyle,
          }}
        />
      </div>
      {current.sublabel && (
        <div style={{ marginTop: 4 }}>
          <DispersionText
            text={current.sublabel}
            isVisible={isVisible}
            charDelay={40}
            duration={1600}
            style={{
              fontSize: 11,
              color: '#666',
              fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              ...sublabelStyle,
            }}
          />
        </div>
      )}
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
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);

  useEffect(() => {
    getDailyHabits().then(setHabits);
  }, []);

  useEffect(() => {
    getCalendarEvents().then(setCustomEvents);
  }, []);

  useEffect(() => {
    getCountdowns().then(setCountdowns);
  }, []);

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

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Build magic spot data
  const weatherItems = useMemo(() => {
    if (!weather) return [];
    const condition = weatherCodeToDescription[weather.weatherCode] || 'Clear';
    const items = [
      { label: 'Now', value: `${Math.round(weather.temperature)}° ${condition}` },
    ];
    if (forecast[0]) {
      items.push({ label: 'Today', value: `High ${forecast[0].tempMax}° / Low ${forecast[0].tempMin}°` });
    }
    if (forecast[1]) {
      items.push({
        label: forecast[1].date.toLocaleDateString('en-US', { weekday: 'short' }),
        value: `${forecast[1].tempMax}° / ${forecast[1].tempMin}°`
      });
    }
    return items;
  }, [weather, forecast]);

  const cryptoItems = useMemo(() => {
    return crypto.slice(0, 3).map(c => ({
      label: c.symbol,
      value: `$${c.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sublabel: `${c.change24h >= 0 ? '+' : ''}${c.change24h.toFixed(1)}%`,
    }));
  }, [crypto]);

  const proverbItems = useMemo(() => {
    // Get a random selection of proverbs
    const shuffled = [...proverbs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8).map(p => ({
      value: `"${p.meaning}"`,
      sublabel: p.romaji,
    }));
  }, []);

  const calendarItems = useMemo(() => {
    const todayEvents = events.filter(e => {
      const today = new Date();
      return e.start.toDateString() === today.toDateString();
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    return todayEvents.slice(0, 5).map(e => ({
      label: e.allDay ? 'All Day' : e.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      value: e.title.length > 25 ? e.title.slice(0, 25) + '...' : e.title,
    }));
  }, [events]);

  const countdownItems = useMemo(() => {
    const upcoming = countdowns
      .filter(c => new Date(c.target_date).getTime() > Date.now())
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());

    return upcoming.slice(0, 4).map(c => {
      const days = Math.ceil((new Date(c.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        label: 'Countdown',
        value: `${days} day${days !== 1 ? 's' : ''}`,
        sublabel: `until ${c.title}`,
      };
    });
  }, [countdowns]);

  const generateSummary = useCallback(async () => {
    if (!groqApiKey) {
      setError('Groq API key not configured.');
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
            ...events.map(e => ({
              title: e.title,
              time: e.allDay ? 'All day' : e.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              isAllDay: e.allDay,
              start: e.start,
            })),
            ...customEvents.map(e => {
              const startDate = e.start_date.endsWith('Z') || e.start_date.includes('+')
                ? new Date(e.start_date)
                : new Date(e.start_date + '+11:00');
              return {
                title: e.title,
                time: e.all_day ? 'All day' : startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                isAllDay: e.all_day,
                start: startDate,
              };
            }),
          ]
            .filter(e => e.start.toDateString() === new Date().toDateString())
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .slice(0, 8)
            .map(({ title, time, isAllDay }) => ({ title, time, isAllDay })),
        },
        stocks: { crypto: crypto.map(c => ({ name: c.name, price: c.price, change: c.change24h })) },
        news: news.slice(0, 5).map(n => ({ title: n.title, source: n.source })),
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
    const timer = setTimeout(() => generateSummary(), 2000);
    return () => clearTimeout(timer);
  }, [generateSummary]);

  useEffect(() => {
    const interval = setInterval(generateSummary, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [generateSummary]);

  const dateStr = currentTime.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const timeStr = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true
  });

  if (loading && !summary) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #ddd', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: 24, color: '#666', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>Composing Edition</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, background: '#faf9f6' }}>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center', maxWidth: 360, lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>{error}</div>
        <button onClick={generateSummary} style={{ marginTop: 24, padding: '12px 32px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#000', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#faf9f6', overflow: 'auto', fontFamily: 'Georgia, "Times New Roman", serif', WebkitOverflowScrolling: 'touch' }}>
      <style>{`
        @keyframes inkFadeIn {
          0% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--tr)); filter: blur(2px); }
          40% { opacity: 0.4; filter: blur(1px); }
          100% { opacity: 1; transform: translate(0, 0) rotate(0deg); filter: blur(0); }
        }
        @keyframes inkFadeOut {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); filter: blur(0); }
          60% { opacity: 0.4; filter: blur(1px); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--tr)); filter: blur(2px); }
        }
      `}</style>

      {/* Masthead */}
      <div style={{ padding: '24px 40px 16px', borderBottom: '3px double #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #ccc' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{dateStr}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{timeStr}</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, fontFamily: '"Times New Roman", Georgia, serif', color: '#000' }}>The Daily Briefing</h1>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#888' }}>All the news that fits your morning</div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', overflow: 'visible', minHeight: 'min-content' }}>

        {/* Left Column */}
        <div style={{ borderRight: '1px solid #ddd', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Weather Magic Spot */}
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Weather</h3>
            <MagicSpot
              items={weatherItems}
              cycleTime={15000}
              startDelay={0}
              valueStyle={{ fontSize: 22, fontWeight: 300 }}
            />
          </div>

          {/* Proverb Magic Spot */}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Wisdom</h3>
            <MagicSpot
              items={proverbItems}
              cycleTime={18000}
              startDelay={3000}
              valueStyle={{ fontSize: 15, fontWeight: 400, lineHeight: 1.5, fontStyle: 'italic' }}
              sublabelStyle={{ fontSize: 10, color: '#999', marginTop: 8 }}
            />
          </div>

          {/* Markets Magic Spot */}
          <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Markets</h3>
            <MagicSpot
              items={cryptoItems}
              cycleTime={10000}
              startDelay={5000}
              valueStyle={{ fontSize: 20, fontWeight: 300 }}
            />
          </div>
        </div>

        {/* Center Column */}
        <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: '0 0 16px 0', color: '#000' }}>{summary?.greeting || 'Welcome to your daily briefing.'}</h2>
            <div style={{ width: 60, height: 3, background: '#000', marginBottom: 16 }} />
          </div>

          {/* Calendar Events Magic Spot */}
          {calendarItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Schedule</h3>
              <MagicSpot
                items={calendarItems}
                cycleTime={8000}
                startDelay={2000}
                labelStyle={{ fontSize: 10, color: '#666' }}
                valueStyle={{ fontSize: 16 }}
              />
            </div>
          )}

          {/* Countdown Magic Spot */}
          {countdownItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Countdown</h3>
              <MagicSpot
                items={countdownItems}
                cycleTime={12000}
                startDelay={7000}
                valueStyle={{ fontSize: 24, fontWeight: 300 }}
              />
            </div>
          )}

          {/* Quote/Advice */}
          <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #ddd' }}>
            <blockquote style={{ fontSize: 14, fontStyle: 'italic', color: '#555', margin: 0, paddingLeft: 16, borderLeft: '3px solid #ccc', lineHeight: 1.6 }}>
              {summary?.advice || 'Have a productive day ahead.'}
            </blockquote>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ borderLeft: '1px solid #ddd', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 12px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Headlines</h3>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#333', margin: 0 }}>{summary?.newsSummary || 'News loading...'}</p>
          </div>

          <div style={{ borderTop: '1px solid #ddd', paddingTop: 20 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 12px 0', paddingBottom: 6, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>Daily Habits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  onClick={() => handleHabitToggle(habit.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: habit.completed ? '#f0f5f0' : '#fafafa', border: habit.completed ? '1px solid #c4d4c4' : '1px solid #eee', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: 3, border: habit.completed ? '2px solid #5a8a5a' : '2px solid #ccc', background: habit.completed ? '#5a8a5a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {habit.completed && <Check size={12} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ color: habit.completed ? '#5a8a5a' : '#666', flexShrink: 0 }}>{getHabitIcon(habit.icon)}</span>
                  <span style={{ flex: 1, fontSize: 12, color: habit.completed ? '#888' : '#333', textDecoration: habit.completed ? 'line-through' : 'none', fontFamily: 'Georgia, serif' }}>{habit.name}</span>
                  {habit.completed && habit.completedAt && (
                    <span style={{ fontSize: 9, color: '#999', letterSpacing: '0.05em' }}>
                      {new Date(habit.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
