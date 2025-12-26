import { useState, useEffect, useCallback } from 'react';
import { NewsItem } from '../types/news';
import { fetchMultipleFeeds } from '../services/newsService';
import { useSettings } from '../contexts/SettingsContext';

interface UseNewsReturn {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => Promise<void>;
}

// Default feeds if none configured
const DEFAULT_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech' },
];

export function useNews(): UseNewsReturn {
  const { settings } = useSettings();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Get custom feeds from settings or use defaults
  const customFeeds = (settings as { rssFeeds?: { url: string; name: string }[] }).rssFeeds;
  const feeds = customFeeds && customFeeds.length > 0 ? customFeeds : DEFAULT_FEEDS;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMultipleFeeds(feeds, 5);
      setItems(data);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
    } finally {
      setLoading(false);
    }
  }, [feeds]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    items,
    loading,
    error,
    lastFetched,
    refresh: fetchData,
  };
}
