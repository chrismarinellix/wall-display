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

// Individual pomodoro session record
export type SessionType = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSession {
  id?: string;
  type: SessionType;
  duration_minutes: number;
  completed_at: string; // ISO timestamp
}

const SESSIONS_STORAGE_KEY = 'pomodoro-sessions';

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

// Record a completed pomodoro session (work or break)
export async function recordSession(session: Omit<PomodoroSession, 'id'>): Promise<void> {
  const newSession: PomodoroSession = {
    ...session,
    id: crypto.randomUUID(),
  };

  if (!supabase) {
    // Save to localStorage
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const sessions = stored ? JSON.parse(stored) : [];
    sessions.push(newSession);
    // Keep only last 200 sessions
    if (sessions.length > 200) {
      sessions.splice(0, sessions.length - 200);
    }
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    console.log(`[Sessions] Saved session to localStorage: ${session.type} (${session.duration_minutes}min)`);
    return;
  }

  try {
    const { error } = await supabase
      .from('pomodoro_sessions')
      .insert({
        id: newSession.id,
        type: newSession.type,
        duration_minutes: newSession.duration_minutes,
        completed_at: newSession.completed_at,
      });

    if (error) {
      // If table doesn't exist, fall back to localStorage
      if (error.code === '42P01') {
        console.log('[Sessions] Table not found, using localStorage');
        const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
        const sessions = stored ? JSON.parse(stored) : [];
        sessions.push(newSession);
        if (sessions.length > 200) {
          sessions.splice(0, sessions.length - 200);
        }
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
        return;
      }
      throw error;
    }

    // Also save to localStorage as backup
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const sessions = stored ? JSON.parse(stored) : [];
    sessions.push(newSession);
    if (sessions.length > 200) {
      sessions.splice(0, sessions.length - 200);
    }
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));

    console.log(`[Sessions] Saved session: ${session.type} (${session.duration_minutes}min)`);
  } catch (e) {
    console.error('Failed to record session:', e);
    // Fallback to localStorage
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const sessions = stored ? JSON.parse(stored) : [];
    sessions.push(newSession);
    if (sessions.length > 200) {
      sessions.splice(0, sessions.length - 200);
    }
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }
}

// Get recent sessions (for history display)
export async function getRecentSessions(limit: number = 60): Promise<PomodoroSession[]> {
  if (!supabase) {
    // Get from localStorage
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (stored) {
      try {
        const sessions = JSON.parse(stored) as PomodoroSession[];
        return sessions.slice(-limit);
      } catch {
        return [];
      }
    }
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist, fall back to localStorage
      if (error.code === '42P01') {
        console.log('[Sessions] Table not found, using localStorage');
        const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
        if (stored) {
          const sessions = JSON.parse(stored) as PomodoroSession[];
          return sessions.slice(-limit);
        }
        return [];
      }
      throw error;
    }

    // Reverse to get oldest first (for display)
    return (data || []).reverse();
  } catch (e) {
    console.error('Failed to get sessions:', e);
    // Fallback to localStorage
    const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (stored) {
      try {
        const sessions = JSON.parse(stored) as PomodoroSession[];
        return sessions.slice(-limit);
      } catch {
        return [];
      }
    }
    return [];
  }
}

// ============ COUNTDOWN TIMERS ============

export interface CountdownEvent {
  id: string;
  title: string;
  target_date: string; // ISO string
  color: string;
  description?: string; // Rich description for AI to create engaging content
  importance?: 'low' | 'medium' | 'high'; // How significant is this event
  category?: 'birthday' | 'holiday' | 'travel' | 'work' | 'personal' | 'anniversary' | 'other';
  created_at?: string;
}

// Get all countdown events (only future events)
export async function getCountdowns(): Promise<CountdownEvent[]> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    const stored = localStorage.getItem('countdown-events');
    if (stored) {
      try {
        const events = JSON.parse(stored) as CountdownEvent[];
        // Filter to only future events
        return events.filter(e => e.target_date >= today);
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
      .gte('target_date', today) // Only future events
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
        description: event.description,
        importance: event.importance,
        category: event.category,
      });

    if (error) throw error;
    console.log('Added countdown to Supabase:', event.title);
  } catch (e) {
    console.error('Failed to add countdown:', e);
  }
}

// Update a countdown
export async function updateCountdown(id: string, updates: Partial<Pick<CountdownEvent, 'title' | 'target_date' | 'color' | 'description' | 'importance' | 'category'>>): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    const stored = localStorage.getItem('countdown-events');
    if (stored) {
      const events = JSON.parse(stored).map((e: CountdownEvent) =>
        e.id === id ? { ...e, ...updates } : e
      );
      localStorage.setItem('countdown-events', JSON.stringify(events));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('countdowns')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    console.log('Updated countdown in Supabase:', id);
  } catch (e) {
    console.error('Failed to update countdown:', e);
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

// Update a calendar event
export async function updateCalendarEvent(id: string, updates: Partial<CalendarEventRecord>): Promise<void> {
  if (!supabase) {
    return;
  }

  try {
    const { error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    console.log('Updated calendar event:', id);
  } catch (e) {
    console.error('Failed to update calendar event:', e);
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

// ============ DAILY HABITS ============

export interface DailyHabit {
  id: string;
  name: string;
  icon: string;
  completed: boolean;
  completedAt?: string; // ISO timestamp
}

export interface DailyHabitsRecord {
  date: string;
  habits: DailyHabit[];
}

const DEFAULT_HABITS: Omit<DailyHabit, 'completed' | 'completedAt'>[] = [
  { id: 'gym', name: 'Gym / Workout', icon: 'dumbbell' },
  { id: 'ride', name: 'Bike Ride', icon: 'bike' },
  { id: 'protein', name: 'High Protein Meal', icon: 'beef' },
  { id: 'veggies', name: 'Eat Vegetables', icon: 'salad' },
  { id: 'water', name: 'Drink 2L Water', icon: 'droplet' },
  { id: 'sleep', name: '7+ Hours Sleep', icon: 'moon' },
];

// Get today's date as YYYY-MM-DD
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Get default habits (fresh for a new day)
function getDefaultHabits(): DailyHabit[] {
  return DEFAULT_HABITS.map(h => ({
    ...h,
    completed: false,
    completedAt: undefined,
  }));
}

// Get habits for today (async - from Supabase)
export async function getDailyHabits(): Promise<DailyHabit[]> {
  const today = getTodayString();

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(`habits-${today}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultHabits();
      }
    }
    return getDefaultHabits();
  }

  try {
    const { data, error } = await supabase
      .from('daily_habits')
      .select('habits')
      .eq('date', today)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - return defaults
        return getDefaultHabits();
      }
      throw error;
    }

    return data?.habits || getDefaultHabits();
  } catch (e) {
    console.error('Failed to fetch daily habits:', e);
    // Fallback to localStorage
    const stored = localStorage.getItem(`habits-${today}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultHabits();
      }
    }
    return getDefaultHabits();
  }
}

// Toggle a habit (async - saves to Supabase)
export async function toggleHabit(habitId: string, currentHabits: DailyHabit[]): Promise<DailyHabit[]> {
  const today = getTodayString();
  const now = new Date().toISOString();

  const updated = currentHabits.map(h => {
    if (h.id === habitId) {
      return {
        ...h,
        completed: !h.completed,
        completedAt: !h.completed ? now : undefined,
      };
    }
    return h;
  });

  if (!supabase) {
    // Fallback to localStorage
    localStorage.setItem(`habits-${today}`, JSON.stringify(updated));
    return updated;
  }

  try {
    // Upsert the habits for today
    const { error } = await supabase
      .from('daily_habits')
      .upsert({
        date: today,
        habits: updated,
      }, {
        onConflict: 'date',
      });

    if (error) throw error;

    // Also save to localStorage as backup
    localStorage.setItem(`habits-${today}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save habit toggle:', e);
    // Still save to localStorage
    localStorage.setItem(`habits-${today}`, JSON.stringify(updated));
  }

  return updated;
}

// Subscribe to habit changes (realtime)
export function subscribeToHabits(callback: (habits: DailyHabit[]) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const today = getTodayString();

  const channel = supabase
    .channel('daily-habits-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_habits', filter: `date=eq.${today}` },
      async () => {
        const habits = await getDailyHabits();
        callback(habits);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Get habit history for past N days (per habit)
export async function getHabitHistory(days: number = 14): Promise<{ [habitId: string]: { [date: string]: boolean } }> {
  const history: { [habitId: string]: { [date: string]: boolean } } = {};
  const today = new Date();

  // Initialize all default habits
  DEFAULT_HABITS.forEach(h => {
    history[h.id] = {};
  });

  if (!supabase) {
    // Fallback to localStorage
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stored = localStorage.getItem(`habits-${dateStr}`);
      if (stored) {
        try {
          const habits = JSON.parse(stored) as DailyHabit[];
          habits.forEach(h => {
            if (history[h.id]) {
              history[h.id][dateStr] = h.completed;
            }
          });
        } catch {
          // Skip invalid data
        }
      }
    }
    return history;
  }

  try {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const { data, error } = await supabase
      .from('daily_habits')
      .select('date, habits')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    if (error) throw error;

    // Process each day's habits
    data?.forEach((row: { date: string; habits: DailyHabit[] }) => {
      row.habits.forEach(h => {
        if (history[h.id]) {
          history[h.id][row.date] = h.completed;
        }
      });
    });

    return history;
  } catch (e) {
    console.error('Failed to fetch habit history:', e);
    return history;
  }
}

// Get habit completion stats for the week (async)
export async function getWeeklyHabitStats(): Promise<{ date: string; completed: number; total: number }[]> {
  const stats = [];
  const today = new Date();

  if (!supabase) {
    // Fallback to localStorage
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const stored = localStorage.getItem(`habits-${dateStr}`);
      if (stored) {
        try {
          const habits = JSON.parse(stored) as DailyHabit[];
          stats.push({
            date: dateStr,
            completed: habits.filter(h => h.completed).length,
            total: habits.length,
          });
        } catch {
          stats.push({ date: dateStr, completed: 0, total: DEFAULT_HABITS.length });
        }
      } else {
        stats.push({ date: dateStr, completed: 0, total: DEFAULT_HABITS.length });
      }
    }
    return stats;
  }

  try {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const { data, error } = await supabase
      .from('daily_habits')
      .select('date, habits')
      .gte('date', weekAgo.toISOString().split('T')[0])
      .lte('date', today.toISOString().split('T')[0]);

    if (error) throw error;

    // Build map from data
    const habitsByDate: { [date: string]: DailyHabit[] } = {};
    data?.forEach((row: { date: string; habits: DailyHabit[] }) => {
      habitsByDate[row.date] = row.habits;
    });

    // Generate stats for each day
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const habits = habitsByDate[dateStr];
      if (habits) {
        stats.push({
          date: dateStr,
          completed: habits.filter(h => h.completed).length,
          total: habits.length,
        });
      } else {
        stats.push({ date: dateStr, completed: 0, total: DEFAULT_HABITS.length });
      }
    }

    return stats;
  } catch (e) {
    console.error('Failed to fetch weekly habit stats:', e);
    return [];
  }
}

// ============ TODOS ============

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string; // ISO date string
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  completed_at?: string;
}

const TODOS_STORAGE_KEY = 'wall-display-todos';

// Get all todos
export async function getTodos(): Promise<TodoItem[]> {
  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
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
      .from('todos')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const todos = (data || []).map(d => ({
      id: d.id,
      title: d.title,
      completed: d.completed,
      due_date: d.due_date,
      priority: d.priority || 'medium',
      created_at: d.created_at,
      completed_at: d.completed_at,
    }));

    // Cache to localStorage
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
    return todos;
  } catch (e) {
    console.error('Failed to fetch todos:', e);
    // Try localStorage fallback
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
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

// Add a new todo
export async function addTodo(todo: Omit<TodoItem, 'id' | 'created_at'>): Promise<TodoItem | null> {
  const newTodo: TodoItem = {
    ...todo,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    const todos = stored ? JSON.parse(stored) : [];
    todos.push(newTodo);
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));
    return newTodo;
  }

  try {
    const { error } = await supabase
      .from('todos')
      .insert({
        id: newTodo.id,
        title: newTodo.title,
        completed: newTodo.completed,
        due_date: newTodo.due_date,
        priority: newTodo.priority,
        created_at: newTodo.created_at,
      });

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    const todos = stored ? JSON.parse(stored) : [];
    todos.push(newTodo);
    localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(todos));

    return newTodo;
  } catch (e) {
    console.error('Failed to add todo:', e);
    return null;
  }
}

// Toggle todo completion
export async function toggleTodo(id: string): Promise<void> {
  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    if (stored) {
      const todos = JSON.parse(stored) as TodoItem[];
      const updated = todos.map(t => {
        if (t.id === id) {
          return {
            ...t,
            completed: !t.completed,
            completed_at: !t.completed ? new Date().toISOString() : undefined,
          };
        }
        return t;
      });
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(updated));
    }
    return;
  }

  try {
    // First get current state
    const { data: current } = await supabase
      .from('todos')
      .select('completed')
      .eq('id', id)
      .single();

    const newCompleted = !current?.completed;

    const { error } = await supabase
      .from('todos')
      .update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    if (stored) {
      const todos = JSON.parse(stored) as TodoItem[];
      const updated = todos.map(t => {
        if (t.id === id) {
          return {
            ...t,
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : undefined,
          };
        }
        return t;
      });
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to toggle todo:', e);
  }
}

// Update a todo
export async function updateTodo(id: string, updates: Partial<Omit<TodoItem, 'id' | 'created_at'>>): Promise<void> {
  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    if (stored) {
      const todos = JSON.parse(stored) as TodoItem[];
      const updated = todos.map(t => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(updated));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    if (stored) {
      const todos = JSON.parse(stored) as TodoItem[];
      const updated = todos.map(t => t.id === id ? { ...t, ...updates } : t);
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to update todo:', e);
  }
}

// Delete a todo
export async function deleteTodo(id: string): Promise<void> {
  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    if (stored) {
      const todos = JSON.parse(stored) as TodoItem[];
      const filtered = todos.filter(t => t.id !== id);
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(filtered));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(TODOS_STORAGE_KEY);
    if (stored) {
      const todos = JSON.parse(stored) as TodoItem[];
      const filtered = todos.filter(t => t.id !== id);
      localStorage.setItem(TODOS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to delete todo:', e);
  }
}

// Subscribe to todo changes
export function subscribeToTodos(callback: (todos: TodoItem[]) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel('todos-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'todos' },
      async () => {
        const todos = await getTodos();
        callback(todos);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============ BIRTHDAYS & ZODIAC ============

export interface Birthday {
  name: string;
  date: string; // Format: MM-DD
  birthYear: number;
  relationship?: string;
}

// Family birthdays
export const BIRTHDAYS: Birthday[] = [
  { name: 'Chris', date: '06-04', birthYear: 1970, relationship: 'self' },
  { name: 'Caroline', date: '08-10', birthYear: 1972, relationship: 'partner' },
  { name: 'Dad', date: '03-13', birthYear: 1942, relationship: 'father' },
];

// Zodiac signs with date ranges and traits
export const ZODIAC_SIGNS: Record<string, {
  start: string;
  end: string;
  element: string;
  traits: string[];
  symbol: string;
}> = {
  'Aries': { start: '03-21', end: '04-19', element: 'Fire', traits: ['bold', 'ambitious', 'passionate'], symbol: '♈' },
  'Taurus': { start: '04-20', end: '05-20', element: 'Earth', traits: ['reliable', 'patient', 'devoted'], symbol: '♉' },
  'Gemini': { start: '05-21', end: '06-20', element: 'Air', traits: ['curious', 'adaptable', 'witty'], symbol: '♊' },
  'Cancer': { start: '06-21', end: '07-22', element: 'Water', traits: ['intuitive', 'sentimental', 'protective'], symbol: '♋' },
  'Leo': { start: '07-23', end: '08-22', element: 'Fire', traits: ['dramatic', 'creative', 'passionate'], symbol: '♌' },
  'Virgo': { start: '08-23', end: '09-22', element: 'Earth', traits: ['analytical', 'practical', 'loyal'], symbol: '♍' },
  'Libra': { start: '09-23', end: '10-22', element: 'Air', traits: ['diplomatic', 'gracious', 'fair'], symbol: '♎' },
  'Scorpio': { start: '10-23', end: '11-21', element: 'Water', traits: ['resourceful', 'powerful', 'passionate'], symbol: '♏' },
  'Sagittarius': { start: '11-22', end: '12-21', element: 'Fire', traits: ['generous', 'idealistic', 'adventurous'], symbol: '♐' },
  'Capricorn': { start: '12-22', end: '01-19', element: 'Earth', traits: ['responsible', 'disciplined', 'ambitious'], symbol: '♑' },
  'Aquarius': { start: '01-20', end: '02-18', element: 'Air', traits: ['progressive', 'original', 'independent'], symbol: '♒' },
  'Pisces': { start: '02-19', end: '03-20', element: 'Water', traits: ['compassionate', 'artistic', 'intuitive'], symbol: '♓' },
};

// Get zodiac sign for a date
export function getZodiacSign(monthDay: string): { name: string; symbol: string; element: string; traits: string[] } | null {
  const [month, day] = monthDay.split('-').map(Number);
  const checkDate = month * 100 + day; // e.g., 0604 = 604

  for (const [sign, data] of Object.entries(ZODIAC_SIGNS)) {
    const [startMonth, startDay] = data.start.split('-').map(Number);
    const [endMonth, endDay] = data.end.split('-').map(Number);
    const startNum = startMonth * 100 + startDay;
    const endNum = endMonth * 100 + endDay;

    // Handle Capricorn which spans year boundary
    if (startNum > endNum) {
      if (checkDate >= startNum || checkDate <= endNum) {
        return { name: sign, symbol: data.symbol, element: data.element, traits: data.traits };
      }
    } else {
      if (checkDate >= startNum && checkDate <= endNum) {
        return { name: sign, symbol: data.symbol, element: data.element, traits: data.traits };
      }
    }
  }
  return null;
}

// Get birthday info with zodiac and age
export function getBirthdayInfo(birthday: Birthday): {
  name: string;
  age: number;
  zodiac: { name: string; symbol: string; element: string; traits: string[] } | null;
  daysUntilBirthday: number;
  isBirthdayToday: boolean;
  isBirthdayThisWeek: boolean;
  birthYear: number;
} {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [month, day] = birthday.date.split('-').map(Number);

  // Calculate age
  let age = currentYear - birthday.birthYear;
  const birthdayThisYear = new Date(currentYear, month - 1, day);
  if (today < birthdayThisYear) {
    age--;
  }

  // Days until next birthday
  let nextBirthday = new Date(currentYear, month - 1, day);
  if (nextBirthday < today) {
    nextBirthday = new Date(currentYear + 1, month - 1, day);
  }
  const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Is birthday today?
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isBirthdayToday = birthday.date === todayStr;

  // Is birthday this week?
  const isBirthdayThisWeek = daysUntilBirthday <= 7 && daysUntilBirthday > 0;

  return {
    name: birthday.name,
    age,
    zodiac: getZodiacSign(birthday.date),
    daysUntilBirthday,
    isBirthdayToday,
    isBirthdayThisWeek,
    birthYear: birthday.birthYear,
  };
}

// Get all upcoming birthdays
export function getUpcomingBirthdays(): Array<ReturnType<typeof getBirthdayInfo>> {
  return BIRTHDAYS
    .map(getBirthdayInfo)
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
}

// Get birthday message for the day
export function getBirthdayMessage(): string | null {
  const todayBirthdays = BIRTHDAYS
    .map(getBirthdayInfo)
    .filter(b => b.isBirthdayToday);

  if (todayBirthdays.length === 0) return null;

  const messages = todayBirthdays.map(b => {
    const zodiac = b.zodiac;
    return `Happy Birthday to ${b.name}! Turning ${b.age} today. ${zodiac ? `A ${zodiac.name} ${zodiac.symbol} with ${zodiac.traits.join(', ')} energy.` : ''}`;
  });

  return messages.join(' ');
}

// ============ PROJECTS ============

export type ProjectRoom =
  | 'Bathroom 1'
  | 'Bathroom 2'
  | 'Bathroom 3'
  | 'Kitchen'
  | 'Laundry'
  | 'Hall'
  | 'Master Bedroom'
  | 'Olivier Room'
  | 'Ella Room'
  | 'Upstairs Office'
  | 'Upstairs Bedroom'
  | 'Upstairs TV Room'
  | "Chris's Office"
  | 'Back Yard'
  | 'Front Yard'
  | 'Side of House'
  | 'Garage'
  | 'Exterior'
  | 'General';

export const PROJECT_ROOMS: ProjectRoom[] = [
  'Bathroom 1',
  'Bathroom 2',
  'Bathroom 3',
  'Kitchen',
  'Laundry',
  'Hall',
  'Master Bedroom',
  'Olivier Room',
  'Ella Room',
  'Upstairs Office',
  'Upstairs Bedroom',
  'Upstairs TV Room',
  "Chris's Office",
  'Back Yard',
  'Front Yard',
  'Side of House',
  'Garage',
  'Exterior',
  'General',
];

export interface Project {
  id: string;
  title: string;
  description?: string; // How/details
  when?: string; // When it will be done
  target_date?: string; // ISO date for calendar integration
  cost?: number;
  assigned_to?: 'Chris' | 'Contractor'; // Who will do it
  room?: ProjectRoom; // Location/room in the house
  status: 'pending' | 'in_progress' | 'completed';
  position: number; // For drag-and-drop ordering
  created_at: string;
  updated_at?: string;
  updated_by?: 'Chris' | 'Caroline'; // Who last modified
  completed_at?: string;
  // Priority flags
  chris_priority?: boolean;
  caroline_priority?: boolean;
  // Status checkboxes
  needs_quote?: boolean;
  quote_received?: boolean;
  materials_needed?: boolean;
  materials_ordered?: boolean;
  scheduled?: boolean;
  blocked?: boolean;
  requires_permit?: boolean;
  permit_approved?: boolean;
}

const PROJECTS_STORAGE_KEY = 'wall-display-projects';

// Get all projects ordered by position
export async function getProjects(): Promise<Project[]> {
  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
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
      .from('projects')
      .select('*')
      .order('position', { ascending: true });

    if (error) throw error;

    const projects = (data || []).map(d => ({
      id: d.id,
      title: d.title,
      description: d.description,
      when: d.when,
      target_date: d.target_date,
      cost: d.cost,
      assigned_to: d.assigned_to || 'Chris',
      room: d.room,
      status: d.status || 'pending',
      position: d.position,
      created_at: d.created_at,
      updated_at: d.updated_at,
      updated_by: d.updated_by,
      completed_at: d.completed_at,
      chris_priority: d.chris_priority || false,
      caroline_priority: d.caroline_priority || false,
      needs_quote: d.needs_quote || false,
      quote_received: d.quote_received || false,
      materials_needed: d.materials_needed || false,
      materials_ordered: d.materials_ordered || false,
      scheduled: d.scheduled || false,
      blocked: d.blocked || false,
      requires_permit: d.requires_permit || false,
      permit_approved: d.permit_approved || false,
    }));

    // Cache to localStorage
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    return projects;
  } catch (e) {
    console.error('Failed to fetch projects:', e);
    // Try localStorage fallback
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
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

// Add a new project
export async function addProject(project: Omit<Project, 'id' | 'created_at' | 'position'>): Promise<Project | null> {
  // Get current projects to determine next position
  const currentProjects = await getProjects();
  const maxPosition = currentProjects.reduce((max, p) => Math.max(max, p.position), -1);

  const newProject: Project = {
    ...project,
    id: crypto.randomUUID(),
    position: maxPosition + 1,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const projects = stored ? JSON.parse(stored) : [];
    projects.push(newProject);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    return newProject;
  }

  try {
    const { error } = await supabase
      .from('projects')
      .insert({
        id: newProject.id,
        title: newProject.title,
        description: newProject.description,
        when: newProject.when,
        target_date: newProject.target_date,
        cost: newProject.cost,
        assigned_to: newProject.assigned_to || 'Chris',
        room: newProject.room,
        status: newProject.status,
        position: newProject.position,
        created_at: newProject.created_at,
      });

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    const projects = stored ? JSON.parse(stored) : [];
    projects.push(newProject);
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));

    return newProject;
  } catch (e) {
    console.error('Failed to add project:', e);
    return null;
  }
}

// Update a project
export async function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Promise<void> {
  const updatesWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const updated = projects.map(p => p.id === id ? { ...p, ...updatesWithTimestamp } : p);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('projects')
      .update(updatesWithTimestamp)
      .eq('id', id);

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const updated = projects.map(p => p.id === id ? { ...p, ...updatesWithTimestamp } : p);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to update project:', e);
  }
}

// Reorder projects (after drag-and-drop)
export async function reorderProjects(projectIds: string[]): Promise<void> {
  const updates = projectIds.map((id, index) => ({ id, position: index }));

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const reordered = projects.map(p => {
        const update = updates.find(u => u.id === p.id);
        return update ? { ...p, position: update.position } : p;
      }).sort((a, b) => a.position - b.position);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(reordered));
    }
    return;
  }

  try {
    // Update each project's position
    for (const update of updates) {
      await supabase
        .from('projects')
        .update({ position: update.position, updated_at: new Date().toISOString() })
        .eq('id', update.id);
    }

    // Update localStorage cache
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const reordered = projects.map(p => {
        const update = updates.find(u => u.id === p.id);
        return update ? { ...p, position: update.position } : p;
      }).sort((a, b) => a.position - b.position);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(reordered));
    }
  } catch (e) {
    console.error('Failed to reorder projects:', e);
  }
}

// Delete a project
export async function deleteProject(id: string): Promise<void> {
  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const filtered = projects.filter(p => p.id !== id);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Update localStorage cache
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (stored) {
      const projects = JSON.parse(stored) as Project[];
      const filtered = projects.filter(p => p.id !== id);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to delete project:', e);
  }
}

// Subscribe to project changes
export function subscribeToProjects(callback: (projects: Project[]) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel('projects-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      async () => {
        const projects = await getProjects();
        callback(projects);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============ FASTING ============

export interface FastingRecord {
  id?: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp when completed/stopped
  target_hours: number; // Usually 24
  completed: boolean;
  notes?: string;
  created_at?: string;
}

const FASTING_STORAGE_KEY = 'current-fast';

// Get current active fast
export async function getCurrentFast(): Promise<FastingRecord | null> {
  if (!supabase) {
    const stored = localStorage.getItem(FASTING_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    console.log('Fetching current fast from Supabase...');
    const { data, error } = await supabase
      .from('fasting')
      .select('*')
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }
    console.log('Current fast from Supabase:', data);
    return data || null;
  } catch (e) {
    console.error('Failed to get current fast:', e);
    const stored = localStorage.getItem(FASTING_STORAGE_KEY);
    console.log('Falling back to localStorage:', stored);
    return stored ? JSON.parse(stored) : null;
  }
}

// Get fasting history
export async function getFastingHistory(): Promise<FastingRecord[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('fasting')
      .select('*')
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to get fasting history:', e);
    return [];
  }
}

// Start a new fast
export async function startFast(targetHours: number = 24): Promise<FastingRecord | null> {
  // Let Supabase generate the ID
  const newFast = {
    start_time: new Date().toISOString(),
    target_hours: targetHours,
    completed: false,
  };

  if (!supabase) {
    console.log('Supabase not configured, using localStorage');
    const localFast = { ...newFast, id: crypto.randomUUID() };
    localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(localFast));
    return localFast;
  }

  try {
    console.log('Starting fast in Supabase:', newFast);
    const { data, error } = await supabase
      .from('fasting')
      .insert(newFast)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    const insertedFast = data?.[0] || null;
    console.log('Fast started successfully:', insertedFast);
    if (insertedFast) {
      localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(insertedFast));
    }
    return insertedFast;
  } catch (e) {
    console.error('Failed to start fast:', e);
    const localFast = { ...newFast, id: crypto.randomUUID() };
    localStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(localFast));
    return localFast;
  }
}

// End/complete a fast
export async function endFast(id: string, completed: boolean = true): Promise<void> {
  const endTime = new Date().toISOString();

  if (!supabase) {
    localStorage.removeItem(FASTING_STORAGE_KEY);
    return;
  }

  try {
    const { error } = await supabase
      .from('fasting')
      .update({ end_time: endTime, completed })
      .eq('id', id);

    if (error) throw error;
    localStorage.removeItem(FASTING_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to end fast:', e);
    localStorage.removeItem(FASTING_STORAGE_KEY);
  }
}

// Subscribe to fasting changes
export function subscribeToFasting(callback: (fast: FastingRecord | null) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel('fasting-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'fasting' },
      async () => {
        const fast = await getCurrentFast();
        callback(fast);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Fasting diary notes
export interface FastingNote {
  id?: string;
  fasting_id: string;
  hour_mark: number; // What hour of the fast this note was recorded
  mood: 'great' | 'good' | 'okay' | 'tough' | 'difficult';
  energy_level: number; // 1-5
  hunger_level: number; // 1-5
  note: string;
  created_at?: string;
}

const FASTING_NOTES_STORAGE_KEY = 'fasting-notes';

// Get notes for a specific fast
export async function getFastingNotes(fastingId: string): Promise<FastingNote[]> {
  if (!supabase) {
    const stored = localStorage.getItem(FASTING_NOTES_STORAGE_KEY);
    const allNotes: FastingNote[] = stored ? JSON.parse(stored) : [];
    return allNotes.filter(n => n.fasting_id === fastingId);
  }

  try {
    const { data, error } = await supabase
      .from('fasting_notes')
      .select('*')
      .eq('fasting_id', fastingId)
      .order('hour_mark', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to get fasting notes:', e);
    return [];
  }
}

// Add a note to a fast
export async function addFastingNote(note: Omit<FastingNote, 'id' | 'created_at'>): Promise<FastingNote | null> {
  if (!supabase) {
    const stored = localStorage.getItem(FASTING_NOTES_STORAGE_KEY);
    const allNotes: FastingNote[] = stored ? JSON.parse(stored) : [];
    const newNote: FastingNote = { ...note, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    allNotes.push(newNote);
    localStorage.setItem(FASTING_NOTES_STORAGE_KEY, JSON.stringify(allNotes));
    return newNote;
  }

  try {
    const { data, error } = await supabase
      .from('fasting_notes')
      .insert(note)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (e) {
    console.error('Failed to add fasting note:', e);
    return null;
  }
}

// Get fasting history with notes count
export async function getFastingHistoryWithNotes(): Promise<(FastingRecord & { notes_count: number })[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data: fasts, error: fastsError } = await supabase
      .from('fasting')
      .select('*')
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(30);

    if (fastsError) throw fastsError;
    if (!fasts) return [];

    // Get notes count for each fast
    const fastsWithNotes = await Promise.all(
      fasts.map(async (fast) => {
        const { count } = await supabase
          .from('fasting_notes')
          .select('*', { count: 'exact', head: true })
          .eq('fasting_id', fast.id);
        return { ...fast, notes_count: count || 0 };
      })
    );

    return fastsWithNotes;
  } catch (e) {
    console.error('Failed to get fasting history with notes:', e);
    return [];
  }
}

// Subscribe to fasting notes changes
export function subscribeToFastingNotes(fastingId: string, callback: (notes: FastingNote[]) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel(`fasting-notes-${fastingId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'fasting_notes', filter: `fasting_id=eq.${fastingId}` },
      async () => {
        const notes = await getFastingNotes(fastingId);
        callback(notes);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============ EYE GAZING ============

export interface EyeGazingSession {
  id?: string;
  user: 'Chris' | 'Caroline';
  duration_seconds: number;
  completed_at: string; // ISO timestamp
  created_at?: string;
}

export interface EyeGazingHistory {
  [date: string]: { chris: number; caroline: number };
}

const EYE_GAZING_STORAGE_KEY = 'eye-gazing-sessions';

// Get eye gazing history for past N days
export async function getEyeGazingHistory(days: number = 60): Promise<EyeGazingHistory> {
  const history: EyeGazingHistory = {};

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(EYE_GAZING_STORAGE_KEY);
    if (stored) {
      try {
        const sessions = JSON.parse(stored) as EyeGazingSession[];
        sessions.forEach(s => {
          const date = s.completed_at.split('T')[0];
          if (!history[date]) {
            history[date] = { chris: 0, caroline: 0 };
          }
          if (s.user === 'Chris') {
            history[date].chris++;
          } else {
            history[date].caroline++;
          }
        });
      } catch {}
    }
    return history;
  }

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    const { data, error } = await supabase
      .from('eye_gazing')
      .select('*')
      .gte('completed_at', startDate.toISOString())
      .order('completed_at', { ascending: false });

    if (error) throw error;

    (data || []).forEach((s: EyeGazingSession) => {
      const date = s.completed_at.split('T')[0];
      if (!history[date]) {
        history[date] = { chris: 0, caroline: 0 };
      }
      if (s.user === 'Chris') {
        history[date].chris++;
      } else {
        history[date].caroline++;
      }
    });

    console.log(`Loaded ${data?.length || 0} eye gazing sessions`);
    return history;
  } catch (e) {
    console.error('Failed to get eye gazing history:', e);
    return {};
  }
}

// Record an eye gazing session
export async function recordEyeGazingSession(user: 'Chris' | 'Caroline', durationSeconds: number): Promise<EyeGazingSession | null> {
  const session: EyeGazingSession = {
    user,
    duration_seconds: durationSeconds,
    completed_at: new Date().toISOString(),
  };

  if (!supabase) {
    // Fallback to localStorage
    const stored = localStorage.getItem(EYE_GAZING_STORAGE_KEY);
    const sessions: EyeGazingSession[] = stored ? JSON.parse(stored) : [];
    const newSession = { ...session, id: crypto.randomUUID() };
    sessions.push(newSession);
    // Keep only last 200 sessions
    if (sessions.length > 200) {
      sessions.splice(0, sessions.length - 200);
    }
    localStorage.setItem(EYE_GAZING_STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  }

  try {
    const { data, error } = await supabase
      .from('eye_gazing')
      .insert(session)
      .select();

    if (error) throw error;

    // Also save to localStorage as backup
    const stored = localStorage.getItem(EYE_GAZING_STORAGE_KEY);
    const sessions: EyeGazingSession[] = stored ? JSON.parse(stored) : [];
    sessions.push(data?.[0] || session);
    if (sessions.length > 200) {
      sessions.splice(0, sessions.length - 200);
    }
    localStorage.setItem(EYE_GAZING_STORAGE_KEY, JSON.stringify(sessions));

    console.log(`Recorded eye gazing session for ${user}`);
    return data?.[0] || null;
  } catch (e) {
    console.error('Failed to record eye gazing session:', e);
    // Fallback to localStorage
    const stored = localStorage.getItem(EYE_GAZING_STORAGE_KEY);
    const sessions: EyeGazingSession[] = stored ? JSON.parse(stored) : [];
    const newSession = { ...session, id: crypto.randomUUID() };
    sessions.push(newSession);
    localStorage.setItem(EYE_GAZING_STORAGE_KEY, JSON.stringify(sessions));
    return newSession;
  }
}

// Get today's eye gazing count
export async function getTodayEyeGazingCount(): Promise<{ chris: number; caroline: number }> {
  const today = new Date().toISOString().split('T')[0];
  const history = await getEyeGazingHistory(1);
  return history[today] || { chris: 0, caroline: 0 };
}

// Subscribe to eye gazing changes
export function subscribeToEyeGazing(callback: (history: EyeGazingHistory) => void): (() => void) | null {
  if (!supabase) {
    return null;
  }

  const channel = supabase
    .channel('eye-gazing-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'eye_gazing' },
      async () => {
        const history = await getEyeGazingHistory(60);
        callback(history);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
