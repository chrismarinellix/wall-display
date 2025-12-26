import { HackerNewsStory } from '../types/hackerNews';

const HN_API = 'https://hacker-news.firebaseio.com/v0';

export async function fetchTopStories(limit: number = 15): Promise<HackerNewsStory[]> {
  // Get top story IDs
  const idsResponse = await fetch(`${HN_API}/topstories.json`);
  if (!idsResponse.ok) {
    throw new Error('Failed to fetch top stories');
  }

  const allIds: number[] = await idsResponse.json();
  const topIds = allIds.slice(0, limit);

  // Fetch each story in parallel
  const storyPromises = topIds.map(async (id) => {
    const response = await fetch(`${HN_API}/item/${id}.json`);
    if (!response.ok) return null;
    return response.json();
  });

  const stories = await Promise.all(storyPromises);

  return stories.filter((story): story is HackerNewsStory =>
    story !== null && story.type === 'story'
  );
}

export async function fetchBestStories(limit: number = 15): Promise<HackerNewsStory[]> {
  const idsResponse = await fetch(`${HN_API}/beststories.json`);
  if (!idsResponse.ok) {
    throw new Error('Failed to fetch best stories');
  }

  const allIds: number[] = await idsResponse.json();
  const topIds = allIds.slice(0, limit);

  const storyPromises = topIds.map(async (id) => {
    const response = await fetch(`${HN_API}/item/${id}.json`);
    if (!response.ok) return null;
    return response.json();
  });

  const stories = await Promise.all(storyPromises);

  return stories.filter((story): story is HackerNewsStory =>
    story !== null && story.type === 'story'
  );
}

export function extractDomain(url?: string): string {
  if (!url) return 'news.ycombinator.com';
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'news.ycombinator.com';
  }
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
