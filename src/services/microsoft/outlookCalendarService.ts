import { CalendarEvent } from '../../types/calendar';
import { getAccessToken, graphScopes } from './microsoftAuth';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface OutlookEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  location?: { displayName: string };
}

interface GraphResponse<T> {
  value: T[];
}

export async function fetchOutlookCalendarEvents(maxResults: number = 20): Promise<CalendarEvent[]> {
  const accessToken = await getAccessToken(graphScopes.calendar);
  if (!accessToken) {
    throw new Error('Not authenticated with Microsoft');
  }

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const params = new URLSearchParams({
    $top: maxResults.toString(),
    $select: 'id,subject,start,end,isAllDay,location',
    $orderby: 'start/dateTime',
    startDateTime: now.toISOString(),
    endDateTime: endOfWeek.toISOString(),
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/me/calendarView?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Outlook Calendar authentication expired');
    }
    throw new Error(`Outlook Calendar API error: ${response.status}`);
  }

  const data: GraphResponse<OutlookEvent> = await response.json();

  return data.value.map((event) => ({
    id: event.id,
    title: event.subject || '(No title)',
    start: new Date(event.start.dateTime + 'Z'),
    end: new Date(event.end.dateTime + 'Z'),
    allDay: event.isAllDay,
    location: event.location?.displayName,
    source: 'outlook' as const,
  }));
}
