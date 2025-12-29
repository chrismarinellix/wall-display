export type ScreenType =
  | 'weather'
  | 'stocks'
  | 'quotes'
  | 'pomodoro'
  | 'japanese'
  | 'calendar'
  | 'countdown'
  | 'homeassistant'
  | 'moments'
  | 'summary'
  | 'setup'
  | 'video';

export interface RssFeed {
  url: string;
  name: string;
}

export interface Settings {
  cycleInterval: number; // ms between screen changes (0 = disabled)
  refreshInterval: number; // ms between data refreshes
  latitude: number;
  longitude: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  timeFormat: '12h' | '24h';
  screenOrder: ScreenType[];
  // New settings for additional plugins
  stockSymbols: string[];
  cryptoSymbols: string[];
  rssFeeds: RssFeed[];
  alphaVantageApiKey: string;
}

export const defaultSettings: Settings = {
  cycleInterval: 180000, // 3 minutes between screens (cycles through screenOrder)
  refreshInterval: 300000,
  latitude: -37.8136,  // Melbourne
  longitude: 144.9631, // Melbourne
  temperatureUnit: 'celsius',
  timeFormat: '24h',
  // First two screens auto-cycle (Prophet & History), others available via dock
  screenOrder: ['summary', 'moments', 'weather', 'calendar', 'pomodoro', 'countdown', 'homeassistant', 'stocks', 'quotes', 'japanese', 'setup'],
  // Default crypto and stocks
  stockSymbols: ['AAPL', 'GOOGL', 'MSFT'],
  cryptoSymbols: ['bitcoin', 'ethereum', 'solana'],
  rssFeeds: [
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech' },
  ],
  alphaVantageApiKey: '',
};
