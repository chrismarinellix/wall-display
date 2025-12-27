import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns';
import { Plus, X, Calendar, Clock, RefreshCw } from 'lucide-react';
import {
  getCountdowns,
  addCountdown,
  removeCountdown,
  subscribeToCountdowns,
  CountdownEvent as SupabaseCountdownEvent,
} from '../../services/supabase';

interface CountdownEvent {
  id: string;
  title: string;
  targetDate: string; // ISO string
  color: string;
}

// Convert between local format and Supabase format
function fromSupabase(e: SupabaseCountdownEvent): CountdownEvent {
  return { id: e.id, title: e.title, targetDate: e.target_date, color: e.color };
}

function toSupabase(e: CountdownEvent): SupabaseCountdownEvent {
  return { id: e.id, title: e.title, target_date: e.targetDate, color: e.color };
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

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

function CountdownTimer({ event, onRemove }: { event: CountdownEvent; onRemove: () => void }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(event.targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(event.targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.targetDate]);

  if (timeLeft.isPast) {
    return (
      <div
        style={{
          padding: 16,
          borderLeft: `3px solid ${event.color}`,
          backgroundColor: '#f5f5f5',
          marginBottom: 12,
          position: 'relative',
        }}
      >
        <button
          onClick={onRemove}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.5,
          }}
        >
          <X size={14} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{event.title}</div>
        <div style={{ fontSize: 12, color: '#666' }}>Event has passed</div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 16,
        borderLeft: `3px solid ${event.color}`,
        backgroundColor: '#fafafa',
        marginBottom: 12,
        position: 'relative',
      }}
    >
      <button
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.5,
        }}
      >
        <X size={14} />
      </button>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{event.title}</div>
      <div className="flex gap--medium" style={{ alignItems: 'baseline' }}>
        {timeLeft.days > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 300, color: event.color }}>{timeLeft.days}</div>
            <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.1em' }}>DAYS</div>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 300, color: event.color }}>{timeLeft.hours}</div>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.1em' }}>HRS</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 300, color: event.color }}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.1em' }}>MIN</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 300, color: '#ccc' }}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.1em' }}>SEC</div>
        </div>
      </div>
    </div>
  );
}

export function CountdownScreen() {
  const [events, setEvents] = useState<CountdownEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('12:00');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  // Load events from Supabase on mount
  const loadEvents = async () => {
    setLoading(true);
    const data = await getCountdowns();
    setEvents(data.map(fromSupabase).sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToCountdowns((data) => {
      setEvents(data.map(fromSupabase).sort((a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      ));
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !newDate) return;

    const targetDate = new Date(`${newDate}T${newTime}`);
    const event: CountdownEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      targetDate: targetDate.toISOString(),
      color: selectedColor,
    };

    // Optimistically update UI
    setEvents(prev => [...prev, event].sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));

    // Save to Supabase
    await addCountdown(toSupabase(event));

    setNewTitle('');
    setNewDate('');
    setNewTime('12:00');
    setShowAddForm(false);
  };

  const handleRemoveEvent = async (id: string) => {
    // Optimistically update UI
    setEvents(prev => prev.filter(e => e.id !== id));
    // Remove from Supabase
    await removeCountdown(id);
  };

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex flex--between" style={{ alignItems: 'center', marginBottom: 20 }}>
        <div className="flex" style={{ alignItems: 'center', gap: 12 }}>
          <Clock size={20} />
          <span className="label">COUNTDOWNS</span>
          <span style={{ fontSize: 12, color: '#999' }}>{events.length} events</span>
        </div>
        <div className="flex gap--small">
          <button
            onClick={loadEvents}
            style={{
              background: 'none',
              border: '1px solid #e5e5e5',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: 'none',
              border: '1px solid #e5e5e5',
              cursor: 'pointer',
              padding: 6,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          style={{
            padding: 16,
            backgroundColor: '#f5f5f5',
            marginBottom: 16,
            borderRadius: 4,
          }}
        >
          <input
            type="text"
            placeholder="Event name"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 4,
              marginBottom: 8,
              fontSize: 14,
            }}
          />
          <div className="flex gap--medium" style={{ marginBottom: 8 }}>
            <div className="flex" style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <Calendar size={14} />
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14,
                }}
              />
            </div>
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: 4,
                fontSize: 14,
              }}
            />
          </div>
          <div className="flex gap--small" style={{ marginBottom: 12 }}>
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: selectedColor === color ? '2px solid #000' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
          <button
            onClick={handleAddEvent}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Add Countdown
          </button>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="flex flex--center flex-1 flex--col" style={{ gap: 8 }}>
          <span style={{ color: '#999', fontSize: 14 }}>
            {loading ? 'Loading...' : 'No countdowns'}
          </span>
          {!loading && <span style={{ color: '#ccc', fontSize: 12 }}>Tap + to add an event</span>}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {events.map(event => (
            <CountdownTimer key={event.id} event={event} onRemove={() => handleRemoveEvent(event.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
