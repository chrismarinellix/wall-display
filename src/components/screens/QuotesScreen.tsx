import { useState, useEffect } from 'react';
import { quotes } from '../../data/quotes';

function getQuoteForPeriod() {
  // Change quote every 6 hours (4 times per day)
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const periodOfDay = Math.floor(now.getHours() / 6); // 0-3 (4 periods per day)
  const index = (dayOfYear * 4 + periodOfDay) % quotes.length;
  return quotes[index];
}

export function QuotesScreen() {
  const [quote, setQuote] = useState(getQuoteForPeriod);

  useEffect(() => {
    // Check for new quote every minute
    const interval = setInterval(() => {
      setQuote(getQuoteForPeriod());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex--col flex--center" style={{ height: '100%', textAlign: 'center', padding: '0 32px' }}>
      {/* Large opening quote mark */}
      <div style={{ fontSize: 180, fontWeight: 200, lineHeight: 0.6, color: '#e5e5e5', marginBottom: 16 }}>
        "
      </div>

      {/* Quote text */}
      <div className="title" style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.5, maxWidth: 640 }}>
        {quote.text}
      </div>

      {/* Author */}
      <div className="flex gap--medium" style={{ alignItems: 'center', marginTop: 40 }}>
        <div className="divider" style={{ width: 32, margin: 0 }} />
        <span className="label">{quote.author}</span>
        <div className="divider" style={{ width: 32, margin: 0 }} />
      </div>
    </div>
  );
}
