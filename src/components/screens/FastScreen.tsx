export function FastScreen() {
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
        fontSize: 'clamp(120px, 25vw, 300px)',
        fontWeight: 800,
        letterSpacing: '-0.02em',
        margin: 0,
        marginBottom: '40px',
        background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 60px rgba(255,255,255,0.3)',
      }}>
        Fast.
      </h1>

      {/* Benefits */}
      <div style={{
        maxWidth: '600px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontSize: 'clamp(16px, 2.5vw, 24px)',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.6,
        }}>
          <p style={{ margin: 0 }}>
            Decisions made quickly. Projects completed efficiently.
          </p>
          <p style={{ margin: 0 }}>
            No overthinking. No delays. Just action.
          </p>
          <p style={{ margin: 0 }}>
            Time is the only resource you can't get back.
          </p>
        </div>

        <div style={{
          marginTop: '48px',
          fontSize: 'clamp(12px, 1.5vw, 16px)',
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Move fast. Stay focused. Ship it.
        </div>
      </div>
    </div>
  );
}
