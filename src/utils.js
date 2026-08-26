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

export const syncStateToBackend = async () => {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription && Notification.permission === 'granted') {
      try {
        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (publicVapidKey) {
          const padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
          const base64 = (publicVapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: outputArray
          });
        }
      } catch (subErr) {
        console.error('Auto-subscribe failed:', subErr);
      }
    }
    
    if (!subscription) return; // No push subscription, no need to sync state for notifications

    let habits = [];
    try {
      const savedRitualsStr = localStorage.getItem('pinboard_rituals_data');
      if (savedRitualsStr) {
        habits = JSON.parse(savedRitualsStr).habits || [];
      }
    } catch(e) {}

    let tasks = [];
    try {
      const savedTasks = localStorage.getItem('pinboard_tasks');
      if (savedTasks) {
        tasks = JSON.parse(savedTasks);
      }
    } catch(e) {}

    const dailyReviewTime = localStorage.getItem('pinboard_daily_review_time') || '20:00';
    const timezoneOffset = new Date().getTimezoneOffset();

    await fetch('/api/sync-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, habits, tasks, dailyReviewTime, timezoneOffset })
    });
  } catch (e) {
    console.error('Error syncing state to backend', e);
  }
};
