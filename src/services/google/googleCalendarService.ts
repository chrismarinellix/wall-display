import { CalendarEvent } from '../../types/calendar';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  maxResults: number = 20
): Promise<CalendarEvent[]> {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    timeMin: now.toISOString(),
    timeMax: endOfWeek.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Google Calendar authentication expired');
    }
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  const data: GoogleCalendarResponse = await response.json();

  return data.items.map((event) => ({
    id: event.id,
    title: event.summary || '(No title)',
    start: new Date(event.start.dateTime || event.start.date || ''),
    end: new Date(event.end.dateTime || event.end.date || ''),
    allDay: !event.start.dateTime,
    location: event.location,
    source: 'google' as const,
  }));
}
