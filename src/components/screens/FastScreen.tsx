import { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, CheckCircle2 } from 'lucide-react';
import { getCurrentFast, startFast, endFast, FastingRecord, subscribeToFasting } from '../../services/supabase';

// Fasting milestones - what happens at each hour
const FASTING_MILESTONES = [
  { hour: 0, title: 'Fast Started', description: 'Blood sugar begins to drop' },
  { hour: 2, title: 'Digestion Complete', description: 'Stomach emptying, insulin dropping' },
  { hour: 4, title: 'Blood Sugar Stable', description: 'Body switching fuel sources' },
  { hour: 6, title: 'Fat Burning Begins', description: 'Glycogen stores depleting' },
  { hour: 8, title: 'Entering Ketosis', description: 'Liver producing ketones' },
  { hour: 10, title: 'Growth Hormone Rising', description: 'HGH levels increasing' },
  { hour: 12, title: 'Ketosis Active', description: 'Brain using ketones for fuel' },
  { hour: 14, title: 'Autophagy Starting', description: 'Cells begin self-cleaning' },
  { hour: 16, title: 'Deep Autophagy', description: 'Damaged proteins recycled' },
  { hour: 18, title: 'Peak Fat Burning', description: 'Maximum metabolic efficiency' },
  { hour: 20, title: 'Inflammation Down', description: 'Inflammatory markers reducing' },
  { hour: 22, title: 'Cellular Renewal', description: 'New cell growth stimulated' },
  { hour: 24, title: 'Fast Complete!', description: 'Maximum benefits achieved' },
];

// Speed benefits (marked with *)
const SPEED_BENEFITS = [
  '* Decide quickly',
  '* Ship daily',
  '* No overthinking',
  '* Just action',
  '* Move now',
  '* Done beats perfect',
];

const FAST_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

export function FastScreen() {
  const [currentFast, setCurrentFast] = useState<FastingRecord | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  // Load current fast from Supabase
  useEffect(() => {
    const loadFast = async () => {
      const fast = await getCurrentFast();
      setCurrentFast(fast);
      setLoading(false);
    };
    loadFast();

    // Subscribe to changes
    const unsubscribe = subscribeToFasting((fast) => {
      setCurrentFast(fast);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartFast = useCallback(async () => {
    const fast = await startFast(24);
    setCurrentFast(fast);
  }, []);

  const handleEndFast = useCallback(async () => {
    if (currentFast?.id) {
      const fastStartTime = new Date(currentFast.start_time).getTime();
      const elapsed = Date.now() - fastStartTime;
      const completed = elapsed >= FAST_DURATION;
      await endFast(currentFast.id, completed);
      setCurrentFast(null);
    }
  }, [currentFast]);

  // Calculate elapsed and remaining time
  const fastStartTime = currentFast ? new Date(currentFast.start_time).getTime() : null;
  const elapsedMs = fastStartTime ? now - fastStartTime : 0;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingMs = fastStartTime ? Math.max(0, FAST_DURATION - elapsedMs) : FAST_DURATION;
  const isComplete = fastStartTime && elapsedMs >= FAST_DURATION;
  const progress = fastStartTime ? Math.min(100, (elapsedMs / FAST_DURATION) * 100) : 0;

  // Get current and next milestone
  const currentMilestone = FASTING_MILESTONES.filter(m => m.hour <= elapsedHours).pop() || FASTING_MILESTONES[0];
  const nextMilestone = FASTING_MILESTONES.find(m => m.hour > elapsedHours);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get a speed benefit based on current hour
  const speedBenefit = SPEED_BENEFITS[Math.floor(elapsedHours) % SPEED_BENEFITS.length];

  if (loading) {
    return (
      <div style={{ height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '30px',
      color: '#fff',
    }}>
      {/* Main word */}
      <h1 style={{
        fontSize: 'clamp(80px, 18vw, 180px)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        margin: 0,
        marginBottom: '10px',
        color: isComplete ? '#22c55e' : '#fff',
      }}>
        Fast!
      </h1>

      {/* Current milestone */}
      {currentFast && (
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <div style={{
            fontSize: 'clamp(16px, 3vw, 24px)',
            fontWeight: 600,
            color: isComplete ? '#22c55e' : '#f59e0b',
            marginBottom: '4px',
          }}>
            {currentMilestone.title}
          </div>
          <div style={{
            fontSize: 'clamp(12px, 2vw, 16px)',
            color: 'rgba(255,255,255,0.6)',
          }}>
            {currentMilestone.description}
          </div>
        </div>
      )}

      {/* Timer section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '20px',
        width: '100%',
        maxWidth: '500px',
      }}>
        {/* Progress bar with milestone markers */}
        <div style={{
          width: '100%',
          position: 'relative',
          marginBottom: '24px',
        }}>
          <div style={{
            width: '100%',
            height: 8,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              background: isComplete ? '#22c55e' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
              borderRadius: 4,
              transition: 'width 1s linear',
            }} />
          </div>
          {/* Milestone dots */}
          {currentFast && FASTING_MILESTONES.filter(m => m.hour > 0 && m.hour < 24).map(m => (
            <div
              key={m.hour}
              style={{
                position: 'absolute',
                left: `${(m.hour / 24) * 100}%`,
                top: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: elapsedHours >= m.hour ? '#22c55e' : 'rgba(255,255,255,0.2)',
                transform: 'translateX(-50%)',
                border: '2px solid #000',
              }}
              title={`${m.hour}h: ${m.title}`}
            />
          ))}
        </div>

        {/* Time display */}
        <div style={{
          display: 'flex',
          gap: 'clamp(20px, 5vw, 50px)',
          alignItems: 'center',
        }}>
          {/* Elapsed time */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(24px, 5vw, 40px)',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#22c55e',
            }}>
              {formatTime(elapsedMs)}
            </div>
            <div style={{
              fontSize: 'clamp(9px, 1.8vw, 12px)',
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
            height: 36,
            background: 'rgba(255,255,255,0.2)',
          }} />

          {/* Remaining time */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(24px, 5vw, 40px)',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: isComplete ? '#22c55e' : '#ef4444',
            }}>
              {isComplete ? '00:00:00' : formatTime(remainingMs)}
            </div>
            <div style={{
              fontSize: 'clamp(9px, 1.8vw, 12px)',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {isComplete ? 'Complete!' : 'Remaining'}
            </div>
          </div>
        </div>

        {/* Next milestone */}
        {currentFast && nextMilestone && !isComplete && (
          <div style={{
            marginTop: '16px',
            fontSize: 'clamp(10px, 2vw, 13px)',
            color: 'rgba(255,255,255,0.4)',
          }}>
            Next: {nextMilestone.title} in {Math.ceil(nextMilestone.hour - elapsedHours)}h
          </div>
        )}

        {/* Control buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginTop: '20px',
        }}>
          {!currentFast ? (
            <button
              onClick={handleStartFast}
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
              <Play size={20} /> Start 24h Fast
            </button>
          ) : (
            <button
              onClick={handleEndFast}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: isComplete ? '#22c55e' : 'rgba(255,255,255,0.1)',
                color: isComplete ? '#000' : '#fff',
                border: isComplete ? 'none' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isComplete ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
              {isComplete ? 'Complete Fast' : 'End Fast'}
            </button>
          )}
        </div>
      </div>

      {/* Speed benefit reminder */}
      <div style={{
        fontSize: 'clamp(12px, 2vw, 16px)',
        color: 'rgba(255,255,255,0.4)',
        marginTop: '10px',
      }}>
        {speedBenefit}
      </div>
    </div>
  );
}
