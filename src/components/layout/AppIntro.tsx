import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

export const AppIntro: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('tp_intro_seen') === '1') return;
      sessionStorage.setItem('tp_intro_seen', '1');
      setVisible(true);
      const timer = window.setTimeout(() => setVisible(false), 720);
      return () => window.clearTimeout(timer);
    } catch {
      // If storage is unavailable, skip the intro rather than blocking the app.
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="tp-intro" aria-hidden="true">
      <div className="tp-intro-grid" />
      <div className="tp-intro-content">
        <div className="tp-intro-mark"><Flame size={28} fill="currentColor" strokeWidth={0} /></div>
        <div className="tp-intro-kicker">ESPORTS ORGANIZER</div>
        <div className="tp-intro-title">TOURNAMENT<br /><span>POINTS</span></div>
        <div className="tp-intro-line"><span /></div>
        <div className="tp-intro-credit">MADE WITH LOVE BY BHARGAV</div>
      </div>
    </div>
  );
};
