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

// Realistic pencil-sketch style feminine eyes
function BlinkingEyes({ isBlinking }: { isBlinking: boolean }) {
  return (
    <svg
      viewBox="0 0 400 120"
      style={{
        width: '100%',
        maxWidth: 440,
        height: 'auto',
      }}
    >
      <defs>
        {/* Subtle pencil texture */}
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        {/* Soft shadow for depth */}
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
          <feOffset in="blur" dx="0" dy="1" result="offsetBlur"/>
          <feMerge>
            <feMergeNode in="offsetBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Iris gradient for realism */}
        <radialGradient id="irisGradient" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#8B7355"/>
          <stop offset="40%" stopColor="#5C4033"/>
          <stop offset="100%" stopColor="#2C1810"/>
        </radialGradient>
      </defs>

      {/* Left eye - positioned with proper spacing */}
      <g transform="translate(45, 60)" style={{ filter: 'url(#pencil)' }}>
        {/* Eyebrow - soft curved stroke */}
        <path
          d="M-5,-38 Q35,-52 85,-42"
          fill="none"
          stroke="#4a4a4a"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={isBlinking ? 0.6 : 0.7}
        />
        <path
          d="M0,-36 Q35,-48 80,-40"
          fill="none"
          stroke="#5a5a5a"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={isBlinking ? 0.3 : 0.4}
        />

        {/* Upper eyelid crease */}
        <path
          d={isBlinking ? "M2,-4 Q40,-6 78,-4" : "M2,-22 Q40,-32 78,-22"}
          fill="none"
          stroke="#888"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity={isBlinking ? 0.3 : 0.5}
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Eye shape - elegant almond */}
        <path
          d={isBlinking
            ? "M0,0 C20,-3 60,-3 80,0 C60,3 20,3 0,0"
            : "M0,0 C15,-22 65,-22 80,0 C65,18 15,18 0,0"
          }
          fill={isBlinking ? "none" : "#faf8f5"}
          stroke="#3a3a3a"
          strokeWidth="1.2"
          strokeLinecap="round"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Inner corner detail */}
        <path
          d={isBlinking ? "" : "M-2,0 Q2,-2 5,0 Q2,2 -2,0"}
          fill="#e8d4c8"
          stroke="#999"
          strokeWidth="0.5"
          opacity={isBlinking ? 0 : 0.6}
          style={{ transition: 'opacity 0.15s ease-in-out' }}
        />

        {/* Iris */}
        <circle
          cx="40"
          cy="0"
          r={isBlinking ? 0 : 14}
          fill="url(#irisGradient)"
          stroke="#2a2a2a"
          strokeWidth="0.8"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Iris detail lines */}
        {!isBlinking && (
          <g opacity="0.3">
            <path d="M40,-14 L40,-5" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M33,-12 L36,-5" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M47,-12 L44,-5" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M28,-8 L34,-4" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M52,-8 L46,-4" stroke="#1a1a1a" strokeWidth="0.3"/>
          </g>
        )}

        {/* Pupil */}
        <circle
          cx="40"
          cy="0"
          r={isBlinking ? 0 : 6}
          fill="#0a0a0a"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Light reflections */}
        <circle
          cx="44"
          cy="-4"
          r={isBlinking ? 0 : 2.5}
          fill="#fff"
          opacity="0.9"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        <circle
          cx="36"
          cy="3"
          r={isBlinking ? 0 : 1}
          fill="#fff"
          opacity="0.5"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Upper lashes - curved and natural */}
        {!isBlinking && (
          <g stroke="#2a2a2a" strokeLinecap="round">
            <path d="M8,-15 Q6,-22 3,-28" strokeWidth="1.2"/>
            <path d="M14,-18 Q13,-26 11,-33" strokeWidth="1.3"/>
            <path d="M20,-20 Q20,-29 19,-37" strokeWidth="1.4"/>
            <path d="M27,-21 Q28,-31 28,-40" strokeWidth="1.5"/>
            <path d="M34,-22 Q36,-32 37,-42" strokeWidth="1.5"/>
            <path d="M41,-22 Q44,-32 47,-41" strokeWidth="1.5"/>
            <path d="M48,-21 Q52,-30 56,-38" strokeWidth="1.4"/>
            <path d="M55,-19 Q60,-27 65,-34" strokeWidth="1.3"/>
            <path d="M62,-16 Q68,-23 74,-28" strokeWidth="1.2"/>
            <path d="M68,-13 Q74,-18 80,-22" strokeWidth="1.1"/>
            {/* Second row of lashes for fullness */}
            <path d="M11,-16 Q9,-22 7,-27" strokeWidth="0.9" opacity="0.7"/>
            <path d="M17,-19 Q16,-25 15,-31" strokeWidth="1" opacity="0.7"/>
            <path d="M24,-20 Q24,-27 24,-34" strokeWidth="1.1" opacity="0.7"/>
            <path d="M31,-21 Q32,-28 33,-36" strokeWidth="1.2" opacity="0.7"/>
            <path d="M38,-22 Q40,-29 42,-37" strokeWidth="1.2" opacity="0.7"/>
            <path d="M45,-21 Q48,-28 51,-35" strokeWidth="1.1" opacity="0.7"/>
            <path d="M52,-19 Q56,-25 60,-31" strokeWidth="1" opacity="0.7"/>
            <path d="M59,-16 Q64,-21 69,-26" strokeWidth="0.9" opacity="0.7"/>
          </g>
        )}

        {/* Lower lash line - subtle */}
        {!isBlinking && (
          <g stroke="#4a4a4a" strokeLinecap="round" opacity="0.6">
            <path d="M15,12 Q14,15 12,17" strokeWidth="0.6"/>
            <path d="M22,14 Q22,17 21,19" strokeWidth="0.6"/>
            <path d="M30,15 Q30,18 30,21" strokeWidth="0.7"/>
            <path d="M38,15 Q39,18 39,21" strokeWidth="0.7"/>
            <path d="M46,15 Q47,18 48,20" strokeWidth="0.7"/>
            <path d="M54,14 Q55,17 57,19" strokeWidth="0.6"/>
            <path d="M62,12 Q64,14 66,16" strokeWidth="0.6"/>
          </g>
        )}

        {/* Waterline highlight */}
        <path
          d={isBlinking ? "" : "M5,1 Q40,6 75,1"}
          fill="none"
          stroke="#ddd"
          strokeWidth="0.5"
          opacity={isBlinking ? 0 : 0.4}
          style={{ transition: 'opacity 0.15s ease-in-out' }}
        />
      </g>

      {/* Right eye - mirrored with proper spacing */}
      <g transform="translate(355, 60) scale(-1, 1)" style={{ filter: 'url(#pencil)' }}>
        {/* Eyebrow */}
        <path
          d="M-5,-38 Q35,-52 85,-42"
          fill="none"
          stroke="#4a4a4a"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={isBlinking ? 0.6 : 0.7}
        />
        <path
          d="M0,-36 Q35,-48 80,-40"
          fill="none"
          stroke="#5a5a5a"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={isBlinking ? 0.3 : 0.4}
        />

        {/* Upper eyelid crease */}
        <path
          d={isBlinking ? "M2,-4 Q40,-6 78,-4" : "M2,-22 Q40,-32 78,-22"}
          fill="none"
          stroke="#888"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity={isBlinking ? 0.3 : 0.5}
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Eye shape */}
        <path
          d={isBlinking
            ? "M0,0 C20,-3 60,-3 80,0 C60,3 20,3 0,0"
            : "M0,0 C15,-22 65,-22 80,0 C65,18 15,18 0,0"
          }
          fill={isBlinking ? "none" : "#faf8f5"}
          stroke="#3a3a3a"
          strokeWidth="1.2"
          strokeLinecap="round"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Inner corner detail */}
        <path
          d={isBlinking ? "" : "M-2,0 Q2,-2 5,0 Q2,2 -2,0"}
          fill="#e8d4c8"
          stroke="#999"
          strokeWidth="0.5"
          opacity={isBlinking ? 0 : 0.6}
          style={{ transition: 'opacity 0.15s ease-in-out' }}
        />

        {/* Iris */}
        <circle
          cx="40"
          cy="0"
          r={isBlinking ? 0 : 14}
          fill="url(#irisGradient)"
          stroke="#2a2a2a"
          strokeWidth="0.8"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Iris detail lines */}
        {!isBlinking && (
          <g opacity="0.3">
            <path d="M40,-14 L40,-5" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M33,-12 L36,-5" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M47,-12 L44,-5" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M28,-8 L34,-4" stroke="#1a1a1a" strokeWidth="0.3"/>
            <path d="M52,-8 L46,-4" stroke="#1a1a1a" strokeWidth="0.3"/>
          </g>
        )}

        {/* Pupil */}
        <circle
          cx="40"
          cy="0"
          r={isBlinking ? 0 : 6}
          fill="#0a0a0a"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Light reflections - flipped for right eye */}
        <circle
          cx="36"
          cy="-4"
          r={isBlinking ? 0 : 2.5}
          fill="#fff"
          opacity="0.9"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />
        <circle
          cx="44"
          cy="3"
          r={isBlinking ? 0 : 1}
          fill="#fff"
          opacity="0.5"
          style={{ transition: 'all 0.15s ease-in-out' }}
        />

        {/* Upper lashes */}
        {!isBlinking && (
          <g stroke="#2a2a2a" strokeLinecap="round">
            <path d="M8,-15 Q6,-22 3,-28" strokeWidth="1.2"/>
            <path d="M14,-18 Q13,-26 11,-33" strokeWidth="1.3"/>
            <path d="M20,-20 Q20,-29 19,-37" strokeWidth="1.4"/>
            <path d="M27,-21 Q28,-31 28,-40" strokeWidth="1.5"/>
            <path d="M34,-22 Q36,-32 37,-42" strokeWidth="1.5"/>
            <path d="M41,-22 Q44,-32 47,-41" strokeWidth="1.5"/>
            <path d="M48,-21 Q52,-30 56,-38" strokeWidth="1.4"/>
            <path d="M55,-19 Q60,-27 65,-34" strokeWidth="1.3"/>
            <path d="M62,-16 Q68,-23 74,-28" strokeWidth="1.2"/>
            <path d="M68,-13 Q74,-18 80,-22" strokeWidth="1.1"/>
            <path d="M11,-16 Q9,-22 7,-27" strokeWidth="0.9" opacity="0.7"/>
            <path d="M17,-19 Q16,-25 15,-31" strokeWidth="1" opacity="0.7"/>
            <path d="M24,-20 Q24,-27 24,-34" strokeWidth="1.1" opacity="0.7"/>
            <path d="M31,-21 Q32,-28 33,-36" strokeWidth="1.2" opacity="0.7"/>
            <path d="M38,-22 Q40,-29 42,-37" strokeWidth="1.2" opacity="0.7"/>
            <path d="M45,-21 Q48,-28 51,-35" strokeWidth="1.1" opacity="0.7"/>
            <path d="M52,-19 Q56,-25 60,-31" strokeWidth="1" opacity="0.7"/>
            <path d="M59,-16 Q64,-21 69,-26" strokeWidth="0.9" opacity="0.7"/>
          </g>
        )}

        {/* Lower lash line */}
        {!isBlinking && (
          <g stroke="#4a4a4a" strokeLinecap="round" opacity="0.6">
            <path d="M15,12 Q14,15 12,17" strokeWidth="0.6"/>
            <path d="M22,14 Q22,17 21,19" strokeWidth="0.6"/>
            <path d="M30,15 Q30,18 30,21" strokeWidth="0.7"/>
            <path d="M38,15 Q39,18 39,21" strokeWidth="0.7"/>
            <path d="M46,15 Q47,18 48,20" strokeWidth="0.7"/>
            <path d="M54,14 Q55,17 57,19" strokeWidth="0.6"/>
            <path d="M62,12 Q64,14 66,16" strokeWidth="0.6"/>
          </g>
        )}

        {/* Waterline highlight */}
        <path
          d={isBlinking ? "" : "M5,1 Q40,6 75,1"}
          fill="none"
          stroke="#ddd"
          strokeWidth="0.5"
          opacity={isBlinking ? 0 : 0.4}
          style={{ transition: 'opacity 0.15s ease-in-out' }}
        />
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
        <div style={{ marginBottom: 24, width: '100%', maxWidth: 440 }}>
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
