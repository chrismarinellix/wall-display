import { useState, useEffect } from 'react';

const BENEFITS = [
  'Decide quickly',
  'Ship daily',
  'No overthinking',
  'Just action',
  'Move now',
  'Start today',
  'Done beats perfect',
  'Momentum matters',
  'Speed wins',
  'Act first',
  'Trust instincts',
  'Less planning',
  'More doing',
  'Ship it',
  'Launch early',
  'Iterate fast',
  'Fail forward',
  'Learn quickly',
  'Adapt rapidly',
  'Stay nimble',
  'Cut delays',
  'No waiting',
  'Bias to action',
  'Execute now',
  'Time is finite',
  'Progress daily',
  'Build momentum',
  'Start imperfect',
  'Refine later',
  'Just begin',
];

// Rotate benefits every 30 minutes (1800000ms)
const ROTATION_INTERVAL = 1800000;

export function FastScreen() {
  const [currentPairIndex, setCurrentPairIndex] = useState(() => {
    // Start with a pair based on current time so it's consistent
    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const pairIndex = Math.floor(minutesSinceMidnight / 30) % Math.floor(BENEFITS.length / 2);
    return pairIndex;
  });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const rotateBenefits = () => {
      // Fade out
      setIsVisible(false);

      // After fade out, change benefits and fade in
      setTimeout(() => {
        setCurrentPairIndex(prev => (prev + 1) % Math.floor(BENEFITS.length / 2));
        setIsVisible(true);
      }, 1500); // 1.5s fade out duration
    };

    const interval = setInterval(rotateBenefits, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Get current pair of benefits
  const benefit1 = BENEFITS[currentPairIndex * 2];
  const benefit2 = BENEFITS[currentPairIndex * 2 + 1];

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

      {/* Two benefits with fade animation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '32px',
        fontSize: 'clamp(16px, 2.5vw, 26px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.6)',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1.5s ease-in-out',
      }}>
        <span>{benefit1}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
        <span>{benefit2}</span>
      </div>
    </div>
  );
}
