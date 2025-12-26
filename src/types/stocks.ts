export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

export interface CryptoQuote {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
}

export interface StocksData {
  stocks: StockQuote[];
  crypto: CryptoQuote[];
  lastUpdated: Date | null;
}
