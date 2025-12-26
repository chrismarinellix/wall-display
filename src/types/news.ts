export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
  thumbnail?: string;
}

export interface NewsData {
  items: NewsItem[];
  lastUpdated: Date | null;
}
