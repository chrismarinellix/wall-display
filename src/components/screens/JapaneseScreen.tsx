import { useState, useEffect } from 'react';
import { proverbs } from '../../data/proverbs';

function getRandomProverb() {
  const index = Math.floor(Math.random() * proverbs.length);
  return { proverb: proverbs[index], index };
}

export function JapaneseScreen() {
  const [proverbData, setProverbData] = useState(getRandomProverb);

  // Get a new random proverb each time the component mounts (screen shown)
  useEffect(() => {
    setProverbData(getRandomProverb());
  }, []);

  return (
    <div className="flex flex--col flex--center" style={{ height: '100%', textAlign: 'center', padding: '0 32px' }}>
      {/* Japanese calligraphy text */}
      <div style={{
        fontSize: 72,
        fontWeight: 400,
        lineHeight: 1.3,
        fontFamily: '"Shippori Mincho", "Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif',
        letterSpacing: '0.15em',
        marginBottom: 40,
      }}>
        {proverbData.proverb.japanese}
      </div>

      {/* Romaji */}
      <div className="label label--gray" style={{ fontSize: 11, marginBottom: 24, letterSpacing: '0.15em' }}>
        {proverbData.proverb.romaji}
      </div>

      {/* Meaning */}
      <div className="flex gap--medium" style={{ alignItems: 'center', marginBottom: 20 }}>
        <div style={{ width: 40, height: 1, background: '#ccc' }} />
        <span style={{ fontSize: 20, fontWeight: 400 }}>
          {proverbData.proverb.meaning}
        </span>
        <div style={{ width: 40, height: 1, background: '#ccc' }} />
      </div>

      {/* Explanation */}
      <div style={{
        fontSize: 14,
        color: '#666',
        maxWidth: 500,
        lineHeight: 1.7,
        fontWeight: 300,
      }}>
        {proverbData.proverb.explanation}
      </div>
    </div>
  );
}
