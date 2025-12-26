export interface Email {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  date: Date;
  snippet: string;
  isRead: boolean;
  source: 'gmail' | 'outlook';
}

export interface EmailState {
  emails: Email[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}
