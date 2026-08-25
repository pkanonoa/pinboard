import { getLocalYMD } from '../utils';

export const BADGE_DEFINITIONS = [
  { id: 'first_step', name: 'First Step', icon: '🔥', description: 'Complete your first task.' },
  { id: 'hydrated', name: 'Hydrated', icon: '💧', description: 'Log water 7 days in a row.' },
  { id: 'consistent', name: 'Consistent', icon: '💪', description: 'Complete all habits in a day.' },
  { id: 'trusted', name: 'Trusted', icon: '📋', description: 'Add 10 tasks from others and complete them.' },
  { id: 'unstoppable', name: 'Unstoppable', icon: '🏆', description: 'Maintain a 30 day streak on any habit.' },
  { id: 'early_bird', name: 'Early Bird', icon: '⚡️', description: 'Complete a task before 9am.' },
  { id: 'night_owl', name: 'Night Owl', icon: '🌙', description: 'Complete a task after 9pm.' },
  { id: 'perfect_week', name: 'Perfect Week', icon: '🎯', description: 'Complete all habits every day for 7 days.' }
];

export const checkAndUnlockBadges = () => {
  try {
    const earnedLogStr = localStorage.getItem('pinboard_earned_badges');
    const earnedBadges = earnedLogStr ? JSON.parse(earnedLogStr) : [];
    
    // We only evaluate badges that are not already earned
    const unlockedIds = new Set(earnedBadges.map(b => b.id));
    
    let newlyEarned = [];

    // Load necessary data
    const tasks = JSON.parse(localStorage.getItem('pinboard_tasks') || '[]');
    
    let habits = [];
    try {
      const ritualsData = JSON.parse(localStorage.getItem('pinboard_rituals_data') || '{}');
      habits = ritualsData.habits || [];
    } catch(e) {}
    
    const completionLog = JSON.parse(localStorage.getItem('pinboard_completion_log') || '[]');
    const todayStr = getLocalYMD();
    const currentHour = new Date().getHours();

    // 1. 🔥 First Step
    if (!unlockedIds.has('first_step')) {
      if (tasks.some(t => t.done)) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'first_step'));
      }
    }

    // 2. 💧 Hydrated
    if (!unlockedIds.has('hydrated')) {
      const waterHabit = habits.find(h => h.name.toLowerCase().includes('water'));
      if (waterHabit && waterHabit.streak >= 7) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'hydrated'));
      }
    }

    // 3. 💪 Consistent
    if (!unlockedIds.has('consistent')) {
      if (habits.length > 0 && habits.every(h => h.count >= h.goal && h.lastCompletedDate === todayStr)) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'consistent'));
      }
    }

    // 4. 📋 Trusted
    if (!unlockedIds.has('trusted')) {
      const trustedCount = tasks.filter(t => t.done && t.person && t.person.trim() !== '').length;
      if (trustedCount >= 10) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'trusted'));
      }
    }

    // 5. 🏆 Unstoppable
    if (!unlockedIds.has('unstoppable')) {
      if (habits.some(h => h.streak >= 30)) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'unstoppable'));
      }
    }

    // 6. ⚡️ Early Bird
    if (!unlockedIds.has('early_bird')) {
      // We check if there's any task completed today before 9am, or just check right now.
      // Easiest is to check the completion log for a task completed < 9am.
      const hasEarlyTask = completionLog.some(log => {
        if (log.type === 'task') {
          const d = new Date(log.timestamp);
          return d.getHours() < 9;
        }
        return false;
      });
      if (hasEarlyTask || (tasks.some(t => t.done && t.completedDate === todayStr) && currentHour < 9)) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'early_bird'));
      }
    }

    // 7. 🌙 Night Owl
    if (!unlockedIds.has('night_owl')) {
      const hasLateTask = completionLog.some(log => {
        if (log.type === 'task') {
          const d = new Date(log.timestamp);
          return d.getHours() >= 21;
        }
        return false;
      });
      if (hasLateTask || (tasks.some(t => t.done && t.completedDate === todayStr) && currentHour >= 21)) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'night_owl'));
      }
    }

    // 8. 🎯 Perfect Week
    if (!unlockedIds.has('perfect_week') && habits.length > 0) {
      // Check last 7 days
      let perfect = true;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = getLocalYMD(d);
        
        // Ensure every habit has a log on `ymd`
        const habitsCompletedThatDay = completionLog.filter(l => l.type === 'habit' && getLocalYMD(new Date(l.timestamp)) === ymd);
        
        const allCompleted = habits.every(h => habitsCompletedThatDay.some(l => l.id === h.id));
        if (!allCompleted) {
          perfect = false;
          break;
        }
      }
      
      if (perfect) {
        newlyEarned.push(BADGE_DEFINITIONS.find(b => b.id === 'perfect_week'));
      }
    }

    if (newlyEarned.length > 0) {
      const now = new Date().toISOString();
      newlyEarned.forEach(badge => {
        earnedBadges.push({
          id: badge.id,
          timestamp: now
        });
        // Dispatch event for UI
        window.dispatchEvent(new CustomEvent('badgeUnlocked', { detail: badge }));
      });
      localStorage.setItem('pinboard_earned_badges', JSON.stringify(earnedBadges));
    }

  } catch (e) {
    console.error("Error evaluating badges:", e);
  }
};

export const getClosestBadgeProgress = () => {
  try {
    const earnedLogStr = localStorage.getItem('pinboard_earned_badges');
    const earnedBadges = earnedLogStr ? JSON.parse(earnedLogStr) : [];
    const unlockedIds = new Set(earnedBadges.map(b => b.id));

    const tasks = JSON.parse(localStorage.getItem('pinboard_tasks') || '[]');
    let habits = [];
    try {
      const ritualsData = JSON.parse(localStorage.getItem('pinboard_rituals_data') || '{}');
      habits = ritualsData.habits || [];
    } catch(e) {}
    
    const completionLog = JSON.parse(localStorage.getItem('pinboard_completion_log') || '[]');
    const todayStr = getLocalYMD();

    let progressList = [];

    // Evaluate progress for each unearned badge
    if (!unlockedIds.has('first_step')) {
      const current = tasks.filter(t => t.done).length;
      progressList.push({ id: 'first_step', current, goal: 1, unit: 'tasks' });
    }

    if (!unlockedIds.has('hydrated')) {
      const waterHabit = habits.find(h => h.name.toLowerCase().includes('water'));
      const current = waterHabit ? waterHabit.streak : 0;
      progressList.push({ id: 'hydrated', current, goal: 7, unit: 'days streak' });
    }

    if (!unlockedIds.has('consistent')) {
      const habitsDone = habits.filter(h => h.count >= h.goal && h.lastCompletedDate === todayStr).length;
      progressList.push({ id: 'consistent', current: habitsDone, goal: Math.max(1, habits.length), unit: 'rituals today' });
    }

    if (!unlockedIds.has('trusted')) {
      const trustedCount = tasks.filter(t => t.done && t.person && t.person.trim() !== '').length;
      progressList.push({ id: 'trusted', current: trustedCount, goal: 10, unit: 'trusted tasks' });
    }

    if (!unlockedIds.has('unstoppable')) {
      const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
      progressList.push({ id: 'unstoppable', current: maxStreak, goal: 30, unit: 'days max streak' });
    }

    if (!unlockedIds.has('early_bird')) {
      progressList.push({ id: 'early_bird', current: 0, goal: 1, unit: 'task before 9am' });
    }

    if (!unlockedIds.has('night_owl')) {
      progressList.push({ id: 'night_owl', current: 0, goal: 1, unit: 'task after 9pm' });
    }

    if (!unlockedIds.has('perfect_week')) {
      // Find consecutive perfect days
      let currentPerfect = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = getLocalYMD(d);
        const habitsCompletedThatDay = completionLog.filter(l => l.type === 'habit' && getLocalYMD(new Date(l.timestamp)) === ymd);
        
        const allCompleted = habits.length > 0 && habits.every(h => habitsCompletedThatDay.some(l => l.id === h.id));
        if (allCompleted) {
          currentPerfect++;
        } else {
          break; // Streak broken
        }
      }
      progressList.push({ id: 'perfect_week', current: currentPerfect, goal: 7, unit: 'perfect days' });
    }

    if (progressList.length === 0) return null;

    // Find the one closest to completion based on percentage
    const closest = progressList.reduce((prev, curr) => {
      const prevPercent = prev.current / prev.goal;
      const currPercent = curr.current / curr.goal;
      return (currPercent > prevPercent) ? curr : prev;
    });

    const badgeDef = BADGE_DEFINITIONS.find(b => b.id === closest.id);
    return { ...closest, badge: badgeDef };

  } catch (e) {
    console.error("Error calculating badge progress:", e);
    return null;
  }
};
