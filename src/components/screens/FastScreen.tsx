import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

// Fasting benefits
const FASTING_BENEFITS = [
  'Autophagy activated',
  'Cells regenerating',
  'Insulin dropping',
  'Fat burning mode',
  'HGH increasing',
  'Mental clarity',
  'Inflammation down',
  'Ketones rising',
  'Gut healing',
  'Energy stabilizing',
  'Focus sharpening',
  'Metabolism resetting',
  'Detox accelerating',
  'Longevity genes on',
  'Brain fog clearing',
  'Cravings fading',
  'Discipline building',
  'Willpower growing',
  'Body healing',
  'Mind strengthening',
];

// Speed benefits (marked with *)
const SPEED_BENEFITS = [
  '* Decide quickly',
  '* Ship daily',
  '* No overthinking',
  '* Just action',
  '* Move now',
  '* Done beats perfect',
  '* Momentum matters',
  '* Speed wins',
  '* Bias to action',
  '* Execute now',
];

const ALL_BENEFITS = [...FASTING_BENEFITS, ...SPEED_BENEFITS];

// Rotate benefits every 30 minutes (1800000ms)
const ROTATION_INTERVAL = 1800000;
const FAST_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
const STORAGE_KEY = 'fast_start_time';

export function FastScreen() {
  const [currentPairIndex, setCurrentPairIndex] = useState(() => {
    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    return Math.floor(minutesSinceMidnight / 30) % Math.floor(ALL_BENEFITS.length / 2);
  });
  const [isVisible, setIsVisible] = useState(true);
  const [fastStartTime, setFastStartTime] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [now, setNow] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate benefits
  useEffect(() => {
    const rotateBenefits = () => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentPairIndex(prev => (prev + 1) % Math.floor(ALL_BENEFITS.length / 2));
        setIsVisible(true);
      }, 1500);
    };

    const interval = setInterval(rotateBenefits, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const startFast = useCallback(() => {
    const startTime = Date.now();
    setFastStartTime(startTime);
    localStorage.setItem(STORAGE_KEY, startTime.toString());
  }, []);

  const resetFast = useCallback(() => {
    setFastStartTime(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Calculate elapsed and remaining time
  const elapsedMs = fastStartTime ? now - fastStartTime : 0;
  const remainingMs = fastStartTime ? Math.max(0, FAST_DURATION - elapsedMs) : FAST_DURATION;
  const isComplete = fastStartTime && elapsedMs >= FAST_DURATION;
  const progress = fastStartTime ? Math.min(100, (elapsedMs / FAST_DURATION) * 100) : 0;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const benefit1 = ALL_BENEFITS[currentPairIndex * 2];
  const benefit2 = ALL_BENEFITS[currentPairIndex * 2 + 1] || ALL_BENEFITS[0];

  return (
    <div style={{
      height: '100%',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#fff',
    }}>
      {/* Main word */}
      <h1 style={{
        fontSize: 'clamp(100px, 22vw, 240px)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        margin: 0,
        marginBottom: '20px',
        color: isComplete ? '#22c55e' : '#fff',
      }}>
        Fast!
      </h1>

      {/* Timer section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '40px',
      }}>
        {/* Progress bar */}
        <div style={{
          width: 'clamp(200px, 50vw, 400px)',
          height: 8,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: isComplete ? '#22c55e' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
            borderRadius: 4,
            transition: 'width 1s linear',
          }} />
        </div>

        {/* Time display */}
        <div style={{
          display: 'flex',
          gap: 'clamp(20px, 5vw, 60px)',
          alignItems: 'center',
        }}>
          {/* Elapsed time */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(28px, 6vw, 48px)',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#22c55e',
            }}>
              {formatTime(elapsedMs)}
            </div>
            <div style={{
              fontSize: 'clamp(10px, 2vw, 14px)',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Fasted
            </div>
          </div>

          {/* Divider */}
          <div style={{
            width: 2,
            height: 40,
            background: 'rgba(255,255,255,0.2)',
          }} />

          {/* Remaining time */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(28px, 6vw, 48px)',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: isComplete ? '#22c55e' : '#ef4444',
            }}>
              {isComplete ? '00:00:00' : formatTime(remainingMs)}
            </div>
            <div style={{
              fontSize: 'clamp(10px, 2vw, 14px)',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {isComplete ? 'Complete!' : 'Remaining'}
            </div>
          </div>
        </div>

        {/* Control buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginTop: '24px',
        }}>
          {!fastStartTime ? (
            <button
              onClick={startFast}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#22c55e',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Play size={20} /> Start Fast
            </button>
          ) : (
            <button
              onClick={resetFast}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={18} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Two benefits with fade animation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        fontSize: 'clamp(14px, 2vw, 22px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.6)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1.5s ease-in-out',
      }}>
        <span>{benefit1}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
        <span>{benefit2}</span>
      </div>
    </div>
  );
}
