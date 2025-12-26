import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Sun, Cloud, CloudRain } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import { useStocks } from '../../hooks/useStocks';
import { useHackerNews } from '../../hooks/useHackerNews';

function WeatherIcon({ code, size = 32 }: { code: number; size?: number }) {
  if (code === 0 || code === 1) return <Sun size={size} strokeWidth={1.5} />;
  if (code >= 61 && code <= 67) return <CloudRain size={size} strokeWidth={1.5} />;
  return <Cloud size={size} strokeWidth={1.5} />;
}

export function DashboardScreen() {
  const { current, forecast } = useWeather();
  const { crypto } = useStocks();
  const { stories } = useHackerNews(5);

  const btc = crypto.find(c => c.id === 'bitcoin');
  const eth = crypto.find(c => c.id === 'ethereum');

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Top row: Date and Weather */}
      <div className="flex flex--between" style={{ alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div className="value value--large" style={{ fontWeight: 200 }}>
            {format(new Date(), 'EEEE')}
          </div>
          <div className="description" style={{ marginTop: 4 }}>
            {format(new Date(), 'MMMM d, yyyy')}
          </div>
        </div>

        {current && (
          <div className="flex gap--medium" style={{ alignItems: 'center' }}>
            <WeatherIcon code={current.weatherCode} size={36} />
            <span className="value value--large">{current.temperature}°</span>
          </div>
        )}
      </div>

      {/* Crypto row */}
      <div className="flex gap--xlarge" style={{ paddingBottom: 20 }}>
        {btc && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Bitcoin</div>
            <div className="value value--large">${Math.round(btc.price).toLocaleString()}</div>
            <div className="flex gap--xsmall" style={{ marginTop: 6, alignItems: 'center' }}>
              {btc.changePercent24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="label label--small">{btc.changePercent24h >= 0 ? '+' : ''}{btc.changePercent24h.toFixed(1)}%</span>
            </div>
          </div>
        )}
        {eth && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Ethereum</div>
            <div className="value value--large">${Math.round(eth.price).toLocaleString()}</div>
            <div className="flex gap--xsmall" style={{ marginTop: 6, alignItems: 'center' }}>
              {eth.changePercent24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="label label--small">{eth.changePercent24h >= 0 ? '+' : ''}{eth.changePercent24h.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="divider" style={{ marginBottom: 16 }} />

      {/* Hacker News */}
      <div style={{ flex: 1 }}>
        <div className="label" style={{ marginBottom: 12 }}>Top Stories</div>
        {stories.map((story, i) => (
          <div key={story.id} className="item">
            <div className="meta">
              <span className="index">{i + 1}</span>
            </div>
            <div className="content">
              <span className="title title--small">{story.title}</span>
              <div className="meta-line">
                <span className="label label--small label--underline">{story.score} pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast bar */}
      {forecast.length > 0 && (
        <div className="forecast-bar">
          {forecast.slice(0, 5).map((day, i) => (
            <div key={i} className="forecast-day">
              <div className="label label--gray" style={{ marginBottom: 6 }}>
                {i === 0 ? 'Today' : format(day.date, 'EEE')}
              </div>
              <WeatherIcon code={day.weatherCode} size={18} />
              <div className="value value--xsmall" style={{ marginTop: 6 }}>{day.tempMax}°</div>
              <div className="description" style={{ fontSize: 10 }}>{day.tempMin}°</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
