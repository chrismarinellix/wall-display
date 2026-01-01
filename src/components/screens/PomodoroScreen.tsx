import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain, SkipForward, Volume2, VolumeX, Target } from 'lucide-react';
import { supabase, getPomodoroHistory, incrementPomodoro, addMinutes, PomodoroHistory, recordSession, getRecentSessions, PomodoroSession, SessionType } from '../../services/supabase';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface TimerState {
  mode: TimerMode;
  startedAt: number | null; // timestamp when timer started
  pausedAt: number | null;  // timestamp when paused (to calculate elapsed)
  totalDuration: number;    // total duration in seconds
  completedPomodoros: number;
  lastSavedMinute: number;  // track last saved minute to avoid duplicates
}

interface TimerConfig {
  work: number;
  shortBreak: number;
  longBreak: number;
  sessionsUntilLongBreak: number;
}

const PRESETS: Record<string, TimerConfig> = {
  micro: { work: 5, shortBreak: 1, longBreak: 5, sessionsUntilLongBreak: 4 },
  short: { work: 15, shortBreak: 3, longBreak: 10, sessionsUntilLongBreak: 4 },
  standard: { work: 25, shortBreak: 5, longBreak: 15, sessionsUntilLongBreak: 4 },
  extended: { work: 50, shortBreak: 10, longBreak: 30, sessionsUntilLongBreak: 2 },
};

const PRESET_LABELS: Record<string, string> = {
  micro: '5/1',
  short: '15/3',
  standard: '25/5',
  extended: '50/10',
};

const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

// Sound notification
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    const now = audioContext.currentTime;
    playTone(523.25, now, 0.2);
    playTone(659.25, now + 0.15, 0.2);
    playTone(783.99, now + 0.3, 0.3);
  } catch (e) {
    console.log('Could not play sound:', e);
  }
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function showNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.svg' });
  }
}

// LocalStorage functions
function getLocalHistory(): PomodoroHistory {
  try {
    const stored = localStorage.getItem('pomodoro-history');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert old format to new format
      const history: PomodoroHistory = {};
      Object.entries(parsed).forEach(([date, value]) => {
        if (typeof value === 'number') {
          history[date] = { count: value, minutes: 0 };
        } else {
          history[date] = value as { count: number; minutes: number };
        }
      });
      return history;
    }
  } catch {}
  return {};
}

function saveLocalHistory(history: PomodoroHistory) {
  localStorage.setItem('pomodoro-history', JSON.stringify(history));
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayKey(): string {
  return formatLocalDate(new Date());
}

function getLast60Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  for (let i = 59; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(formatLocalDate(date));
  }
  return days;
}

function getTimerState(): TimerState | null {
  try {
    const stored = localStorage.getItem('pomodoro-timer-state');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveTimerState(state: TimerState | null) {
  if (state) {
    localStorage.setItem('pomodoro-timer-state', JSON.stringify(state));
  } else {
    localStorage.removeItem('pomodoro-timer-state');
  }
}

function getSettings() {
  try {
    const stored = localStorage.getItem('pomodoro-settings');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    preset: 'standard',
    soundEnabled: true,
    dailyGoal: 8,
  };
}

function saveSettings(settings: any) {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

const STACK_HEIGHT = 5; // 5 boxes per day

// Session symbols for display
const SESSION_SYMBOLS: Record<SessionType, { symbol: string; color: string; label: string }> = {
  work: { symbol: '●', color: '#000', label: 'Focus' },
  shortBreak: { symbol: '○', color: '#888', label: 'Short' },
  longBreak: { symbol: '◎', color: '#666', label: 'Long' },
};

// Format time for tooltip (e.g., "2:30 PM")
function formatSessionTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Session history grid - shows last 60 sessions with symbols
function SessionHistoryGrid({ sessions }: { sessions: PomodoroSession[] }) {
  const workCount = sessions.filter(s => s.type === 'work').length;
  const breakCount = sessions.filter(s => s.type !== 'work').length;

  return (
    <div style={{ marginTop: 'auto', paddingTop: 24, width: '100%' }}>
      <div className="flex flex--between" style={{ marginBottom: 12, alignItems: 'center' }}>
        <div className="label label--gray">Last 60 Sessions</div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {workCount} focus · {breakCount} breaks
        </div>
      </div>

      {/* Session grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        justifyContent: 'flex-start',
      }}>
        {sessions.length === 0 ? (
          <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>
            No sessions yet. Start your first focus session!
          </div>
        ) : (
          sessions.map((session, idx) => {
            const { symbol, color, label } = SESSION_SYMBOLS[session.type];
            const time = formatSessionTime(session.completed_at);
            return (
              <div
                key={session.id || idx}
                title={`${label} (${session.duration_minutes}min) at ${time}`}
                style={{
                  fontSize: 14,
                  color,
                  cursor: 'default',
                  lineHeight: 1,
                }}
              >
                {symbol}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex gap--medium" style={{ marginTop: 12, justifyContent: 'center' }}>
        {Object.entries(SESSION_SYMBOLS).map(([type, { symbol, color, label }]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color }}>{symbol}</span>
            <span style={{ fontSize: 10, color: '#999' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapGrid({ history }: { history: PomodoroHistory }) {
  const days = getLast60Days();
  const counts = days.map(d => history[d]?.count || 0);
  const totalPomodoros = counts.reduce((a, b) => a + b, 0);

  // Get box color based on how many are filled
  const getBoxColor = (dayCount: number, boxIndex: number) => {
    // boxIndex 0 is top (5th pomodoro), 4 is bottom (1st pomodoro)
    const pomodoroNumber = STACK_HEIGHT - boxIndex; // 5, 4, 3, 2, 1

    if (dayCount >= pomodoroNumber) {
      // This box is filled - darker gray for more pomodoros
      // First pomodoro is lightest (#ccc), 5th is darkest (#333)
      const darkness = Math.round(204 - (pomodoroNumber - 1) * 40); // 204, 164, 124, 84, 44
      return `rgb(${darkness}, ${darkness}, ${darkness})`;
    }
    return '#e5e5e5'; // Empty box
  };

  return (
    <div style={{ marginTop: 'auto', paddingTop: 24, width: '100%' }}>
      <div className="flex flex--between" style={{ marginBottom: 12, alignItems: 'center' }}>
        <div className="label label--gray">Last 60 Days</div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {totalPomodoros} completed
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, width: '100%' }}>
        {days.map((day) => {
          const count = history[day]?.count || 0;

          return (
            <div
              key={day}
              title={`${day}: ${count} pomodoro${count !== 1 ? 's' : ''}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {/* Stack of 5 boxes, top to bottom */}
              {Array.from({ length: STACK_HEIGHT }).map((_, boxIndex) => (
                <div
                  key={boxIndex}
                  style={{
                    height: 8,
                    background: getBoxColor(count, boxIndex),
                    transition: 'background 0.3s ease',
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex--between" style={{ marginTop: 8 }}>
        <span style={{ fontSize: 10, color: '#999' }}>60 days ago</span>
        <span style={{ fontSize: 10, color: '#999' }}>Today</span>
      </div>
    </div>
  );
}

export function PomodoroScreen() {
  const settings = getSettings();
  // Ensure preset is valid, fallback to 'standard' if not
  const initialPreset = PRESETS[settings.preset] ? settings.preset : 'standard';
  const [preset, setPreset] = useState<string>(initialPreset);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [dailyGoal] = useState<number>(settings.dailyGoal);
  const [history, setHistory] = useState<PomodoroHistory>({});
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);

  const config = PRESETS[preset] || PRESETS['standard'];
  const times = {
    work: config.work * 60,
    shortBreak: config.shortBreak * 60,
    longBreak: config.longBreak * 60,
  };

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>(() => {
    const saved = getTimerState();
    if (saved && saved.startedAt) {
      // Check if timer should have completed while away
      const elapsed = (Date.now() - saved.startedAt) / 1000;
      if (elapsed >= saved.totalDuration) {
        // Timer completed while away - will handle in useEffect
        return saved;
      }
      return saved;
    }
    return {
      mode: 'work',
      startedAt: null,
      pausedAt: null,
      totalDuration: times.work,
      completedPomodoros: 0,
      lastSavedMinute: 0,
    };
  });

  const [timeLeft, setTimeLeft] = useState(() => {
    if (timerState.startedAt && !timerState.pausedAt) {
      const elapsed = (Date.now() - timerState.startedAt) / 1000;
      return Math.max(0, timerState.totalDuration - elapsed);
    } else if (timerState.pausedAt && timerState.startedAt) {
      const elapsed = (timerState.pausedAt - timerState.startedAt) / 1000;
      return Math.max(0, timerState.totalDuration - elapsed);
    }
    return timerState.totalDuration;
  });

  const isRunning = timerState.startedAt !== null && timerState.pausedAt === null;
  const lastSaveRef = useRef<number>(0);

  // Request notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Load history and sessions (refreshes on mount, visibility change, and periodically)
  useEffect(() => {
    async function loadData() {
      if (supabase) {
        console.log('Loading pomodoro history from Supabase...');
        const cloudHistory = await getPomodoroHistory();
        console.log('Loaded history:', cloudHistory);
        setHistory(cloudHistory);
        saveLocalHistory(cloudHistory);
      } else {
        console.log('Supabase not configured, using localStorage');
        setHistory(getLocalHistory());
      }

      // Load recent sessions
      const recentSessions = await getRecentSessions(60);
      setSessions(recentSessions);
    }

    // Load immediately
    loadData();

    // Refresh when page becomes visible (user switches back to tab/screen)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh every 30 seconds to pick up changes from other devices
    const refreshInterval = setInterval(loadData, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(refreshInterval);
    };
  }, []);

  // Save settings
  useEffect(() => {
    saveSettings({ preset, soundEnabled, dailyGoal });
  }, [preset, soundEnabled, dailyGoal]);

  // Save timer state whenever it changes
  useEffect(() => {
    saveTimerState(timerState);
  }, [timerState]);

  // Save partial minutes periodically and on unmount
  const savePartialMinutes = useCallback(async () => {
    if (!timerState.startedAt || timerState.mode !== 'work') return;

    const now = timerState.pausedAt || Date.now();
    const elapsedSeconds = (now - timerState.startedAt) / 1000;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const minutesToSave = elapsedMinutes - timerState.lastSavedMinute;

    console.log(`[Pomodoro] Checking partial minutes: elapsed=${elapsedMinutes}min, lastSaved=${timerState.lastSavedMinute}min, toSave=${minutesToSave}min`);

    if (minutesToSave > 0) {
      const todayKey = getTodayKey();
      console.log(`[Pomodoro] Saving ${minutesToSave} partial minutes for ${todayKey}`);

      // Update local history
      const newHistory = { ...history };
      if (!newHistory[todayKey]) {
        newHistory[todayKey] = { count: 0, minutes: 0 };
      }
      newHistory[todayKey].minutes += minutesToSave;
      setHistory(newHistory);
      saveLocalHistory(newHistory);

      // Sync to Supabase
      if (supabase) {
        console.log(`[Pomodoro] Syncing ${minutesToSave} minutes to Supabase...`);
        await addMinutes(todayKey, minutesToSave);
        console.log(`[Pomodoro] Supabase sync complete`);
      } else {
        console.log(`[Pomodoro] Supabase not configured, saved to localStorage only`);
      }

      setTimerState(prev => ({ ...prev, lastSavedMinute: elapsedMinutes }));
    }
  }, [timerState, history]);

  // Save on unmount or visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning) {
        savePartialMinutes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (isRunning) {
        savePartialMinutes();
      }
    };
  }, [isRunning, savePartialMinutes]);

  // Store current values in refs to avoid effect dependency issues
  const timerStateRef = useRef(timerState);
  const historyRef = useRef(history);
  const sessionsRef = useRef(sessions);
  const configRef = useRef(config);
  const timesRef = useRef(times);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => { timerStateRef.current = timerState; }, [timerState]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { timesRef.current = times; }, [times]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Timer tick - minimal dependencies for stable interval
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const state = timerStateRef.current;
      const cfg = configRef.current;
      const t = timesRef.current;
      const hist = historyRef.current;
      const sound = soundEnabledRef.current;

      if (!state.startedAt) return;

      const elapsed = (Date.now() - state.startedAt) / 1000;
      const remaining = Math.max(0, state.totalDuration - elapsed);
      setTimeLeft(remaining);

      // Save partial minutes every minute (using ref to avoid recreating interval)
      const elapsedMinutes = Math.floor(elapsed / 60);
      if (elapsedMinutes > lastSaveRef.current && state.mode === 'work') {
        lastSaveRef.current = elapsedMinutes;
        // Inline the save logic to avoid dependency on callback
        const todayKey = getTodayKey();
        const minutesToSave = elapsedMinutes - state.lastSavedMinute;
        if (minutesToSave > 0) {
          const newHistory = { ...hist };
          if (!newHistory[todayKey]) {
            newHistory[todayKey] = { count: 0, minutes: 0 };
          }
          newHistory[todayKey].minutes += minutesToSave;
          setHistory(newHistory);
          saveLocalHistory(newHistory);
          if (supabase) {
            addMinutes(todayKey, minutesToSave);
          }
          setTimerState(prev => ({ ...prev, lastSavedMinute: elapsedMinutes }));
        }
      }

      // Timer complete
      if (remaining <= 0) {
        if (sound) playNotificationSound();
        const currentSessions = sessionsRef.current;

        if (state.mode === 'work') {
          const newCount = state.completedPomodoros + 1;
          const isLongBreak = newCount % cfg.sessionsUntilLongBreak === 0;
          const nextMode = isLongBreak ? 'longBreak' : 'shortBreak';
          const nextDuration = isLongBreak ? t.longBreak : t.shortBreak;

          // Record completed pomodoro
          const todayKey = getTodayKey();
          const newHistory = { ...hist };
          if (!newHistory[todayKey]) {
            newHistory[todayKey] = { count: 0, minutes: 0 };
          }
          newHistory[todayKey].count += 1;
          setHistory(newHistory);
          saveLocalHistory(newHistory);
          if (supabase) {
            incrementPomodoro(todayKey);
          }

          // Record work session
          const workSession: Omit<PomodoroSession, 'id'> = {
            type: 'work',
            duration_minutes: cfg.work,
            completed_at: new Date().toISOString(),
          };
          recordSession(workSession);
          setSessions([...currentSessions, { ...workSession, id: crypto.randomUUID() }].slice(-60));

          showNotification('Focus Complete!', `Time for a ${isLongBreak ? 'long' : 'short'} break.`);

          setTimerState({
            mode: nextMode,
            startedAt: null,
            pausedAt: null,
            totalDuration: nextDuration,
            completedPomodoros: newCount,
            lastSavedMinute: 0,
          });
          setTimeLeft(nextDuration);
        } else {
          // Record break session
          const breakSession: Omit<PomodoroSession, 'id'> = {
            type: state.mode as SessionType,
            duration_minutes: state.mode === 'longBreak' ? cfg.longBreak : cfg.shortBreak,
            completed_at: new Date().toISOString(),
          };
          recordSession(breakSession);
          setSessions([...currentSessions, { ...breakSession, id: crypto.randomUUID() }].slice(-60));

          showNotification('Break Over!', 'Time to focus.');
          setTimerState({
            mode: 'work',
            startedAt: null,
            pausedAt: null,
            totalDuration: t.work,
            completedPomodoros: state.completedPomodoros,
            lastSavedMinute: 0,
          });
          setTimeLeft(t.work);
        }
        lastSaveRef.current = 0;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]); // Only depend on isRunning - use refs for everything else

  // Check if timer completed while away
  useEffect(() => {
    if (timerState.startedAt && !timerState.pausedAt) {
      const elapsed = (Date.now() - timerState.startedAt) / 1000;
      if (elapsed >= timerState.totalDuration) {
        // Timer completed while away
        if (timerState.mode === 'work') {
          const newCount = timerState.completedPomodoros + 1;
          const todayKey = getTodayKey();
          const newHistory = { ...history };
          if (!newHistory[todayKey]) {
            newHistory[todayKey] = { count: 0, minutes: 0 };
          }
          newHistory[todayKey].count += 1;
          newHistory[todayKey].minutes += config.work; // Full session
          setHistory(newHistory);
          saveLocalHistory(newHistory);
          if (supabase) {
            incrementPomodoro(todayKey);
            addMinutes(todayKey, config.work);
          }

          const isLongBreak = newCount % config.sessionsUntilLongBreak === 0;
          setTimerState({
            mode: isLongBreak ? 'longBreak' : 'shortBreak',
            startedAt: null,
            pausedAt: null,
            totalDuration: isLongBreak ? times.longBreak : times.shortBreak,
            completedPomodoros: newCount,
            lastSavedMinute: 0,
          });
        } else {
          setTimerState({
            mode: 'work',
            startedAt: null,
            pausedAt: null,
            totalDuration: times.work,
            completedPomodoros: timerState.completedPomodoros,
            lastSavedMinute: 0,
          });
        }
      }
    }
  }, []); // Only on mount

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (isRunning) {
      // Pause
      savePartialMinutes();
      setTimerState(prev => ({ ...prev, pausedAt: Date.now() }));
    } else if (timerState.pausedAt) {
      // Resume from pause
      const pausedDuration = Date.now() - timerState.pausedAt;
      setTimerState(prev => ({
        ...prev,
        startedAt: prev.startedAt! + pausedDuration,
        pausedAt: null,
      }));
    } else {
      // Start fresh
      setTimerState(prev => ({
        ...prev,
        startedAt: Date.now(),
        pausedAt: null,
        lastSavedMinute: 0,
      }));
      lastSaveRef.current = 0;
    }
  };

  const reset = () => {
    savePartialMinutes();
    setTimerState(prev => ({
      ...prev,
      startedAt: null,
      pausedAt: null,
      lastSavedMinute: 0,
    }));
    setTimeLeft(timerState.totalDuration);
    lastSaveRef.current = 0;
  };

  const switchMode = (newMode: TimerMode) => {
    if (isRunning) savePartialMinutes();
    const newDuration = times[newMode];
    setTimerState({
      mode: newMode,
      startedAt: null,
      pausedAt: null,
      totalDuration: newDuration,
      completedPomodoros: timerState.completedPomodoros,
      lastSavedMinute: 0,
    });
    setTimeLeft(newDuration);
    lastSaveRef.current = 0;
  };

  const changePreset = (newPreset: string) => {
    if (isRunning) savePartialMinutes();
    setPreset(newPreset);
    const newConfig = PRESETS[newPreset];
    const newDuration = newConfig.work * 60;
    setTimerState({
      mode: 'work',
      startedAt: null,
      pausedAt: null,
      totalDuration: newDuration,
      completedPomodoros: 0,
      lastSavedMinute: 0,
    });
    setTimeLeft(newDuration);
    lastSaveRef.current = 0;
  };

  const skipBreak = () => {
    if (timerState.mode === 'work') return;
    switchMode('work');
  };

  const progress = ((timerState.totalDuration - timeLeft) / timerState.totalDuration) * 100;
  const todayData = history[getTodayKey()] || { count: 0, minutes: 0 };
  const todayCount = todayData.count;
  const todayMinutes = todayData.minutes;
  const sessionsUntilLongBreak = config.sessionsUntilLongBreak - (timerState.completedPomodoros % config.sessionsUntilLongBreak);
  const goalProgress = Math.min(100, (todayCount / dailyGoal) * 100);

  return (
    <div className="flex flex--col" style={{ height: '100%', position: 'relative' }}>
      {/* Full-width progress bar at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: -24,
        right: -24,
        height: 4,
        background: '#e5e5e5',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: timerState.mode === 'work' ? '#000' : '#666',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Header */}
      <div className="flex flex--between" style={{ marginBottom: 16, alignItems: 'center', marginTop: 12 }}>
        <div className="flex gap--small">
          {Object.keys(PRESETS).map((p) => (
            <button
              key={p}
              onClick={() => changePreset(p)}
              className={`label ${preset === p ? '' : 'label--gray'}`}
              style={{
                background: 'none',
                border: preset === p ? '1px solid #000' : '1px solid #e5e5e5',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="flex gap--small" style={{ alignItems: 'center' }}>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} color="#999" />}
          </button>
          <span className="label label--gray">Session</span>
          <span className="label">{timerState.completedPomodoros + 1}</span>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap--large" style={{ justifyContent: 'center', marginBottom: 24 }}>
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`label ${timerState.mode === m ? '' : 'label--gray'}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              borderBottom: timerState.mode === m ? '2px solid #000' : '2px solid transparent'
            }}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="flex flex--col flex--center" style={{ flex: 1 }}>
        <div style={{ marginBottom: 20 }}>
          {timerState.mode === 'work' ? <Brain size={40} strokeWidth={1.5} /> : <Coffee size={40} strokeWidth={1.5} />}
        </div>

        <div className="value value--xxxlarge" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeLeft)}
        </div>

        <div className="description" style={{ marginTop: 12, fontSize: 14 }}>
          {MODE_LABELS[timerState.mode]}
          {timerState.mode === 'work' && sessionsUntilLongBreak < config.sessionsUntilLongBreak && (
            <span style={{ marginLeft: 8, color: '#999' }}>
              ({sessionsUntilLongBreak} until long break)
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap--large" style={{ marginTop: 32 }}>
          <button
            onClick={toggleTimer}
            style={{
              width: 56, height: 56,
              border: '2px solid #000',
              background: isRunning ? '#000' : '#fff',
              color: isRunning ? '#fff' : '#000',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
          </button>
          <button
            onClick={reset}
            style={{
              width: 56, height: 56,
              border: '2px solid #e5e5e5',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <RotateCcw size={20} />
          </button>
          {timerState.mode !== 'work' && (
            <button
              onClick={skipBreak}
              style={{
                width: 56, height: 56,
                border: '2px solid #e5e5e5',
                background: '#fff',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Skip break"
            >
              <SkipForward size={20} />
            </button>
          )}
        </div>

        {/* Daily goal */}
        <div style={{ marginTop: 24, width: 180 }}>
          <div className="flex flex--between" style={{ marginBottom: 6 }}>
            <div className="flex gap--small" style={{ alignItems: 'center' }}>
              <Target size={12} />
              <span className="label label--gray">Goal</span>
            </div>
            <span className="label">{todayCount}/{dailyGoal}</span>
          </div>
          <div style={{ width: '100%', height: 4, background: '#e5e5e5', overflow: 'hidden' }}>
            <div style={{
              width: `${goalProgress}%`,
              height: '100%',
              background: todayCount >= dailyGoal ? '#000' : '#999',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap--medium" style={{ marginTop: 16, alignItems: 'center' }}>
          <div className="flex gap--small" style={{ alignItems: 'center' }}>
            <span className="label label--gray">Focus time</span>
            <span className="label">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</span>
          </div>
        </div>
      </div>

      <SessionHistoryGrid sessions={sessions} />
    </div>
  );
}
