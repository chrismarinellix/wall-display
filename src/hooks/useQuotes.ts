import { useState, useEffect, useCallback } from 'react';
import { Quote } from '../types/quotes';
import { fetchRandomQuote, getDailyQuote } from '../services/quotesService';

interface UseQuotesReturn {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => Promise<void>;
}

export function useQuotes(): UseQuotesReturn {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from API, falls back to local quotes
      const data = await fetchRandomQuote();
      setQuote(data);
      setLastFetched(new Date());
    } catch (err) {
      // If all else fails, use daily quote
      setQuote(getDailyQuote());
      setError(err instanceof Error ? err.message : 'Using offline quotes');
      setLastFetched(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    // Start with daily quote immediately
    setQuote(getDailyQuote());
    setLastFetched(new Date());
    // Then try to fetch a fresh one
    fetchData();
  }, [fetchData]);

  // Refresh every hour
  useEffect(() => {
    const interval = setInterval(fetchData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    quote,
    loading,
    error,
    lastFetched,
    refresh: fetchData,
  };
}
