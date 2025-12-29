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

// Update a countdown
export async function updateCountdown(id: string, updates: Partial<Pick<CountdownEvent, 'title' | 'target_date' | 'color'>>): Promise<void> {
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
