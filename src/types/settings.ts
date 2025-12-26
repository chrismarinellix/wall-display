export type ScreenType =
  | 'dashboard'
  | 'emails'
  | 'calendar'
  | 'weather'
  | 'stocks'
  | 'hackernews'
  | 'quotes'
  | 'news'
  | 'pomodoro';

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
  cycleInterval: 30000,
  refreshInterval: 300000,
  latitude: 51.5074,
  longitude: -0.1278,
  temperatureUnit: 'celsius',
  timeFormat: '24h',
  screenOrder: ['dashboard', 'weather', 'stocks', 'hackernews', 'quotes', 'news', 'pomodoro'],
  // Default crypto and stocks
  stockSymbols: ['AAPL', 'GOOGL', 'MSFT'],
  cryptoSymbols: ['bitcoin', 'ethereum', 'solana'],
  rssFeeds: [
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech' },
  ],
  alphaVantageApiKey: '',
};
