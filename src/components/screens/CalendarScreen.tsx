import { useState, useEffect } from 'react';
import { format, isToday, isTomorrow, startOfDay, addDays, isAfter, isBefore } from 'date-fns';
import { Calendar, Clock, MapPin, RefreshCw } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  allDay: boolean;
}

// Parse iCal date format
function parseICalDate(dateStr: string): Date {
  // Handle formats: 20251227T140000Z or 20251227
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
    // All day event
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

    // Handle line continuations (lines starting with space or tab)
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
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const keyPart = line.slice(0, colonIndex);
        const key = keyPart.split(';')[0]; // Remove parameters like ;TZID=...
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
        }
      }
    }
  }

  return events;
}

async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const icalUrl = import.meta.env.VITE_GOOGLE_CALENDAR_ICAL_URL;

  if (!icalUrl) {
    console.log('No Google Calendar iCal URL configured (VITE_GOOGLE_CALENDAR_ICAL_URL)');
    return [];
  }

  try {
    console.log('[Calendar] Fetching iCal feed...');
    // Use corsproxy.io - faster and more reliable
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(icalUrl)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status}`);
    }

    const icalText = await response.text();
    const events = parseICalFeed(icalText);
    console.log(`[Calendar] Parsed ${events.length} total events`);

    // Filter to upcoming events (today and next 7 days)
    const now = new Date();
    const startOfToday = startOfDay(now);
    const weekFromNow = addDays(now, 7);

    const upcomingEvents = events
      .filter(event => {
        return isAfter(event.start, addDays(startOfToday, -1)) && isBefore(startOfDay(event.start), weekFromNow);
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    console.log(`[Calendar] ${upcomingEvents.length} upcoming events`);
    return upcomingEvents;
  } catch (e) {
    console.error('[Calendar] Failed to fetch calendar:', e);
    return [];
  }
}

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }
  return format(event.start, 'h:mm a');
}

function formatEventDate(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export function CalendarScreen() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    const fetchedEvents = await fetchCalendarEvents();
    setEvents(fetchedEvents);
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();

    // Refresh every 5 minutes
    const interval = setInterval(loadEvents, 300000);
    return () => clearInterval(interval);
  }, []);

  const icalConfigured = !!import.meta.env.VITE_GOOGLE_CALENDAR_ICAL_URL;

  if (!icalConfigured) {
    return (
      <div className="flex flex--col" style={{ height: '100%' }}>
        <div className="flex" style={{ alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Calendar size={24} />
          <span className="label">CALENDAR</span>
        </div>
        <div className="flex flex--center flex-1 flex--col" style={{ gap: 16 }}>
          <span style={{ color: '#666', fontSize: 14 }}>Calendar not configured</span>
          <span style={{ color: '#999', fontSize: 12, maxWidth: 300, textAlign: 'center' }}>
            Add VITE_GOOGLE_CALENDAR_ICAL_URL to Netlify environment variables.
            Get it from Google Calendar → Settings → Integrate calendar → Secret address in iCal format.
          </span>
        </div>
      </div>
    );
  }

  // Group events by date
  const groupedEvents: { [key: string]: CalendarEvent[] } = {};
  events.forEach(event => {
    const dateKey = format(startOfDay(event.start), 'yyyy-MM-dd');
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  const sortedDays = Object.keys(groupedEvents).sort();

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex flex--between" style={{ alignItems: 'center', marginBottom: 20 }}>
        <div className="flex" style={{ alignItems: 'center', gap: 12 }}>
          <Calendar size={20} />
          <span className="label">UPCOMING</span>
          <span style={{ fontSize: 12, color: '#999' }}>{events.length} events</span>
        </div>
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
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <div className="flex flex--center flex-1">
          <span style={{ color: '#999', fontSize: 14 }}>
            {loading ? 'Loading...' : 'No upcoming events'}
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          {sortedDays.map(dateKey => {
            const dayEvents = groupedEvents[dateKey];
            return (
              <div key={dateKey} style={{ marginBottom: 20 }}>
                {/* Date header */}
                <div className="label label--gray" style={{ marginBottom: 10, fontSize: 11 }}>
                  {formatEventDate(dayEvents[0].start)}
                </div>

                {/* Events for this day */}
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    style={{
                      marginBottom: 12,
                      paddingLeft: 12,
                      borderLeft: '2px solid #000',
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>
                      {event.title}
                    </div>
                    <div className="flex gap--medium" style={{ color: '#666', fontSize: 12 }}>
                      <div className="flex" style={{ alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        <span>{formatEventTime(event)}</span>
                      </div>
                      {event.location && (
                        <div className="flex" style={{ alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} />
                          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Last updated */}
      {lastUpdate && (
        <div style={{ fontSize: 11, color: '#999', textAlign: 'center', paddingTop: 12 }}>
          Updated {format(lastUpdate, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
