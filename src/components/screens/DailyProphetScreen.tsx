import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Bike, Beef, Salad, Droplet, Moon, Check, AlertTriangle, Clock, Brain, Volume2, VolumeX } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useCalendar } from '../../hooks/useCalendar';
import { useStocks } from '../../hooks/useStocks';
import { useSettings } from '../../contexts/SettingsContext';
import { weatherCodeToDescription } from '../../types/weather';
import { getDailyHabits, toggleHabit, subscribeToHabits, DailyHabit, getCountdowns, CountdownEvent, getTodos, toggleTodo, TodoItem, subscribeToTodos, getPomodoroHistory, PomodoroHistory, getHabitHistory } from '../../services/supabase';
import { generateNewspaperArticles, NewspaperArticles, NewspaperData } from '../../services/aiService';
import { getVoiceSettings, saveVoiceSettings, generateSpeech, generateBriefingScript, audioPlayer, VoiceSettings } from '../../services/voiceService';
import { proverbs } from '../../data/proverbs';
import { historicalMoments, HistoricalMoment } from '../../data/moments';
import { format, isToday, isTomorrow, differenceInDays, differenceInHours, isPast } from 'date-fns';

// API keys from env
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const CUSTOM_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID;

// Extended image mapping for history - keywords from moments.ts
const imageMap: Record<string, string> = {
  // Space exploration
  'space,astronaut': '1446776811953-b23d57bd21aa',
  'moon,space': '1522030299830-16b8d3d049fe',
  'earth,space': '1614730321146-b6fa6a46bcb4',
  'mars,space': '1614728894747-a83421e2b9c9',
  'mars,rover': '1614728894747-a83421e2b9c9',
  'mars,helicopter': '1614728894747-a83421e2b9c9',
  'telescope,stars': '1462331940025-496dfbfc7564',
  'telescope,galaxy': '1462331940025-496dfbfc7564',
  'space,station': '1446776811953-b23d57bd21aa',
  'space,stars': '1462331940025-496dfbfc7564',
  'shuttle,space': '1457364887197-9e4d43c9a91d',
  'rocket,space': '1457364887197-9e4d43c9a91d',
  'moon,rocket': '1522030299830-16b8d3d049fe',
  'pluto,space': '1462331940025-496dfbfc7564',
  'blackhole,space': '1462331940025-496dfbfc7564',
  'waves,space': '1462331940025-496dfbfc7564',
  // Science & medicine
  'medicine,science': '1532187863486-abf9dbad1b69',
  'medicine,victory': '1532187863486-abf9dbad1b69',
  'dna,science': '1607619056574-7b8d3ee536b2',
  'dna,genome': '1607619056574-7b8d3ee536b2',
  'vaccine,medicine': '1532187863486-abf9dbad1b69',
  'heart,medicine': '1532187863486-abf9dbad1b69',
  'baby,science': '1532187863486-abf9dbad1b69',
  'sheep,science': '1607619056574-7b8d3ee536b2',
  'particle,physics': '1507413245164-6160d8298b31',
  'protein,ai': '1607619056574-7b8d3ee536b2',
  // Technology
  'technology,innovation': '1518770660439-4636190af475',
  'internet,technology': '1518770660439-4636190af475',
  'computer,technology': '1518770660439-4636190af475',
  'phone,technology': '1518770660439-4636190af475',
  'radio,invention': '1518770660439-4636190af475',
  'flight,aviation': '1436491865332-7a61a109cc05',
  'plane,aviation': '1436491865332-7a61a109cc05',
  'train,locomotive': '1474487548417-781cb71495f3',
  'automobile,invention': '1474487548417-781cb71495f3',
  // Civil rights & social
  'freedom,justice': '1569163139394-de4e4f43e4e3',
  'vote,women': '1569163139394-de4e4f43e4e3',
  'vote,rights': '1569163139394-de4e4f43e4e3',
  'vote,freedom': '1569163139394-de4e4f43e4e3',
  'rights,peace': '1569163139394-de4e4f43e4e3',
  'rights,justice': '1569163139394-de4e4f43e4e3',
  'school,justice': '1569163139394-de4e4f43e4e3',
  'bus,rights': '1569163139394-de4e4f43e4e3',
  'speech,dream': '1569163139394-de4e4f43e4e3',
  'pride,rights': '1569163139394-de4e4f43e4e3',
  'sports,equality': '1569163139394-de4e4f43e4e3',
  'accessibility,rights': '1569163139394-de4e4f43e4e3',
  'freedom,mandela': '1569163139394-de4e4f43e4e3',
  'marriage,love': '1569163139394-de4e4f43e4e3',
  // History & war
  'history,war': '1569163139394-de4e4f43e4e3',
  'war,peace': '1569163139394-de4e4f43e4e3',
  'peace,treaty': '1569163139394-de4e4f43e4e3',
  'wall,freedom': '1569163139394-de4e4f43e4e3',
  // Nature & exploration
  'ocean,ship': '1507003211169-0a1dd7228f2d',
  'ship,exploration': '1507003211169-0a1dd7228f2d',
  'mountain,nature': '1464822759023-fed622ff2c3b',
  'nature,conservation': '1464822759023-fed622ff2c3b',
  'everest,mountain': '1464822759023-fed622ff2c3b',
  'pole,exploration': '1464822759023-fed622ff2c3b',
  // Cities & architecture
  'city,architecture': '1449824913935-59a10b8d2000',
  'bridge,engineering': '1449824913935-59a10b8d2000',
  'tower,architecture': '1449824913935-59a10b8d2000',
  'canal,engineering': '1449824913935-59a10b8d2000',
  // Arts & culture
  'art,painting': '1578662996442-48f60103fc96',
  'music,performance': '1514320291840-2e0a9bf2a9ae',
  'film,cinema': '1489599849927-2ee91cede3ba',
  'book,literature': '1481627834876-b7833e8f5570',
  'olympics,sports': '1569163139394-de4e4f43e4e3',
};

// Weather condition to atmospheric image mapping
const weatherImageMap: Record<string, string> = {
  'clear': '1501630834273-4b5604d2ee31', // Bright sunny sky
  'sunny': '1501630834273-4b5604d2ee31',
  'clouds': '1534088568595-a066f410bcda', // Cloudy atmospheric
  'cloudy': '1534088568595-a066f410bcda',
  'overcast': '1499956827185-0d63ee78a910', // Gray overcast
  'rain': '1515694346937-94d85e41e6f0', // Rain on window
  'drizzle': '1515694346937-94d85e41e6f0',
  'storm': '1605727216801-e27a8ae9f22e', // Lightning storm
  'thunder': '1605727216801-e27a8ae9f22e',
  'snow': '1491002052546-bf38f186af56', // Snowy scene
  'fog': '1485236715568-ddc5ee6ca227', // Misty foggy
  'mist': '1485236715568-ddc5ee6ca227',
  'wind': '1506905925346-21bda4d32df4', // Windy trees
  'default': '1504608524841-42fe6f032b4b', // Atmospheric sky
};

function getImageUrl(keywords: string): string {
  const id = imageMap[keywords] || '1419242902214-272b3f66ee7a';
  return `https://images.unsplash.com/photo-${id}?w=1200&q=85`;
}

function getWeatherImageUrl(condition: string): string {
  const lowerCondition = condition.toLowerCase();
  // Find matching weather condition
  for (const [key, id] of Object.entries(weatherImageMap)) {
    if (lowerCondition.includes(key)) {
      return `https://images.unsplash.com/photo-${id}?w=800&q=80`;
    }
  }
  return `https://images.unsplash.com/photo-${weatherImageMap.default}?w=800&q=80`;
}

// Magical Prophet Text - ink materializing on parchment with quill animation
// Professional NY Post meets Hogwarts - clean, fast, magical
// E-ink mode: skip animation entirely and show final text immediately
function MagicalText({
  text,
  style = {},
  revealDuration = 3000,
  variant = 'default', // 'default' | 'headline' | 'subtle'
  einkMode = false,
}: {
  text: string;
  style?: React.CSSProperties;
  revealDuration?: number;
  variant?: 'default' | 'headline' | 'subtle';
  einkMode?: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(einkMode); // Start revealed in e-ink mode
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Generate character timing (each char starts at a different time)
  const charStarts = useMemo(() =>
    text.split('').map((_, i) => (i / text.length) * 0.6),
    [text]
  );

  // Animation loop - skip entirely in e-ink mode
  useEffect(() => {
    if (einkMode) return; // No animation for e-ink

    startTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const p = Math.min(1, elapsed / revealDuration);
      setProgress(p);

      if (p < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRevealed(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [revealDuration, einkMode]);

  // E-ink mode or animation complete: show static text
  if (isRevealed || einkMode) {
    return <span style={{ display: 'inline', ...style }}>{text}</span>;
  }

  return (
    <span style={{ display: 'inline', ...style }}>
      {text.split('').map((char, i) => {
        const charStart = charStarts[i];
        const charProgress = Math.max(0, Math.min(1, (progress - charStart) / 0.4));
        const ease = 1 - Math.pow(1 - charProgress, 3);

        // Different effects based on variant
        let opacity = ease;
        let blur = (1 - ease) * 2;
        let scale = 0.95 + ease * 0.05;
        let yOffset = (1 - ease) * 4;

        if (variant === 'headline') {
          // Clean dramatic for headlines - no rotation to avoid layout issues
          blur = (1 - ease) * 3;
          scale = 0.9 + ease * 0.1;
          yOffset = (1 - ease) * 8;
        } else if (variant === 'subtle') {
          blur = (1 - ease) * 1;
          yOffset = (1 - ease) * 2;
        }

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity,
              transform: ease < 1 ? `translateY(${yOffset}px) scale(${scale})` : 'none',
              filter: blur > 0.1 ? `blur(${blur}px)` : 'none',
              transition: 'none',
              whiteSpace: char === ' ' ? 'pre' : 'normal',
              willChange: ease < 1 ? 'transform, opacity, filter' : 'auto',
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </span>
  );
}

// Simpler static text for non-animated contexts
function StaticText({
  text,
  style = {},
}: {
  text: string;
  style?: React.CSSProperties;
}) {
  return <span style={style}>{text}</span>;
}

// Article component with magical fog reveal - mesmerizing and impressive
function Article({
  headline,
  body,
  byline,
  startDelay = 0,
  headlineStyle = {},
  bodyStyle = {},
  einkMode = false,
}: {
  headline: string;
  body: string;
  byline?: string;
  startDelay?: number;
  headlineStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  einkMode?: boolean;
}) {
  const [started, setStarted] = useState(einkMode); // Start immediately in e-ink mode
  const [bylineOpacity, setBylineOpacity] = useState(einkMode ? 0.6 : 0);

  useEffect(() => {
    if (einkMode) return; // Skip delay in e-ink mode
    const startTimer = setTimeout(() => {
      setStarted(true);
      setTimeout(() => setBylineOpacity(0.6), 2000);
    }, startDelay);
    return () => clearTimeout(startTimer);
  }, [startDelay, einkMode]);

  if (!started) return <div style={{ minHeight: 80 }} />;

  // Fast reveal - headline in 1.5-3 sec, body in 2-4 sec
  const headlineDuration = Math.max(1500, Math.min(3000, headline.length * 25));
  const bodyDuration = Math.max(2000, Math.min(4000, body.length * 10));

  return (
    <div style={{ minHeight: 80 }}>
      <div style={{ marginBottom: 8 }}>
        <MagicalText
          text={headline}
          revealDuration={headlineDuration}
          einkMode={einkMode}
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
        <MagicalText
          text={body}
          revealDuration={bodyDuration}
          einkMode={einkMode}
          style={{
            fontSize: 13,
            color: '#333',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.6,
            ...bodyStyle,
          }}
        />
      </div>
      {byline && (
        <div style={{ marginTop: 6, opacity: bylineOpacity, transition: einkMode ? 'none' : 'opacity 2s ease' }}>
          <span style={{ fontSize: 10, fontStyle: 'italic', color: '#666' }}>{byline}</span>
        </div>
      )}
    </div>
  );
}

// Habit history grid - shows 14 days of completion status
function HabitHistoryGrid({
  habitHistory,
  onToggleToday,
}: {
  habitHistory: { [date: string]: boolean };
  onToggleToday: () => void;
}) {
  const today = new Date();
  const days: { date: string; completed: boolean | undefined; isToday: boolean }[] = [];

  // Generate 14 days from oldest to newest (left to right)
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      completed: habitHistory[dateStr],
      isToday: i === 0,
    });
  }

  return (
    <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
      {days.map((day) => {
        const isCompleted = day.completed === true;
        const isMissed = day.completed === false;
        const isNoData = day.completed === undefined;

        return (
          <div
            key={day.date}
            onClick={day.isToday ? onToggleToday : undefined}
            title={`${day.date}${isCompleted ? ' ✓' : isMissed ? ' ✗' : ''}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: isCompleted
                ? '#333'  // Dark for completed
                : '#e8e8e8',  // Light gray for missed or no data
              border: day.isToday ? '2px solid #666' : '1px solid #ddd',
              cursor: day.isToday ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              opacity: isNoData && !day.isToday ? 0.4 : 1,
            }}
          />
        );
      })}
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

// Local voice clone API URL (auto-started via launchd)
const VOICE_CLONE_API = 'http://localhost:5123/synthesize';

// Pre-generate voice audio for the briefing
async function preGenerateVoiceAudio(text: string): Promise<string | null> {
  try {
    const response = await fetch(VOICE_CLONE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.log('Voice server not available for pre-generation');
      return null;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.log('Voice pre-generation skipped:', err);
    return null;
  }
}

// Voice Button Component - uses pre-generated audio from local voice clone server
function VoiceButton({
  audioUrl,
  isGenerating,
}: {
  audioUrl: string | null;
  isGenerating: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const playBriefing = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!audioUrl) return;

    const audio = new Audio(audioUrl);

    audio.onended = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setIsPlaying(false);
      audioRef.current = null;
    };

    audioRef.current = audio;
    audio.play();
    setIsPlaying(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const isReady = audioUrl !== null;

  // Show progress indicator while generating
  if (isGenerating) {
    return (
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          fontSize: 10,
          color: '#888',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <div style={{
            width: 12,
            height: 12,
            border: '2px solid #ddd',
            borderTopColor: '#888',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          Generating voice...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show button only when audio is ready
  if (!isReady) return null;

  return (
    <div style={{ marginTop: 16, textAlign: 'center' }}>
      <button
        onClick={playBriefing}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 16px',
          background: isPlaying ? 'rgba(0,0,0,0.08)' : 'transparent',
          border: `1px solid ${isPlaying ? '#666' : '#ccc'}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 11,
          color: isPlaying ? '#333' : '#666',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          transition: 'all 0.2s ease',
        }}
      >
        {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
        {isPlaying ? 'Stop' : 'Listen'}
      </button>
    </div>
  );
}

export function DailyProphetScreen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [habits, setHabits] = useState<DailyHabit[]>([]);
  const [habitHistory, setHabitHistory] = useState<{ [habitId: string]: { [date: string]: boolean } }>({});
  const [countdowns, setCountdowns] = useState<CountdownEvent[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroHistory>({});
  const [historicalMoment, setHistoricalMoment] = useState<HistoricalMoment | null>(null);
  const [currentProverb, setCurrentProverb] = useState(proverbs[0]);
  const [articles, setArticles] = useState<NewspaperArticles | null>(null);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const voiceAudioUrlRef = useRef<string | null>(null);
  const lastAlertRef = useRef<string | null>(null);
  const articleRefreshRef = useRef<number>(0);
  const { settings } = useSettings();
  const einkMode = settings.einkMode;

  // Load data
  useEffect(() => { getDailyHabits().then(setHabits); }, []);
  useEffect(() => { getHabitHistory(14).then(setHabitHistory); }, []);
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

      // Pre-generate voice audio for the headline and greeting
      setIsGeneratingVoice(true);
      // Revoke old audio URL to prevent memory leak
      if (voiceAudioUrlRef.current) {
        URL.revokeObjectURL(voiceAudioUrlRef.current);
      }
      const textToRead = `${newArticles.headline}. ${newArticles.greeting}`;
      const audioUrl = await preGenerateVoiceAudio(textToRead);
      voiceAudioUrlRef.current = audioUrl;
      setVoiceAudioUrl(audioUrl);
      setIsGeneratingVoice(false);
    } catch (error) {
      console.error('Failed to generate articles:', error);
      setIsGeneratingVoice(false);
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
    // Refresh habit history after toggle
    const newHistory = await getHabitHistory(14);
    setHabitHistory(newHistory);
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
      <div style={{ padding: '16px 24px 12px', borderBottom: '1px solid #ccc', background: 'rgba(255,255,255,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #ddd' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{dateStr}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666' }}>{timeStr}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0, color: '#000', fontFamily: '"Playfair Display", Georgia, serif' }}>
            Daily Briefing
          </h1>
          <div style={{ fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#888', marginTop: 4 }}>
            Your personalized morning update
          </div>
        </div>
      </div>

      {/* Main Headline */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #ddd',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(245,240,225,0.3) 100%)',
        minHeight: 100,
      }}>
        {articles ? (
          <>
            {/* Headline */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <MagicalText
                text={articles.headline}
                revealDuration={3000}
                variant="headline"
                einkMode={einkMode}
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#000',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  lineHeight: 1.3,
                }}
              />
            </div>

            {/* Greeting */}
            <div style={{ textAlign: 'center' }}>
              <MagicalText
                text={articles.greeting}
                revealDuration={4000}
                variant="subtle"
                einkMode={einkMode}
                style={{ fontSize: 14, color: '#444', fontStyle: 'italic', lineHeight: 1.6 }}
              />
            </div>

            {/* Voice Playback Button */}
            <VoiceButton audioUrl={voiceAudioUrl} isGenerating={isGeneratingVoice} />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 14, color: '#888', fontStyle: 'italic' }}>
              Preparing your briefing...
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: 0 }}>

        {/* Left Column */}
        <div style={{ borderRight: '1px solid #ddd', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Weather Article */}
          <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>Weather Report</div>
              {articles?.weatherArticle ? (
                <Article
                  headline={articles.weatherArticle.headline}
                  body={articles.weatherArticle.body}
                  byline={articles.weatherArticle.advice}
                  startDelay={einkMode ? 0 : 2000}
                  einkMode={einkMode}
                />
              ) : weather ? (
                <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>
                  Currently {Math.round(weather.temperature)}°C and {weatherCodeToDescription[weather.weatherCode] || 'clear'}.
                  {weather.humidity && ` Humidity at ${weather.humidity}%.`}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#666', fontStyle: 'italic' }}>
                  Gathering weather data from our meteorological correspondents...
                </div>
              )}
            </div>
          </div>

          {/* Markets Article */}
          {articles?.marketsArticle && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>Financial Markets</div>
              <Article
                headline={articles.marketsArticle.headline}
                body={articles.marketsArticle.body}
                startDelay={einkMode ? 0 : 15000}
                einkMode={einkMode}
              />
            </div>
          )}

          {/* Wisdom Corner */}
          {articles?.wisdomCorner && (
            <div style={{ marginTop: 'auto', padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: 4 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8, color: '#666' }}>Ancient Wisdom</div>
              <MagicalText
                text={articles.wisdomCorner}
                revealDuration={15000}
                einkMode={einkMode}
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
                    startDelay={einkMode ? 0 : 5000}
                    headlineStyle={{ fontSize: 18 }}
                    bodyStyle={{ fontSize: 13, lineHeight: 1.7 }}
                    einkMode={einkMode}
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

          {/* Prominent Countdown Section */}
          {countdowns.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12, color: 'rgba(255,255,255,0.5)' }}>Upcoming Events</div>
                {/* Primary Countdown */}
                {(() => {
                  const event = countdowns[0];
                  const target = new Date(event.target_date);
                  const now = new Date();
                  const days = differenceInDays(target, now);
                  const hours = differenceInHours(target, now) % 24;
                  const isPassed = isPast(target);

                  return (
                    <div style={{ marginBottom: countdowns.length > 1 ? 16 : 0 }}>
                      {/* Giant countdown number */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                        <span style={{
                          fontSize: 56,
                          fontWeight: 200,
                          color: isPassed ? '#888' : '#fff',
                          fontFamily: '"Playfair Display", Georgia, serif',
                          lineHeight: 1,
                        }}>
                          {isPassed ? '0' : days}
                        </span>
                        <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                          {isPassed ? 'Today!' : days === 1 ? 'day' : 'days'}
                          {!isPassed && hours > 0 && `, ${hours}h`}
                        </span>
                      </div>
                      {/* Event title */}
                      <div style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#fff',
                        fontFamily: '"Playfair Display", Georgia, serif',
                        marginBottom: 6,
                      }}>
                        {event.title}
                      </div>
                      {/* Event description */}
                      {event.description && (
                        <MagicalText
                          text={event.description}
                          revealDuration={20000}
                          einkMode={einkMode}
                          style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, fontStyle: 'italic' }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Next event preview */}
                {countdowns.length > 1 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, color: 'rgba(255,255,255,0.4)' }}>Up Next</div>
                    {countdowns.slice(1, 3).map((event, idx) => {
                      const target = new Date(event.target_date);
                      const days = differenceInDays(target, new Date());
                      return (
                        <div key={event.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: idx < 1 ? 6 : 0 }}>
                          <span style={{ fontSize: 18, fontWeight: 300, color: 'rgba(255,255,255,0.8)' }}>{days}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>days</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1 }}>— {event.title}</span>
                        </div>
                      );
                    })}
                  </div>
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
                startDelay={einkMode ? 0 : 8000}
                einkMode={einkMode}
              />
            </div>
          )}

          {/* Closing Thought */}
          {articles?.closingThought && (
            <div style={{ marginTop: 'auto', textAlign: 'center', padding: '12px 0', borderTop: '1px solid #ddd' }}>
              <MagicalText
                text={articles.closingThought}
                revealDuration={12000}
                einkMode={einkMode}
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

          {/* Habits with History */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 4, borderBottom: '2px solid #000', display: 'inline-block' }}>
              Daily Rituals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habits.map((habit, i) => (
                <div key={habit.id} style={{ animation: `prophetSlideIn 0.8s ease ${i * 80}ms both` }}>
                  <AnimatedHabit
                    habit={habit}
                    onToggle={() => handleHabitToggle(habit.id)}
                    animationDelay={0}
                  />
                  <HabitHistoryGrid
                    habitHistory={habitHistory[habit.id] || {}}
                    onToggleToday={() => handleHabitToggle(habit.id)}
                  />
                </div>
              ))}
            </div>
            {/* History Legend */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 8, color: '#888' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 8, height: 8, background: '#333', borderRadius: 2 }} />
                <span>Done</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 8, height: 8, background: '#e8e8e8', borderRadius: 2 }} />
                <span>Missed</span>
              </div>
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
                <MagicalText
                  text={articles.productivityNote}
                  revealDuration={10000}
                  einkMode={einkMode}
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
