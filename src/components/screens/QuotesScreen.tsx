import { useState, useEffect } from 'react';
import { quotes } from '../../data/quotes';

function getRandomQuote() {
  const index = Math.floor(Math.random() * quotes.length);
  return { quote: quotes[index], index };
}

export function QuotesScreen() {
  const [quoteData, setQuoteData] = useState(getRandomQuote);

  // Get a new random quote each time the component mounts (screen shown)
  useEffect(() => {
    setQuoteData(getRandomQuote());
  }, []);

  return (
    <div className="flex flex--col" style={{ height: '100%', justifyContent: 'center', padding: '0 48px' }}>
      {/* Decorative line */}
      <div style={{ width: 60, height: 3, background: '#000', marginBottom: 40 }} />

      {/* Quote text - large and impactful */}
      <div style={{
        fontSize: 42,
        fontWeight: 300,
        lineHeight: 1.4,
        letterSpacing: '-0.01em',
        maxWidth: 800,
      }}>
        {quoteData.quote.text}
      </div>

      {/* Author */}
      <div style={{ marginTop: 48 }}>
        <span className="label" style={{ fontSize: 12, letterSpacing: '0.15em' }}>
          {quoteData.quote.author.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
