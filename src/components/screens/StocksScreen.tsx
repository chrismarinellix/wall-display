import { format } from 'date-fns';
import { TrendingUp, TrendingDown, RefreshCw, Bitcoin } from 'lucide-react';
import { useStocks } from '../../hooks/useStocks';
import { Loading } from '../ui/Loading';
import { CryptoQuote, StockQuote } from '../../types/stocks';

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 6 : 2,
  });
}

function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

function CryptoItem({ coin, isFirst }: { coin: CryptoQuote; isFirst: boolean }) {
  const isPositive = coin.changePercent24h >= 0;

  return (
    <div className={`py-4 ${isFirst ? '' : 'border-t border-eink-light'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center bg-eink-light rounded-full">
            <span className="text-xs font-medium">{coin.symbol.slice(0, 2)}</span>
          </div>
          <div>
            <div className="font-medium text-eink-black">{coin.symbol}</div>
            <div className="text-xs text-eink-mid">{coin.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="stat-number text-2xl text-eink-black">
            ${formatPrice(coin.price)}
          </div>
          <div className={`stat-change flex items-center justify-end gap-1 ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{formatChange(coin.change24h, coin.changePercent24h)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockItem({ stock }: { stock: StockQuote }) {
  const isPositive = stock.change >= 0;

  return (
    <div className="py-3 border-t border-eink-light">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-eink-black">{stock.symbol}</div>
        </div>
        <div className="text-right">
          <div className="stat-number text-xl text-eink-black">
            ${formatPrice(stock.price)}
          </div>
          <div className={`stat-change flex items-center justify-end gap-1 ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{formatChange(stock.change, stock.changePercent)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StocksScreen() {
  const { stocks, crypto, loading, error, refresh, lastFetched } = useStocks();

  if (loading && crypto.length === 0) {
    return <Loading message="Fetching market data..." />;
  }

  // Show the first crypto as the hero
  const heroCoin = crypto[0];
  const otherCrypto = crypto.slice(1);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bitcoin className="text-eink-dark" size={20} />
          <h1 className="eink-heading text-xl">Markets</h1>
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

      {/* Hero crypto display */}
      {heroCoin && (
        <div className="eink-card p-6 mb-6">
          <div className="eink-label mb-2">{heroCoin.name}</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="stat-number text-6xl text-eink-black">
                ${formatPrice(heroCoin.price)}
              </div>
              <div className={`stat-change flex items-center gap-2 mt-2 text-lg ${heroCoin.changePercent24h >= 0 ? 'positive' : 'negative'}`}>
                {heroCoin.changePercent24h >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                <span>{formatChange(heroCoin.change24h, heroCoin.changePercent24h)}</span>
                <span className="text-eink-mid text-sm">24h</span>
              </div>
            </div>
            <div className="text-8xl font-light text-eink-light">
              {heroCoin.symbol}
            </div>
          </div>
        </div>
      )}

      {/* Other crypto */}
      {otherCrypto.length > 0 && (
        <div className="eink-card p-4 flex-1 overflow-auto">
          <div className="eink-label mb-3">Other Crypto</div>
          {otherCrypto.map((coin, index) => (
            <CryptoItem key={coin.id} coin={coin} isFirst={index === 0} />
          ))}
        </div>
      )}

      {/* Stocks section */}
      {stocks.length > 0 && (
        <div className="eink-card p-4 mt-4">
          <div className="eink-label mb-3">Stocks</div>
          {stocks.map((stock) => (
            <StockItem key={stock.symbol} stock={stock} />
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastFetched && (
        <div className="text-xs text-eink-mid eink-mono pt-4 text-center mt-auto">
          Updated {format(lastFetched, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
