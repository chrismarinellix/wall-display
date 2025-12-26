import { useState, useEffect, useCallback } from 'react';
import { StockQuote, CryptoQuote } from '../types/stocks';
import { fetchCryptoDetails, fetchStockPrices } from '../services/stocksService';
import { useSettings } from '../contexts/SettingsContext';

interface UseStocksReturn {
  stocks: StockQuote[];
  crypto: CryptoQuote[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  refresh: () => Promise<void>;
}

// Default crypto to show (CoinGecko IDs)
const DEFAULT_CRYPTO = ['bitcoin', 'ethereum', 'solana'];

export function useStocks(): UseStocksReturn {
  const { settings } = useSettings();
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [crypto, setCrypto] = useState<CryptoQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const cryptoIds = (settings as { cryptoSymbols?: string[] }).cryptoSymbols || DEFAULT_CRYPTO;
  const stockSymbols = (settings as { stockSymbols?: string[] }).stockSymbols || [];
  const alphaVantageKey = (settings as { alphaVantageApiKey?: string }).alphaVantageApiKey ||
    import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch crypto (always works, no API key needed)
      const cryptoData = await fetchCryptoDetails(cryptoIds);
      setCrypto(cryptoData);

      // Fetch stocks if API key is provided
      if (alphaVantageKey && stockSymbols.length > 0) {
        const stockData = await fetchStockPrices(stockSymbols, alphaVantageKey);
        setStocks(stockData);
      }

      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, [cryptoIds, stockSymbols, alphaVantageKey]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh on interval (every 5 minutes for free tier limits)
  useEffect(() => {
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    stocks,
    crypto,
    loading,
    error,
    lastFetched,
    refresh: fetchData,
  };
}
