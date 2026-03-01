import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

function SplashScreen({ onFinish, dataReady }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 500);
    const t3 = setTimeout(() => setPhase(3), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    const t1 = setTimeout(() => setPhase(4), 400);
    const t2 = setTimeout(() => onFinish(), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [dataReady, onFinish]);

  return (
    <div className={`splash-container ${phase === 4 ? 'fade-out' : ''}`}>
      <p className={`splash-top ${phase >= 1 ? 'show' : ''}`}>SEE, MAKE, SHARE,</p>
      <img src="/oddday-logo.png" alt="ODD DAY WORKS" className={`splash-logo ${phase >= 2 ? 'show' : ''}`} />
      <div className="splash-bottom-wrap">
        <p className={`splash-bottom ${phase >= 3 ? 'show' : ''}`}>WORKS / ZINES</p>
      </div>
    </div>
  );
}

export default SplashScreen;