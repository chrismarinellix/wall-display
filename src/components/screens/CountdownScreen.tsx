import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, format } from 'date-fns';
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
  targetDate: string;
  color: string;
}

function fromSupabase(e: SupabaseCountdownEvent): CountdownEvent {
  return { id: e.id, title: e.title, targetDate: e.target_date, color: e.color };
}

function toSupabase(e: CountdownEvent): SupabaseCountdownEvent {
  return { id: e.id, title: e.title, target_date: e.targetDate, color: e.color };
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

function getExcitingMessage(days: number, hours: number, title: string): string {
  const eventName = title.toLowerCase();

  if (days === 0 && hours === 0) {
    return "It's almost here!";
  }
  if (days === 0 && hours === 1) {
    return "Just one more hour to go!";
  }
  if (days === 0 && hours <= 3) {
    return "So close you can taste it!";
  }
  if (days === 0) {
    return "Today's the day!";
  }
  if (days === 1) {
    return "Tomorrow is the big day!";
  }
  if (days === 2) {
    return "Just a couple of sleeps away!";
  }
  if (days <= 7) {
    return "This week! The excitement builds...";
  }
  if (days <= 14) {
    return "Getting closer every moment!";
  }
  if (days <= 30) {
    return "Mark your calendar, it's coming!";
  }
  if (days <= 60) {
    return "Something wonderful awaits...";
  }
  return "The countdown has begun!";
}

function CountdownTimer({ event, onRemove, isFirst }: { event: CountdownEvent; onRemove: () => void; isFirst?: boolean }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(event.targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(event.targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.targetDate]);

  // Calculate progress based on created time vs target
  const target = new Date(event.targetDate);
  const now = new Date();
  const totalMs = 30 * 24 * 60 * 60 * 1000; // 30 days baseline
  const remainingMs = target.getTime() - now.getTime();
  const progress = Math.max(0, Math.min(100, ((totalMs - remainingMs) / totalMs) * 100));

  if (timeLeft.isPast) {
    return (
      <div style={{ marginBottom: isFirst ? 48 : 32 }}>
        <div className="flex flex--between" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontSize: isFirst ? 13 : 11,
              fontWeight: 500,
              letterSpacing: '0.2em',
              color: '#999',
              marginBottom: 8,
              textTransform: 'uppercase',
            }}>
              {event.title}
            </div>
            <div style={{ fontSize: isFirst ? 24 : 16, color: '#bbb', fontWeight: 300 }}>
              Event has passed
            </div>
          </div>
          <button
            onClick={onRemove}
            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4 }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  const TimeUnit = ({ value, label, large }: { value: number | string; label: string; large?: boolean }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: large ? 72 : (isFirst ? 48 : 28),
        fontWeight: 100,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: '#000',
        letterSpacing: '-0.02em',
      }}>
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </div>
      <div style={{
        fontSize: large ? 11 : (isFirst ? 10 : 8),
        fontWeight: 500,
        color: '#aaa',
        letterSpacing: '0.2em',
        marginTop: large ? 12 : 6,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );

  const Separator = () => (
    <div style={{
      fontSize: isFirst ? 48 : 28,
      fontWeight: 100,
      color: '#ddd',
      lineHeight: 1,
      marginTop: isFirst ? -8 : -4,
    }}>
      :
    </div>
  );

  return (
    <div style={{ marginBottom: isFirst ? 48 : 32 }}>
      {/* Event title */}
      <div className="flex flex--between" style={{ alignItems: 'flex-start', marginBottom: isFirst ? 24 : 12 }}>
        <div style={{
          fontSize: isFirst ? 13 : 11,
          fontWeight: 500,
          letterSpacing: '0.2em',
          color: '#666',
          textTransform: 'uppercase',
        }}>
          {event.title}
        </div>
        <button
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3, padding: 4 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Time display with exciting message */}
      <div className="flex" style={{
        gap: isFirst ? 16 : 10,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
      }}>
        {timeLeft.days > 0 && (
          <>
            <TimeUnit value={timeLeft.days} label={timeLeft.days === 1 ? 'Day' : 'Days'} large={isFirst} />
            {isFirst && <Separator />}
          </>
        )}
        <TimeUnit value={timeLeft.hours} label="Hrs" large={isFirst && timeLeft.days === 0} />
        <Separator />
        <TimeUnit value={timeLeft.minutes} label="Min" large={isFirst && timeLeft.days === 0} />
        <Separator />
        <TimeUnit value={timeLeft.seconds} label="Sec" />

        {/* Exciting message */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: isFirst ? 24 : 12,
          paddingLeft: isFirst ? 24 : 12,
          borderLeft: '1px solid #ddd',
          height: isFirst ? 72 : 40,
        }}>
          <span style={{
            fontSize: isFirst ? 18 : 12,
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#888',
            letterSpacing: '0.02em',
          }}>
            {getExcitingMessage(timeLeft.days, timeLeft.hours, event.title)}
          </span>
        </div>
      </div>

      {/* Progress bar - elegant thin line */}
      <div style={{
        marginTop: isFirst ? 32 : 16,
        height: 1,
        background: '#eee',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progress}%`,
          background: '#000',
          transition: 'width 1s linear',
        }} />
      </div>

      {/* Target date for first item */}
      {isFirst && (
        <div style={{
          marginTop: 16,
          fontSize: 12,
          color: '#bbb',
          fontWeight: 400,
        }}>
          {format(new Date(event.targetDate), "EEEE, d MMMM yyyy 'at' h:mm a")}
        </div>
      )}
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
    const unsubscribe = subscribeToCountdowns((data) => {
      setEvents(data.map(fromSupabase).sort((a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
      ));
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleAddEvent = async () => {
    if (!newTitle.trim() || !newDate) return;

    const targetDate = new Date(`${newDate}T${newTime}`);
    const event: CountdownEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      targetDate: targetDate.toISOString(),
      color: '#000',
    };

    setEvents(prev => [...prev, event].sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));

    await addCountdown(toSupabase(event));

    setNewTitle('');
    setNewDate('');
    setNewTime('12:00');
    setShowAddForm(false);
  };

  const handleRemoveEvent = async (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    await removeCountdown(id);
  };

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Minimal header */}
      <div className="flex flex--between" style={{ alignItems: 'center', marginBottom: 32 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.25em',
          color: '#999',
          textTransform: 'uppercase',
        }}>
          {events.length} {events.length === 1 ? 'Countdown' : 'Countdowns'}
        </div>
        <div className="flex gap--small">
          <button
            onClick={loadEvents}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              opacity: 0.4,
            }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: showAddForm ? '#000' : 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 4,
            }}
          >
            <Plus size={14} color={showAddForm ? '#fff' : '#000'} />
          </button>
        </div>
      </div>

      {/* Add Form - minimal and elegant */}
      {showAddForm && (
        <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #eee' }}>
          <input
            type="text"
            placeholder="Event name"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 0',
              border: 'none',
              borderBottom: '1px solid #ddd',
              fontSize: 18,
              fontWeight: 300,
              outline: 'none',
              marginBottom: 16,
              background: 'transparent',
            }}
          />
          <div className="flex gap--medium" style={{ marginBottom: 16 }}>
            <div className="flex" style={{ alignItems: 'center', gap: 8, flex: 1 }}>
              <Calendar size={14} color="#999" />
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #eee',
                  borderRadius: 4,
                  fontSize: 14,
                  background: '#fafafa',
                }}
              />
            </div>
            <div className="flex" style={{ alignItems: 'center', gap: 8 }}>
              <Clock size={14} color="#999" />
              <input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #eee',
                  borderRadius: 4,
                  fontSize: 14,
                  background: '#fafafa',
                }}
              />
            </div>
          </div>
          <button
            onClick={handleAddEvent}
            disabled={!newTitle.trim() || !newDate}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: newTitle.trim() && newDate ? '#000' : '#ddd',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: newTitle.trim() && newDate ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Add Countdown
          </button>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <div className="flex flex--center flex-1 flex--col" style={{ gap: 16 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Clock size={28} strokeWidth={1} color="#ccc" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#999', marginBottom: 4 }}>
              {loading ? 'Loading...' : 'No countdowns yet'}
            </div>
            {!loading && (
              <div style={{ fontSize: 12, color: '#ccc' }}>
                Tap + to add your first event
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {events.map((event, index) => (
            <CountdownTimer
              key={event.id}
              event={event}
              onRemove={() => handleRemoveEvent(event.id)}
              isFirst={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
