import React, { createContext, useContext, useState, useEffect } from 'react';

const MascotContext = createContext();

export function MascotProvider({ children }) {
  const [mascotState, setMascotState] = useState({
    mood: 'happy',
    message: null,
    isVisible: false,
    timestamp: 0
  });

  const triggerMascot = (mood, message, duration = 4000) => {
    setMascotState({ mood, message, isVisible: true, timestamp: Date.now() });

    if (duration > 0) {
      setTimeout(() => {
        setMascotState(prev => {
          // Only auto-hide if a newer message hasn't been triggered
          if (Date.now() - prev.timestamp >= duration - 100) {
            return { ...prev, isVisible: false };
          }
          return prev;
        });
      }, duration);
    }
  };

  const dismissMascot = () => {
    setMascotState(prev => ({ ...prev, isVisible: false }));
  };

  // Listen for global badge events
  useEffect(() => {
    const handleBadgeUnlocked = (e) => {
      const badge = e.detail;
      triggerMascot('surprised', `Whoa! You earned a new badge: ${badge.name}!`, 5000);
    };

    window.addEventListener('badgeUnlocked', handleBadgeUnlocked);
    return () => window.removeEventListener('badgeUnlocked', handleBadgeUnlocked);
  }, []);

  return (
    <MascotContext.Provider value={{ mascotState, triggerMascot, dismissMascot }}>
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  return useContext(MascotContext);
}
