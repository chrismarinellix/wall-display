export interface HackerNewsStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants: number; // comment count
  type: 'story' | 'job' | 'poll';
}

export interface HackerNewsData {
  stories: HackerNewsStory[];
  lastUpdated: Date | null;
}
