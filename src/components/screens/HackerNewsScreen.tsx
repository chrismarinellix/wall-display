import { format } from 'date-fns';
import { Flame, RefreshCw, MessageSquare, ExternalLink, ChevronUp } from 'lucide-react';
import { useHackerNews } from '../../hooks/useHackerNews';
import { Loading } from '../ui/Loading';
import { HackerNewsStory } from '../../types/hackerNews';
import { extractDomain, formatTimeAgo } from '../../services/hackerNewsService';

function StoryItem({ story, rank }: { story: HackerNewsStory; rank: number }) {
  const domain = extractDomain(story.url);
  const timeAgo = formatTimeAgo(story.time);

  return (
    <div className="trmnl-list-item">
      <div className="flex gap-3">
        {/* Rank */}
        <div className="w-6 text-right">
          <span className="eink-mono text-sm text-eink-mid">{rank}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="text-sm font-medium text-eink-black leading-snug flex-1">
              {story.title}
            </h3>
            {story.url && (
              <a
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-1 hover:bg-eink-light rounded"
              >
                <ExternalLink size={12} className="text-eink-mid" />
              </a>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-eink-mid">
            <span className="flex items-center gap-1">
              <ChevronUp size={12} />
              {story.score}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={10} />
              {story.descendants || 0}
            </span>
            <span className="truncate">{domain}</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HackerNewsScreen() {
  const { stories, loading, error, refresh, lastFetched } = useHackerNews(12);

  if (loading && stories.length === 0) {
    return <Loading message="Fetching stories..." />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Flame className="text-eink-dark" size={20} />
          <h1 className="eink-heading text-xl">Hacker News</h1>
          <span className="eink-mono text-xs text-eink-mid">
            Top Stories
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

      {/* Stories list */}
      {stories.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">No stories available</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {stories.map((story, index) => (
            <StoryItem key={story.id} story={story} rank={index + 1} />
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
