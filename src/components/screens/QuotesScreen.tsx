import { useQuotes } from '../../hooks/useQuotes';

export function QuotesScreen() {
  const { quote } = useQuotes();

  if (!quote) {
    return <div className="flex flex--center flex-1"><span className="description">Loading quote...</span></div>;
  }

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
