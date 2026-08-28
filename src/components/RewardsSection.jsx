import React, { useState, useEffect } from 'react';
import { BADGE_DEFINITIONS } from '../utils/badgeUtils';
import { getUserStats } from '../utils';

export default function RewardsSection() {
  const [points, setPoints] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]);

  useEffect(() => {
    const badgesStr = localStorage.getItem('pinboard_earned_badges');
    let loadedBadges = [];
    if (badgesStr) {
      try {
        loadedBadges = JSON.parse(badgesStr);
      } catch (e) {
        console.error('Failed to parse earned badges', e);
      }
    }
    setEarnedBadges(loadedBadges);
    
    const stats = getUserStats();
    setPoints(stats.points);
  }, []);

  const stats = getUserStats();
  const currentLevel = stats.currentLevel;
  const nextLevel = stats.nextLevel;
  const previousMax = stats.previousMax;

  // Calculate progress percentage
  let progressPercentage = 100;
  let pointsToNext = 0;
  if (nextLevel) {
    const range = currentLevel.max - previousMax;
    const progressIntoLevel = points - previousMax;
    progressPercentage = Math.min(100, Math.max(0, (progressIntoLevel / range) * 100));
    pointsToNext = currentLevel.max - points + 1; // +1 because it's up to max
  }

  return (
    <div className="w-full max-w-md z-10 flex flex-col gap-6 pt-6 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          Rewards
        </h2>
      </div>

      {/* Level & Points Header */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 mb-8 text-center shadow-[0_4px_20px_rgba(79,70,229,0.3)] border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest mb-1">Total Points</p>
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500 mb-2 drop-shadow-sm">
            {points.toLocaleString()}
          </div>
          <div className="inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 mb-4">
            <span className="text-white font-bold tracking-wide">{currentLevel.name}</span>
          </div>

          <div className="w-full bg-black/40 rounded-full h-2.5 mb-2 overflow-hidden border border-white/10">
            <div 
              className="bg-gradient-to-r from-amber-400 to-orange-500 h-2.5 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress_1s_linear_infinite]"></div>
            </div>
          </div>
          
          {nextLevel ? (
            <p className="text-xs text-indigo-200 font-medium">{pointsToNext.toLocaleString()} pts to {nextLevel.name}</p>
          ) : (
            <p className="text-xs text-amber-300 font-bold uppercase tracking-widest">Max Level Reached!</p>
          )}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Badges</h3>
        <div className="grid grid-cols-2 gap-3">
          {BADGE_DEFINITIONS.map(badgeDef => {
            const earnedInfo = earnedBadges.find(b => b.id === badgeDef.id);
            const isEarned = !!earnedInfo;

            return (
              <div 
                key={badgeDef.id} 
                className={`relative flex flex-col items-center text-center p-4 rounded-2xl transition-all duration-300 ${
                  isEarned 
                    ? 'bg-[#1e1e28] border border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.05)]' 
                    : 'bg-[#16161f] opacity-60 filter grayscale'
                }`}
              >
                <div className="text-4xl mb-3 drop-shadow-md">{badgeDef.icon}</div>
                <h4 className={`font-bold text-sm mb-1 ${isEarned ? 'text-white' : 'text-gray-400'}`}>{badgeDef.name}</h4>
                <p className="text-[10px] text-gray-500 leading-tight mb-3 flex-grow">{badgeDef.description}</p>
                
                {isEarned ? (
                  <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md w-full">
                    Earned {new Date(earnedInfo.timestamp).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[9px] font-medium text-gray-500 bg-[#2a2a35] px-2 py-1 rounded-md w-full">
                    Locked
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
