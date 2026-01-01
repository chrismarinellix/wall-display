import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Plus, X, Pencil, Clock } from 'lucide-react';
import {
  getCalendarEvents,
  addCalendarEvent,
  removeCalendarEvent,
  updateCalendarEvent,
  subscribeToCalendarEvents,
  CalendarEventRecord,
  getProjects,
  subscribeToProjects,
  Project,
} from '../../services/supabase';
import { ClipboardList } from 'lucide-react';

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
  { label: 'All day', value: '' },
  { label: 'Morning', value: '08:00' },
  { label: 'Mid-morning', value: '10:00' },
  { label: 'Noon', value: '12:00' },
  { label: 'Afternoon', value: '15:00' },
  { label: 'School end', value: '15:30' },
  { label: 'Evening', value: '18:00' },
  { label: 'Night', value: '20:00' },
];

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  allDay: boolean;
  rrule?: string;
  isCustom?: boolean;
  isProject?: boolean;
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
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Responsive styles using CSS clamp() for smooth scaling
const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    touchAction: 'pan-y',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'clamp(6px, 1.5vw, 12px)',
    flexWrap: 'wrap',
    gap: 8,
    flexShrink: 0,
  },
  monthTitle: {
    fontSize: 'clamp(14px, 4vw, 18px)',
    fontWeight: 500,
    minWidth: 'clamp(100px, 28vw, 160px)',
    textAlign: 'center',
  },
  weekdayHeader: {
    textAlign: 'center',
    fontSize: 'clamp(8px, 2vw, 10px)',
    fontWeight: 600,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: '1fr',
    flex: 1,
    gap: 1,
    background: '#e5e5e5',
  },
  dayCell: {
    padding: 'clamp(2px, 0.8vw, 4px)',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background 0.15s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  dayNumber: {
    fontSize: 'clamp(10px, 2.5vw, 12px)',
    marginBottom: 2,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTag: {
    fontSize: 'clamp(6px, 1.5vw, 8px)',
    padding: 'clamp(1px, 0.3vw, 2px) clamp(2px, 0.8vw, 3px)',
    marginBottom: 1,
    background: '#000',
    color: '#fff',
    borderRadius: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    lineHeight: 1.2,
    maxHeight: 16,
  },
  modal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    background: '#fff',
    padding: 'clamp(16px, 4vw, 24px)',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90vh',
    overflow: 'auto',
  },
  input: {
    width: '100%',
    padding: 'clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px)',
    fontSize: 'clamp(13px, 3vw, 14px)',
    border: '1px solid #ddd',
    borderRadius: 4,
    boxSizing: 'border-box' as const,
  },
  timePresetButton: {
    padding: 'clamp(4px, 1.5vw, 6px) clamp(6px, 2vw, 10px)',
    fontSize: 'clamp(10px, 2.5vw, 11px)',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  button: {
    padding: 'clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)',
    fontSize: 'clamp(12px, 3vw, 14px)',
    borderRadius: 4,
    cursor: 'pointer',
  },
};

export function CalendarScreen() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<CalendarEventRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [editingEvent, setEditingEvent] = useState<CalendarEventRecord | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // Swipe navigation for touch devices
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't interfere with modal interactions
    const target = e.target as HTMLElement;
    if (target.closest('.calendar-modal')) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and exceeds threshold
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      // Stop propagation to prevent parent ScreenContainer from handling
      e.stopPropagation();

      if (deltaX > 0) {
        // Swipe right - previous month
        setCurrentMonth(prev => subMonths(prev, 1));
      } else {
        // Swipe left - next month
        setCurrentMonth(prev => addMonths(prev, 1));
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

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

  const loadProjects = async () => {
    const projectList = await getProjects();
    setProjects(projectList.filter(p => p.target_date && p.status !== 'completed'));
  };

  const loadAllEvents = async () => {
    setLoading(true);
    await Promise.all([loadGoogleEvents(), loadCustomEvents(), loadProjects()]);
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

  // Subscribe to project changes
  useEffect(() => {
    const unsubscribe = subscribeToProjects((projectList) => {
      setProjects(projectList.filter(p => p.target_date && p.status !== 'completed'));
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setNewEventTitle('');
    setNewEventTime('');
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const handleEditEvent = (event: CalendarEventRecord) => {
    setEditingEvent(event);
    setNewEventTitle(event.title);
    setSelectedDate(new Date(event.start_date));
    // Extract time if not all day
    if (!event.all_day && event.start_date.includes('T')) {
      const timePart = event.start_date.split('T')[1]?.slice(0, 5) || '';
      setNewEventTime(timePart);
    } else {
      setNewEventTime('');
    }
    setShowAddModal(true);
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEventTitle.trim()) return;

    const isAllDay = !newEventTime;
    const startDate = isAllDay
      ? format(selectedDate, 'yyyy-MM-dd')
      : `${format(selectedDate, 'yyyy-MM-dd')}T${newEventTime}`;

    if (editingEvent) {
      // Update existing event
      await updateCalendarEvent(editingEvent.id, {
        title: newEventTitle.trim(),
        start_date: startDate,
        all_day: isAllDay,
      });
    } else {
      // Create new event
      const newEvent: CalendarEventRecord = {
        id: crypto.randomUUID(),
        title: newEventTitle.trim(),
        start_date: startDate,
        all_day: isAllDay,
      };
      await addCalendarEvent(newEvent);
    }

    setShowAddModal(false);
    setNewEventTitle('');
    setNewEventTime('');
    setEditingEvent(null);
    loadCustomEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    await removeCalendarEvent(id);
    loadCustomEvents();
  };

  // Drag and drop handlers
  const handleDragStart = (event: CalendarEvent) => {
    if (event.isCustom) {
      setDraggedEvent(event);
    }
  };

  const handleDrop = async (targetDate: Date) => {
    if (!draggedEvent || !draggedEvent.isCustom) return;

    const customEvent = customEvents.find(e => e.id === draggedEvent.id);
    if (!customEvent) return;

    const isAllDay = customEvent.all_day;
    const newStartDate = isAllDay
      ? format(targetDate, 'yyyy-MM-dd')
      : `${format(targetDate, 'yyyy-MM-dd')}T${customEvent.start_date.split('T')[1] || '12:00'}`;

    await updateCalendarEvent(draggedEvent.id, {
      start_date: newStartDate,
    });

    setDraggedEvent(null);
    loadCustomEvents();
  };

  // Merge Google Calendar events, custom events, and projects
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
    // Add projects with target dates
    ...projects.map((p) => ({
      id: `project-${p.id}`,
      title: p.title,
      start: new Date(p.target_date!),
      end: new Date(p.target_date!),
      allDay: true,
      isProject: true,
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

  // Detect mobile viewport
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={() => {
        // Allow vertical scrolling but track for swipe
      }}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 6,
              cursor: 'pointer',
              padding: isMobile ? 8 : 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: isMobile ? 36 : 28,
              minHeight: isMobile ? 36 : 28,
              touchAction: 'manipulation',
            }}
          >
            <ChevronLeft size={isMobile ? 18 : 16} />
          </button>
          <span style={styles.monthTitle}>
            {format(currentMonth, isMobile ? 'MMM yyyy' : 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 6,
              cursor: 'pointer',
              padding: isMobile ? 8 : 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: isMobile ? 36 : 28,
              minHeight: isMobile ? 36 : 28,
              touchAction: 'manipulation',
            }}
          >
            <ChevronRight size={isMobile ? 18 : 16} />
          </button>
        </div>
        <button
          onClick={loadAllEvents}
          style={{
            background: '#fff',
            border: '1px solid #ddd',
            cursor: 'pointer',
            padding: isMobile ? 8 : 6,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 6,
            minWidth: isMobile ? 36 : 28,
            minHeight: isMobile ? 36 : 28,
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 'clamp(4px, 1.5vw, 8px)' }}>
        {(isMobile ? WEEKDAYS_SHORT : WEEKDAYS).map((weekday, idx) => (
          <div key={idx} style={styles.weekdayHeader}>
            {weekday}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={styles.calendarGrid}>
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dateKey}
              onClick={() => handleDayClick(day)}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isCurrentDay) {
                  e.currentTarget.style.background = '#e8f4ff';
                }
              }}
              onDragLeave={(e) => {
                if (!isCurrentDay) {
                  e.currentTarget.style.background = '#fff';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!isCurrentDay) {
                  e.currentTarget.style.background = '#fff';
                }
                handleDrop(day);
              }}
              style={{
                ...styles.dayCell,
                background: isCurrentDay
                  ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                  : '#fff',
                opacity: isCurrentMonth ? 1 : 0.4,
                boxShadow: isCurrentDay
                  ? 'inset 0 0 0 2px #000, 0 2px 8px rgba(0,0,0,0.15)'
                  : 'none',
              }}
            >
              {/* Day number */}
              <div
                style={{
                  ...styles.dayNumber,
                  fontWeight: isCurrentDay ? 700 : 400,
                  color: isCurrentDay ? '#fff' : '#333',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: isCurrentDay ? 22 : 'auto',
                    height: isCurrentDay ? 22 : 'auto',
                    background: isCurrentDay ? '#fff' : 'transparent',
                    color: isCurrentDay ? '#000' : '#333',
                    borderRadius: isCurrentDay ? '50%' : 0,
                    fontSize: isCurrentDay ? 11 : 12,
                    fontWeight: isCurrentDay ? 800 : 400,
                  }}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentDay && (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      opacity: 0.8,
                    }}
                  >
                    TODAY
                  </span>
                )}
                {!isCurrentDay && !isMobile && <Plus size={10} style={{ opacity: 0.3 }} />}
              </div>

              {/* Events */}
              {dayEvents.slice(0, isMobile ? 1 : 2).map(event => {
                const customEventRecord = event.isCustom
                  ? customEvents.find(e => e.id === event.id)
                  : null;
                const isProjectEvent = event.isProject === true;

                return (
                  <div
                    key={event.id}
                    draggable={event.isCustom && !isMobile}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(event);
                    }}
                    style={{
                      ...styles.eventTag,
                      background: isProjectEvent
                        ? (isCurrentDay ? 'rgba(100, 149, 237, 0.9)' : '#6495ed')
                        : isCurrentDay
                          ? (event.isCustom ? 'rgba(255,255,255,0.85)' : '#fff')
                          : (event.isCustom ? '#333' : '#000'),
                      color: isProjectEvent ? '#fff' : (isCurrentDay ? '#000' : '#fff'),
                      cursor: event.isCustom && !isMobile ? 'grab' : 'default',
                      border: isProjectEvent ? '1px solid rgba(255,255,255,0.3)' : 'none',
                    }}
                    title={`${event.title}${event.allDay ? '' : ` - ${format(event.start, 'h:mm a')}`}${event.isCustom ? ' (drag to move)' : ''}${isProjectEvent ? ' (Project)' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {isProjectEvent && <ClipboardList size={8} style={{ flexShrink: 0 }} />}
                      {!event.allDay && !isMobile && !isProjectEvent && <Clock size={8} style={{ marginRight: 2, opacity: 0.7 }} />}
                      {event.title}
                    </span>
                    {event.isCustom && customEventRecord && !isMobile && (
                      <div style={{ display: 'flex', gap: 2 }}>
                        <Pencil
                          size={10}
                          style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(customEventRecord);
                          }}
                        />
                        <X
                          size={10}
                          style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {dayEvents.length > (isMobile ? 1 : 2) && (
                <div style={{ fontSize: 'clamp(6px, 1.5vw, 8px)', color: isCurrentDay ? 'rgba(255,255,255,0.7)' : '#666' }}>
                  +{dayEvents.length - (isMobile ? 1 : 2)} more
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event count */}
      <div style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#999', textAlign: 'center', paddingTop: 'clamp(4px, 1.5vw, 8px)' }}>
        {allEvents.length} events this month
      </div>

      {/* Add/Edit Event Modal */}
      {showAddModal && selectedDate && (
        <div
          style={styles.modal}
          onClick={() => {
            setShowAddModal(false);
            setEditingEvent(null);
          }}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(12px, 3vw, 16px)' }}>
              <h3 style={{ margin: 0, fontSize: 'clamp(14px, 3.5vw, 16px)' }}>{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
              <X
                size={20}
                style={{ cursor: 'pointer', opacity: 0.5 }}
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
              />
            </div>
            {/* Date display/picker */}
            {editingEvent ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 8, letterSpacing: '0.05em' }}>DATE</div>
                <input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value + 'T12:00:00');
                    setSelectedDate(newDate);
                  }}
                  style={{
                    ...styles.input,
                    cursor: 'pointer',
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: 'clamp(8px, 2vw, 12px)', fontSize: 'clamp(12px, 3vw, 14px)', color: '#666' }}>
                {format(selectedDate, isMobile ? 'EEE, MMM d' : 'EEEE, MMMM d, yyyy')}
              </div>
            )}

            {/* Common Events Dropdown */}
            {!editingEvent && (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setNewEventTitle(e.target.value);
                }}
                style={{
                  ...styles.input,
                  marginBottom: 10,
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
            )}

            {/* Event title input */}
            <input
              type="text"
              placeholder={editingEvent ? "Event title" : "Or type custom event"}
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEvent();
              }}
              autoFocus
              style={{
                ...styles.input,
                marginBottom: 'clamp(10px, 2.5vw, 14px)',
              }}
            />

            {/* Exact time input */}
            <div style={{ marginBottom: 'clamp(10px, 2.5vw, 14px)' }}>
              <div style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#999', marginBottom: 'clamp(4px, 1.5vw, 8px)', letterSpacing: '0.05em' }}>TIME (optional)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={14} color="#999" />
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  style={{
                    ...styles.input,
                    flex: 1,
                  }}
                  placeholder="Leave empty for all-day"
                />
                {newEventTime && (
                  <button
                    onClick={() => setNewEventTime('')}
                    style={{
                      background: 'none',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 'clamp(10px, 2.5vw, 11px)',
                      color: '#666',
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick time presets */}
            <div style={{ marginBottom: 'clamp(10px, 2.5vw, 14px)' }}>
              <div style={{ fontSize: 'clamp(9px, 2.5vw, 11px)', color: '#999', marginBottom: 'clamp(4px, 1.5vw, 8px)', letterSpacing: '0.05em' }}>QUICK PRESETS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(4px, 1.5vw, 6px)' }}>
                {TIME_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setNewEventTime(preset.value)}
                    style={{
                      ...styles.timePresetButton,
                      border: newEventTime === preset.value ? '1px solid #333' : '1px solid #ddd',
                      backgroundColor: newEventTime === preset.value ? '#333' : '#fff',
                      color: newEventTime === preset.value ? '#fff' : '#666',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                style={{
                  ...styles.button,
                  border: '1px solid #ddd',
                  background: '#fff',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newEventTitle.trim()}
                style={{
                  ...styles.button,
                  border: 'none',
                  background: newEventTitle.trim() ? '#000' : '#ccc',
                  color: '#fff',
                  cursor: newEventTitle.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {editingEvent ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
