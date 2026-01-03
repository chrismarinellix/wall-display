export function FastScreen() {
  const reasons = [
    'Decide quickly',
    'Ship daily',
    'No overthinking',
    'Just action',
  ];

  return (
    <div style={{
      height: '100%',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#fff',
    }}>
      {/* Main word */}
      <h1 style={{
        fontSize: 'clamp(140px, 28vw, 320px)',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        margin: 0,
        marginBottom: '60px',
        color: '#fff',
      }}>
        Fast!
      </h1>

      {/* Reasons separated by dots */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        fontSize: 'clamp(14px, 2vw, 22px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.6)',
        flexWrap: 'wrap',
      }}>
        {reasons.map((reason, index) => (
          <span key={reason} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {index > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>}
            <span>{reason}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
