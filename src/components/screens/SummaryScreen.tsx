import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dumbbell, Bike, Beef, Salad, Droplet, Moon, Check, AlertTriangle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { weatherCodeToDescription } from '../../types/weather';
import { getDailyHabits, toggleHabit, subscribeToHabits, DailyHabit, getCountdowns, CountdownEvent, getTodos, toggleTodo, TodoItem, subscribeToTodos } from '../../services/supabase';
import { proverbs } from '../../data/proverbs';
import { historicalMoments, HistoricalMoment } from '../../data/moments';
import { format, isToday, isTomorrow, differenceInDays, differenceInHours, isPast } from 'date-fns';

// Map keywords to Unsplash image IDs
const imageMap: Record<string, string> = {
  'space,astronaut': '1446776811953-b23d57bd21aa',
  'moon,space': '1522030299830-16b8d3d049fe',
  'earth,space': '1614730321146-b6fa6a46bcb4',
  'mars,space': '1614728894747-a83421e2b9c9',
  'telescope,stars': '1462331940025-496dfbfc7564',
  'medicine,science': '1532187863486-abf9dbad1b69',
  'dna,science': '1607619056574-7b8d3ee536b2',
  'technology,innovation': '1518770660439-4636190af475',
};

function getImageUrl(keywords: string): string {
  const id = imageMap[keywords] || '1419242902214-272b3f66ee7a';
  return `https://images.unsplash.com/photo-${id}?w=800&q=80`;
}

// Gentle ink-fade text component
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

// Magic spot component
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
          <DispersionText text={current.label} isVisible={isVisible} charDelay={50} duration={1800}
            style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', color: '#888', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', ...labelStyle }} />
        </div>
      )}
      <div>
        <DispersionText text={current.value} isVisible={isVisible} charDelay={45} duration={2000}
          style={{ fontSize: 18, fontWeight: 400, color: '#222', fontFamily: 'Georgia, serif', ...valueStyle }} />
      </div>
      {current.sublabel && (
        <div style={{ marginTop: 4 }}>
          <DispersionText text={current.sublabel} isVisible={isVisible} charDelay={40} duration={1600}
            style={{ fontSize: 11, color: '#666', fontStyle: 'italic', fontFamily: 'Georgia, serif', ...sublabelStyle }} />
        </div>
      )}
    </div>
  );
}

// Get personalized greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

// Play notification sound
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('Could not play notification sound:', e);
  }
}

export function SummaryScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [historicalMoment, setHistoricalMoment] = useState<HistoricalMoment & { imageUrl: string } | null>(null);
  const lastAlertRef = useRef<string | null>(null);

  // Load data
  useEffect(() => { getDailyHabits().then(setHabits); }, []);
  useEffect(() => { getCountdowns().then(setCountdowns); }, []);
  useEffect(() => { getTodos().then(setTodos); }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const unsubHabits = subscribeToHabits(setHabits);
    const unsubTodos = subscribeToTodos(setTodos);
    return () => { unsubHabits?.(); unsubTodos?.(); };
  }, []);

  // Get random historical moment
  useEffect(() => {
    const getRandomMoment = () => {
      const moment = historicalMoments[Math.floor(Math.random() * historicalMoments.length)];
      return { ...moment, imageUrl: getImageUrl(moment.keywords) };
    };
    setHistoricalMoment(getRandomMoment());
    const timer = setInterval(() => setHistoricalMoment(getRandomMoment()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check for urgent todos and play sound
  useEffect(() => {
    const urgentTodo = todos.find(t => {
      if (t.completed || !t.due_date || t.priority !== 'high') return false;
      const hoursUntilDue = differenceInHours(new Date(t.due_date), new Date());
      return hoursUntilDue <= 2 && hoursUntilDue > 0;
    });

    if (urgentTodo && lastAlertRef.current !== urgentTodo.id) {
      lastAlertRef.current = urgentTodo.id;
      playNotificationSound();
    }
  }, [todos]);

  const handleHabitToggle = async (habitId: string) => {
    const updated = await toggleHabit(habitId, habits);
    setHabits(updated);
  };

  const handleTodoToggle = async (todoId: string) => {
    await toggleTodo(todoId);
    const updated = await getTodos();
    setTodos(updated);
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

  // Build data items
  const weatherItems = useMemo(() => {
    if (!weather) return [];
    const condition = weatherCodeToDescription[weather.weatherCode] || 'Clear';
    const items = [{ label: 'Now', value: `${Math.round(weather.temperature)}° ${condition}` }];
    if (forecast[0]) items.push({ label: 'Today', value: `High ${forecast[0].tempMax}° / Low ${forecast[0].tempMin}°` });
    if (forecast[1]) items.push({ label: forecast[1].date.toLocaleDateString('en-US', { weekday: 'short' }), value: `${forecast[1].tempMax}° / ${forecast[1].tempMin}°` });
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
    const shuffled = [...proverbs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8).map(p => ({ value: `"${p.meaning}"`, sublabel: p.romaji }));
  }, []);

  // Calendar items for today and tomorrow
  const calendarItems = useMemo(() => {
    const now = new Date();
    const relevantEvents = events.filter(e => {
      const eventDate = e.start;
      return isToday(eventDate) || isTomorrow(eventDate);
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    return relevantEvents.slice(0, 6).map(e => {
      const dayLabel = isToday(e.start) ? 'Today' : 'Tomorrow';
      const timeStr = e.allDay ? 'All Day' : format(e.start, 'h:mm a');
      return { label: `${dayLabel} · ${timeStr}`, value: e.title.length > 28 ? e.title.slice(0, 28) + '...' : e.title };
    });
  }, [events]);

  // Countdown items
  const countdownItems = useMemo(() => {
    const upcoming = countdowns
      .filter(c => new Date(c.target_date).getTime() > Date.now())
      .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime());
    return upcoming.slice(0, 4).map(c => {
      const days = differenceInDays(new Date(c.target_date), new Date());
      return { label: 'Countdown', value: `${days} day${days !== 1 ? 's' : ''}`, sublabel: `until ${c.title}` };
    });
  }, [countdowns]);

  // Todos - prioritized
  const todoItems = useMemo(() => {
    const incomplete = todos.filter(t => !t.completed).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      return 0;
    });
    return incomplete.slice(0, 5);
  }, [todos]);

  const dateStr = format(currentTime, 'EEEE, MMMM d, yyyy');
  const timeStr = format(currentTime, 'h:mm a');
  const greeting = getGreeting();

  // Check if there are urgent items
  const hasUrgentTodos = todos.some(t => !t.completed && t.priority === 'high' && t.due_date && differenceInHours(new Date(t.due_date), new Date()) <= 24);

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
      <div style={{ padding: '20px 32px 14px', borderBottom: '3px double #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #ccc' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{dateStr}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{timeStr}</span>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: '#000' }}>The Daily Briefing</h1>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888' }}>Your personal command center</div>
      </div>

      {/* Personalized Greeting */}
      <div style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #f5f4f0 0%, #eae9e4 100%)', borderBottom: '1px solid #ddd' }}>
        <h2 style={{ fontSize: 24, fontWeight: 400, margin: 0, color: '#222' }}>
          {greeting}, <span style={{ fontWeight: 600 }}>Chris</span>
        </h2>
        {hasUrgentTodos && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: '#c44' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>You have urgent tasks requiring attention</span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', overflow: 'visible', minHeight: 'min-content' }}>

        {/* Left Column */}
        <div style={{ borderRight: '1px solid #ddd', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Todos Section */}
          {todoItems.length > 0 && (
            <Section title="Tasks">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {todoItems.map((todo) => {
                  const isOverdue = todo.due_date && isPast(new Date(todo.due_date));
                  const isUrgent = todo.priority === 'high';
                  return (
                    <div key={todo.id} onClick={() => handleTodoToggle(todo.id)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: isOverdue ? '#fff5f5' : isUrgent ? '#fff8f0' : '#fafafa', border: `1px solid ${isOverdue ? '#ffdddd' : isUrgent ? '#ffe4c4' : '#eee'}`, borderRadius: 4, cursor: 'pointer' }}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isOverdue ? '#c44' : isUrgent ? '#e88' : '#ccc'}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#333', fontFamily: 'Georgia, serif' }}>{todo.title}</div>
                        {todo.due_date && (
                          <div style={{ fontSize: 9, color: isOverdue ? '#c44' : '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} />
                            {isOverdue ? 'Overdue' : format(new Date(todo.due_date), 'MMM d, h:mm a')}
                          </div>
                        )}
                      </div>
                      {isUrgent && <AlertTriangle size={12} color="#e88" />}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Weather */}
          <Section title="Weather">
            <MagicSpot items={weatherItems} cycleTime={15000} startDelay={0} valueStyle={{ fontSize: 20, fontWeight: 300 }} />
          </Section>

          {/* Markets */}
          <Section title="Markets">
            <MagicSpot items={cryptoItems} cycleTime={10000} startDelay={4000} valueStyle={{ fontSize: 18, fontWeight: 300 }} />
          </Section>
        </div>

        {/* Center Column */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Calendar */}
          {calendarItems.length > 0 && (
            <Section title="Schedule">
              <MagicSpot items={calendarItems} cycleTime={8000} startDelay={2000} labelStyle={{ fontSize: 10, color: '#666' }} valueStyle={{ fontSize: 15 }} />
            </Section>
          )}

          {/* Countdown */}
          {countdownItems.length > 0 && (
            <Section title="Countdown">
              <MagicSpot items={countdownItems} cycleTime={12000} startDelay={6000} valueStyle={{ fontSize: 22, fontWeight: 300 }} />
            </Section>
          )}

          {/* Wisdom */}
          <Section title="Wisdom">
            <MagicSpot items={proverbItems} cycleTime={18000} startDelay={3000} valueStyle={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5, fontStyle: 'italic' }} sublabelStyle={{ fontSize: 10, color: '#999' }} />
          </Section>

          {/* Historical Moment */}
          {historicalMoment && (
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #ddd' }}>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>This Day in History</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <img src={historicalMoment.imageUrl} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, opacity: 0.9 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{historicalMoment.title}</div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{historicalMoment.year}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ borderLeft: '1px solid #ddd', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Daily Habits */}
          <Section title="Daily Habits">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {habits.map((habit) => (
                <div key={habit.id} onClick={() => handleHabitToggle(habit.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: habit.completed ? '#f0f5f0' : '#fafafa', border: habit.completed ? '1px solid #c4d4c4' : '1px solid #eee', borderRadius: 4, cursor: 'pointer' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: habit.completed ? '2px solid #5a8a5a' : '2px solid #ccc', background: habit.completed ? '#5a8a5a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {habit.completed && <Check size={10} color="#fff" strokeWidth={3} />}
                  </div>
                  <span style={{ color: habit.completed ? '#5a8a5a' : '#666', flexShrink: 0 }}>{getHabitIcon(habit.icon)}</span>
                  <span style={{ flex: 1, fontSize: 11, color: habit.completed ? '#888' : '#333', textDecoration: habit.completed ? 'line-through' : 'none' }}>{habit.name}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Completed Todos */}
          {todos.filter(t => t.completed).length > 0 && (
            <Section title="Completed">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {todos.filter(t => t.completed).slice(0, 3).map((todo) => (
                  <div key={todo.id} style={{ fontSize: 11, color: '#888', textDecoration: 'line-through', padding: '4px 0' }}>
                    {todo.title}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Quick Stats */}
          <div style={{ marginTop: 'auto', padding: '12px', background: '#f5f4f0', borderRadius: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 300, color: '#222' }}>{habits.filter(h => h.completed).length}/{habits.length}</div>
                <div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Habits</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 300, color: '#222' }}>{todos.filter(t => !t.completed).length}</div>
                <div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tasks</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 10px 0', paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block', color: '#000' }}>{title}</h3>
      {children}
    </div>
  );
}
