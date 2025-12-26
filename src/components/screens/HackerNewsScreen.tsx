import { useHackerNews } from '../../hooks/useHackerNews';
import { formatTimeAgo } from '../../services/hackerNewsService';

export function HackerNewsScreen() {
  const { stories } = useHackerNews(12);

  const leftColumn = stories.slice(0, 6);
  const rightColumn = stories.slice(6, 12);

  return (
    <div className="columns">
      <div className="column">
        {leftColumn.map((story, i) => (
          <div key={story.id} className="item">
            <div className="meta">
              <span className="index">{i + 1}</span>
            </div>
            <div className="content">
              <span className="title title--small">{story.title}</span>
              <div className="meta-line">
                <span className="label label--small label--underline">{story.score} pts</span>
                <span>{formatTimeAgo(story.time)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="column">
        {rightColumn.map((story, i) => (
          <div key={story.id} className="item">
            <div className="meta">
              <span className="index">{i + 7}</span>
            </div>
            <div className="content">
              <span className="title title--small">{story.title}</span>
              <div className="meta-line">
                <span className="label label--small label--underline">{story.score} pts</span>
                <span>{formatTimeAgo(story.time)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
