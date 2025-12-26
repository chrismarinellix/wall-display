import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '../types/calendar';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { fetchGoogleCalendarEvents } from '../services/google/googleCalendarService';
import { fetchOutlookCalendarEvents } from '../services/microsoft/outlookCalendarService';

interface UseCalendarReturn {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastFetched: Date | null;
}

export function useCalendar(): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { auth } = useAuth();
  const { settings } = useSettings();

  const fetchEvents = useCallback(async () => {
    if (!auth.google.isAuthenticated && !auth.microsoft.isAuthenticated) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results: CalendarEvent[] = [];

      // Fetch Google Calendar if authenticated
      if (auth.google.isAuthenticated && auth.google.accessToken) {
        try {
          const googleEvents = await fetchGoogleCalendarEvents(auth.google.accessToken);
          results.push(...googleEvents);
        } catch (e) {
          console.error('Google Calendar fetch error:', e);
        }
      }

      // Fetch Outlook Calendar if authenticated
      if (auth.microsoft.isAuthenticated) {
        try {
          const outlookEvents = await fetchOutlookCalendarEvents();
          results.push(...outlookEvents);
        } catch (e) {
          console.error('Outlook Calendar fetch error:', e);
        }
      }

      // Sort by start time
      results.sort((a, b) => a.start.getTime() - b.start.getTime());

      setEvents(results);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch calendar');
    } finally {
      setLoading(false);
    }
  }, [auth.google.isAuthenticated, auth.google.accessToken, auth.microsoft.isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Auto-refresh
  useEffect(() => {
    if (settings.refreshInterval === 0) return;

    const timer = setInterval(fetchEvents, settings.refreshInterval);
    return () => clearInterval(timer);
  }, [fetchEvents, settings.refreshInterval]);

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
    lastFetched,
  };
}
