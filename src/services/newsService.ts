import { NewsItem } from '../types/news';

const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json';

// Default RSS feeds for tech news
const DEFAULT_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech' },
];

export async function fetchRssFeed(feedUrl: string, sourceName?: string): Promise<NewsItem[]> {
  const response = await fetch(
    `${RSS2JSON_API}?rss_url=${encodeURIComponent(feedUrl)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${feedUrl}`);
  }

  const data = await response.json();

  if (data.status !== 'ok') {
    throw new Error(data.message || 'Failed to parse feed');
  }

  return data.items.map((item: {
    title: string;
    link: string;
    pubDate: string;
    description?: string;
    thumbnail?: string;
    enclosure?: { link?: string };
  }) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: sourceName || extractSourceName(feedUrl),
    description: item.description ? stripHtml(item.description).slice(0, 150) : undefined,
    thumbnail: item.thumbnail || item.enclosure?.link,
  }));
}

export async function fetchMultipleFeeds(
  feeds: { url: string; name: string }[] = DEFAULT_FEEDS,
  itemsPerFeed: number = 5
): Promise<NewsItem[]> {
  const feedPromises = feeds.map(async (feed) => {
    try {
      const items = await fetchRssFeed(feed.url, feed.name);
      return items.slice(0, itemsPerFeed);
    } catch (err) {
      console.error(`Failed to fetch ${feed.name}:`, err);
      return [];
    }
  });

  const allItems = await Promise.all(feedPromises);
  const flatItems = allItems.flat();

  // Sort by date, newest first
  return flatItems.sort((a, b) =>
    new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );
}

function extractSourceName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^(www\.|feeds\.|rss\.)/i, '').split('.')[0];
  } catch {
    return 'Unknown';
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

export function formatNewsTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}
