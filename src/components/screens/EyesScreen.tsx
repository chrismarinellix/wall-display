import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Heart } from 'lucide-react';
import {
  getEyeGazingHistory,
  recordEyeGazingSession,
  subscribeToEyeGazing,
  EyeGazingHistory
} from '../../services/supabase';

const DEFAULT_DURATION = 35; // 35 seconds default

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
  today.setHours(0, 0, 0, 0);

  for (let i = 59; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(formatLocalDate(date));
  }
  return days;
}

// Pencil-sketch style blinking eyes SVG component
function BlinkingEyes({ isBlinking }: { isBlinking: boolean }) {
  return (
    <svg
      viewBox="0 0 200 80"
      style={{
        width: '100%',
        maxWidth: 320,
        height: 'auto',
        filter: 'url(#pencil-texture)',
      }}
    >
      <defs>
        {/* Pencil texture filter for sketch effect */}
        <filter id="pencil-texture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>

      {/* Left eye */}
      <g transform="translate(30, 40)">
        {/* Eye outline - almond shape */}
        <path
          d={isBlinking
            ? "M0,0 Q35,-2 70,0 Q35,2 0,0"
            : "M0,0 Q35,-28 70,0 Q35,28 0,0"
          }
          fill="none"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Upper eyelid crease */}
        <path
          d={isBlinking ? "" : "M5,-8 Q35,-32 65,-8"}
          fill="none"
          stroke="#666"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity={isBlinking ? 0 : 0.6}
          style={{ transition: 'opacity 0.15s ease-in-out' }}
        />
        {/* Iris */}
        <circle
          cx="35"
          cy="0"
          r={isBlinking ? "0" : "12"}
          fill="none"
          stroke="#444"
          strokeWidth="1.2"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Pupil */}
        <circle
          cx="35"
          cy="0"
          r={isBlinking ? "0" : "5"}
          fill="#222"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Light reflection */}
        <circle
          cx="38"
          cy="-3"
          r={isBlinking ? "0" : "2"}
          fill="#fff"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Lower lashes - subtle */}
        {!isBlinking && (
          <>
            <path d="M15,10 L13,14" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M25,13 L24,17" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M35,14 L35,18" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M45,13 L46,17" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M55,10 L57,14" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
          </>
        )}
        {/* Upper lashes - more prominent */}
        {!isBlinking && (
          <>
            <path d="M10,-10 L6,-16" stroke="#333" strokeWidth="0.8" strokeLinecap="round"/>
            <path d="M18,-14 L15,-21" stroke="#333" strokeWidth="0.9" strokeLinecap="round"/>
            <path d="M26,-17 L24,-25" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
            <path d="M35,-18 L35,-27" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
            <path d="M44,-17 L46,-25" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
            <path d="M52,-14 L55,-21" stroke="#333" strokeWidth="0.9" strokeLinecap="round"/>
            <path d="M60,-10 L64,-16" stroke="#333" strokeWidth="0.8" strokeLinecap="round"/>
          </>
        )}
      </g>

      {/* Right eye - mirrored */}
      <g transform="translate(100, 40)">
        {/* Eye outline - almond shape */}
        <path
          d={isBlinking
            ? "M0,0 Q35,-2 70,0 Q35,2 0,0"
            : "M0,0 Q35,-28 70,0 Q35,28 0,0"
          }
          fill="none"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Upper eyelid crease */}
        <path
          d={isBlinking ? "" : "M5,-8 Q35,-32 65,-8"}
          fill="none"
          stroke="#666"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity={isBlinking ? 0 : 0.6}
          style={{ transition: 'opacity 0.15s ease-in-out' }}
        />
        {/* Iris */}
        <circle
          cx="35"
          cy="0"
          r={isBlinking ? "0" : "12"}
          fill="none"
          stroke="#444"
          strokeWidth="1.2"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Pupil */}
        <circle
          cx="35"
          cy="0"
          r={isBlinking ? "0" : "5"}
          fill="#222"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Light reflection */}
        <circle
          cx="38"
          cy="-3"
          r={isBlinking ? "0" : "2"}
          fill="#fff"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        {/* Lower lashes - subtle */}
        {!isBlinking && (
          <>
            <path d="M15,10 L13,14" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M25,13 L24,17" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M35,14 L35,18" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M45,13 L46,17" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
            <path d="M55,10 L57,14" stroke="#555" strokeWidth="0.6" strokeLinecap="round"/>
          </>
        )}
        {/* Upper lashes - more prominent */}
        {!isBlinking && (
          <>
            <path d="M10,-10 L6,-16" stroke="#333" strokeWidth="0.8" strokeLinecap="round"/>
            <path d="M18,-14 L15,-21" stroke="#333" strokeWidth="0.9" strokeLinecap="round"/>
            <path d="M26,-17 L24,-25" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
            <path d="M35,-18 L35,-27" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
            <path d="M44,-17 L46,-25" stroke="#333" strokeWidth="1" strokeLinecap="round"/>
            <path d="M52,-14 L55,-21" stroke="#333" strokeWidth="0.9" strokeLinecap="round"/>
            <path d="M60,-10 L64,-16" stroke="#333" strokeWidth="0.8" strokeLinecap="round"/>
          </>
        )}
      </g>
    </svg>
  );
}

// 60-day heatmap showing both users
function EyeGazingHeatmap({ history }: { history: EyeGazingHistory }) {
  const days = getLast60Days();
  const totalSessions = days.reduce((sum, d) => {
    const day = history[d];
    return sum + (day?.chris || 0) + (day?.caroline || 0);
  }, 0);

  return (
    <div style={{ marginTop: 'auto', paddingTop: 24, width: '100%' }}>
      <div className="flex flex--between" style={{ marginBottom: 12, alignItems: 'center' }}>
        <div className="label label--gray">Last 60 Days</div>
        <div style={{ fontSize: 11, color: '#666' }}>
          {totalSessions} sessions
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, width: '100%' }}>
        {days.map((day) => {
          const dayData = history[day] || { chris: 0, caroline: 0 };
          const total = dayData.chris + dayData.caroline;

          // Get color based on who did it
          const getColor = () => {
            if (total === 0) return '#e5e5e5';
            if (dayData.chris > 0 && dayData.caroline > 0) return '#222'; // Both - darkest
            if (dayData.chris > 0) return '#666'; // Just Chris - medium
            return '#999'; // Just Caroline - lighter
          };

          return (
            <div
              key={day}
              title={`${day}: Chris ${dayData.chris}, Caroline ${dayData.caroline}`}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {/* Stack of 2 boxes - one for each person */}
              <div
                style={{
                  height: 16,
                  background: dayData.caroline > 0 ? '#888' : '#e5e5e5',
                  transition: 'background 0.3s ease',
                }}
                title={`Caroline: ${dayData.caroline}`}
              />
              <div
                style={{
                  height: 16,
                  background: dayData.chris > 0 ? '#333' : '#e5e5e5',
                  transition: 'background 0.3s ease',
                }}
                title={`Chris: ${dayData.chris}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex--between" style={{ marginTop: 8 }}>
        <span style={{ fontSize: 10, color: '#999' }}>60 days ago</span>
        <div className="flex gap--medium">
          <span style={{ fontSize: 10, color: '#333' }}>Chris</span>
          <span style={{ fontSize: 10, color: '#888' }}>Caroline</span>
        </div>
        <span style={{ fontSize: 10, color: '#999' }}>Today</span>
      </div>
    </div>
  );
}

export function EyesScreen() {
  const [history, setHistory] = useState<EyeGazingHistory>({});
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [selectedUser, setSelectedUser] = useState<'Chris' | 'Caroline' | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const timerRef = useRef<number | null>(null);
  const blinkIntervalRef = useRef<number | null>(null);

  // Load history
  useEffect(() => {
    async function loadHistory() {
      const h = await getEyeGazingHistory(60);
      setHistory(h);
    }
    loadHistory();

    // Subscribe to changes
    const unsubscribe = subscribeToEyeGazing((h) => setHistory(h));
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Blinking effect - random blinks every 2-5 seconds
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 3000; // 2-5 seconds
      blinkIntervalRef.current = window.setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();

    return () => {
      if (blinkIntervalRef.current) {
        clearTimeout(blinkIntervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setTimeout(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // Timer complete
      setIsRunning(false);
      setShowComplete(true);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleStart = useCallback(() => {
    if (!selectedUser) return;
    setIsRunning(true);
    setShowComplete(false);
  }, [selectedUser]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(DEFAULT_DURATION);
    setShowComplete(false);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!selectedUser) return;

    const elapsedSeconds = DEFAULT_DURATION - timeLeft;
    await recordEyeGazingSession(selectedUser, elapsedSeconds);

    // Refresh history
    const h = await getEyeGazingHistory(60);
    setHistory(h);

    // Reset for next session
    setTimeLeft(DEFAULT_DURATION);
    setShowComplete(false);
    setSelectedUser(null);
  }, [selectedUser, timeLeft]);

  const todayData = history[getTodayKey()] || { chris: 0, caroline: 0 };
  const progress = ((DEFAULT_DURATION - timeLeft) / DEFAULT_DURATION) * 100;

  return (
    <div className="flex flex--col" style={{ height: '100%', position: 'relative' }}>
      {/* Progress bar at top */}
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
          background: '#000',
          transition: 'width 0.1s linear',
        }} />
      </div>

      {/* Header */}
      <div className="flex flex--between" style={{ marginBottom: 16, alignItems: 'center', marginTop: 12 }}>
        <div className="flex gap--small" style={{ alignItems: 'center' }}>
          <Heart size={16} />
          <span className="label">Eye Gazing</span>
        </div>
        <div className="flex gap--medium">
          <div className="flex gap--small" style={{ alignItems: 'center' }}>
            <span className="label label--gray">Today:</span>
            <span className="label">C:{todayData.chris} C:{todayData.caroline}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex--col flex--center" style={{ flex: 1 }}>
        {/* Eyes display */}
        <div style={{ marginBottom: 24, width: '100%', maxWidth: 320 }}>
          <BlinkingEyes isBlinking={isBlinking} />
        </div>

        {/* Timer display */}
        <div className="value value--xxxlarge" style={{ fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
          {timeLeft}s
        </div>

        <div className="description" style={{ marginBottom: 24, textAlign: 'center', maxWidth: 280 }}>
          {showComplete
            ? 'Session complete!'
            : isRunning
              ? 'Look into each other\'s eyes...'
              : 'Select who\'s recording, then start'}
        </div>

        {/* User selection */}
        <div className="flex gap--medium" style={{ marginBottom: 24 }}>
          <button
            onClick={() => setSelectedUser('Chris')}
            disabled={isRunning}
            style={{
              padding: '12px 24px',
              border: selectedUser === 'Chris' ? '2px solid #000' : '2px solid #e5e5e5',
              background: selectedUser === 'Chris' ? '#000' : '#fff',
              color: selectedUser === 'Chris' ? '#fff' : '#000',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: isRunning ? 0.5 : 1,
            }}
          >
            Chris
          </button>
          <button
            onClick={() => setSelectedUser('Caroline')}
            disabled={isRunning}
            style={{
              padding: '12px 24px',
              border: selectedUser === 'Caroline' ? '2px solid #000' : '2px solid #e5e5e5',
              background: selectedUser === 'Caroline' ? '#000' : '#fff',
              color: selectedUser === 'Caroline' ? '#fff' : '#000',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              opacity: isRunning ? 0.5 : 1,
            }}
          >
            Caroline
          </button>
        </div>

        {/* Controls */}
        <div className="flex gap--large">
          {showComplete ? (
            <button
              onClick={handleComplete}
              style={{
                width: 56, height: 56,
                border: '2px solid #000',
                background: '#000',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Record session"
            >
              <Heart size={24} />
            </button>
          ) : (
            <button
              onClick={isRunning ? handlePause : handleStart}
              disabled={!selectedUser && !isRunning}
              style={{
                width: 56, height: 56,
                border: '2px solid #000',
                background: isRunning ? '#000' : '#fff',
                color: isRunning ? '#fff' : '#000',
                cursor: !selectedUser && !isRunning ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: !selectedUser && !isRunning ? 0.5 : 1,
              }}
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 3 }} />}
            </button>
          )}
          <button
            onClick={handleReset}
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
        </div>
      </div>

      {/* History heatmap */}
      <EyeGazingHeatmap history={history} />
    </div>
  );
}
