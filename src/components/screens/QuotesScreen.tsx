import { useState, useEffect, useMemo } from 'react';
import { quotes } from '../../data/quotes';

// Extract keywords from quote text for image search
function extractKeywords(text: string): string {
  // Common inspirational themes mapped to image-friendly keywords
  const themeKeywords: Record<string, string> = {
    'dream': 'sky,clouds',
    'success': 'mountain,summit',
    'love': 'heart,sunset',
    'life': 'nature,path',
    'time': 'clock,hourglass',
    'change': 'butterfly,transformation',
    'hope': 'sunrise,light',
    'courage': 'lion,strength',
    'wisdom': 'books,library',
    'happiness': 'joy,sunshine',
    'peace': 'calm,water',
    'future': 'horizon,road',
    'mind': 'brain,thinking',
    'heart': 'love,warmth',
    'journey': 'path,adventure',
    'nature': 'forest,trees',
    'strength': 'rock,mountain',
    'beauty': 'flower,garden',
    'freedom': 'bird,sky',
    'faith': 'light,hope',
  };

  const lowerText = text.toLowerCase();

  for (const [keyword, imageTerms] of Object.entries(themeKeywords)) {
    if (lowerText.includes(keyword)) {
      return imageTerms;
    }
  }

  // Default abstract/inspirational keywords
  return 'nature,minimal,calm';
}

function getRandomQuote() {
  const index = Math.floor(Math.random() * quotes.length);
  return { quote: quotes[index], index };
}

export function QuotesScreen() {
  const [quoteData, setQuoteData] = useState(getRandomQuote);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Get image based on quote content using Loremflickr
  const imageUrl = useMemo(() => {
    const keywords = extractKeywords(quoteData.quote.text);
    // Loremflickr allows keyword-based image search
    // Add index to get different images for same keywords
    return `https://loremflickr.com/800/400/${keywords}?lock=${quoteData.index}`;
  }, [quoteData.index, quoteData.quote.text]);

  // Get a new random quote each time the component mounts (screen shown)
  useEffect(() => {
    setQuoteData(getRandomQuote());
    setImageLoaded(false);
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
          onLoad={() => setImageLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(100%) contrast(1.1)',
            opacity: imageLoaded ? 0.85 : 0,
            transition: 'opacity 0.5s ease',
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
