import { useState, useEffect, useCallback } from 'react';
import { CurrentWeather, WeatherForecast } from '../types/weather';
import { useSettings } from '../contexts/SettingsContext';
import { fetchWeather, getCurrentLocation } from '../services/weatherService';

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
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { settings } = useSettings();

  // Get location on mount
  useEffect(() => {
    const getLocation = async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
      } catch {
        // Fall back to settings
        setLocation({
          latitude: settings.latitude,
          longitude: settings.longitude,
        });
      }
    };

    getLocation();
  }, [settings.latitude, settings.longitude]);

  const fetchWeatherData = useCallback(async () => {
    const lat = location?.latitude ?? settings.latitude;
    const lon = location?.longitude ?? settings.longitude;

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
  }, [location, settings.latitude, settings.longitude]);

  // Initial fetch when location is available
  useEffect(() => {
    if (location) {
      fetchWeatherData();
    }
  }, [location, fetchWeatherData]);

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
