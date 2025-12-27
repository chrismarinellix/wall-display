import { useState, useEffect, useCallback } from 'react';
import { CurrentWeather, WeatherForecast } from '../types/weather';
import { useSettings } from '../contexts/SettingsContext';
import { fetchWeather } from '../services/weatherService';

interface UseWeatherReturn {
  current: CurrentWeather | null;
  forecast: WeatherForecast[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastFetched: Date | null;
}

export function useWeather(): UseWeatherReturn {
  const [current, setCurrent] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { settings } = useSettings();

  // Always use the configured Melbourne coordinates
  const lat = settings.latitude;
  const lon = settings.longitude;

  const fetchWeatherData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWeather(lat, lon);
      setCurrent(data.current);
      setForecast(data.forecast);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  }, [lat, lon]);

  // Initial fetch
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Auto-refresh (weather updates less frequently)
  useEffect(() => {
    const interval = Math.max(settings.refreshInterval, 900000); // At least 15 min
    const timer = setInterval(fetchWeatherData, interval);
    return () => clearInterval(timer);
  }, [fetchWeatherData, settings.refreshInterval]);

  return {
    current,
    forecast,
    loading,
    error,
    refresh: fetchWeatherData,
    lastFetched,
  };
}
