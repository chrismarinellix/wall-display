import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { useQuotes } from '../../hooks/useQuotes';
import { Loading } from '../ui/Loading';

export function QuotesScreen() {
  const { quote, loading, refresh, lastFetched } = useQuotes();

  if (loading && !quote) {
    return <Loading message="Loading quote..." />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Quote display - full screen centered */}
      {quote ? (
        <div className="flex-1 flex flex-col justify-center items-center px-8">
          <div className="max-w-3xl text-center">
            {/* Large decorative quote mark */}
            <div className="text-[12rem] text-eink-light leading-none font-serif -mb-24 select-none">
              &ldquo;
            </div>

            {/* Quote text */}
            <blockquote className="text-3xl md:text-4xl font-light text-eink-black leading-relaxed tracking-tight">
              {quote.text}
            </blockquote>

            {/* Author with decorative line */}
            <div className="mt-12 flex items-center justify-center gap-4">
              <div className="w-12 h-px bg-eink-mid"></div>
              <div className="text-lg font-medium text-eink-dark">
                {quote.author}
              </div>
              <div className="w-12 h-px bg-eink-mid"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-eink-mid eink-body">No quote available</p>
        </div>
      )}

      {/* Footer with date and refresh */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-eink-mid">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </div>
        <button
          onClick={refresh}
          className="p-2 hover:bg-eink-light rounded transition-colors text-eink-mid"
          title="Get new quote"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
