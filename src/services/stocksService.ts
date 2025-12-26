import { StockQuote, CryptoQuote } from '../types/stocks';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Fetch crypto prices from CoinGecko (free, no API key needed)
export async function fetchCryptoPrices(ids: string[]): Promise<CryptoQuote[]> {
  if (ids.length === 0) return [];

  const idsParam = ids.join(',');
  const response = await fetch(
    `${COINGECKO_API}/simple/price?ids=${idsParam}&vs_currencies=usd&include_24hr_change=true`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch crypto prices');
  }

  const data = await response.json();

  return ids.map(id => {
    const coinData = data[id];
    if (!coinData) {
      return {
        id,
        symbol: id.toUpperCase(),
        name: id.charAt(0).toUpperCase() + id.slice(1),
        price: 0,
        change24h: 0,
        changePercent24h: 0,
      };
    }

    return {
      id,
      symbol: getSymbolForCoin(id),
      name: getCoinName(id),
      price: coinData.usd || 0,
      change24h: (coinData.usd * (coinData.usd_24h_change || 0)) / 100,
      changePercent24h: coinData.usd_24h_change || 0,
    };
  });
}

// Get more detailed crypto info including market data
export async function fetchCryptoDetails(ids: string[]): Promise<CryptoQuote[]> {
  if (ids.length === 0) return [];

  const idsParam = ids.join(',');
  const response = await fetch(
    `${COINGECKO_API}/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
  );

  if (!response.ok) {
    // Fallback to simple endpoint
    return fetchCryptoPrices(ids);
  }

  const data = await response.json();

  return data.map((coin: {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
  }) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    price: coin.current_price,
    change24h: coin.price_change_24h,
    changePercent24h: coin.price_change_percentage_24h,
  }));
}

// Fetch stock prices from Alpha Vantage (requires API key)
export async function fetchStockPrices(
  symbols: string[],
  apiKey: string
): Promise<StockQuote[]> {
  if (!apiKey || symbols.length === 0) return [];

  const results: StockQuote[] = [];

  // Alpha Vantage free tier: 25 requests/day, so we batch carefully
  for (const symbol of symbols.slice(0, 5)) {
    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );

      if (!response.ok) continue;

      const data = await response.json();
      const quote = data['Global Quote'];

      if (quote && quote['05. price']) {
        results.push({
          symbol: quote['01. symbol'],
          price: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
          previousClose: parseFloat(quote['08. previous close']),
        });
      }
    } catch (err) {
      console.error(`Failed to fetch ${symbol}:`, err);
    }
  }

  return results;
}

// Helper functions
function getSymbolForCoin(id: string): string {
  const symbols: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    solana: 'SOL',
    cardano: 'ADA',
    polkadot: 'DOT',
    dogecoin: 'DOGE',
    'shiba-inu': 'SHIB',
    avalanche: 'AVAX',
    chainlink: 'LINK',
    polygon: 'MATIC',
  };
  return symbols[id] || id.toUpperCase().slice(0, 4);
}

function getCoinName(id: string): string {
  const names: Record<string, string> = {
    bitcoin: 'Bitcoin',
    ethereum: 'Ethereum',
    solana: 'Solana',
    cardano: 'Cardano',
    polkadot: 'Polkadot',
    dogecoin: 'Dogecoin',
    'shiba-inu': 'Shiba Inu',
    avalanche: 'Avalanche',
    chainlink: 'Chainlink',
    polygon: 'Polygon',
  };
  return names[id] || id.charAt(0).toUpperCase() + id.slice(1);
}
