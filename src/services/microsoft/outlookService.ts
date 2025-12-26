import { Email } from '../../types/email';
import { getAccessToken, graphScopes } from './microsoftAuth';

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

interface OutlookMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
}

interface GraphResponse<T> {
  value: T[];
}

export async function fetchOutlookEmails(maxResults: number = 15): Promise<Email[]> {
  const accessToken = await getAccessToken(graphScopes.mail);
  if (!accessToken) {
    throw new Error('Not authenticated with Microsoft');
  }

  const params = new URLSearchParams({
    $top: maxResults.toString(),
    $select: 'id,subject,from,receivedDateTime,bodyPreview,isRead',
    $orderby: 'receivedDateTime desc',
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/me/mailFolders/inbox/messages?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Outlook authentication expired');
    }
    throw new Error(`Outlook API error: ${response.status}`);
  }

  const data: GraphResponse<OutlookMessage> = await response.json();

  return data.value.map((msg) => ({
    id: msg.id,
    subject: msg.subject || '(No subject)',
    from: msg.from?.emailAddress?.address || 'Unknown',
    fromName: msg.from?.emailAddress?.name,
    date: new Date(msg.receivedDateTime),
    snippet: msg.bodyPreview,
    isRead: msg.isRead,
    source: 'outlook' as const,
  }));
}
