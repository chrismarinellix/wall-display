import { format } from 'date-fns';
import { Newspaper, RefreshCw, ExternalLink } from 'lucide-react';
import { useNews } from '../../hooks/useNews';
import { Loading } from '../ui/Loading';
import { NewsItem } from '../../types/news';
import { formatNewsTime } from '../../services/newsService';

function NewsArticle({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="trmnl-list-item block hover:bg-eink-light transition-colors"
    >
      <div className="flex gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-eink-black leading-snug line-clamp-2">
            {item.title}
          </h3>

          {item.description && (
            <p className="text-xs text-eink-mid mt-1 line-clamp-1">
              {item.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 mt-2 text-xs text-eink-mid">
            <span className="font-medium text-eink-dark">{item.source}</span>
            <span>&middot;</span>
            <span>{formatNewsTime(item.pubDate)}</span>
          </div>
        </div>

        {/* External link indicator */}
        <div className="flex-shrink-0 pt-1">
          <ExternalLink size={12} className="text-eink-light" />
        </div>
      </div>
    </a>
  );
}

export function NewsScreen() {
  const { items, loading, error, refresh, lastFetched } = useNews();

  if (loading && items.length === 0) {
    return <Loading message="Fetching news..." />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Newspaper className="text-eink-dark" size={20} />
          <h1 className="eink-heading text-xl">News</h1>
          <span className="eink-mono text-xs text-eink-mid">
            {items.length} articles
          </span>
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
        <div className="text-sm text-eink-dark bg-eink-light p-3 mb-4">
          {error}
        </div>
      )}

      {/* News list */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">No news available</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {items.slice(0, 10).map((item, index) => (
            <NewsArticle key={`${item.link}-${index}`} item={item} />
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
