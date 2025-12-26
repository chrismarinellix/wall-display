import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStocks } from '../../hooks/useStocks';

export function StocksScreen() {
  const { crypto } = useStocks();

  const hero = crypto[0];
  const others = crypto.slice(1);

  return (
    <div className="flex flex--col" style={{ height: '100%' }}>
      {/* Hero crypto */}
      {hero && (
        <div className="text-center" style={{ paddingTop: 24, paddingBottom: 32 }}>
          <div className="label" style={{ marginBottom: 12 }}>{hero.name}</div>
          <div className="value value--xxxlarge">
            ${Math.round(hero.price).toLocaleString()}
          </div>
          <div className="flex flex--center gap--small" style={{ marginTop: 16 }}>
            {hero.changePercent24h >= 0 ? <TrendingUp size={24} strokeWidth={2} /> : <TrendingDown size={24} strokeWidth={2} />}
            <span className="value value--small">
              {hero.changePercent24h >= 0 ? '+' : ''}{hero.changePercent24h.toFixed(2)}%
            </span>
            <span className="label label--gray" style={{ marginLeft: 8 }}>24h</span>
          </div>
        </div>
      )}

      <div className="divider" />

      {/* Other crypto in columns */}
      <div className="columns" style={{ flex: 1, paddingTop: 16 }}>
        <div className="column">
          {others.slice(0, 3).map((coin) => (
            <div key={coin.id} className="item">
              <div className="content">
                <div className="flex flex--between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <span className="title title--small">{coin.name}</span>
                    <div className="label label--gray" style={{ marginTop: 4 }}>{coin.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="value value--small">${coin.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="flex gap--xsmall" style={{ justifyContent: 'flex-end', marginTop: 4, alignItems: 'center' }}>
                      {coin.changePercent24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span className="label label--small">{coin.changePercent24h >= 0 ? '+' : ''}{coin.changePercent24h.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="column">
          {others.slice(3, 6).map((coin) => (
            <div key={coin.id} className="item">
              <div className="content">
                <div className="flex flex--between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <span className="title title--small">{coin.name}</span>
                    <div className="label label--gray" style={{ marginTop: 4 }}>{coin.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="value value--small">${coin.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="flex gap--xsmall" style={{ justifyContent: 'flex-end', marginTop: 4, alignItems: 'center' }}>
                      {coin.changePercent24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span className="label label--small">{coin.changePercent24h >= 0 ? '+' : ''}{coin.changePercent24h.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
