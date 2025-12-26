import { format, isToday, isYesterday } from 'date-fns';
import { Mail, RefreshCw } from 'lucide-react';
import { useEmails } from '../../hooks/useEmails';
import { Loading } from '../ui/Loading';
import { Email } from '../../types/email';

function formatEmailDate(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMM d');
}

function EmailItem({ email }: { email: Email }) {
  return (
    <div className={`email-item py-3 px-2 border-b border-eink-light ${!email.isRead ? 'bg-eink-light/30' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="pt-2 w-2">
          {!email.isRead && <div className="unread-dot" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className={`text-sm truncate ${!email.isRead ? 'font-semibold' : ''}`}>
              {email.fromName || email.from}
            </span>
            <span className="eink-mono text-xs text-eink-mid flex-shrink-0">
              {formatEmailDate(email.date)}
            </span>
          </div>
          <div className={`text-sm mb-1 truncate ${!email.isRead ? 'text-eink-black' : 'text-eink-dark'}`}>
            {email.subject}
          </div>
          <div className="text-xs text-eink-mid truncate">
            {email.snippet}
          </div>
        </div>

        {/* Source indicator */}
        <div className="text-[10px] eink-mono text-eink-mid pt-1">
          {email.source === 'gmail' ? 'G' : 'O'}
        </div>
      </div>
    </div>
  );
}

export function EmailScreen() {
  const { emails, loading, error, refresh, lastFetched } = useEmails();

  if (loading && emails.length === 0) {
    return <Loading message="Fetching emails..." />;
  }

  const unreadCount = emails.filter(e => !e.isRead).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Mail className="text-eink-dark" size={20} />
          <h1 className="eink-heading text-xl">Inbox</h1>
          {unreadCount > 0 && (
            <span className="eink-mono text-xs bg-eink-black text-eink-white px-2 py-0.5 rounded">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-2 hover:bg-eink-light rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="text-sm text-eink-dark bg-eink-light p-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Email list */}
      {emails.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">No emails to display</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto -mx-2">
          {emails.map(email => (
            <EmailItem key={email.id} email={email} />
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastFetched && (
        <div className="text-xs text-eink-mid eink-mono pt-2 text-center">
          Updated {format(lastFetched, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
