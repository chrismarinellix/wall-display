export interface Quote {
  text: string;
  author: string;
}

export interface QuotesData {
  current: Quote | null;
  history: Quote[];
  lastUpdated: Date | null;
}
