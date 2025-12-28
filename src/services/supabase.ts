import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface PomodoroRecord {
  id?: number;
  date: string;
  count: number;
  minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface PomodoroHistory {
  [date: string]: { count: number; minutes: number };
}

// Get all pomodoro history (with minutes if available)
export async function getPomodoroHistory(): Promise<PomodoroHistory> {
  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    return {};
  }

  try {
    // Try with minutes column first
    const { data, error } = await supabase
      .from('pomodoro_history')
      .select('date, count, minutes');

    // If minutes column doesn't exist, query without it
    if (error && error.code === '42703') {
      console.log('Minutes column not found, querying without it');
      const result = await supabase
        .from('pomodoro_history')
        .select('date, count');

      if (result.error) throw result.error;

      const history: PomodoroHistory = {};
      result.data?.forEach((record: { date: string; count: number }) => {
        history[record.date] = {
          count: record.count || 0,
          minutes: 0
        };
      });
      console.log(`Loaded ${result.data?.length || 0} days of history from Supabase (no minutes column)`);
      return history;
    }

    if (error) throw error;

    const history: PomodoroHistory = {};
    data?.forEach((record: { date: string; count: number; minutes?: number }) => {
      history[record.date] = {
        count: record.count || 0,
        minutes: record.minutes || 0
      };
    });
    console.log(`Loaded ${data?.length || 0} days of history from Supabase`);
    return history;
  } catch (e) {
    console.error('Failed to fetch pomodoro history:', e);
    return {};
  }
}

// Increment pomodoro count for today
export async function incrementPomodoro(date: string): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured');
    return;
  }

  try {
    // First get current values
    const { data: existing } = await supabase
      .from('pomodoro_history')
      .select('count, minutes')
      .eq('date', date)
      .single();

    if (existing) {
      await supabase
        .from('pomodoro_history')
        .update({ count: (existing.count || 0) + 1 })
        .eq('date', date);
    } else {
      await supabase
        .from('pomodoro_history')
        .insert({ date, count: 1, minutes: 0 });
    }
  } catch (e) {
    console.error('Failed to increment pomodoro:', e);
  }
}

// Add minutes to today's record (for partial sessions)
// Note: This will silently fail if the minutes column doesn't exist
export async function addMinutes(date: string, minutesToAdd: number): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured');
    return;
  }

  try {
    // First get current values
    const { data: existing, error: selectError } = await supabase
      .from('pomodoro_history')
      .select('count, minutes')
      .eq('date', date)
      .single();

    // If minutes column doesn't exist, just skip this operation
    if (selectError && selectError.code === '42703') {
      console.log('Minutes column not found, skipping addMinutes');
      return;
    }

    if (existing) {
      await supabase
        .from('pomodoro_history')
        .update({ minutes: (existing.minutes || 0) + minutesToAdd })
        .eq('date', date);
    } else {
      await supabase
        .from('pomodoro_history')
        .insert({ date, count: 0, minutes: minutesToAdd });
    }
  } catch (e) {
    console.error('Failed to add minutes:', e);
  }
}

// ============ COUNTDOWN TIMERS ============

export interface CountdownEvent {
  id: string;
  title: string;
  target_date: string; // ISO string
  color: string;
  created_at?: string;
}

// Get all countdown events
export async function getCountdowns(): Promise<CountdownEvent[]> {
  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    const stored = localStorage.getItem('countdown-events');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('countdowns')
      .select('*')
      .order('target_date', { ascending: true });

    if (error) throw error;

    console.log(`Loaded ${data?.length || 0} countdowns from Supabase`);
    return data || [];
  } catch (e) {
    console.error('Failed to fetch countdowns:', e);
    // Fallback to localStorage
    const stored = localStorage.getItem('countdown-events');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }
}

// Add a new countdown
export async function addCountdown(event: CountdownEvent): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    const stored = localStorage.getItem('countdown-events');
    const events = stored ? JSON.parse(stored) : [];
    events.push(event);
    localStorage.setItem('countdown-events', JSON.stringify(events));
    return;
  }

  try {
    const { error } = await supabase
      .from('countdowns')
      .insert({
        id: event.id,
        title: event.title,
        target_date: event.target_date,
        color: event.color,
      });

    if (error) throw error;
    console.log('Added countdown to Supabase:', event.title);
  } catch (e) {
    console.error('Failed to add countdown:', e);
  }
}

// Remove a countdown
export async function removeCountdown(id: string): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    const stored = localStorage.getItem('countdown-events');
    if (stored) {
      const events = JSON.parse(stored).filter((e: CountdownEvent) => e.id !== id);
      localStorage.setItem('countdown-events', JSON.stringify(events));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('countdowns')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('Removed countdown from Supabase:', id);
  } catch (e) {
    console.error('Failed to remove countdown:', e);
  }
}

// Subscribe to countdown changes (realtime)
export function subscribeToCountdowns(callback: (events: CountdownEvent[]) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel('countdowns-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'countdowns' },
      async () => {
        // Refetch all countdowns when any change happens
        const events = await getCountdowns();
        callback(events);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============ CALENDAR EVENTS ============

export interface CalendarEventRecord {
  id: string;
  title: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  location?: string;
  created_at?: string;
}

// Get all calendar events
export async function getCalendarEvents(): Promise<CalendarEventRecord[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to fetch calendar events:', e);
    return [];
  }
}

// Add a calendar event
export async function addCalendarEvent(event: CalendarEventRecord): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured');
    return;
  }

  try {
    const { error } = await supabase
      .from('calendar_events')
      .insert(event);

    if (error) throw error;
    console.log('Added calendar event:', event.title);
  } catch (e) {
    console.error('Failed to add calendar event:', e);
  }
}

// Remove a calendar event
export async function removeCalendarEvent(id: string): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('Removed calendar event:', id);
  } catch (e) {
    console.error('Failed to remove calendar event:', e);
  }
}

// Subscribe to calendar event changes
export function subscribeToCalendarEvents(callback: (events: CalendarEventRecord[]) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel('calendar-events-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calendar_events' },
      async () => {
        const events = await getCalendarEvents();
        callback(events);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
