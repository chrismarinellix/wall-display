export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  location?: string;
  source: 'google' | 'outlook';
}

export interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}
