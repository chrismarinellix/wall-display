import { useNews } from '../../hooks/useNews';
import { formatNewsTime } from '../../services/newsService';

export function NewsScreen() {
  const { items } = useNews();

  if (items.length === 0) {
    return <div className="flex flex--center flex-1"><span className="description">Loading news...</span></div>;
  }

  const leftColumn = items.slice(0, 5);
  const rightColumn = items.slice(5, 10);

  return (
    <div className="columns">
      <div className="column">
        {leftColumn.map((item, i) => (
          <div key={`${item.link}-${i}`} className="item">
            <div className="meta">
              <span className="index">{i + 1}</span>
            </div>
            <div className="content">
              <span className="title title--small">{item.title}</span>
              <div className="meta-line">
                <span className="label label--small label--underline">{item.source}</span>
                <span>{formatNewsTime(item.pubDate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="column">
        {rightColumn.map((item, i) => (
          <div key={`${item.link}-${i}`} className="item">
            <div className="meta">
              <span className="index">{i + 6}</span>
            </div>
            <div className="content">
              <span className="title title--small">{item.title}</span>
              <div className="meta-line">
                <span className="label label--small label--underline">{item.source}</span>
                <span>{formatNewsTime(item.pubDate)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
