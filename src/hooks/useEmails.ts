import { useState, useEffect, useCallback } from 'react';
import { Email } from '../types/email';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { fetchGmailEmails } from '../services/google/gmailService';
import { fetchOutlookEmails } from '../services/microsoft/outlookService';

interface UseEmailsReturn {
  emails: Email[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastFetched: Date | null;
}

export function useEmails(): UseEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const { auth } = useAuth();
  const { settings } = useSettings();

  const fetchEmails = useCallback(async () => {
    if (!auth.google.isAuthenticated && !auth.microsoft.isAuthenticated) {
      setEmails([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results: Email[] = [];

      // Fetch Gmail if authenticated
      if (auth.google.isAuthenticated && auth.google.accessToken) {
        try {
          const gmailEmails = await fetchGmailEmails(auth.google.accessToken);
          results.push(...gmailEmails);
        } catch (e) {
          console.error('Gmail fetch error:', e);
        }
      }

      // Fetch Outlook if authenticated
      if (auth.microsoft.isAuthenticated) {
        try {
          const outlookEmails = await fetchOutlookEmails();
          results.push(...outlookEmails);
        } catch (e) {
          console.error('Outlook fetch error:', e);
        }
      }

      // Sort by date, newest first
      results.sort((a, b) => b.date.getTime() - a.date.getTime());

      setEmails(results);
      setLastFetched(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [auth.google.isAuthenticated, auth.google.accessToken, auth.microsoft.isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Auto-refresh
  useEffect(() => {
    if (settings.refreshInterval === 0) return;

    const timer = setInterval(fetchEmails, settings.refreshInterval);
    return () => clearInterval(timer);
  }, [fetchEmails, settings.refreshInterval]);

  return {
    emails,
    loading,
    error,
    refresh: fetchEmails,
    lastFetched,
  };
}
