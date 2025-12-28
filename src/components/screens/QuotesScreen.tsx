import { useState, useEffect, useMemo } from 'react';
import { quotes } from '../../data/quotes';

// Abstract imagery keywords for inspirational quotes
const imageKeywords = [
  'mountain,landscape,minimal',
  'ocean,horizon,calm',
  'sunrise,sky,hope',
  'forest,nature,peaceful',
  'stars,night,universe',
  'clouds,sky,serene',
  'desert,minimal,vast',
  'lake,reflection,still',
  'path,journey,road',
  'light,abstract,glow',
];

function getRandomQuote() {
  const index = Math.floor(Math.random() * quotes.length);
  return { quote: quotes[index], index };
}

export function QuotesScreen() {
  const [quoteData, setQuoteData] = useState(getRandomQuote);

  // Get a consistent but varied image based on quote index
  const imageUrl = useMemo(() => {
    const keyword = imageKeywords[quoteData.index % imageKeywords.length];
    // Use Unsplash Source (free, no API key needed)
    return `https://source.unsplash.com/800x400/?${keyword}&sig=${quoteData.index}`;
  }, [quoteData.index]);

  // Get a new random quote each time the component mounts (screen shown)
  useEffect(() => {
    setQuoteData(getRandomQuote());
  }, []);

  return (
    <div
      className="flex flex--col"
      style={{
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 32px',
      }}
    >
      {/* Inspirational image */}
      <div
        style={{
          width: '100%',
          maxWidth: 500,
          height: 140,
          marginBottom: 40,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#f5f5f5',
        }}
      >
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(100%) contrast(1.1)',
            opacity: 0.9,
          }}
        />
      </div>

      {/* Opening quote mark */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 200,
          lineHeight: 0.5,
          color: '#ddd',
          marginBottom: 16,
          fontFamily: 'Georgia, serif',
        }}
      >
        "
      </div>

      {/* Quote text - large and centered */}
      <div
        style={{
          fontSize: 36,
          fontWeight: 300,
          lineHeight: 1.5,
          letterSpacing: '-0.01em',
          maxWidth: 700,
          color: '#222',
        }}
      >
        {quoteData.quote.text}
      </div>

      {/* Author - centered below */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            width: 40,
            height: 2,
            background: '#ccc',
            margin: '0 auto 16px',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.2em',
            color: '#888',
            textTransform: 'uppercase',
          }}
        >
          {quoteData.quote.author}
        </span>
      </div>
    </div>
  );
}
