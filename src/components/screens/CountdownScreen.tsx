import { useState, useEffect, useCallback } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, format, getMonth } from 'date-fns';
import { Plus, X, Calendar, Clock, RefreshCw, Pencil, Check, Sparkles } from 'lucide-react';
import {
  getCountdowns,
  addCountdown,
  removeCountdown,
  updateCountdown,
  subscribeToCountdowns,
  CountdownEvent as SupabaseCountdownEvent,
} from '../../services/supabase';

interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string;
  color: string;
}

function fromSupabase(e: SupabaseCountdownEvent): CountdownEvent {
  return { id: e.id, title: e.title, targetDate: e.target_date, color: e.color };
}

function toSupabase(e: CountdownEvent): SupabaseCountdownEvent {
  return { id: e.id, title: e.title, target_date: e.targetDate, color: e.color };
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

// Zodiac signs by month
const ZODIAC_SIGNS: { [key: number]: { symbol: string; name: string; dates: string } } = {
  0: { symbol: '♑', name: 'Capricorn', dates: 'Dec 22 - Jan 19' },
  1: { symbol: '♒', name: 'Aquarius', dates: 'Jan 20 - Feb 18' },
  2: { symbol: '♓', name: 'Pisces', dates: 'Feb 19 - Mar 20' },
  3: { symbol: '♈', name: 'Aries', dates: 'Mar 21 - Apr 19' },
  4: { symbol: '♉', name: 'Taurus', dates: 'Apr 20 - May 20' },
  5: { symbol: '♊', name: 'Gemini', dates: 'May 21 - Jun 20' },
  6: { symbol: '♋', name: 'Cancer', dates: 'Jun 21 - Jul 22' },
  7: { symbol: '♌', name: 'Leo', dates: 'Jul 23 - Aug 22' },
  8: { symbol: '♍', name: 'Virgo', dates: 'Aug 23 - Sep 22' },
  9: { symbol: '♎', name: 'Libra', dates: 'Sep 23 - Oct 22' },
  10: { symbol: '♏', name: 'Scorpio', dates: 'Oct 23 - Nov 21' },
  11: { symbol: '♐', name: 'Sagittarius', dates: 'Nov 22 - Dec 21' },
};

// Detect event type from title
function getEventType(title: string): 'birthday' | 'holiday' | 'travel' | 'event' {
  const lower = title.toLowerCase();
  if (lower.includes('birthday') || lower.includes('bday')) return 'birthday';
  if (lower.includes('christmas') || lower.includes('holiday') || lower.includes('easter')) return 'holiday';
  if (lower.includes('trip') || lower.includes('flight') || lower.includes('vacation') || lower.includes('travel')) return 'travel';
  return 'event';
}

// Get zodiac for a date
function getZodiac(date: Date): { symbol: string; name: string } {
  const month = getMonth(date);
  const day = date.getDate();

  // Adjust for zodiac date ranges
  if ((month === 0 && day <= 19) || (month === 11 && day >= 22)) return ZODIAC_SIGNS[0]; // Capricorn
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) return ZODIAC_SIGNS[1]; // Aquarius
  if ((month === 1 && day >= 19) || (month === 2 && day <= 20)) return ZODIAC_SIGNS[2]; // Pisces
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) return ZODIAC_SIGNS[3]; // Aries
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) return ZODIAC_SIGNS[4]; // Taurus
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) return ZODIAC_SIGNS[5]; // Gemini
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) return ZODIAC_SIGNS[6]; // Cancer
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) return ZODIAC_SIGNS[7]; // Leo
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return ZODIAC_SIGNS[8]; // Virgo
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return ZODIAC_SIGNS[9]; // Libra
  if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) return ZODIAC_SIGNS[10]; // Scorpio
  return ZODIAC_SIGNS[11]; // Sagittarius
}

// Generate AI insight for countdown
async function generateCountdownInsight(
  event: CountdownEvent,
  daysLeft: number,
  apiKey: string
): Promise<string> {
  if (!apiKey) return '';

  const eventType = getEventType(event.title);
  const targetDate = new Date(event.targetDate);
  const zodiac = eventType === 'birthday' ? getZodiac(targetDate) : null;

  const prompt = `Generate a single short, fun sentence (max 15 words) about this upcoming event:
Event: ${event.title}
Days until: ${daysLeft}
Date: ${format(targetDate, 'MMMM d')}
Type: ${eventType}
${zodiac ? `Zodiac: ${zodiac.name}` : ''}

Be creative and relevant to the event type. For birthdays, maybe reference the zodiac or age milestone.
For holidays, reference traditions. For travel, build excitement.
Respond with just the sentence, no quotes or extra text.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 50,
      }),
    });

    if (!response.ok) return '';
    const result = await response.json();
    return result.choices[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
}

function getTimeRemaining(targetDate: string) {
  const target = new Date(targetDate);
  const now = new Date();

  if (isPast(target)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;
  const seconds = differenceInSeconds(target, now) % 60;

  return { days, hours, minutes, seconds, isPast: false };
}

// Hero Countdown Card - big dramatic display
function HeroCountdown({
  event,
  onRemove,
  onEdit,
  insight,
}: {
  event: CountdownEvent;
  onRemove: () => void;
  onEdit: () => void;
  insight: string;
}) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(event.targetDate));
  const targetDate = new Date(event.targetDate);
  const eventType = getEventType(event.title);
  const zodiac = eventType === 'birthday' ? getZodiac(targetDate) : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(event.targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.targetDate]);

  if (timeLeft.isPast) return null;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${event.color}15 0%, ${event.color}05 100%)`,
        borderRadius: 16,
        padding: '32px 40px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${event.color}30`,
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: `1px solid ${event.color}20`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          border: `1px solid ${event.color}15`,
        }}
      />

      {/* Edit/Remove buttons */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: 'none',
            borderRadius: 6,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Pencil size={14} color="#666" />
        </button>
        <button
          onClick={onRemove}
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: 'none',
            borderRadius: 6,
            padding: 8,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} color="#666" />
        </button>
      </div>

      {/* Title with Zodiac */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        {zodiac && (
          <span
            style={{
              fontSize: 32,
              opacity: 0.8,
            }}
            title={zodiac.name}
          >
            {zodiac.symbol}
          </span>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: event.color,
          }}
        >
          {event.title}
        </span>
      </div>

      {/* Giant Days Number */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          padding: '24px 0',
        }}
      >
        <span
          style={{
            fontSize: 140,
            fontWeight: 200,
            lineHeight: 1,
            color: event.color,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timeLeft.days}
        </span>
        <span
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: '#666',
            marginLeft: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          days
        </span>
      </div>

      {/* Hours:Minutes:Seconds */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginBottom: 24,
        }}
      >
        <TimeUnit value={timeLeft.hours} label="hours" color={event.color} />
        <span style={{ fontSize: 24, color: '#ccc', fontWeight: 200 }}>:</span>
        <TimeUnit value={timeLeft.minutes} label="min" color="#999" />
        <span style={{ fontSize: 24, color: '#ccc', fontWeight: 200 }}>:</span>
        <TimeUnit value={timeLeft.seconds} label="sec" color="#ccc" />
      </div>

      {/* Target Date */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 13,
          color: '#666',
          marginBottom: insight ? 16 : 0,
        }}
      >
        {format(targetDate, 'EEEE, MMMM d, yyyy')}
      </div>

      {/* AI Insight */}
      {insight && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          <Sparkles size={14} color={event.color} />
          <span style={{ fontSize: 13, color: '#555', fontStyle: 'italic' }}>
            {insight}
          </span>
        </div>
      )}
    </div>
  );
}

function TimeUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 300, color, fontVariantNumeric: 'tabular-nums' }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

// Compact Countdown Card for secondary countdowns
function CompactCountdown({
  event,
  onRemove,
  onEdit,
  insight,
}: {
  event: CountdownEvent;
  onRemove: () => void;
  onEdit: () => void;
  insight: string;
}) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(event.targetDate));
  const targetDate = new Date(event.targetDate);
  const eventType = getEventType(event.title);
  const zodiac = eventType === 'birthday' ? getZodiac(targetDate) : null;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(event.targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.targetDate]);

  if (timeLeft.isPast) return null;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #eee',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        marginBottom: 12,
      }}
    >
      {/* Days circle */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${event.color}20 0%, ${event.color}10 100%)`,
          border: `2px solid ${event.color}40`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 300, color: event.color, lineHeight: 1 }}>
          {timeLeft.days}
        </span>
        <span style={{ fontSize: 8, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          days
        </span>
      </div>

      {/* Event details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {zodiac && (
            <span style={{ fontSize: 18 }} title={zodiac.name}>
              {zodiac.symbol}
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 500, color: '#333' }}>
            {event.title}
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: insight ? 8 : 0 }}>
          {format(targetDate, 'MMM d, yyyy')}
          <span style={{ margin: '0 8px', opacity: 0.5 }}>|</span>
          {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </div>
        {insight && (
          <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={10} color={event.color} />
            {insight}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onEdit}
          style={{
            background: '#f5f5f5',
            border: 'none',
            borderRadius: 6,
            padding: 8,
            cursor: 'pointer',
          }}
        >
          <Pencil size={12} color="#666" />
        </button>
        <button
          onClick={onRemove}
          style={{
            background: '#f5f5f5',
            border: 'none',
            borderRadius: 6,
            padding: 8,
            cursor: 'pointer',
          }}
        >
          <X size={12} color="#666" />
        </button>
      </div>
    </div>
  );
}

export function CountdownScreen() {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CountdownEvent | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [insights, setInsights] = useState<{ [id: string]: string }>({});

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY || '';

  const loadEvents = async () => {
    setLoading(true);
    const data = await getCountdowns();
    setEvents(
      data.map(fromSupabase).sort((a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      )
    );
    setLoading(false);
  };

  // Generate insights for all events
  const loadInsights = useCallback(async () => {
    if (!groqApiKey) return;

    const activeEvents = events.filter(e => !isPast(new Date(e.targetDate)));
    const newInsights: { [id: string]: string } = {};

    // Only load insights for first 3 events to save API calls
    for (const event of activeEvents.slice(0, 3)) {
      if (!insights[event.id]) {
        const timeLeft = getTimeRemaining(event.targetDate);
        const insight = await generateCountdownInsight(event, timeLeft.days, groqApiKey);
        if (insight) newInsights[event.id] = insight;
      }
    }

    if (Object.keys(newInsights).length > 0) {
      setInsights(prev => ({ ...prev, ...newInsights }));
    }
  }, [events, groqApiKey, insights]);

  useEffect(() => {
    loadEvents();
    const unsubscribe = subscribeToCountdowns((data) => {
      setEvents(
        data.map(fromSupabase).sort((a, b) =>
          new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
        )
      );
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Load insights when events change
  useEffect(() => {
    const timer = setTimeout(loadInsights, 1000);
    return () => clearTimeout(timer);
  }, [loadInsights]);

  const activeEvents = events.filter(e => !isPast(new Date(e.targetDate)));
  const [heroEvent, ...otherEvents] = activeEvents;

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !newDate) return;

    const targetDate = new Date(`${newDate}T${newTime}`);
    const event: CountdownEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      targetDate: targetDate.toISOString(),
      color: selectedColor,
    };

    setEvents(prev => [...prev, event].sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));
    await addCountdown(toSupabase(event));

    setNewTitle('');
    setNewDate('');
    setNewTime('12:00');
    setShowAddForm(false);
    setEditingEvent(null);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !newTitle.trim() || !newDate) return;

    const targetDate = new Date(`${newDate}T${newTime}`);
    const updates = {
      title: newTitle.trim(),
      targetDate: targetDate.toISOString(),
      color: selectedColor,
    };

    setEvents(prev => prev.map(e =>
      e.id === editingEvent.id ? { ...e, ...updates } : e
    ).sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));

    await updateCountdown(editingEvent.id, {
      title: updates.title,
      target_date: updates.targetDate,
      color: updates.color,
    });

    setNewTitle('');
    setNewDate('');
    setNewTime('12:00');
    setShowAddForm(false);
    setEditingEvent(null);
  };

  const handleRemoveEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await removeCountdown(id);
  };

  const openEditForm = (event: CountdownEvent) => {
    setEditingEvent(event);
    setNewTitle(event.title);
    setNewDate(format(new Date(event.targetDate), 'yyyy-MM-dd'));
    setNewTime(format(new Date(event.targetDate), 'HH:mm'));
    setSelectedColor(event.color);
    setShowAddForm(true);
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingEvent(null);
    setNewTitle('');
    setNewDate('');
    setNewTime('12:00');
  };

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} color="#333" />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', color: '#333' }}>
            COUNTDOWNS
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadEvents}
            style={{
              background: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: 6,
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} color="#666" className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => { setShowAddForm(true); setEditingEvent(null); }}
            style={{
              background: '#333',
              border: 'none',
              borderRadius: 6,
              padding: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={14} color="#fff" />
          </button>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={closeForm}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: 360,
              maxWidth: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600 }}>
              {editingEvent ? 'Edit Countdown' : 'New Countdown'}
            </h3>

            <input
              type="text"
              placeholder="Event name (e.g., Ella's Birthday)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Calendar size={16} color="#999" />
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                style={{
                  padding: '12px 14px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                  width: 110,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: selectedColor === color ? '3px solid #333' : '3px solid transparent',
                    cursor: 'pointer',
                    transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={closeForm}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                disabled={!newTitle.trim() || !newDate}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: 8,
                  background: !newTitle.trim() || !newDate ? '#ccc' : '#333',
                  color: '#fff',
                  cursor: !newTitle.trim() || !newDate ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Check size={16} />
                {editingEvent ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeEvents.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <Clock size={48} color="#ddd" />
          <span style={{ color: '#999', fontSize: 15 }}>
            {loading ? 'Loading...' : 'No upcoming countdowns'}
          </span>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              marginTop: 8,
              padding: '10px 20px',
              background: '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={14} />
            Add Countdown
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {/* Hero countdown */}
          {heroEvent && (
            <HeroCountdown
              event={heroEvent}
              onRemove={() => handleRemoveEvent(heroEvent.id)}
              onEdit={() => openEditForm(heroEvent)}
              insight={insights[heroEvent.id] || ''}
            />
          )}

          {/* Other countdowns */}
          {otherEvents.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  color: '#999',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                }}
              >
                Coming Up
              </div>
              {otherEvents.map(event => (
                <CompactCountdown
                  key={event.id}
                  event={event}
                  onRemove={() => handleRemoveEvent(event.id)}
                  onEdit={() => openEditForm(event)}
                  insight={insights[event.id] || ''}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
