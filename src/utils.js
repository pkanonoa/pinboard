export const getLocalYMD = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const LEVELS = [
  { max: 100, name: 'Beginner' },
  { max: 500, name: 'Getting There' },
  { max: 1000, name: 'On a Roll' },
  { max: 3000, name: 'Habit Hero' },
  { max: Infinity, name: 'Unstoppable' }
];

export const getUserStats = () => {
  let points = 0;
  try {
    const logStr = localStorage.getItem('pinboard_completion_log');
    if (logStr) {
      const log = JSON.parse(logStr);
      log.forEach(entry => {
        if (entry.type === 'task') points += 10;
        if (entry.type === 'habit') points += 5;
      });
    }

    const badgesStr = localStorage.getItem('pinboard_earned_badges');
    if (badgesStr) {
      const loadedBadges = JSON.parse(badgesStr);
      points += (loadedBadges.length * 50);
    }
  } catch (e) {
    console.error('Failed to calculate stats', e);
  }

  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  let previousMax = 0;

  for (let i = 0; i < LEVELS.length; i++) {
    if (points <= LEVELS[i].max) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      previousMax = i > 0 ? LEVELS[i - 1].max : 0;
      break;
    }
  }
  
  if (points > LEVELS[LEVELS.length - 2].max) {
    currentLevel = LEVELS[LEVELS.length - 1];
    nextLevel = null;
    previousMax = LEVELS[LEVELS.length - 2].max;
  }

  return { points, currentLevel, nextLevel, previousMax };
};

export const logCompletion = (type, id) => {
  try {
    const logStr = localStorage.getItem('pinboard_completion_log');
    const log = logStr ? JSON.parse(logStr) : [];
    log.push({ type, id, timestamp: new Date().toISOString() });
    localStorage.setItem('pinboard_completion_log', JSON.stringify(log));
  } catch (e) {
    console.error('Failed to log completion', e);
  }
};

export const removeCompletionToday = (type, id) => {
  try {
    const logStr = localStorage.getItem('pinboard_completion_log');
    if (!logStr) return;
    let log = JSON.parse(logStr);
    
    const todayYMD = getLocalYMD();
    
    // Find the most recent entry for this type and id today, and remove it
    // Or just remove all for this id today.
    log = log.filter(entry => {
      if (entry.type === type && entry.id === id) {
        const entryDate = new Date(entry.timestamp);
        const entryYMD = getLocalYMD(entryDate);
        if (entryYMD === todayYMD) {
          return false; // remove
        }
      }
      return true;
    });
    
    localStorage.setItem('pinboard_completion_log', JSON.stringify(log));
  } catch (e) {
    console.error('Failed to remove completion log', e);
  }
};
