import { useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  setYear,
  getYear,
  isAfter,
  isBefore,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Plus, X } from 'lucide-react';
import {
  getCalendarEvents,
  addCalendarEvent,
  removeCalendarEvent,
  subscribeToCalendarEvents,
  CalendarEventRecord,
} from '../../services/supabase';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  allDay: boolean;
  rrule?: string;
  isCustom?: boolean;
}

// Parse iCal date format
function parseICalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const hour = parseInt(dateStr.slice(9, 11)) || 0;
    const minute = parseInt(dateStr.slice(11, 13)) || 0;
    const second = parseInt(dateStr.slice(13, 15)) || 0;

    if (dateStr.endsWith('Z')) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    }
    return new Date(year, month, day, hour, minute, second);
  } else {
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    return new Date(year, month, day);
  }
}

function parseICalFeed(icalText: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = icalText.split(/\r?\n/);
  let currentEvent: Partial<CalendarEvent> | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].slice(1);
    }

    if (line === 'BEGIN:VEVENT') {
      currentEvent = { allDay: false };
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.title && currentEvent.start) {
        events.push({
          id: currentEvent.id || Math.random().toString(),
          title: currentEvent.title,
          start: currentEvent.start,
          end: currentEvent.end || currentEvent.start,
          location: currentEvent.location,
          allDay: currentEvent.allDay || false,
          rrule: currentEvent.rrule,
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const keyPart = line.slice(0, colonIndex);
        const key = keyPart.split(';')[0];
        const value = line.slice(colonIndex + 1);

        if (key === 'SUMMARY') {
          currentEvent.title = value.replace(/\\,/g, ',').replace(/\\n/g, ' ');
        } else if (key === 'UID') {
          currentEvent.id = value;
        } else if (key === 'LOCATION') {
          currentEvent.location = value.replace(/\\,/g, ',');
        } else if (key === 'DTSTART') {
          currentEvent.start = parseICalDate(value);
          if (keyPart.includes('VALUE=DATE') || value.length === 8) {
            currentEvent.allDay = true;
          }
        } else if (key === 'DTEND') {
          currentEvent.end = parseICalDate(value);
        } else if (key === 'RRULE') {
          currentEvent.rrule = value;
        }
      }
    }
  }

  return events;
}

function expandRecurringEvents(events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
  const expandedEvents: CalendarEvent[] = [];
  const startYear = getYear(startDate);
  const endYear = getYear(endDate);

  for (const event of events) {
    if (event.rrule && event.rrule.includes('FREQ=YEARLY')) {
      for (let year = startYear; year <= endYear; year++) {
        const thisYearStart = setYear(event.start, year);
        const thisYearEnd = setYear(event.end, year);

        if (isAfter(thisYearStart, addDays(startDate, -1)) && isBefore(thisYearStart, addDays(endDate, 1))) {
          expandedEvents.push({
            ...event,
            id: `${event.id}-${year}`,
            start: thisYearStart,
            end: thisYearEnd,
          });
        }
      }
    } else {
      expandedEvents.push(event);
    }
  }

  return expandedEvents;
}

async function fetchCalendarEvents(monthStart: Date, monthEnd: Date): Promise<CalendarEvent[]> {
  const icalUrl = import.meta.env.VITE_GOOGLE_CALENDAR_ICAL_URL;

  if (!icalUrl) {
    console.log('No Google Calendar iCal URL configured');
    return [];
  }

  const proxies = [
    `/api/calendar-proxy?url=${encodeURIComponent(icalUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(icalUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`,
  ];

  for (const proxyUrl of proxies) {
    try {
      console.log(`[Calendar] Trying proxy: ${proxyUrl.split('?')[0]}...`);
      const response = await fetch(proxyUrl);

      if (!response.ok) continue;

      const icalText = await response.text();
      if (!icalText.includes('BEGIN:VCALENDAR')) continue;

      const events = parseICalFeed(icalText);
      const expandedEvents = expandRecurringEvents(events, monthStart, monthEnd);

      return expandedEvents
        .filter(event => {
          const eventDate = event.start;
          return isAfter(eventDate, addDays(monthStart, -1)) && isBefore(eventDate, addDays(monthEnd, 1));
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());
    } catch (e) {
      console.log(`[Calendar] Proxy failed:`, e);
      continue;
    }
  }

  return [];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<CalendarEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');

  const loadGoogleEvents = async () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const fetchedEvents = await fetchCalendarEvents(monthStart, monthEnd);
    setGoogleEvents(fetchedEvents);
  };

  const loadCustomEvents = async () => {
    const events = await getCalendarEvents();
    setCustomEvents(events);
  };

  const loadAllEvents = async () => {
    setLoading(true);
    await Promise.all([loadGoogleEvents(), loadCustomEvents()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllEvents();
  }, [currentMonth]);

  // Subscribe to custom event changes
  useEffect(() => {
    const unsubscribe = subscribeToCalendarEvents((events) => {
      setCustomEvents(events);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setNewEventTitle('');
    setShowAddModal(true);
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEventTitle.trim()) return;

    const newEvent: CalendarEventRecord = {
      id: crypto.randomUUID(),
      title: newEventTitle.trim(),
      start_date: format(selectedDate, 'yyyy-MM-dd'),
      all_day: true,
    };

    await addCalendarEvent(newEvent);
    setShowAddModal(false);
    setNewEventTitle('');
    loadCustomEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    await removeCalendarEvent(id);
    loadCustomEvents();
  };

  // Merge Google Calendar events with custom events
  const allEvents: CalendarEvent[] = [
    ...googleEvents,
    ...customEvents.map((e) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_date),
      end: e.end_date ? new Date(e.end_date) : new Date(e.start_date),
      location: e.location,
      allDay: e.all_day,
      isCustom: true,
    })),
  ];

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Group events by date
  const eventsByDate: { [key: string]: CalendarEvent[] } = {};
  allEvents.forEach(event => {
    const dateKey = format(event.start, 'yyyy-MM-dd');
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex flex--between" style={{ alignItems: 'center', marginBottom: 16 }}>
        <div className="flex" style={{ alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: 18, fontWeight: 500, minWidth: 160, textAlign: 'center' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={loadAllEvents}
          style={{
            background: 'none',
            border: '1px solid #e5e5e5',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
        {WEEKDAYS.map(weekday => (
          <div
            key={weekday}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {weekday}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          flex: 1,
          gap: 1,
          background: '#e5e5e5',
        }}
      >
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => handleDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleDayClick(day);
              }}
              style={{
                background: isCurrentDay ? '#f5f5f5' : '#fff',
                padding: 4,
                minHeight: 60,
                opacity: isCurrentMonth ? 1 : 0.4,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Day number */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: isCurrentDay ? 700 : 400,
                  color: isCurrentDay ? '#000' : '#333',
                  marginBottom: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{format(day, 'd')}</span>
                <Plus size={10} style={{ opacity: 0.3 }} />
              </div>

              {/* Events */}
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  style={{
                    fontSize: 9,
                    padding: '2px 4px',
                    marginBottom: 2,
                    background: event.isCustom ? '#333' : '#000',
                    color: '#fff',
                    borderRadius: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                  title={`${event.title}${event.allDay ? '' : ` - ${format(event.start, 'h:mm a')}`}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
                  {event.isCustom && (
                    <X
                      size={10}
                      style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEvent(event.id);
                      }}
                    />
                  )}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div style={{ fontSize: 8, color: '#666' }}>
                  +{dayEvents.length - 2} more
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event count */}
      <div style={{ fontSize: 11, color: '#999', textAlign: 'center', paddingTop: 8 }}>
        {allEvents.length} events this month
      </div>

      {/* Add Event Modal */}
      {showAddModal && selectedDate && (
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
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: 24,
              borderRadius: 8,
              minWidth: 300,
              maxWidth: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Add Event</h3>
              <X
                size={20}
                style={{ cursor: 'pointer', opacity: 0.5 }}
                onClick={() => setShowAddModal(false)}
              />
            </div>
            <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </div>
            <input
              type="text"
              placeholder="Event title"
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEvent();
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                border: '1px solid #ddd',
                borderRadius: 4,
                marginBottom: 16,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newEventTitle.trim()}
                style={{
                  padding: '8px 16px',
                  fontSize: 14,
                  border: 'none',
                  borderRadius: 4,
                  background: newEventTitle.trim() ? '#000' : '#ccc',
                  color: '#fff',
                  cursor: newEventTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
