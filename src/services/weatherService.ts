import { CurrentWeather, WeatherForecast, getAqiInfo } from '../types/weather';

// Open-Meteo API - free, no key required, accurate global weather data
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_AQI_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  current_units: {
    temperature_2m: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface AirQualityResponse {
  current: {
    european_aqi: number;
    pm2_5: number;
    pm10: number;
  };
}

export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<{ current: CurrentWeather; forecast: WeatherForecast[] }> {
  const weatherParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '5',
  });

  const aqiParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: 'european_aqi,pm2_5,pm10',
  });

  // Fetch weather and air quality in parallel
  const [weatherResponse, aqiResponse] = await Promise.all([
    fetch(`${OPEN_METEO_BASE}?${weatherParams}`),
    fetch(`${OPEN_METEO_AQI_BASE}?${aqiParams}`),
  ]);

  if (!weatherResponse.ok) {
    throw new Error(`Weather API error: ${weatherResponse.status}`);
  }

  const data: OpenMeteoResponse = await weatherResponse.json();

  // Air quality is optional - don't fail if it errors
  let airQuality = undefined;
  if (aqiResponse.ok) {
    try {
      const aqiData: AirQualityResponse = await aqiResponse.json();
      const aqiInfo = getAqiInfo(aqiData.current.european_aqi);
      airQuality = {
        aqi: Math.round(aqiData.current.european_aqi),
        pm25: Math.round(aqiData.current.pm2_5),
        pm10: Math.round(aqiData.current.pm10),
        label: aqiInfo.label,
        color: aqiInfo.color,
      };
    } catch (e) {
      console.warn('Failed to parse air quality data:', e);
    }
  }

  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      unit: data.current_units.temperature_2m,
      airQuality,
    },
    forecast: data.daily.time.map((date, i) => ({
      date: new Date(date),
      weatherCode: data.daily.weather_code[i],
      tempMax: Math.round(data.daily.temperature_2m_max[i]),
      tempMin: Math.round(data.daily.temperature_2m_min[i]),
    })),
  };
}

// Get user's location
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 10000 }
    );
  });
}
