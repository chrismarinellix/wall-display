import { Email } from '../../types/email';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
  };
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>;
  resultSizeEstimate: number;
}

export async function fetchGmailEmails(
  accessToken: string,
  maxResults: number = 15
): Promise<Email[]> {
  // Fetch message list
  const listResponse = await fetch(
    `${GMAIL_API_BASE}/users/me/messages?maxResults=${maxResults}&labelIds=INBOX`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listResponse.ok) {
    if (listResponse.status === 401) {
      throw new Error('Gmail authentication expired');
    }
    throw new Error(`Gmail API error: ${listResponse.status}`);
  }

  const listData: GmailListResponse = await listResponse.json();
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch full message details in parallel
  const emails = await Promise.all(
    listData.messages.map(async (msg) => {
      const detailResponse = await fetch(
        `${GMAIL_API_BASE}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!detailResponse.ok) {
        return null;
      }

      const detail: GmailMessage = await detailResponse.json();
      return parseGmailMessage(detail);
    })
  );

  return emails.filter((email): email is Email => email !== null);
}

function parseGmailMessage(message: GmailMessage): Email {
  const headers = message.payload.headers;
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const fromHeader = getHeader('From');
  const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/);

  return {
    id: message.id,
    subject: getHeader('Subject') || '(No subject)',
    from: fromMatch ? fromMatch[2] : fromHeader,
    fromName: fromMatch ? fromMatch[1].replace(/"/g, '') : undefined,
    date: new Date(getHeader('Date')),
    snippet: message.snippet,
    isRead: !message.labelIds?.includes('UNREAD'),
    source: 'gmail',
  };
}
