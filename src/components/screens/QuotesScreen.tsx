import { format } from 'date-fns';
import { Quote as QuoteIcon, RefreshCw } from 'lucide-react';
import { useQuotes } from '../../hooks/useQuotes';
import { Loading } from '../ui/Loading';

export function QuotesScreen() {
  const { quote, loading, refresh, lastFetched } = useQuotes();

  if (loading && !quote) {
    return <Loading message="Loading quote..." />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <QuoteIcon className="text-eink-dark" size={20} />
          <h1 className="eink-heading text-xl">Daily Quote</h1>
        </div>
        <button
          onClick={refresh}
          className="p-2 hover:bg-eink-light rounded transition-colors"
          title="Get new quote"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Quote display - centered, large text */}
      {quote ? (
        <div className="flex-1 flex flex-col justify-center items-center px-4">
          <div className="max-w-2xl text-center">
            {/* Large opening quote mark */}
            <div className="text-8xl text-eink-light leading-none mb-4 font-serif">
              &ldquo;
            </div>

            {/* Quote text */}
            <blockquote className="trmnl-quote text-eink-black mb-8">
              {quote.text}
            </blockquote>

            {/* Author */}
            <div className="trmnl-quote-author">
              &mdash; {quote.author}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">No quote available</p>
        </div>
      )}

      {/* Last updated */}
      {lastFetched && (
        <div className="text-xs text-eink-mid eink-mono pt-4 text-center">
          {format(lastFetched, 'EEEE, MMMM d')}
        </div>
      )}
    </div>
  );
}
