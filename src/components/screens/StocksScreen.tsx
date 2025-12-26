import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStocks } from '../../hooks/useStocks';
import { Loading } from '../ui/Loading';
import { CryptoQuote, StockQuote } from '../../types/stocks';

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  });
}

function CryptoCard({ coin, isHero }: { coin: CryptoQuote; isHero?: boolean }) {
  const isPositive = coin.changePercent24h >= 0;

  if (isHero) {
    return (
      <div className="text-center py-8">
        <div className="eink-label mb-4">{coin.name}</div>
        <div className="stat-number text-8xl text-eink-black mb-4">
          ${formatPrice(coin.price)}
        </div>
        <div className={`inline-flex items-center gap-2 text-2xl ${isPositive ? 'text-eink-black' : 'text-eink-mid'}`}>
          {isPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          <span>{isPositive ? '+' : ''}{coin.changePercent24h.toFixed(2)}%</span>
          <span className="text-eink-mid text-lg ml-2">24h</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-5 border-b border-eink-light last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 flex items-center justify-center bg-eink-light text-sm font-medium">
          {coin.symbol}
        </div>
        <div>
          <div className="font-medium text-eink-black text-lg">{coin.name}</div>
          <div className="text-sm text-eink-mid">{coin.symbol}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="stat-number text-2xl text-eink-black">
          ${formatPrice(coin.price)}
        </div>
        <div className={`flex items-center justify-end gap-1 text-sm mt-1 ${isPositive ? 'text-eink-black' : 'text-eink-mid'}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{isPositive ? '+' : ''}{coin.changePercent24h.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

function StockCard({ stock }: { stock: StockQuote }) {
  const isPositive = stock.change >= 0;

  return (
    <div className="flex items-center justify-between py-4 border-b border-eink-light last:border-0">
      <div className="font-medium text-eink-black text-lg">{stock.symbol}</div>
      <div className="text-right">
        <div className="stat-number text-xl text-eink-black">
          ${formatPrice(stock.price)}
        </div>
        <div className={`flex items-center justify-end gap-1 text-sm ${isPositive ? 'text-eink-black' : 'text-eink-mid'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

export function StocksScreen() {
  const { stocks, crypto, loading, error, lastFetched } = useStocks();

  if (loading && crypto.length === 0) {
    return <Loading message="Fetching market data..." />;
  }

  const heroCoin = crypto[0];
  const otherCrypto = crypto.slice(1);

  return (
    <div className="h-full flex flex-col">
      {/* Error state */}
      {error && (
        <div className="text-sm text-eink-dark bg-eink-light p-3 mb-6">
          {error}
        </div>
      )}

      {/* Hero crypto */}
      {heroCoin && <CryptoCard coin={heroCoin} isHero />}

      {/* Other crypto */}
      <div className="flex-1 overflow-auto">
        {otherCrypto.length > 0 && (
          <div className="mb-6">
            {otherCrypto.map((coin) => (
              <CryptoCard key={coin.id} coin={coin} />
            ))}
          </div>
        )}

        {/* Stocks */}
        {stocks.length > 0 && (
          <div className="pt-6 border-t border-eink-black">
            <div className="eink-label mb-4">Stocks</div>
            {stocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}
      </div>

      {/* Last updated */}
      {lastFetched && (
        <div className="text-xs text-eink-mid eink-mono pt-4 text-center">
          Updated {format(lastFetched, 'h:mm a')}
        </div>
      )}
    </div>
  );
}
