import { format, isToday, isTomorrow, startOfDay, isSameDay } from 'date-fns';
import { Calendar, RefreshCw, MapPin } from 'lucide-react';
import { useCalendar } from '../../hooks/useCalendar';
import { Loading } from '../ui/Loading';
import { CalendarEvent } from '../../types/calendar';

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }
  return format(event.start, 'h:mm a');
}

function EventItem({ event }: { event: CalendarEvent }) {
  const isNow = new Date() >= event.start && new Date() <= event.end;

  return (
    <div className={`py-3 px-3 border-l-2 ${isNow ? 'border-eink-black bg-eink-light/50' : 'border-eink-mid'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-eink-black truncate">
            {event.title}
          </div>
          {event.location && (
            <div className="flex items-center gap-1 text-xs text-eink-mid mt-1">
              <MapPin size={10} />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="eink-mono text-xs text-eink-dark">
            {formatEventTime(event)}
          </div>
          <div className="text-[10px] eink-mono text-eink-mid">
            {event.source === 'google' ? 'G' : 'O'}
          </div>
        </div>
      </div>
    </div>
  );
}

function DaySection({ date, events }: { date: Date; events: CalendarEvent[] }) {
  let dayLabel: string;
  if (isToday(date)) {
    dayLabel = 'Today';
  } else if (isTomorrow(date)) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = format(date, 'EEEE, MMM d');
  }

  return (
    <div className="mb-6">
      <h3 className="eink-heading text-sm text-eink-dark mb-2 pb-1 border-b border-eink-mid">
        {dayLabel}
      </h3>
      <div className="space-y-1">
        {events.map(event => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

export function CalendarScreen() {
  const { events, loading, error, refresh, lastFetched } = useCalendar();

  if (loading && events.length === 0) {
    return <Loading message="Fetching calendar..." />;
  }

  // Group events by day
  const eventsByDay = events.reduce((acc, event) => {
    const dayKey = startOfDay(event.start).toISOString();
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const sortedDays = Object.keys(eventsByDay).sort();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-eink-dark" size={20} />
          <h1 className="eink-heading text-xl">Upcoming</h1>
          <span className="eink-mono text-xs text-eink-mid">
            {events.length} events
          </span>
        </div>
        <button
          onClick={refresh}
          className="p-2 hover:bg-eink-light rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-sm text-eink-dark bg-eink-light p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">No upcoming events</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {sortedDays.map(dayKey => (
            <DaySection
              key={dayKey}
              date={new Date(dayKey)}
              events={eventsByDay[dayKey]}
            />
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastFetched && (
        <div className="text-xs text-eink-mid eink-mono pt-2 text-center">
          Updated {format(lastFetched, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
