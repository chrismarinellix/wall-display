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
