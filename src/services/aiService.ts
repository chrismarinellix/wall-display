// AI Summary Service using Groq API
// Groq provides fast inference with generous free tier (30 req/min)

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface SummaryData {
  weather?: {
    temperature: number;
    condition: string;
    forecast: string[];
  };
  calendar?: {
    events: Array<{
      title: string;
      time: string;
      isAllDay: boolean;
    }>;
  };
  stocks?: {
    crypto: Array<{
      name: string;
      price: number;
      change: number;
    }>;
  };
  news?: Array<{
    title: string;
    source: string;
  }>;
}

interface AISummaryResponse {
  greeting: string;
  weatherSummary: string;
  daySummary: string;
  marketSummary: string;
  newsSummary: string;
  advice: string;
}

// Enhanced newspaper-style article data
export interface NewspaperData {
  weather?: {
    temperature: number;
    condition: string;
    humidity?: number;
    windSpeed?: number;
    forecast?: Array<{
      date: string;
      tempMax: number;
      tempMin: number;
      condition: string;
    }>;
  };
  calendar?: Array<{
    title: string;
    time: string;
    isAllDay: boolean;
    isToday: boolean;
  }>;
  todos?: Array<{
    title: string;
    priority: string;
    dueDate?: string;
    isOverdue: boolean;
  }>;
  habits?: Array<{
    name: string;
    completed: boolean;
    streak?: number;
  }>;
  pomodoro?: {
    todayCount: number;
    todayMinutes: number;
    streak: number;
    dailyGoal: number;
  };
  crypto?: Array<{
    name: string;
    symbol: string;
    price: number;
    change24h: number;
  }>;
  historicalMoment?: {
    title: string;
    year: string;
    description: string;
  };
  countdown?: {
    title: string;
    daysUntil: number;
  };
  proverb?: {
    japanese: string;
    romaji: string;
    meaning: string;
  };
  userName: string;
}

export interface NewspaperArticles {
  headline: string;
  greeting: string;
  weatherArticle: {
    headline: string;
    body: string;
    advice: string;
  };
  dayArticle: {
    headline: string;
    body: string;
  };
  marketsArticle: {
    headline: string;
    body: string;
  };
  historyArticle: {
    headline: string;
    body: string;
  };
  wisdomCorner: string;
  productivityNote: string;
  closingThought: string;
}

export async function generateDailySummary(
  data: SummaryData,
  apiKey: string
): Promise<AISummaryResponse> {
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const prompt = `You are a helpful personal assistant creating a daily briefing for a wall display.
Be concise, warm, and informative. Use a conversational tone.

Current time: ${timeOfDay} on ${dayName}, ${dateStr}

Available data:
${data.weather ? `Weather: ${data.weather.temperature}°C, ${data.weather.condition}. Forecast: ${data.weather.forecast.join(', ')}` : 'Weather: Not available'}

${data.calendar?.events?.length ? `Today's Calendar (${data.calendar.events.length} events):
${data.calendar.events.slice(0, 5).map(e => `- ${e.title} at ${e.time}`).join('\n')}` : 'Calendar: No events today'}

${data.stocks?.crypto?.length ? `Crypto Markets:
${data.stocks.crypto.map(c => `- ${c.name}: $${c.price.toLocaleString()} (${c.change > 0 ? '+' : ''}${c.change.toFixed(1)}%)`).join('\n')}` : 'Markets: Not available'}

${data.news?.length ? `Top Headlines:
${data.news.slice(0, 3).map(n => `- ${n.title} (${n.source})`).join('\n')}` : 'News: Not available'}

Generate a JSON response with these exact fields (keep each under 50 words):
{
  "greeting": "A warm, personalized greeting for this time of day",
  "weatherSummary": "Brief weather summary with practical advice",
  "daySummary": "Summary of today's schedule and priorities",
  "marketSummary": "Quick market overview if available",
  "newsSummary": "Key news highlights",
  "advice": "One helpful tip or motivational note for the day"
}

Respond ONLY with valid JSON, no markdown or extra text.`;

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from AI');
  }

  try {
    // Parse JSON response, handling potential markdown code blocks
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    // Fallback if parsing fails
    return {
      greeting: `Good ${timeOfDay}!`,
      weatherSummary: data.weather ? `It's ${data.weather.temperature}°C and ${data.weather.condition}.` : 'Weather data unavailable.',
      daySummary: data.calendar?.events?.length ? `You have ${data.calendar.events.length} events today.` : 'Your calendar is clear today.',
      marketSummary: data.stocks?.crypto?.length ? 'Markets are active.' : 'Market data unavailable.',
      newsSummary: data.news?.length ? 'Check the news screen for headlines.' : 'No news available.',
      advice: 'Have a productive day!',
    };
  }
}

// Generate newspaper-style articles for the Daily Prophet briefing
export async function generateNewspaperArticles(
  data: NewspaperData,
  apiKey: string
): Promise<NewspaperArticles> {
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening';
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const prompt = `You are the editor of "The Daily Briefing" - a magical, personalized newspaper like the Daily Prophet from Harry Potter.
Write engaging, newspaper-style articles for ${data.userName}. Be warm, slightly whimsical, but informative.
Articles should feel alive - like they're speaking directly to the reader.

Current: ${timeOfDay}, ${dayName}, ${dateStr}

DATA TO TRANSFORM INTO ARTICLES:

${data.weather ? `WEATHER:
Temperature: ${data.weather.temperature}°C
Condition: ${data.weather.condition}
${data.weather.humidity ? `Humidity: ${data.weather.humidity}%` : ''}
${data.weather.forecast?.length ? `Forecast: ${data.weather.forecast.map(f => `${f.date}: ${f.tempMax}°/${f.tempMin}° ${f.condition}`).join(', ')}` : ''}` : 'Weather unavailable'}

${data.calendar?.length ? `SCHEDULE (${data.calendar.length} events):
${data.calendar.slice(0, 5).map(e => `- ${e.title} (${e.isToday ? 'Today' : 'Tomorrow'} ${e.time})`).join('\n')}` : 'Calendar clear'}

${data.todos?.length ? `TASKS (${data.todos.length} pending):
${data.todos.slice(0, 5).map(t => `- ${t.title} [${t.priority}]${t.isOverdue ? ' OVERDUE!' : ''}`).join('\n')}` : 'No tasks'}

${data.habits?.length ? `HABITS:
${data.habits.map(h => `- ${h.name}: ${h.completed ? 'DONE' : 'pending'}`).join('\n')}` : ''}

${data.pomodoro ? `FOCUS: ${data.pomodoro.todayCount}/${data.pomodoro.dailyGoal} pomodoros, ${data.pomodoro.todayMinutes}min focused, ${data.pomodoro.streak} day streak` : ''}

${data.crypto?.length ? `MARKETS:
${data.crypto.map(c => `- ${c.name}: $${c.price.toLocaleString()} (${c.change24h > 0 ? '+' : ''}${c.change24h.toFixed(1)}%)`).join('\n')}` : ''}

${data.historicalMoment ? `THIS DAY IN HISTORY:
${data.historicalMoment.year}: ${data.historicalMoment.title}
${data.historicalMoment.description}` : ''}

${data.countdown ? `COUNTDOWN: ${data.countdown.daysUntil} days until ${data.countdown.title}` : ''}

${data.proverb ? `WISDOM: "${data.proverb.meaning}" (${data.proverb.romaji})` : ''}

Generate a JSON response. Write like a REAL magical Victorian newspaper with RICH, FLOWING prose.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE:
- Each article body MUST be AT LEAST 80-120 words. Count your words!
- Write in LONG, flowing sentences with multiple clauses
- Use vivid imagery, metaphors, and poetic descriptions
- NO short sentences. NO bullet points. NO lists.
- Every body field must be a SUBSTANTIAL PARAGRAPH

{
  "headline": "Dramatic Victorian headline (8-12 words)",
  "greeting": "Warm greeting for ${data.userName} (50-70 words, describe the day's character)",
  "weatherArticle": {
    "headline": "Poetic weather headline",
    "body": "80-120 words MINIMUM. Paint the sky, describe the light quality, the air's feel, how weather unfolds through the day. Use sensory details - colors, textures, temperatures. Write it like poetry.",
    "advice": "2-3 sentences of practical wisdom"
  },
  "dayArticle": {
    "headline": "Grand headline about today's agenda",
    "body": "80-120 words MINIMUM. Describe each commitment with Victorian gravitas. Paint the day's narrative arc from morning duties through evening. Connect tasks to larger life purposes."
  },
  "marketsArticle": {
    "headline": "Dramatic financial headline",
    "body": "80-120 words MINIMUM. Describe market movements with gravitas - the rise and fall of fortunes, the whispers of traders, the broader economic currents shaping wealth."
  },
  "historyArticle": {
    "headline": "Fascinating historical headline",
    "body": "80-120 words MINIMUM. Transport the reader to that moment. Describe the scene, the key figures, the tension or triumph. Explain why this moment still echoes through time."
  },
  "wisdomCorner": "60-80 words reflecting on the proverb, connecting ancient wisdom to modern life",
  "productivityNote": "40-50 words of warm encouragement about focus progress",
  "closingThought": "25-35 words tying the day's themes together poetically"
}

Respond ONLY with valid JSON, no markdown.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // More capable model for longer content
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 4000, // Much more room for long articles
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error('No response');

    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI article generation failed:', error);
    // Return fallback articles
    return generateFallbackArticles(data, timeOfDay);
  }
}

// Fallback articles when AI is unavailable
function generateFallbackArticles(data: NewspaperData, timeOfDay: string): NewspaperArticles {
  const urgentTasks = data.todos?.filter(t => t.priority === 'high' || t.isOverdue).length || 0;
  const habitsComplete = data.habits?.filter(h => h.completed).length || 0;
  const habitsTotal = data.habits?.length || 0;

  return {
    headline: urgentTasks > 0
      ? `Attention Required: ${urgentTasks} Urgent Matter${urgentTasks > 1 ? 's' : ''} Await`
      : data.calendar?.length
        ? `A Full Day Ahead: ${data.calendar.length} Events on the Schedule`
        : `A New Day Dawns in the ${data.weather?.condition || 'Clear'} Skies`,
    greeting: `Good ${timeOfDay}, ${data.userName}. ${data.weather ? `It's currently ${data.weather.temperature}°C and ${data.weather.condition.toLowerCase()} outside.` : ''} ${data.calendar?.length ? `You have ${data.calendar.length} events on your calendar today.` : 'Your calendar is clear for focused work.'}`,
    weatherArticle: {
      headline: data.weather
        ? `${data.weather.condition} Skies: ${data.weather.temperature}°C Expected`
        : 'Weather Report Pending',
      body: data.weather
        ? `The day brings ${data.weather.condition.toLowerCase()} conditions with temperatures hovering around ${data.weather.temperature}°C. ${data.weather.humidity ? `Humidity levels sit at ${data.weather.humidity}%, ` : ''}making it ${data.weather.temperature > 25 ? 'a warm one' : data.weather.temperature < 15 ? 'quite cool' : 'pleasant'} for any outdoor activities.`
        : 'Weather data is currently being gathered from our meteorological correspondents.',
      advice: data.weather
        ? data.weather.temperature > 25 ? 'Stay hydrated and seek shade during peak hours.' : data.weather.temperature < 15 ? 'A warm layer would serve you well today.' : 'Perfect conditions for your daily endeavors.'
        : 'Check back shortly for weather updates.',
    },
    dayArticle: {
      headline: urgentTasks > 0
        ? `Priority Alert: Critical Tasks Demand Attention`
        : `${data.calendar?.length || 0} Events Chart Today's Course`,
      body: `${data.calendar?.length ? `Your schedule shows ${data.calendar.length} commitment${data.calendar.length > 1 ? 's' : ''} requiring your presence. ` : 'A remarkably open calendar presents opportunities for deep work. '}${data.todos?.length ? `The task ledger records ${data.todos.length} item${data.todos.length > 1 ? 's' : ''} awaiting completion${urgentTasks > 0 ? `, with ${urgentTasks} marked as priority` : ''}.` : ''} ${habitsTotal > 0 ? `Progress on daily habits stands at ${habitsComplete} of ${habitsTotal} complete.` : ''}`,
    },
    marketsArticle: {
      headline: data.crypto?.length
        ? data.crypto[0].change24h > 5 ? 'Markets Surge: Crypto Shows Strength' : data.crypto[0].change24h < -5 ? 'Markets Retreat: Caution Advised' : 'Markets Steady: Mixed Signals Observed'
        : 'Market Watch Continues',
      body: data.crypto?.length
        ? `${data.crypto[0].name} trades at $${data.crypto[0].price.toLocaleString()}, ${data.crypto[0].change24h > 0 ? 'up' : 'down'} ${Math.abs(data.crypto[0].change24h).toFixed(1)}% in the last 24 hours. ${data.crypto.length > 1 ? `${data.crypto[1].name} follows at $${data.crypto[1].price.toLocaleString()}.` : ''}`
        : 'Market data is currently being compiled.',
    },
    historyArticle: {
      headline: data.historicalMoment
        ? `On This Day, ${data.historicalMoment.year}: ${data.historicalMoment.title}`
        : 'Pages of History',
      body: data.historicalMoment
        ? `${data.historicalMoment.description} This momentous occasion in ${data.historicalMoment.year} continues to resonate through the ages, reminding us of humanity's endless capacity for achievement and discovery.`
        : 'Historical archives are being consulted for today\'s featured moment.',
    },
    wisdomCorner: data.proverb
      ? `Ancient wisdom speaks: "${data.proverb.meaning}" (${data.proverb.romaji}). Let this thought guide your actions today.`
      : 'Wisdom awaits in the margins of each moment.',
    productivityNote: data.pomodoro
      ? `${data.pomodoro.todayCount > 0 ? `Splendid focus today! ${data.pomodoro.todayCount} pomodoro${data.pomodoro.todayCount > 1 ? 's' : ''} completed (${data.pomodoro.todayMinutes} minutes of deep work).` : 'The focus timer awaits your first session.'} ${data.pomodoro.streak > 1 ? `Your ${data.pomodoro.streak}-day streak shows remarkable dedication.` : ''}`
      : 'Ready your focus for productive endeavors.',
    closingThought: data.countdown
      ? `${data.countdown.daysUntil} days until ${data.countdown.title} — every moment counts.`
      : 'May this day bring you closer to your aspirations.',
  };
}
