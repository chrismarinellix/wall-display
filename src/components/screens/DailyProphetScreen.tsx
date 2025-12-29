import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Dumbbell, Bike, Beef, Salad, Droplet, Moon, Check, AlertTriangle, Clock, Brain, Target, Volume2, VolumeX, Play, Pause as PauseIcon } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { weatherCodeToDescription } from '../../types/weather';
import { getDailyHabits, toggleHabit, subscribeToHabits, DailyHabit, getCountdowns, CountdownEvent, getTodos, toggleTodo, TodoItem, subscribeToTodos, getPomodoroHistory, PomodoroHistory } from '../../services/supabase';
import { generateNewspaperArticles, NewspaperArticles, NewspaperData } from '../../services/aiService';
import { getVoiceSettings, saveVoiceSettings, generateSpeech, generateBriefingScript, audioPlayer, VoiceSettings } from '../../services/voiceService';
import { proverbs } from '../../data/proverbs';
import { historicalMoments, HistoricalMoment } from '../../data/moments';
import { format, isToday, isTomorrow, differenceInDays, differenceInHours, isPast } from 'date-fns';

// API keys from env
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const CUSTOM_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

// Extended image mapping for history
const imageMap: Record<string, string> = {
  'space,astronaut': '1446776811953-b23d57bd21aa',
  'moon,space': '1522030299830-16b8d3d049fe',
  'earth,space': '1614730321146-b6fa6a46bcb4',
  'mars,space': '1614728894747-a83421e2b9c9',
  'telescope,stars': '1462331940025-496dfbfc7564',
  'medicine,science': '1532187863486-abf9dbad1b69',
  'dna,science': '1607619056574-7b8d3ee536b2',
  'technology,innovation': '1518770660439-4636190af475',
  'history,war': '1569163139394-de4e4f43e4e3',
  'ocean,ship': '1507003211169-0a1dd7228f2d',
  'mountain,nature': '1464822759023-fed622ff2c3b',
  'city,architecture': '1449824913935-59a10b8d2000',
};

function getImageUrl(keywords: string): string {
  const id = imageMap[keywords] || '1419242902214-272b3f66ee7a';
  return `https://images.unsplash.com/photo-${id}?w=1200&q=85`;
}

// Ephemeral text - appears and dissolves like sand mandala
function EphemeralText({
  text,
  phase, // 'forming' | 'present' | 'fading' | 'gone'
  style = {},
  charDelay = 30,
  formDuration = 800,
  fadeDuration = 1200,
  overlapFade = false, // Start fading before fully formed
}: {
  text: string;
  phase: 'forming' | 'present' | 'fading' | 'gone';
  style?: React.CSSProperties;
  charDelay?: number;
  formDuration?: number;
  fadeDuration?: number;
  overlapFade?: boolean;
}) {
  const offsets = useMemo(() =>
    text.split('').map(() => ({
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 10 + 5,
      r: (Math.random() - 0.5) * 8,
      fadeDelay: Math.random() * 0.5, // Random fade delay for dissolve effect
    })), [text]
  );

  if (phase === 'gone') return null;

  return (
    <span style={{ display: 'inline', ...style }}>
      {text.split('').map((char, i) => {
        const totalFormTime = i * charDelay + formDuration;
        const charProgress = i / text.length;

        // For overlap mode, characters start fading based on their position
        const shouldFade = phase === 'fading' || (overlapFade && phase === 'forming' && charProgress < 0.3);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              animation: shouldFade
                ? `sandDissolve ${fadeDuration}ms cubic-bezier(0.55, 0.085, 0.68, 0.53) ${offsets[i].fadeDelay * 500}ms forwards`
                : phase === 'forming' || phase === 'present'
                  ? `inkForm ${formDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * charDelay}ms forwards`
                  : 'none',
              opacity: phase === 'forming' ? 0 : shouldFade ? 1 : 1,
              whiteSpace: char === ' ' ? 'pre' : 'normal',
              ['--tx' as string]: `${offsets[i].x}px`,
              ['--ty' as string]: `${offsets[i].y}px`,
              ['--tr' as string]: `${offsets[i].r}deg`,
              ['--scatter' as string]: `${(Math.random() - 0.5) * 40}px`,
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
}

// Article component with ephemeral lifecycle - SLOW and contemplative
function Article({
  headline,
  body,
  byline,
  cycleTime = 45000, // Much slower - 45 seconds per cycle
  startDelay = 0,
  headlineStyle = {},
  bodyStyle = {},
  onCycle,
}: {
  headline: string;
  body: string;
  byline?: string;
  cycleTime?: number;
  startDelay?: number;
  headlineStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  onCycle?: () => void;
}) {
  const [phase, setPhase] = useState<'forming' | 'present' | 'fading' | 'gone'>('gone');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true);
      setPhase('forming');
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;

    const formTime = 5000; // 5 seconds to form (was 3)
    const presentTime = cycleTime - 12000; // Longer presence
    const fadeTime = 7000; // 7 seconds to fade (was 3)

    // Phase transitions
    const presentTimer = setTimeout(() => setPhase('present'), formTime);
    const fadeTimer = setTimeout(() => setPhase('fading'), formTime + presentTime);
    const goneTimer = setTimeout(() => {
      setPhase('gone');
      setTimeout(() => {
        onCycle?.();
        setPhase('forming');
      }, 500);
    }, formTime + presentTime + fadeTime);

    return () => {
      clearTimeout(presentTimer);
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, [started, cycleTime, onCycle]);

  if (phase === 'gone' && !started) return <div style={{ minHeight: 80 }} />;

  return (
    <div style={{ minHeight: 80 }}>
      <div style={{ marginBottom: 8 }}>
        <EphemeralText
          text={headline}
          phase={phase}
          charDelay={40} // Slower character reveal
          formDuration={1200} // Slower form
          fadeDuration={2000} // Much slower fade
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#1a1a1a',
            fontFamily: '"Playfair Display", Georgia, serif',
            lineHeight: 1.3,
            ...headlineStyle,
          }}
        />
      </div>
      <div>
        <EphemeralText
          text={body}
          phase={phase}
          charDelay={25} // Slower
          formDuration={1000}
          fadeDuration={2500} // Much slower dissolve
          overlapFade={phase === 'fading'}
          style={{
            fontSize: 13,
            color: '#333',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
            ...bodyStyle,
          }}
        />
      </div>
      {byline && phase !== 'gone' && (
        <div style={{ marginTop: 6, opacity: phase === 'fading' ? 0.3 : 0.6, transition: 'opacity 2s' }}>
          <span style={{ fontSize: 10, fontStyle: 'italic', color: '#666' }}>{byline}</span>
        </div>
      )}
    </div>
  );
}

// Prophet-style animated habit with cycling strikethrough
function AnimatedHabit({
  habit,
  onToggle,
  animationDelay = 0,
  showStrikeAnimation = false,
}: {
  habit: DailyHabit;
  onToggle: () => void;
  animationDelay?: number;
  showStrikeAnimation?: boolean;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [strikePhase, setStrikePhase] = useState<'none' | 'striking' | 'struck' | 'unstriking'>('none');
  const prevCompleted = useRef(habit.completed);

  // Handle completion toggle animation
  useEffect(() => {
    if (prevCompleted.current !== habit.completed) {
      setIsAnimating(true);
      setStrikePhase(habit.completed ? 'striking' : 'unstriking');
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setStrikePhase(habit.completed ? 'struck' : 'none');
      }, 1200);
      prevCompleted.current = habit.completed;
      return () => clearTimeout(timer);
    }
  }, [habit.completed]);

  // Periodic strikethrough re-animation for completed habits (Prophet magic)
  useEffect(() => {
    if (!habit.completed || !showStrikeAnimation) return;

    // Re-animate strikethrough periodically
    const reAnimate = () => {
      setStrikePhase('unstriking');
      setTimeout(() => {
        setStrikePhase('striking');
        setTimeout(() => setStrikePhase('struck'), 1500);
      }, 800);
    };

    const timer = setInterval(reAnimate, 15000 + Math.random() * 10000); // Random 15-25s
    return () => clearInterval(timer);
  }, [habit.completed, showStrikeAnimation]);

  const getIcon = () => {
    const iconProps = { size: 14, strokeWidth: 1.5, color: '#444' };
    switch (habit.icon) {
      case 'dumbbell': return <Dumbbell {...iconProps} />;
      case 'bike': return <Bike {...iconProps} />;
      case 'beef': return <Beef {...iconProps} />;
      case 'salad': return <Salad {...iconProps} />;
      case 'droplet': return <Droplet {...iconProps} />;
      case 'moon': return <Moon {...iconProps} />;
      default: return <Check {...iconProps} />;
    }
  };

  // B&W Prophet styling
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: habit.completed ? 'rgba(0,0,0,0.03)' : 'transparent',
        border: '1px solid #ddd',
        borderRadius: 0, // Sharp corners for newspaper feel
        cursor: 'pointer',
        animation: isAnimating ? 'prophetPulse 1.2s ease' : `prophetSlideIn 0.8s ease ${animationDelay}ms both`,
        transition: 'all 0.4s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Checkbox - B&W style */}
      <div style={{
        width: 16,
        height: 16,
        border: `2px solid ${habit.completed ? '#222' : '#999'}`,
        background: habit.completed ? '#222' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.4s ease',
        flexShrink: 0,
      }}>
        {habit.completed && <Check size={10} color="#fff" strokeWidth={3} />}
      </div>

      {/* Icon */}
      <span style={{ opacity: habit.completed ? 0.5 : 0.8, transition: 'opacity 0.4s' }}>
        {getIcon()}
      </span>

      {/* Habit name with animated strikethrough */}
      <span style={{
        flex: 1,
        fontSize: 13,
        color: habit.completed ? '#666' : '#222',
        fontFamily: '"Playfair Display", Georgia, serif',
        fontWeight: 500,
        letterSpacing: '0.02em',
        position: 'relative',
        transition: 'color 0.4s ease',
      }}>
        {habit.name}
        {/* Animated strikethrough line */}
        {habit.completed && (
          <span style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            height: '1.5px',
            background: '#444',
            width: strikePhase === 'striking' || strikePhase === 'struck' ? '100%' : '0%',
            transition: strikePhase === 'striking' ? 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)' :
                       strikePhase === 'unstriking' ? 'width 0.6s ease-out' : 'none',
            transformOrigin: 'left',
          }} />
        )}
      </span>
    </div>
  );
}

// Get today's date key
function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export function DailyProphetScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroHistory>({});
  const [historicalMoment, setHistoricalMoment] = useState<HistoricalMoment | null>(null);
  const [currentProverb, setCurrentProverb] = useState(proverbs[0]);
  const [articles, setArticles] = useState<NewspaperArticles | null>(null);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const lastAlertRef = useRef<string | null>(null);
  const articleRefreshRef = useRef<number>(0);

  // Load data
  useEffect(() => { getDailyHabits().then(setHabits); }, []);
  useEffect(() => { getCountdowns().then(setCountdowns); }, []);
  useEffect(() => { getTodos().then(setTodos); }, []);
  useEffect(() => { getPomodoroHistory().then(setPomodoroHistory); }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    const unsubHabits = subscribeToHabits(setHabits);
    const unsubTodos = subscribeToTodos(setTodos);
    return () => { unsubHabits?.(); unsubTodos?.(); };
  }, []);

  // Rotate historical moments
  useEffect(() => {
    const getMoment = () => historicalMoments[Math.floor(Math.random() * historicalMoments.length)];
    setHistoricalMoment(getMoment());
    const timer = setInterval(() => setHistoricalMoment(getMoment()), 120000); // 2 min
    return () => clearInterval(timer);
  }, []);

  // Rotate proverbs
  useEffect(() => {
    const getProverb = () => proverbs[Math.floor(Math.random() * proverbs.length)];
    setCurrentProverb(getProverb());
    const timer = setInterval(() => setCurrentProverb(getProverb()), 90000); // 90 sec
    return () => clearInterval(timer);
  }, []);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Hooks for weather/calendar/stocks
  const { current: weather, forecast } = useWeather();
  const { events } = useCalendar();
  const { crypto } = useStocks();

  // Pomodoro stats
  const pomodoroStats = useMemo(() => {
    const todayKey = getTodayKey();
    const todayData = pomodoroHistory[todayKey] || { count: 0, minutes: 0 };
    const dailyGoal = 8;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (pomodoroHistory[key]?.count > 0) streak++;
      else if (i > 0) break;
    }
    return { todayCount: todayData.count, todayMinutes: todayData.minutes, dailyGoal, goalProgress: Math.min(100, (todayData.count / dailyGoal) * 100), streak };
  }, [pomodoroHistory]);

  // Generate AI articles
  const generateArticles = useCallback(async () => {
    if (!GROQ_API_KEY) {
      console.log('No Groq API key, using fallback articles');
      return;
    }

    setIsLoadingArticles(true);
    const data: NewspaperData = {
      weather: weather ? {
        temperature: Math.round(weather.temperature),
        condition: weatherCodeToDescription[weather.weatherCode] || 'Clear',
        humidity: weather.humidity,
        forecast: forecast.slice(0, 3).map(f => ({
          date: f.date.toLocaleDateString('en-US', { weekday: 'short' }),
          tempMax: f.tempMax,
          tempMin: f.tempMin,
          condition: weatherCodeToDescription[f.weatherCode] || 'Clear',
        })),
      } : undefined,
      calendar: events.filter(e => isToday(e.start) || isTomorrow(e.start)).slice(0, 5).map(e => ({
        title: e.title,
        time: e.allDay ? 'All Day' : format(e.start, 'h:mm a'),
        isAllDay: e.allDay,
        isToday: isToday(e.start),
      })),
      todos: todos.filter(t => !t.completed).slice(0, 5).map(t => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.due_date,
        isOverdue: t.due_date ? isPast(new Date(t.due_date)) : false,
      })),
      habits: habits.map(h => ({ name: h.name, completed: h.completed })),
      pomodoro: pomodoroStats,
      crypto: crypto.slice(0, 3).map(c => ({
        name: c.name,
        symbol: c.symbol,
        price: c.price,
        change24h: c.change24h,
      })),
      historicalMoment: historicalMoment ? {
        title: historicalMoment.title,
        year: historicalMoment.year,
        description: historicalMoment.description,
      } : undefined,
      countdown: countdowns[0] ? {
        title: countdowns[0].title,
        daysUntil: differenceInDays(new Date(countdowns[0].target_date), new Date()),
      } : undefined,
      proverb: currentProverb,
      userName: 'Chris',
    };

    try {
      const newArticles = await generateNewspaperArticles(data, GROQ_API_KEY);
      setArticles(newArticles);
    } catch (error) {
      console.error('Failed to generate articles:', error);
    } finally {
      setIsLoadingArticles(false);
    }
  }, [weather, forecast, events, todos, habits, pomodoroStats, crypto, historicalMoment, countdowns, currentProverb]);

  // Generate articles on mount and periodically
  useEffect(() => {
    generateArticles();
    const timer = setInterval(() => {
      articleRefreshRef.current++;
      generateArticles();
    }, 600000); // Refresh every 10 minutes
    return () => clearInterval(timer);
  }, [generateArticles]);

  // Handle habit toggle
  const handleHabitToggle = async (habitId: string) => {
    const updated = await toggleHabit(habitId, habits);
    setHabits(updated);
  };

  // Handle todo toggle
  const handleTodoToggle = async (todoId: string) => {
    await toggleTodo(todoId);
    const updated = await getTodos();
    setTodos(updated);
  };

  const dateStr = format(currentTime, 'EEEE, MMMM d, yyyy');
  const timeStr = format(currentTime, 'h:mm a');
  const incompleteTodos = todos.filter(t => !t.completed).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
    return 0;
  });

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #f8f6f0 0%, #f0ede4 100%)',
      overflow: 'auto',
      fontFamily: 'Georgia, "Times New Roman", serif',
    }}>
      <style>{`
        @keyframes inkForm {
          0% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(0.8); filter: blur(3px); }
          40% { opacity: 0.5; filter: blur(2px); }
          70% { opacity: 0.85; filter: blur(0.5px); }
          100% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); filter: blur(0); }
        }
        @keyframes sandDissolve {
          0% { opacity: 1; transform: translate(0, 0) rotate(0deg); filter: blur(0); }
          20% { opacity: 0.8; filter: blur(0.5px); }
          50% { opacity: 0.4; filter: blur(1px); }
          100% { opacity: 0; transform: translate(var(--scatter), calc(var(--ty) * 3)) rotate(calc(var(--tr) * 4)); filter: blur(6px); }
        }
        @keyframes prophetPulse {
          0%, 100% { transform: scale(1); background: rgba(0,0,0,0.03); }
          50% { transform: scale(1.02); background: rgba(0,0,0,0.08); box-shadow: 0 0 15px rgba(0, 0, 0, 0.1); }
        }
        @keyframes prophetSlideIn {
          0% { opacity: 0; transform: translateX(-20px); }
          60% { opacity: 0.7; }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes habitReorder {
          0% { transform: translateY(0); opacity: 1; }
          30% { transform: translateY(-5px); opacity: 0.7; }
          60% { transform: translateY(5px); opacity: 0.7; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      {/* Masthead */}
      <div style={{ padding: '16px 24px 12px', borderBottom: '3px double #000', background: 'rgba(255,255,255,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #ddd' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{dateStr}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{timeStr}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, color: '#000', fontFamily: '"Playfair Display", Georgia, serif' }}>
            The Daily Prophet
          </h1>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#888', marginTop: 4 }}>
            All the news that matters, magically curated for you
          </div>
        </div>
      </div>

      {/* Main Headline */}
      {articles && (
        <div style={{ padding: '16px 24px', borderBottom: '2px solid #000', background: 'rgba(255,255,255,0.3)' }}>
          <EphemeralText
            text={articles.headline}
            phase="present"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#000',
              fontFamily: '"Playfair Display", Georgia, serif',
              lineHeight: 1.2,
              display: 'block',
              textAlign: 'center',
            }}
          />
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <EphemeralText
              text={articles.greeting}
              phase="present"
              charDelay={20}
              style={{ fontSize: 14, color: '#444', fontStyle: 'italic' }}
            />
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 0 }}>

        {/* Left Column */}
        <div style={{ borderRight: '1px solid #ddd', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Weather Article */}
          {articles?.weatherArticle && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>Weather Report</div>
              <Article
                headline={articles.weatherArticle.headline}
                body={articles.weatherArticle.body}
                byline={articles.weatherArticle.advice}
                cycleTime={90000} // 90 seconds - much slower
                startDelay={2000}
              />
            </div>
          )}

          {/* Markets Article */}
          {articles?.marketsArticle && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>Financial Markets</div>
              <Article
                headline={articles.marketsArticle.headline}
                body={articles.marketsArticle.body}
                cycleTime={75000} // 75 seconds
                startDelay={15000} // Starts much later
              />
            </div>
          )}

          {/* Wisdom Corner */}
          {articles?.wisdomCorner && (
            <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, color: '#666' }}>Ancient Wisdom</div>
              <EphemeralText
                text={articles.wisdomCorner}
                phase="present"
                charDelay={30}
                style={{ fontSize: 12, fontStyle: 'italic', color: '#555', lineHeight: 1.5 }}
              />
            </div>
          )}
        </div>

        {/* Center Column - Hero */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* History Feature - Large */}
          {historicalMoment && (
            <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <img
                src={getImageUrl(historicalMoment.keywords)}
                alt=""
                style={{ width: '100%', height: 180, objectFit: 'cover', filter: 'grayscale(1) contrast(1.1)', opacity: 0.9 }}
              />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, color: '#888' }}>This Day in History</div>
                {articles?.historyArticle ? (
                  <Article
                    headline={articles.historyArticle.headline}
                    body={articles.historyArticle.body}
                    cycleTime={120000} // 2 minutes - history deserves time
                    startDelay={5000}
                    headlineStyle={{ fontSize: 18 }}
                    bodyStyle={{ fontSize: 13, lineHeight: 1.7 }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 6, fontFamily: '"Playfair Display", Georgia, serif' }}>
                      {historicalMoment.year}: {historicalMoment.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                      {historicalMoment.description}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Day Article */}
          {articles?.dayArticle && (
            <div style={{ padding: '14px', background: 'rgba(0,0,0,0.02)', border: '1px solid #ddd' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>Today's Agenda</div>
              <Article
                headline={articles.dayArticle.headline}
                body={articles.dayArticle.body}
                cycleTime={100000} // 100 seconds
                startDelay={8000}
              />
            </div>
          )}

          {/* Closing Thought */}
          {articles?.closingThought && (
            <div style={{ marginTop: 'auto', textAlign: 'center', padding: '12px 0', borderTop: '1px solid #ddd' }}>
              <EphemeralText
                text={articles.closingThought}
                phase="present"
                charDelay={40}
                style={{ fontSize: 13, fontStyle: 'italic', color: '#666' }}
              />
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ borderLeft: '1px solid #ddd', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tasks */}
          {incompleteTodos.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>
                Tasks ({incompleteTodos.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {incompleteTodos.slice(0, 4).map((todo, i) => {
                  const isOverdue = todo.due_date && isPast(new Date(todo.due_date));
                  const isUrgent = todo.priority === 'high';
                  return (
                    <div
                      key={todo.id}
                      onClick={() => handleTodoToggle(todo.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        padding: '8px 10px',
                        background: isOverdue ? '#fff5f5' : isUrgent ? '#fff8f0' : '#fafafa',
                        border: `1px solid ${isOverdue ? '#ffdddd' : isUrgent ? '#ffe4c4' : '#eee'}`,
                        borderRadius: 4,
                        cursor: 'pointer',
                        animation: `fadeSlideIn 0.4s ease ${i * 100}ms both`,
                      }}
                    >
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${isOverdue ? '#c44' : isUrgent ? '#e88' : '#ccc'}`, background: '#fff', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: '#333' }}>{todo.title}</div>
                        {todo.due_date && (
                          <div style={{ fontSize: 9, color: isOverdue ? '#c44' : '#888', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={9} />
                            {isOverdue ? 'Overdue' : format(new Date(todo.due_date), 'MMM d')}
                          </div>
                        )}
                      </div>
                      {isUrgent && <AlertTriangle size={12} color="#e88" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Habits */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>
              Daily Rituals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {habits.map((habit, i) => (
                <AnimatedHabit
                  key={habit.id}
                  habit={habit}
                  onToggle={() => handleHabitToggle(habit.id)}
                  animationDelay={i * 80}
                />
              ))}
            </div>
          </div>

          {/* Focus Stats */}
          <div style={{ padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Brain size={14} color="#666" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666' }}>Focus</span>
              {pomodoroStats.streak > 1 && (
                <span style={{ fontSize: 9, color: '#888', marginLeft: 'auto' }}>
                  {pomodoroStats.streak} day streak
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 300, color: '#222' }}>{pomodoroStats.todayCount}</span>
              <span style={{ fontSize: 11, color: '#888' }}>/ {pomodoroStats.dailyGoal} pomodoros</span>
            </div>
            <div style={{ width: '100%', height: 3, background: '#e5e5e5', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
              <div style={{ width: `${pomodoroStats.goalProgress}%`, height: '100%', background: pomodoroStats.goalProgress >= 100 ? '#5a8a5a' : '#666', transition: 'width 0.3s' }} />
            </div>
            {articles?.productivityNote && (
              <div style={{ marginTop: 8 }}>
                <EphemeralText
                  text={articles.productivityNote}
                  phase="present"
                  charDelay={25}
                  style={{ fontSize: 10, color: '#666', fontStyle: 'italic' }}
                />
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#222' }}>{habits.filter(h => h.completed).length}/{habits.length}</div>
              <div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Habits</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#222' }}>{incompleteTodos.length}</div>
              <div style={{ fontSize: 9, color: '#888', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tasks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
