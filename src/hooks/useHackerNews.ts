import { useState, useEffect, useCallback } from 'react';
import { HackerNewsStory } from '../types/hackerNews';
import { fetchTopStories } from '../services/hackerNewsService';

interface UseHackerNewsReturn {
  stories: HackerNewsStory[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => Promise<void>;
}

export function useHackerNews(limit: number = 15): UseHackerNewsReturn {
  const [stories, setStories] = useState<HackerNewsStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTopStories(limit);
      setStories(data);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stories');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    stories,
    loading,
    error,
    lastFetched,
    refresh: fetchData,
  };
}
