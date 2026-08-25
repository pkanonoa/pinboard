import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function BadgeCelebration() {
  const [badge, setBadge] = useState(null);

  useEffect(() => {
    const handleBadgeUnlocked = (e) => {
      const earnedBadge = e.detail;
      setBadge(earnedBadge);

      // Fire confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
    };

    window.addEventListener('badgeUnlocked', handleBadgeUnlocked);
    return () => window.removeEventListener('badgeUnlocked', handleBadgeUnlocked);
  }, []);

  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-gray-900 border border-amber-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(251,191,36,0.2)] transform animate-in zoom-in-95 duration-500">
        <div className="text-6xl mb-4 animate-bounce">{badge.icon}</div>
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-2">
          Badge Unlocked!
        </h2>
        <h3 className="text-xl font-bold text-white mb-2">{badge.name}</h3>
        <p className="text-gray-400 mb-8">{badge.description}</p>
        
        <button 
          onClick={() => setBadge(null)}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
