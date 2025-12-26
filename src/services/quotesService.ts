import { Quote } from '../types/quotes';

// Fallback quotes for when API is unavailable or rate-limited
const FALLBACK_QUOTES: Quote[] = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
  { text: "Get busy living or get busy dying.", author: "Stephen King" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "Many of life's failures are people who did not realize how close they were to success when they gave up.", author: "Thomas Edison" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
];

// Use a CORS proxy or fetch from ZenQuotes
export async function fetchRandomQuote(): Promise<Quote> {
  try {
    // ZenQuotes has CORS restrictions, so we'll use their API through a proxy
    // or just use the fallback quotes which are more reliable
    const response = await fetch('https://zenquotes.io/api/random', {
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      return {
        text: data[0].q,
        author: data[0].a,
      };
    }

    throw new Error('Invalid response format');
  } catch {
    // Return a random fallback quote
    return getRandomFallbackQuote();
  }
}

export function getRandomFallbackQuote(): Quote {
  const index = Math.floor(Math.random() * FALLBACK_QUOTES.length);
  return FALLBACK_QUOTES[index];
}

export function getDailyQuote(): Quote {
  // Use date as seed for consistent daily quote
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const index = seed % FALLBACK_QUOTES.length;
  return FALLBACK_QUOTES[index];
}
