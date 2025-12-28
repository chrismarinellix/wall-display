import { useState, useEffect } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast, format, startOfDay, differenceInMilliseconds } from 'date-fns';
import { Plus, X, Calendar, Clock, RefreshCw, Pencil, Check } from 'lucide-react';
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

// Common event templates with family members
const COMMON_EVENTS = [
  { label: 'Pick up Ella', value: 'Pick up Ella' },
  { label: 'Pick up Olivier', value: 'Pick up Olivier' },
  { label: 'Drop off Ella', value: 'Drop off Ella' },
  { label: 'Drop off Olivier', value: 'Drop off Olivier' },
  { label: 'Ella\'s activity', value: 'Ella\'s activity' },
  { label: 'Olivier\'s activity', value: 'Olivier\'s activity' },
  { label: 'Call with Chris', value: 'Call with Chris' },
  { label: 'Meeting with Carline', value: 'Meeting with Carline' },
  { label: 'Family dinner', value: 'Family dinner' },
  { label: 'School pickup', value: 'School pickup' },
  { label: 'Doctor appointment', value: 'Doctor appointment' },
  { label: 'Birthday party', value: 'Birthday party' },
];

// Quick time presets
const TIME_PRESETS = [
  { label: 'Morning', value: '08:00' },
  { label: 'Mid-morning', value: '10:00' },
  { label: 'Noon', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'School end', value: '15:30' },
  { label: 'Evening', value: '18:00' },
  { label: 'Night', value: '20:00' },
];

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

// Calculate progress from start of today to target date
function getProgressPercent(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  const todayStart = startOfDay(now);

  if (isPast(target)) return 100;

  const totalMs = differenceInMilliseconds(target, todayStart);
  const elapsedMs = differenceInMilliseconds(now, todayStart);

  if (totalMs <= 0) return 100;

  const percent = (elapsedMs / totalMs) * 100;
  return Math.min(100, Math.max(0, percent));
}

interface CountdownCardProps {
  event: CountdownEvent;
  onRemove: () => void;
  onUpdate: (updates: Partial<Pick<CountdownEvent, 'title' | 'targetDate' | 'color'>>) => void;
}

function CountdownCard({ event, onRemove, onUpdate }: CountdownCardProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(event.targetDate));
  const [progress, setProgress] = useState(getProgressPercent(event.targetDate));
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  const [editDate, setEditDate] = useState(format(new Date(event.targetDate), 'yyyy-MM-dd'));
  const [editTime, setEditTime] = useState(format(new Date(event.targetDate), 'HH:mm'));
  const [editColor, setEditColor] = useState(event.color);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(event.targetDate));
      setProgress(getProgressPercent(event.targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.targetDate]);

  // Reset edit form when event changes
  useEffect(() => {
    setEditTitle(event.title);
    setEditDate(format(new Date(event.targetDate), 'yyyy-MM-dd'));
    setEditTime(format(new Date(event.targetDate), 'HH:mm'));
    setEditColor(event.color);
  }, [event]);

  const handleSave = () => {
    const newTargetDate = new Date(`${editDate}T${editTime}`);
    onUpdate({
      title: editTitle.trim(),
      targetDate: newTargetDate.toISOString(),
      color: editColor,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(event.title);
    setEditDate(format(new Date(event.targetDate), 'yyyy-MM-dd'));
    setEditTime(format(new Date(event.targetDate), 'HH:mm'));
    setEditColor(event.color);
    setIsEditing(false);
  };

  // Don't render past events
  if (timeLeft.isPast) {
    return null;
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #eee',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Color accent bar */}
      <div style={{ height: 4, backgroundColor: event.color }} />

      {/* Card content */}
      <div style={{ padding: 20 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: event.color,
              }}
            />
            <span style={{ fontSize: 16, fontWeight: 500, color: '#333' }}>{event.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                background: 'none',
                border: '1px solid #e5e5e5',
                borderRadius: 4,
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                color: '#666',
              }}
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={onRemove}
              style={{
                background: 'none',
                border: '1px solid #e5e5e5',
                borderRadius: 4,
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                color: '#666',
              }}
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Time display */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          {timeLeft.days > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 300, color: event.color, lineHeight: 1 }}>
                {timeLeft.days}
              </div>
              <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.15em', marginTop: 4, textTransform: 'uppercase' }}>
                days
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 300, color: event.color, lineHeight: 1 }}>
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.15em', marginTop: 4, textTransform: 'uppercase' }}>
              hrs
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 300, color: timeLeft.days > 0 ? '#999' : event.color, lineHeight: 1 }}>
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 10, color: '#999', letterSpacing: '0.15em', marginTop: 4, textTransform: 'uppercase' }}>
              min
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 300, color: '#ccc', lineHeight: 1 }}>
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div style={{ fontSize: 10, color: '#ccc', letterSpacing: '0.15em', marginTop: 4, textTransform: 'uppercase' }}>
              sec
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#999' }}>
              {format(new Date(event.targetDate), 'MMM d, yyyy \'at\' h:mm a')}
            </span>
            <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}>
              {progress.toFixed(1)}% of day elapsed
            </span>
          </div>
          <div style={{ height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor: event.color,
                borderRadius: 2,
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>

        {/* Edit form */}
        {isEditing && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              backgroundColor: '#f9f9f9',
              borderRadius: 6,
              border: '1px solid #eee',
            }}
          >
            <input
              type="text"
              placeholder="Event name"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: 6,
                marginBottom: 10,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <Calendar size={14} color="#999" />
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                />
              </div>
              <input
                type="time"
                value={editTime}
                onChange={e => setEditTime(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 14,
                  width: 120,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: editColor === color ? '3px solid #333' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                    transform: editColor === color ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Check size={14} />
                Save
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#fff',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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

  // Filter out past events
  const activeEvents = events.filter(e => !isPast(new Date(e.targetDate)));

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

  const handleUpdateEvent = async (id: string, updates: Partial<Pick<CountdownEvent, 'title' | 'targetDate' | 'color'>>) => {
    // Optimistically update UI
    setEvents(prev => prev.map(e =>
      e.id === id ? { ...e, ...updates } : e
    ).sort((a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
    ));

    // Convert targetDate to target_date for Supabase
    const supabaseUpdates: Record<string, string | undefined> = {};
    if (updates.title) supabaseUpdates.title = updates.title;
    if (updates.targetDate) supabaseUpdates.target_date = updates.targetDate;
    if (updates.color) supabaseUpdates.color = updates.color;

    await updateCountdown(id, supabaseUpdates);
  };

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} color="#333" />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', color: '#333' }}>COUNTDOWNS</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {activeEvents.length} {activeEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={loadEvents}
            style={{
              background: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: 6,
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              color: '#666',
            }}
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: showAddForm ? '#333' : '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: 6,
              cursor: 'pointer',
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              color: showAddForm ? '#fff' : '#666',
            }}
            title="Add countdown"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          style={{
            padding: 20,
            backgroundColor: '#fff',
            marginBottom: 20,
            borderRadius: 8,
            border: '1px solid #eee',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          {/* Common Events Dropdown */}
          <div style={{ marginBottom: 12 }}>
            <select
              value=""
              onChange={e => {
                if (e.target.value) setNewTitle(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14,
                backgroundColor: '#f9f9f9',
                color: '#666',
                cursor: 'pointer',
              }}
            >
              <option value="">Quick select event...</option>
              {COMMON_EVENTS.map(event => (
                <option key={event.value} value={event.value}>
                  {event.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom event name */}
          <input
            type="text"
            placeholder="Or type custom event name"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #ddd',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />

          {/* Date picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={14} color="#999" />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14,
              }}
            />
          </div>

          {/* Time presets */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#999', marginBottom: 8, letterSpacing: '0.05em' }}>TIME OF DAY</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TIME_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setNewTime(preset.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    border: newTime === preset.value ? '1px solid #333' : '1px solid #ddd',
                    borderRadius: 4,
                    backgroundColor: newTime === preset.value ? '#333' : '#fff',
                    color: newTime === preset.value ? '#fff' : '#666',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom time input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={14} color="#999" />
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              style={{
                padding: '12px 14px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 14,
                flex: 1,
              }}
            />
            <span style={{ fontSize: 12, color: '#999' }}>or pick exact time</span>
          </div>

          {/* Color picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#999' }}>Color:</span>
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: selectedColor === color ? '3px solid #333' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'transform 0.1s ease',
                  transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Add button */}
          <button
            onClick={handleAddEvent}
            disabled={!newTitle.trim() || !newDate}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: !newTitle.trim() || !newDate ? '#ccc' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: !newTitle.trim() || !newDate ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Add Countdown
          </button>
        </div>
      )}

      {/* Events list */}
      {activeEvents.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Clock size={32} color="#ddd" />
          <span style={{ color: '#999', fontSize: 14 }}>
            {loading ? 'Loading...' : 'No upcoming events'}
          </span>
          {!loading && (
            <span style={{ color: '#ccc', fontSize: 12 }}>
              Click + to add a countdown
            </span>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeEvents.map(event => (
            <CountdownCard
              key={event.id}
              event={event}
              onRemove={() => handleRemoveEvent(event.id)}
              onUpdate={(updates) => handleUpdateEvent(event.id, updates)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
