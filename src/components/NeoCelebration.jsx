import React, { useState, useEffect, useRef } from "react";
import neoHappy from "../assets/neo-happy.png";

const QUOTES = [
  "You're on fire! Keep the momentum going! 🔥",
  "One step closer to greatness. Don't stop now! ✨",
  "That's what consistency looks like. Proud of you! 💪",
  "Small wins compound into big victories. Keep it up! 🚀",
  "Done is better than perfect. You nailed it! ⚡",
  "Every completed task is a promise kept to yourself. 🌟",
  "Progress, not perfection. You're crushing it! 🎯",
  "Discipline today = freedom tomorrow. 💥",
  "Look at you go! Another one bites the dust! 🏆",
  "You did not feel like it, but you did it anyway. That is character. 🦁",
];

export default function NeoCelebration() {
  const [visible, setVisible] = useState(false);
  const [quote, setQuote] = useState("");
  const [hasBadge, setHasBadge] = useState(false);
  const pendingBadgesRef = useRef([]);
  const visibleRef = useRef(false);

  visibleRef.current = visible;

  useEffect(() => {
    const handleCompletion = () => {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setQuote(q);
      setVisible(true);
    };

    window.addEventListener("neo_celebration", handleCompletion);

    const captureBadge = (e) => {
      if (visibleRef.current) {
        e.stopImmediatePropagation();
        pendingBadgesRef.current.push(e.detail);
        setHasBadge(true);
      }
    };
    window.addEventListener("badgeUnlocked", captureBadge, true);

    return () => {
      window.removeEventListener("neo_celebration", handleCompletion);
      window.removeEventListener("badgeUnlocked", captureBadge, true);
    };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setHasBadge(false);
    const badges = [...pendingBadgesRef.current];
    pendingBadgesRef.current = [];
    badges.forEach((badge, i) => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("badgeUnlocked", { detail: badge }));
      }, 350 + i * 150);
    });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-6"
      onClick={handleDismiss}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm bg-[#13131a] rounded-3xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUpFade 0.45s cubic-bezier(0.34,1.56,0.64,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-end gap-4 p-5 pb-4">
          <img
            src={neoHappy}
            alt="Neo is happy"
            className="w-28 h-28 object-contain flex-shrink-0"
            style={{ filter: "drop-shadow(0 0 20px rgba(99,102,241,0.6))" }}
          />
          <div className="flex-1 min-w-0 pb-1">
            <p className="text-white font-semibold text-[15px] leading-snug">{quote}</p>
            {hasBadge && (
              <p className="text-amber-400 text-xs mt-2.5 font-medium">
                🏅 Badge waiting — tap to reveal!
              </p>
            )}
          </div>
        </div>

        <button
          className="w-full flex items-center justify-center py-3 border-t border-gray-800/60 hover:bg-gray-800/30 active:bg-gray-800/50 transition-colors"
          onClick={handleDismiss}
        >
          <span className="text-gray-500 text-xs font-medium tracking-widest uppercase">
            {hasBadge ? "🏅 Tap to claim badge" : "Tap to continue"}
          </span>
        </button>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(50px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
