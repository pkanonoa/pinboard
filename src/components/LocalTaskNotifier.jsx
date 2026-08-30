import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { saveNotification } from '../db';

export default function LocalTaskNotifier() {
  const notifiedTasksRef = useRef(new Set());
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    const dispatchNotification = ({ title, body, iconEmoji = '⏰', type = 'habit', deepLink = '#rituals', tag }) => {
      // 1. Show in-app toast
      setActiveToast({ title, body, icon: iconEmoji });
      setTimeout(() => setActiveToast(null), 8000); // Hide after 8 seconds

      // 2. Add to Notification Bell (IndexedDB)
      const notifRecord = {
        id: `${type}_${tag}_${Date.now()}`,
        title,
        body,
        timestamp: Date.now(),
        read: false,
        type,
        deepLink
      };

      saveNotification(notifRecord).then(() => {
        window.dispatchEvent(new Event('NEW_NOTIFICATION_LOCAL'));
      });

      // 3. Fire OS-level browser notification if permitted (Outside app)
      if ('Notification' in window && Notification.permission === 'granted') {
        const options = {
          body,
          icon: '/pwa-192x192.png',
          tag
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
          try {
            new Notification(title, options);
          } catch (e) {
            console.error("Native notification error:", e);
          }
        }
      }
    };

    const checkTasks = () => {
      try {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const currentMinuteStr = `${yyyy}-${mm}-${dd}T${hh}:${mins}`;

        // ==========================
        // TASKS DUE DATE LOGIC
        // ==========================
        const savedTasks = localStorage.getItem('pinboard_tasks');
        if (savedTasks) {
          const tasks = JSON.parse(savedTasks);
          tasks.forEach(task => {
            if (!task.done && task.dueDate) {
              const taskDueMinute = task.dueDate.slice(0, 16);

              if (taskDueMinute === currentMinuteStr) {
                const notifKey = `task_${task.id}_${currentMinuteStr}`;

                if (!notifiedTasksRef.current.has(notifKey)) {
                  notifiedTasksRef.current.add(notifKey);
                  dispatchNotification({
                    title: '⏰ Task Due!',
                    body: task.name,
                    iconEmoji: '⏰',
                    type: 'task',
                    deepLink: '#tasks',
                    tag: `task-${task.id}`
                  });
                }
              }
            }
          });
        }

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
            if (habit.count >= habit.goal && habit.lastCompletedDate === todayStr) return;

            if (habit.reminderEnabled) {
              // 1. Time Interval
              if (habit.reminderType === 'interval') {
                const intervalVal = habit.reminderInterval || 2;
                const intervalUnit = habit.reminderIntervalUnit || 'hours';
                const intervalMs = intervalUnit === 'minutes' ? intervalVal * 60 * 1000 : intervalVal * 60 * 60 * 1000;

                const currentHour = now.getHours();
                // Alert during waking hours (8am to 10pm)
                if (currentHour >= 8 && currentHour < 22) {
                  const lastSentKey = `last_local_sent_ritual_${habit.id}`;
                  const lastSentStr = localStorage.getItem(lastSentKey);
                  const lastSent = lastSentStr ? parseInt(lastSentStr, 10) : 0;

                  if (!lastSentStr) {
                    // Initialize on first check so it counts down properly
                    localStorage.setItem(lastSentKey, now.getTime().toString());
                  } else if (now.getTime() - lastSent >= intervalMs) {
                    dispatchNotification({
                      title: `🔄 Routine: ${habit.name}`,
                      body: `Quick reminder for your ${habit.name} ritual! (${habit.count}/${habit.goal} ${habit.unit || ''})`.trim(),
                      iconEmoji: '🔄',
                      type: 'habit',
                      deepLink: '#rituals',
                      tag: `habit-${habit.id}`
                    });
                    localStorage.setItem(lastSentKey, now.getTime().toString());
                  }
                }
              }
              // 2. Goal / Progress Based
              else if (habit.reminderType === 'goal_progress') {
                const checkInTimes = Array.isArray(habit.checkInTimes) && habit.checkInTimes.length > 0
                  ? habit.checkInTimes
                  : (habit.reminderTime ? [habit.reminderTime] : ['12:00', '18:00']);

                for (const checkInTime of checkInTimes) {
                  if (checkInTime === `${hh}:${mins}`) {
                    const notifKey = `habit_gp_${habit.id}_${checkInTime}_${todayStr}`;
                    if (!notifiedTasksRef.current.has(notifKey)) {
                      notifiedTasksRef.current.add(notifKey);

                      const currentValue = habit.count || 0;
                      const targetValue = habit.goal || 1;
                      const progress = targetValue > 0 ? currentValue / targetValue : 0;
                      const threshold = habit.alertThreshold !== undefined ? Number(habit.alertThreshold) : 0.5;

                      if (progress < threshold) {
                        const remainingValue = Math.max(0, targetValue - currentValue);
                        const unitStr = habit.unit ? ` ${habit.unit}` : '';
                        const remainingStr = `${remainingValue.toLocaleString()}${unitStr}`;
                        const percentStr = `${Math.round(progress * 100)}%`;
                        const template = habit.messageTemplate || "You're {remaining} away from your goal. Let's get moving! 🚶";
                        const body = template.replace(/{remaining}/g, remainingStr).replace(/{percent}/g, percentStr);
                        const title = `🎯 ${habit.name} check-in`;

                        dispatchNotification({
                          title,
                          body,
                          iconEmoji: '🎯',
                          type: 'habit',
                          deepLink: '#rituals',
                          tag: `habit-${habit.id}`
                        });
                      }
                    }
                  }
                }
              }
              // 3. Fixed Time
              else if (habit.reminderTime) {
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

                    dispatchNotification({
                      title,
                      body,
                      iconEmoji: '⏰',
                      type: 'habit',
                      deepLink: '#rituals',
                      tag: `habit-${habit.id}`
                    });
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

    // Check immediately on mount, then every 10 seconds for tight precision
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
          <span className="text-2xl animate-bounce">{activeToast.icon || '⏰'}</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">{activeToast.title || 'Notification'}</span>
            <span className="text-sm font-semibold">{activeToast.body}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
