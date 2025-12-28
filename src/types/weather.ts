export interface AirQuality {
  aqi: number; // European AQI (1-5 scale, but can go higher)
  pm25: number;
  pm10: number;
  label: string;
  color: string;
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  unit: string;
  airQuality?: AirQuality;
}

// AQI levels based on European Air Quality Index
// Using monochrome colors - darker = worse air quality
export function getAqiInfo(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: 'Good', color: '#888' };
  if (aqi <= 40) return { label: 'Fair', color: '#666' };
  if (aqi <= 60) return { label: 'Moderate', color: '#555' };
  if (aqi <= 80) return { label: 'Poor', color: '#333' };
  if (aqi <= 100) return { label: 'Very Poor', color: '#222' };
  return { label: 'Hazardous', color: '#000' };
}

export interface WeatherForecast {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
}

export interface WeatherState {
  current: CurrentWeather | null;
  forecast: WeatherForecast[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

// WMO Weather interpretation codes
export const weatherCodeToDescription: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Heavy showers',
  85: 'Light snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + hail',
  99: 'Severe thunderstorm',
};

export const weatherCodeToIcon: Record<number, string> = {
  0: 'sun',
  1: 'sun',
  2: 'cloud-sun',
  3: 'cloud',
  45: 'cloud-fog',
  48: 'cloud-fog',
  51: 'cloud-drizzle',
  53: 'cloud-drizzle',
  55: 'cloud-drizzle',
  61: 'cloud-rain',
  63: 'cloud-rain',
  65: 'cloud-rain',
  71: 'snowflake',
  73: 'snowflake',
  75: 'snowflake',
  77: 'snowflake',
  80: 'cloud-rain',
  81: 'cloud-rain',
  82: 'cloud-rain',
  85: 'snowflake',
  86: 'snowflake',
  95: 'cloud-lightning',
  96: 'cloud-lightning',
  99: 'cloud-lightning',
};
