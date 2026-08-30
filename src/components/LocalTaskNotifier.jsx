import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { saveNotification } from '../db';

export default function LocalTaskNotifier() {
  const notifiedTasksRef = useRef(new Set());
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    const checkTasks = () => {
      try {
        const savedTasks = localStorage.getItem('pinboard_tasks');
        if (!savedTasks) return;
        
        const tasks = JSON.parse(savedTasks);
        
        // Get current local time as YYYY-MM-DDThh:mm
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        
        const currentMinuteStr = `${yyyy}-${mm}-${dd}T${hh}:${mins}`;
        
        tasks.forEach(task => {
          if (!task.done && task.dueDate) {
            // Some due dates might have seconds or 'Z', we only want the minute match
            // The standard HTML datetime-local saves as YYYY-MM-DDThh:mm
            const taskDueMinute = task.dueDate.slice(0, 16);
            
            if (taskDueMinute === currentMinuteStr) {
              const notifKey = `${task.id}_${currentMinuteStr}`;
              
              if (!notifiedTasksRef.current.has(notifKey)) {
                // We haven't notified for this minute yet
                notifiedTasksRef.current.add(notifKey);
                
                // 1. Show in-app toast
                setActiveToast({ title: '⏰ Task Due!', body: task.name });
                setTimeout(() => setActiveToast(null), 8000); // Hide after 8 seconds

                // 2. Add to Notification Bell (IndexedDB)
                const notifRecord = {
                  id: `task_due_${task.id}_${Date.now()}`,
                  title: '⏰ Task Due!',
                  body: task.name,
                  timestamp: Date.now(),
                  read: false,
                  type: 'task',
                  deepLink: '#tasks'
                };
                
                saveNotification(notifRecord).then(() => {
                  window.dispatchEvent(new Event('NEW_NOTIFICATION_LOCAL'));
                });

                // 3. Fire OS-level browser notification if permitted (Outside app)
                if ('Notification' in window && Notification.permission === 'granted') {
                  const title = '⏰ Task Due!';
                  const options = {
                    body: task.name,
                    icon: '/pwa-192x192.png',
                    tag: `task-${task.id}`
                  };

                  // In dev mode, service worker might not be fully ready/controlling.
                  // We check if controller exists, otherwise immediately fallback to native Notification.
                  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(registration => {
                      registration.showNotification(title, options).catch(() => {
                        new Notification(title, options);
                      });
                    }).catch(() => {
                      new Notification(title, options);
                    });
                  } else {
                    new Notification(title, options);
                  }
                }
              }
            }
          }
        });

        // ==========================
        // RITUALS (HABITS) LOGIC
        // ==========================
        const savedRituals = localStorage.getItem('pinboard_rituals_data');
        if (savedRituals) {
          const ritualsData = JSON.parse(savedRituals);
          const habits = ritualsData.habits || [];
          
          habits.forEach(habit => {
            if (habit.paused) return;
            // Skip if already completed today
            if (habit.count >= habit.goal && habit.lastCompletedDate === `${yyyy}-${mm}-${dd}`) return;
            
            if (habit.reminderEnabled && habit.reminderType !== 'interval' && habit.reminderTime) {
              // Day of week check (0=Sunday...)
              if (habit.reminderDays && habit.reminderDays.length > 0) {
                if (!habit.reminderDays.includes(now.getDay())) return;
              }
              
              if (habit.reminderTime === `${hh}:${mins}`) {
                const notifKey = `habit_${habit.id}_${currentMinuteStr}`;
                
                if (!notifiedTasksRef.current.has(notifKey)) {
                  notifiedTasksRef.current.add(notifKey);
                  
                  let title = `⏰ Time for ${habit.name}`;
                  let body = `You haven't completed this yet today.`;
                  const lowerName = habit.name.toLowerCase();
                  if (lowerName.includes('wake up') || lowerName.includes('wakeup')) {
                    title = '⏰ Time to wakeup!';
                    body = 'Rise and shine, it is time to start your day!';
                  }
                  
                  // 1. Show in-app toast
                  setActiveToast({ title, body });
                  setTimeout(() => setActiveToast(null), 8000);

                  // 2. Add to Notification Bell
                  const notifRecord = {
                    id: `habit_due_${habit.id}_${Date.now()}`,
                    title: title,
                    body: body,
                    timestamp: Date.now(),
                    read: false,
                    type: 'habit',
                    deepLink: '#rituals'
                  };
                  saveNotification(notifRecord).then(() => {
                    window.dispatchEvent(new Event('NEW_NOTIFICATION_LOCAL'));
                  });

                  // 3. Fire OS-level browser notification
                  if ('Notification' in window && Notification.permission === 'granted') {
                    const options = {
                      body: body,
                      icon: '/pwa-192x192.png',
                      tag: `habit-${habit.id}`
                    };

                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                      navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, options).catch(() => {
                          new Notification(title, options);
                        });
                      }).catch(() => {
                        new Notification(title, options);
                      });
                    } else {
                      new Notification(title, options);
                    }
                  }
                }
              }
            }
          });
        }
      } catch (error) {
        console.error("LocalTaskNotifier error:", error);
      }
    };

    // Check immediately on mount, then every 10 seconds for tighter precision
    checkTasks();
    const interval = setInterval(checkTasks, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {activeToast && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-400 max-w-[90vw]"
        >
          <span className="text-2xl animate-bounce">⏰</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">{activeToast.title || 'Notification'}</span>
            <span className="text-sm font-semibold">{activeToast.body || activeToast.name}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
