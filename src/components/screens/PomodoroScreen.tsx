import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const TIMES: Record<TimerMode, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export function PomodoroScreen() {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(TIMES.work);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMES[newMode]);
    setIsRunning(false);
  }, []);

  const reset = () => {
    setTimeLeft(TIMES[mode]);
    setIsRunning(false);
  };

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          // Auto-switch modes
          if (mode === 'work') {
            const newCount = completedPomodoros + 1;
            setCompletedPomodoros(newCount);
            // Long break every 4 pomodoros
            if (newCount % 4 === 0) {
              setMode('longBreak');
              return TIMES.longBreak;
            } else {
              setMode('shortBreak');
              return TIMES.shortBreak;
            }
          } else {
            setMode('work');
            return TIMES.work;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, completedPomodoros]);

  const progress = ((TIMES[mode] - timeLeft) / TIMES[mode]) * 100;

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Mode tabs */}
      <div className="flex gap--large" style={{ justifyContent: 'center', marginBottom: 32 }}>
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`label ${mode === m ? '' : 'label--gray'}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              borderBottom: mode === m ? '2px solid #000' : '2px solid transparent'
            }}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="flex flex--col flex--center flex-1">
        <div style={{ marginBottom: 24 }}>
          {mode === 'work' ? (
            <Brain size={48} strokeWidth={1.5} />
          ) : (
            <Coffee size={48} strokeWidth={1.5} />
          )}
        </div>

        <div className="value value--xxxlarge" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeLeft)}
        </div>

        <div className="description" style={{ marginTop: 16, fontSize: 16 }}>
          {MODE_LABELS[mode]}
        </div>

        {/* Progress bar */}
        <div style={{
          width: 200,
          height: 4,
          background: '#e5e5e5',
          marginTop: 32,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: '#000',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Controls */}
        <div className="flex gap--large" style={{ marginTop: 40 }}>
          <button
            onClick={() => setIsRunning(!isRunning)}
            style={{
              width: 64,
              height: 64,
              border: '2px solid #000',
              background: isRunning ? '#000' : '#fff',
              color: isRunning ? '#fff' : '#000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isRunning ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 4 }} />}
          </button>
          <button
            onClick={reset}
            style={{
              width: 64,
              height: 64,
              border: '2px solid #e5e5e5',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      {/* Completed pomodoros */}
      <div className="flex flex--center gap--small" style={{ paddingBottom: 16 }}>
        <span className="label label--gray">Completed</span>
        <div className="flex gap--xsmall">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                background: i < (completedPomodoros % 4) || (completedPomodoros > 0 && completedPomodoros % 4 === 0 && i < 4) ? '#000' : '#e5e5e5'
              }}
            />
          ))}
        </div>
        <span className="label">{completedPomodoros}</span>
      </div>
    </div>
  );
}
