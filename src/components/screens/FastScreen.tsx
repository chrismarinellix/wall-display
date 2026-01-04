import { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, CheckCircle2, PenLine, Flame, Brain, Zap, Heart, Sparkles, Clock, ChevronDown, ChevronUp, History } from 'lucide-react';
import { getCurrentFast, startFast, endFast, FastingRecord, subscribeToFasting, getFastingNotes, addFastingNote, FastingNote, getFastingHistoryWithNotes, subscribeToFastingNotes } from '../../services/supabase';
import { format } from 'date-fns';

// Comprehensive fasting milestones with rich detail
const FASTING_MILESTONES = [
  {
    hour: 0,
    title: 'Fast Begins',
    shortDesc: 'Blood sugar rising from last meal',
    detail: 'Your body is using glucose from your last meal. Insulin levels are elevated to help cells absorb blood sugar.',
    icon: 'clock',
    color: '#6b7280',
    benefits: ['Digestion active', 'Insulin working']
  },
  {
    hour: 2,
    title: 'Digestion Winding Down',
    shortDesc: 'Stomach emptying, insulin dropping',
    detail: 'Food has moved to the small intestine. Your body is still processing nutrients but insulin is starting to decrease.',
    icon: 'clock',
    color: '#6b7280',
    benefits: ['Nutrient absorption', 'Blood sugar normalizing']
  },
  {
    hour: 4,
    title: 'Blood Sugar Stable',
    shortDesc: 'Post-absorptive state beginning',
    detail: 'Your stomach is now empty. Blood sugar has returned to baseline. The body is transitioning to using stored energy.',
    icon: 'zap',
    color: '#eab308',
    benefits: ['Stable energy', 'Insulin low', 'Fat access begins']
  },
  {
    hour: 6,
    title: 'Fat Burning Activates',
    shortDesc: 'Glycogen stores depleting',
    detail: 'Liver glycogen (stored glucose) is being used up. Your body is increasingly turning to fat for energy. Glucagon rises.',
    icon: 'flame',
    color: '#f97316',
    benefits: ['Burning fat stores', 'Glucagon rising', 'Growth hormone increasing']
  },
  {
    hour: 8,
    title: 'Entering Ketosis',
    shortDesc: 'Liver producing ketones',
    detail: 'With glycogen depleted, your liver converts fatty acids into ketones. These become fuel for your brain and body.',
    icon: 'flame',
    color: '#ef4444',
    benefits: ['Ketone production', 'Mental clarity beginning', 'Steady energy']
  },
  {
    hour: 10,
    title: 'Growth Hormone Surge',
    shortDesc: 'HGH levels significantly elevated',
    detail: 'Human Growth Hormone can increase up to 5x. This protects muscle, promotes fat burning, and supports cellular repair.',
    icon: 'zap',
    color: '#8b5cf6',
    benefits: ['Muscle preservation', 'Enhanced fat burning', 'Anti-aging effects']
  },
  {
    hour: 12,
    title: 'Deep Ketosis',
    shortDesc: 'Brain using ketones for fuel',
    detail: 'Ketone levels are elevated. Your brain is efficiently using ketones, which may enhance focus and mental clarity.',
    icon: 'brain',
    color: '#3b82f6',
    benefits: ['Enhanced focus', 'Reduced inflammation', 'Stable mood']
  },
  {
    hour: 14,
    title: 'Autophagy Initiates',
    shortDesc: 'Cellular cleanup beginning',
    detail: 'Autophagy (self-eating) begins. Cells start breaking down damaged proteins and dysfunctional components for recycling.',
    icon: 'sparkles',
    color: '#10b981',
    benefits: ['Cellular cleanup', 'Damaged protein removal', 'Immune boost']
  },
  {
    hour: 16,
    title: 'Autophagy Active',
    shortDesc: 'Deep cellular renewal',
    detail: 'Autophagy is now significantly active. Old and damaged cellular components are being recycled and renewed.',
    icon: 'sparkles',
    color: '#14b8a6',
    benefits: ['Deep cellular repair', 'Mitochondria renewal', 'Longevity pathways active']
  },
  {
    hour: 18,
    title: 'Peak Fat Burning',
    shortDesc: 'Maximum metabolic efficiency',
    detail: 'Your body is highly efficient at burning fat. Insulin is very low, allowing maximum access to fat stores.',
    icon: 'flame',
    color: '#f43f5e',
    benefits: ['Maximum fat oxidation', 'Insulin sensitivity improving', 'Metabolic flexibility']
  },
  {
    hour: 20,
    title: 'Inflammation Reducing',
    shortDesc: 'Inflammatory markers dropping',
    detail: 'Pro-inflammatory markers are decreasing. This reduces oxidative stress and supports overall health.',
    icon: 'heart',
    color: '#ec4899',
    benefits: ['Lower inflammation', 'Reduced oxidative stress', 'Heart health benefits']
  },
  {
    hour: 22,
    title: 'Cellular Renewal',
    shortDesc: 'New cell growth stimulated',
    detail: 'With old components cleared, pathways for building new cellular structures are activated. BDNF increases in the brain.',
    icon: 'sparkles',
    color: '#a855f7',
    benefits: ['New cell growth', 'Brain plasticity (BDNF)', 'Stem cell activation']
  },
  {
    hour: 24,
    title: 'Fast Complete!',
    shortDesc: 'Maximum benefits achieved',
    detail: 'Congratulations! You\'ve completed a full 24-hour fast. Your body has undergone significant metabolic and cellular renewal.',
    icon: 'check',
    color: '#22c55e',
    benefits: ['Full autophagy cycle', 'Metabolic reset', 'Insulin sensitivity restored']
  },
];

const MOODS = [
  { value: 'great', label: 'Great', emoji: '😊', color: '#22c55e' },
  { value: 'good', label: 'Good', emoji: '🙂', color: '#84cc16' },
  { value: 'okay', label: 'Okay', emoji: '😐', color: '#eab308' },
  { value: 'tough', label: 'Tough', emoji: '😕', color: '#f97316' },
  { value: 'difficult', label: 'Hard', emoji: '😣', color: '#ef4444' },
] as const;

// Common fasting symptoms and feelings - organized by category
const FEELING_OPTIONS = {
  physical: {
    label: 'Physical',
    options: [
      { id: 'hungry', label: 'Hungry', emoji: '🍽️' },
      { id: 'headache', label: 'Headache', emoji: '🤕' },
      { id: 'dizzy', label: 'Dizzy', emoji: '💫' },
      { id: 'nauseous', label: 'Nauseous', emoji: '🤢' },
      { id: 'cold', label: 'Cold', emoji: '🥶' },
      { id: 'shaky', label: 'Shaky', emoji: '🫨' },
      { id: 'stomach_growling', label: 'Stomach growling', emoji: '🎵' },
      { id: 'light_headed', label: 'Light-headed', emoji: '🌀' },
      { id: 'energetic', label: 'Energetic', emoji: '⚡' },
      { id: 'tired', label: 'Tired', emoji: '😴' },
      { id: 'strong', label: 'Strong', emoji: '💪' },
      { id: 'weak', label: 'Weak', emoji: '😔' },
    ]
  },
  mental: {
    label: 'Mental',
    options: [
      { id: 'focused', label: 'Focused', emoji: '🎯' },
      { id: 'brain_fog', label: 'Brain fog', emoji: '🌫️' },
      { id: 'clear_minded', label: 'Clear minded', emoji: '💎' },
      { id: 'irritable', label: 'Irritable', emoji: '😤' },
      { id: 'calm', label: 'Calm', emoji: '😌' },
      { id: 'anxious', label: 'Anxious', emoji: '😰' },
      { id: 'motivated', label: 'Motivated', emoji: '🔥' },
      { id: 'unmotivated', label: 'Unmotivated', emoji: '😑' },
      { id: 'euphoric', label: 'Euphoric', emoji: '🤩' },
      { id: 'productive', label: 'Productive', emoji: '📈' },
    ]
  },
  cravings: {
    label: 'Cravings',
    options: [
      { id: 'no_cravings', label: 'No cravings', emoji: '✅' },
      { id: 'sugar_craving', label: 'Sugar craving', emoji: '🍬' },
      { id: 'carb_craving', label: 'Carb craving', emoji: '🍞' },
      { id: 'salt_craving', label: 'Salt craving', emoji: '🧂' },
      { id: 'coffee_craving', label: 'Coffee craving', emoji: '☕' },
      { id: 'food_thoughts', label: 'Thinking about food', emoji: '💭' },
      { id: 'easy_ignore', label: 'Easy to ignore', emoji: '🙅' },
      { id: 'intense_hunger', label: 'Intense hunger', emoji: '🔥' },
    ]
  },
  positive: {
    label: 'Positive Signs',
    options: [
      { id: 'feeling_light', label: 'Feeling light', emoji: '🪶' },
      { id: 'mental_clarity', label: 'Mental clarity', emoji: '🧠' },
      { id: 'proud', label: 'Proud of myself', emoji: '🏆' },
      { id: 'in_control', label: 'In control', emoji: '👑' },
      { id: 'accomplished', label: 'Accomplished', emoji: '✨' },
      { id: 'peaceful', label: 'Peaceful', emoji: '🕊️' },
      { id: 'spiritual', label: 'Spiritual', emoji: '🙏' },
      { id: 'cleansed', label: 'Cleansed', emoji: '💧' },
    ]
  }
};

const FAST_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

function MilestoneIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  switch (icon) {
    case 'flame': return <Flame size={size} />;
    case 'brain': return <Brain size={size} />;
    case 'zap': return <Zap size={size} />;
    case 'heart': return <Heart size={size} />;
    case 'sparkles': return <Sparkles size={size} />;
    case 'check': return <CheckCircle2 size={size} />;
    default: return <Clock size={size} />;
  }
}

export function FastScreen() {
  const [currentFast, setCurrentFast] = useState<FastingRecord | null>(null);
  const [notes, setNotes] = useState<FastingNote[]>([]);
  const [pastFasts, setPastFasts] = useState<(FastingRecord & { notes_count: number })[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [showDiary, setShowDiary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  // Diary form state
  const [diaryNote, setDiaryNote] = useState('');
  const [diaryMood, setDiaryMood] = useState<FastingNote['mood']>('okay');
  const [diaryEnergy, setDiaryEnergy] = useState(3);
  const [diaryHunger, setDiaryHunger] = useState(3);
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  const toggleFeeling = (id: string) => {
    setSelectedFeelings(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // Load current fast and history
  useEffect(() => {
    const loadData = async () => {
      const [fast, history] = await Promise.all([
        getCurrentFast(),
        getFastingHistoryWithNotes()
      ]);
      setCurrentFast(fast);
      setPastFasts(history);
      setLoading(false);
    };
    loadData();

    const unsubscribe = subscribeToFasting((fast) => {
      setCurrentFast(fast);
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Load and subscribe to notes for current fast
  useEffect(() => {
    if (!currentFast?.id) {
      setNotes([]);
      return;
    }

    getFastingNotes(currentFast.id).then(setNotes);

    const unsubscribe = subscribeToFastingNotes(currentFast.id, setNotes);
    return () => { if (unsubscribe) unsubscribe(); };
  }, [currentFast?.id]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartFast = useCallback(async () => {
    const fast = await startFast(24);
    setCurrentFast(fast);
    setShowDiary(false);
    setShowHistory(false);
  }, []);

  const handleEndFast = useCallback(async () => {
    if (currentFast?.id) {
      const fastStartTime = new Date(currentFast.start_time).getTime();
      const elapsed = Date.now() - fastStartTime;
      const completed = elapsed >= FAST_DURATION;
      await endFast(currentFast.id, completed);
      setCurrentFast(null);
      // Refresh history
      getFastingHistoryWithNotes().then(setPastFasts);
    }
  }, [currentFast]);

  const handleAddNote = useCallback(async () => {
    if (!currentFast?.id || (selectedFeelings.length === 0 && !diaryNote.trim())) return;

    setSavingNote(true);
    const fastStartTime = new Date(currentFast.start_time).getTime();
    const elapsedHours = Math.floor((Date.now() - fastStartTime) / (1000 * 60 * 60));

    // Build the note from selected feelings + optional text
    const feelingLabels = selectedFeelings.map(id => {
      for (const category of Object.values(FEELING_OPTIONS)) {
        const opt = category.options.find(o => o.id === id);
        if (opt) return `${opt.emoji} ${opt.label}`;
      }
      return id;
    });
    const feelingsText = feelingLabels.join(', ');
    const fullNote = diaryNote.trim()
      ? `${feelingsText}${feelingsText ? ' — ' : ''}${diaryNote.trim()}`
      : feelingsText;

    await addFastingNote({
      fasting_id: currentFast.id,
      hour_mark: elapsedHours,
      mood: diaryMood,
      energy_level: diaryEnergy,
      hunger_level: diaryHunger,
      note: fullNote,
    });

    setDiaryNote('');
    setSelectedFeelings([]);
    setSavingNote(false);

    // Refresh notes
    const updatedNotes = await getFastingNotes(currentFast.id);
    setNotes(updatedNotes);
  }, [currentFast, diaryNote, diaryMood, diaryEnergy, diaryHunger, selectedFeelings]);

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
  const passedMilestones = FASTING_MILESTONES.filter(m => m.hour <= elapsedHours && m.hour > 0);
  const upcomingMilestones = FASTING_MILESTONES.filter(m => m.hour > elapsedHours);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ height: '100%', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
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
      overflow: 'auto',
      color: '#fff',
    }}>
      {/* Hero section - centered Fast! with timer */}
      <div style={{
        padding: '30px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: currentFast ? 'auto' : '50vh',
      }}>
        {/* Big FAST! title */}
        <h1 style={{
          fontSize: 'clamp(80px, 18vw, 160px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: 0,
          marginBottom: currentFast ? '16px' : '24px',
          color: isComplete ? '#22c55e' : '#fff',
          textAlign: 'center',
        }}>
          Fast!
        </h1>

        {/* Current milestone - shown when fasting */}
        {currentFast && (
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: 'clamp(18px, 4vw, 28px)',
              fontWeight: 600,
              color: isComplete ? '#22c55e' : currentMilestone.color,
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
              <MilestoneIcon icon={currentMilestone.icon} size={24} />
              {currentMilestone.title}
            </div>
            <div style={{
              fontSize: 'clamp(13px, 2.5vw, 18px)',
              color: 'rgba(255,255,255,0.6)',
            }}>
              {currentMilestone.shortDesc}
            </div>
          </div>
        )}

        {/* Timer display - big and centered */}
        {currentFast && (
          <div style={{
            display: 'flex',
            gap: 'clamp(24px, 6vw, 60px)',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            {/* Elapsed time */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'clamp(32px, 8vw, 56px)',
                fontWeight: 700,
                fontFamily: 'ui-monospace, monospace',
                color: '#22c55e',
                lineHeight: 1,
              }}>
                {formatTime(elapsedMs)}
              </div>
              <div style={{
                fontSize: 'clamp(10px, 2vw, 14px)',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 6,
              }}>
                Fasted
              </div>
            </div>

            {/* Divider */}
            <div style={{
              width: 2,
              height: 50,
              background: 'rgba(255,255,255,0.2)',
            }} />

            {/* Remaining time */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 'clamp(32px, 8vw, 56px)',
                fontWeight: 700,
                fontFamily: 'ui-monospace, monospace',
                color: isComplete ? '#22c55e' : '#ef4444',
                lineHeight: 1,
              }}>
                {isComplete ? '00:00:00' : formatTime(remainingMs)}
              </div>
              <div style={{
                fontSize: 'clamp(10px, 2vw, 14px)',
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: 6,
              }}>
                {isComplete ? 'Complete!' : 'Remaining'}
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {currentFast && (
          <div style={{ width: '100%', maxWidth: 500, position: 'relative', marginBottom: '20px' }}>
            <div style={{
              width: '100%',
              height: 10,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 5,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: isComplete ? '#22c55e' : `linear-gradient(90deg, ${currentMilestone.color}, ${nextMilestone?.color || '#22c55e'})`,
                borderRadius: 5,
                transition: 'width 1s linear',
              }} />
            </div>
            {/* Milestone dots */}
            {FASTING_MILESTONES.filter(m => m.hour > 0 && m.hour < 24).map(m => (
              <div
                key={m.hour}
                style={{
                  position: 'absolute',
                  left: `${(m.hour / 24) * 100}%`,
                  top: -1,
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
        )}

        {/* Next milestone */}
        {currentFast && nextMilestone && !isComplete && (
          <div style={{
            fontSize: 'clamp(11px, 2vw, 14px)',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '20px',
          }}>
            Next: <span style={{ color: nextMilestone.color }}>{nextMilestone.title}</span> in {Math.ceil(nextMilestone.hour - elapsedHours)}h
          </div>
        )}

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!currentFast ? (
            <button
              onClick={handleStartFast}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#000',
                border: 'none',
                borderRadius: 12,
                fontSize: 18,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(34, 197, 94, 0.4)',
              }}
            >
              <Play size={22} /> Start 24h Fast
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowDiary(!showDiary)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  background: showDiary ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: showDiary ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <PenLine size={18} /> Journal
              </button>

              <button
                onClick={() => setShowAllMilestones(!showAllMilestones)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  background: showAllMilestones ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={18} /> Stages
              </button>

              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  background: showHistory ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <History size={18} /> History
              </button>

              <button
                onClick={handleEndFast}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  background: isComplete ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'rgba(239, 68, 68, 0.2)',
                  color: isComplete ? '#000' : '#ef4444',
                  border: isComplete ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isComplete ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
                {isComplete ? 'Complete!' : 'End'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expandable content area */}
      <div style={{ flex: 1, padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Diary input panel */}
        {showDiary && currentFast && (
          <div style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 16,
            padding: 20,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>
              How are you feeling? <span style={{ fontWeight: 400, opacity: 0.7 }}>Hour {Math.floor(elapsedHours)}</span>
            </h3>

            {/* Overall Mood selector */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Overall Mood</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {MOODS.map(mood => (
                  <button
                    key={mood.value}
                    onClick={() => setDiaryMood(mood.value)}
                    style={{
                      padding: '10px 18px',
                      background: diaryMood === mood.value ? mood.color : 'rgba(255,255,255,0.05)',
                      color: diaryMood === mood.value ? '#000' : '#fff',
                      border: diaryMood === mood.value ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 24,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Energy & Hunger sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Energy: {diaryEnergy}/5
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setDiaryEnergy(n)}
                      style={{
                        width: 40,
                        height: 40,
                        background: n <= diaryEnergy ? '#eab308' : 'rgba(255,255,255,0.08)',
                        border: 'none',
                        borderRadius: 10,
                        color: n <= diaryEnergy ? '#000' : '#555',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Zap size={18} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Hunger: {diaryHunger}/5
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setDiaryHunger(n)}
                      style={{
                        width: 40,
                        height: 40,
                        background: n <= diaryHunger ? '#ef4444' : 'rgba(255,255,255,0.08)',
                        border: 'none',
                        borderRadius: 10,
                        color: n <= diaryHunger ? '#fff' : '#555',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feeling selectors by category */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                What are you experiencing? <span style={{ opacity: 0.6 }}>(tap all that apply)</span>
              </div>
              {Object.entries(FEELING_OPTIONS).map(([categoryId, category]) => (
                <div key={categoryId} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{category.label}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {category.options.map(option => {
                      const isSelected = selectedFeelings.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          onClick={() => toggleFeeling(option.id)}
                          style={{
                            padding: '8px 14px',
                            background: isSelected ? 'rgba(139, 92, 246, 0.4)' : 'rgba(255,255,255,0.05)',
                            color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                            border: isSelected ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.15s',
                          }}
                        >
                          <span>{option.emoji}</span>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected feelings summary */}
            {selectedFeelings.length > 0 && (
              <div style={{
                padding: 12,
                background: 'rgba(139, 92, 246, 0.2)',
                borderRadius: 10,
                marginBottom: 16,
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
              }}>
                <strong>Selected:</strong> {selectedFeelings.map(id => {
                  for (const category of Object.values(FEELING_OPTIONS)) {
                    const opt = category.options.find(o => o.id === id);
                    if (opt) return `${opt.emoji} ${opt.label}`;
                  }
                  return id;
                }).join(', ')}
              </div>
            )}

            {/* Optional additional note */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Additional notes <span style={{ opacity: 0.6 }}>(optional)</span>
              </div>
              <textarea
                value={diaryNote}
                onChange={(e) => setDiaryNote(e.target.value)}
                placeholder="Any other thoughts or observations..."
                style={{
                  width: '100%',
                  minHeight: 70,
                  padding: 14,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={handleAddNote}
              disabled={(selectedFeelings.length === 0 && !diaryNote.trim()) || savingNote}
              style={{
                padding: '14px 28px',
                background: (selectedFeelings.length > 0 || diaryNote.trim()) ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255,255,255,0.1)',
                color: (selectedFeelings.length > 0 || diaryNote.trim()) ? '#fff' : '#666',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                cursor: (selectedFeelings.length > 0 || diaryNote.trim()) ? 'pointer' : 'not-allowed',
                boxShadow: (selectedFeelings.length > 0 || diaryNote.trim()) ? '0 4px 20px rgba(139, 92, 246, 0.3)' : 'none',
              }}
            >
              {savingNote ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        )}

        {/* Previous notes for this fast */}
        {currentFast && notes.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 20,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              Your Journey ({notes.length} {notes.length === 1 ? 'note' : 'notes'})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notes.map((note, i) => {
                const mood = MOODS.find(m => m.value === note.mood);
                return (
                  <div key={note.id || i} style={{
                    display: 'flex',
                    gap: 12,
                    padding: 12,
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                    borderLeft: `3px solid ${mood?.color || '#666'}`,
                  }}>
                    <div style={{ fontSize: 24 }}>{mood?.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                        <span>Hour {note.hour_mark}</span>
                        <span>Energy: {note.energy_level}/5</span>
                        <span>Hunger: {note.hunger_level}/5</span>
                      </div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{note.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current milestone detail */}
        {currentFast && (
          <div style={{
            background: `linear-gradient(135deg, ${currentMilestone.color}15 0%, ${currentMilestone.color}05 100%)`,
            border: `1px solid ${currentMilestone.color}40`,
            borderRadius: 16,
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${currentMilestone.color}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: currentMilestone.color,
              }}>
                <MilestoneIcon icon={currentMilestone.icon} size={24} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Current Stage • Hour {currentMilestone.hour}
                </div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: currentMilestone.color }}>
                  {currentMilestone.title}
                </h2>
              </div>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
              {currentMilestone.detail}
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {currentMilestone.benefits.map((benefit, i) => (
                <span key={i} style={{
                  padding: '6px 12px',
                  background: `${currentMilestone.color}20`,
                  borderRadius: 20,
                  fontSize: 12,
                  color: currentMilestone.color,
                }}>
                  {benefit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next milestone preview */}
        {currentFast && nextMilestone && !isComplete && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `${nextMilestone.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: nextMilestone.color,
                }}>
                  <MilestoneIcon icon={nextMilestone.icon} size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Next milestone</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: nextMilestone.color }}>{nextMilestone.title}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {Math.ceil(nextMilestone.hour - elapsedHours)}h
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>to go</div>
              </div>
            </div>
          </div>
        )}

        {/* All milestones timeline */}
        {currentFast && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setShowAllMilestones(!showAllMilestones)}
              style={{
                width: '100%',
                padding: '16px 20px',
                background: 'transparent',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600 }}>All Milestones</span>
              {showAllMilestones ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showAllMilestones && (
              <div style={{ padding: '0 20px 20px' }}>
                {FASTING_MILESTONES.filter(m => m.hour > 0).map((m, i) => {
                  const isPassed = elapsedHours >= m.hour;
                  const isCurrent = currentMilestone.hour === m.hour;
                  return (
                    <div key={m.hour} style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: i < FASTING_MILESTONES.length - 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      opacity: isPassed ? 1 : 0.4,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isPassed ? `${m.color}30` : 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isPassed ? m.color : 'rgba(255,255,255,0.3)',
                      }}>
                        <MilestoneIcon icon={m.icon} size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: isPassed ? m.color : 'rgba(255,255,255,0.5)' }}>
                            {m.title}
                          </span>
                          {isCurrent && <span style={{ fontSize: 10, background: m.color, color: '#000', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>NOW</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{m.shortDesc}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{m.hour}h</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Past fasts history */}
        {showHistory && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 16,
            padding: 20,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Past Fasts</h3>
            {pastFasts.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>No completed fasts yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pastFasts.map((fast) => {
                  const startDate = new Date(fast.start_time);
                  const endDate = fast.end_time ? new Date(fast.end_time) : null;
                  const duration = endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60) : 0;
                  return (
                    <div key={fast.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      borderLeft: `3px solid ${fast.completed ? '#22c55e' : '#ef4444'}`,
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: fast.completed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: fast.completed ? '#22c55e' : '#ef4444',
                      }}>
                        {fast.completed ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {format(startDate, 'MMM d, yyyy')}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                          {duration.toFixed(1)}h • {fast.notes_count} {fast.notes_count === 1 ? 'note' : 'notes'}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: fast.completed ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: fast.completed ? '#22c55e' : '#ef4444',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {fast.completed ? 'Completed' : 'Ended Early'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Start prompt when not fasting */}
        {!currentFast && !showHistory && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🍽️</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>Ready to Fast?</h2>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.6)', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
              Start a 24-hour fast to experience the benefits of autophagy, ketosis, and metabolic renewal.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300, margin: '0 auto' }}>
              {[
                { hour: 12, benefit: 'Ketosis & Mental Clarity' },
                { hour: 16, benefit: 'Autophagy Begins' },
                { hour: 24, benefit: 'Complete Metabolic Reset' },
              ].map(({ hour, benefit }) => (
                <div key={hour} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10,
                  textAlign: 'left',
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(34, 197, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#22c55e',
                    fontWeight: 700,
                    fontSize: 12,
                  }}>
                    {hour}h
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
