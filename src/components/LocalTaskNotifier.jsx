import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { saveNotification } from "../db";
import { playNotificationSound } from "../utils/audioUtils";

export default function LocalTaskNotifier() {
  const notifiedTasksRef = useRef(new Set());
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    // Listen for service worker background notification messages
    const handleSwMessage = (event) => {
      if (event.data?.type === "NEW_NOTIFICATION") {
        playNotificationSound();
      }
    };
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleSwMessage);
    }

    const dispatchNotification = ({
      title,
      body,
      iconEmoji = "⏰",
      type = "habit",
      deepLink = "#rituals",
      tag,
    }) => {
      // 0. Play sweet crystal "cling" chime
      playNotificationSound();

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
        deepLink,
      };

      saveNotification(notifRecord).then(() => {
        window.dispatchEvent(new Event("NEW_NOTIFICATION_LOCAL"));
      });

      // 3. Fire OS-level browser notification if permitted (Outside app)
      if ("Notification" in window && Notification.permission === "granted") {
        const options = {
          body,
          icon: "/logo.jpg",
          badge: "/logo.jpg",
          tag,
          vibrate: [200, 100, 200],
          silent: false,
          renotify: true,
        };

        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification(title, options).catch(() => {
                new Notification(title, options);
              });
            })
            .catch(() => {
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
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mins = String(now.getMinutes()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const currentMinuteStr = `${yyyy}-${mm}-${dd}T${hh}:${mins}`;

        // ==========================
        // TASKS DUE DATE LOGIC
        // ==========================
        const savedTasks = localStorage.getItem("pinboard_tasks");
        if (savedTasks) {
          const tasks = JSON.parse(savedTasks);
          tasks.forEach((task) => {
            if (!task.done && task.dueDate) {
              const taskDueMinute = task.dueDate.slice(0, 16);

              if (taskDueMinute === currentMinuteStr) {
                const notifKey = `task_${task.id}_${currentMinuteStr}`;

                if (!notifiedTasksRef.current.has(notifKey)) {
                  notifiedTasksRef.current.add(notifKey);
                  dispatchNotification({
                    title: "⏰ Task Due!",
                    body: task.name,
                    iconEmoji: "⏰",
                    type: "task",
                    deepLink: "#tasks",
                    tag: `task-${task.id}`,
                  });
                }
              }
            }
          });
        }

        // ==========================
        // RITUALS (HABITS) LOGIC
        // ==========================
        const savedRituals = localStorage.getItem("pinboard_rituals_data");
        if (savedRituals) {
          const ritualsData = JSON.parse(savedRituals);
          const habits = ritualsData.habits || [];

          habits.forEach((habit) => {
            if (habit.paused) return;
            // Skip if already completed today
            if (
              habit.count >= habit.goal &&
              habit.lastCompletedDate === todayStr
            )
              return;

            if (habit.reminderEnabled) {
              // 1. Time Interval
              if (habit.reminderType === "interval") {
                const intervalVal = habit.reminderInterval || 2;
                const intervalUnit = habit.reminderIntervalUnit || "hours";
                const intervalMs =
                  intervalUnit === "minutes"
                    ? intervalVal * 60 * 1000
                    : intervalVal * 60 * 60 * 1000;

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
                      body: `Quick reminder for your ${habit.name} ritual! (${habit.count}/${habit.goal} ${habit.unit || ""})`.trim(),
                      iconEmoji: "🔄",
                      type: "habit",
                      deepLink: "#rituals",
                      tag: `habit-${habit.id}`,
                    });
                    localStorage.setItem(lastSentKey, now.getTime().toString());
                  }
                }
              }
              // 2. Goal / Progress Based
              else if (habit.reminderType === "goal_progress") {
                const checkInTimes =
                  Array.isArray(habit.checkInTimes) &&
                  habit.checkInTimes.length > 0
                    ? habit.checkInTimes
                    : habit.reminderTime
                      ? [habit.reminderTime]
                      : ["12:00", "18:00"];

                for (const checkInTime of checkInTimes) {
                  if (checkInTime === `${hh}:${mins}`) {
                    const notifKey = `habit_gp_${habit.id}_${checkInTime}_${todayStr}`;
                    if (!notifiedTasksRef.current.has(notifKey)) {
                      notifiedTasksRef.current.add(notifKey);

                      const currentValue = habit.count || 0;
                      const targetValue = habit.goal || 1;
                      const progress =
                        targetValue > 0 ? currentValue / targetValue : 0;
                      const threshold =
                        habit.alertThreshold !== undefined
                          ? Number(habit.alertThreshold)
                          : 0.5;

                      if (progress < threshold) {
                        const remainingValue = Math.max(
                          0,
                          targetValue - currentValue,
                        );
                        const unitStr = habit.unit ? ` ${habit.unit}` : "";
                        const remainingStr = `${remainingValue.toLocaleString()}${unitStr}`;
                        const percentStr = `${Math.round(progress * 100)}%`;
                        const template =
                          habit.messageTemplate ||
                          "You're {remaining} away from your goal. Let's get moving! 🚶";
                        const body = template
                          .replace(/{remaining}/g, remainingStr)
                          .replace(/{percent}/g, percentStr);
                        const title = `🎯 ${habit.name} check-in`;

                        dispatchNotification({
                          title,
                          body,
                          iconEmoji: "🎯",
                          type: "habit",
                          deepLink: "#rituals",
                          tag: `habit-${habit.id}`,
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
                    if (
                      lowerName.includes("wake up") ||
                      lowerName.includes("wakeup")
                    ) {
                      title = "⏰ Time to wakeup!";
                      body = "Rise and shine, it is time to start your day!";
                    }

                    dispatchNotification({
                      title,
                      body,
                      iconEmoji: "⏰",
                      type: "habit",
                      deepLink: "#rituals",
                      tag: `habit-${habit.id}`,
                    });
                  }
                }
              }
            }
          });
        }

        // ==========================
        // DAILY REVIEW & GOALS PACE LOGIC
        // ==========================
        const dailyReviewTime =
          localStorage.getItem("pinboard_daily_review_time") || "20:00";
        if (dailyReviewTime === `${hh}:${mins}`) {
          // 1. Task Digest
          if (savedTasks) {
            const tasks = JSON.parse(savedTasks);
            const pendingTasks = tasks.filter((t) => !t.done);
            if (pendingTasks.length > 0) {
              const notifKey = `task_digest_${todayStr}`;
              if (!notifiedTasksRef.current.has(notifKey)) {
                notifiedTasksRef.current.add(notifKey);

                let bodyStr = pendingTasks
                  .slice(0, 3)
                  .map((t) => `• ${t.name}`)
                  .join("\n");
                if (pendingTasks.length > 3) {
                  bodyStr += `\n...and ${pendingTasks.length - 3} more.`;
                }

                dispatchNotification({
                  title: "📋 Daily Task Review",
                  body: bodyStr,
                  iconEmoji: "📋",
                  type: "task",
                  deepLink: "#tasks",
                  tag: "task-digest",
                });
              }
            }
          }

          // 2. Monthly Goals Pace
          const savedGoals = localStorage.getItem("pinboard_goals");
          if (savedGoals) {
            const monthlyGoals = JSON.parse(savedGoals);
            if (Array.isArray(monthlyGoals) && monthlyGoals.length > 0) {
              const daysInMonth = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
              ).getDate();
              const daysPassed = now.getDate();
              const daysRemaining = daysInMonth - daysPassed;

              monthlyGoals.forEach((goal) => {
                if (!goal.id || !goal.target || goal.isCompleted) return;
                const progress = goal.progress || 0;
                const target = goal.target;
                const progressPct = target > 0 ? progress / target : 0;
                const expectedPct =
                  daysInMonth > 0 ? daysPassed / daysInMonth : 1;
                const pace =
                  expectedPct > 0
                    ? progressPct / expectedPct
                    : progressPct > 0
                      ? 999
                      : 0;

                const notifKey = `goal_pace_${goal.id}_${todayStr}`;
                if (!notifiedTasksRef.current.has(notifKey)) {
                  notifiedTasksRef.current.add(notifKey);

                  let title, body;
                  if (pace < 0.6) {
                    title = `🔴 ${goal.name} is falling behind`;
                    body = `Only ${progress}/${target} ${goal.unit || ""} logged. ${daysRemaining} days left — let's pick it up!`;
                  } else if (pace < 0.9) {
                    title = `⚠️ ${goal.name} needs attention`;
                    body = `A little behind pace — ${progress}/${target} ${goal.unit || ""}. ${daysRemaining} days remaining.`;
                  }

                  if (title && body) {
                    dispatchNotification({
                      title,
                      body,
                      iconEmoji: "🎯",
                      type: "goal",
                      deepLink: "#goals",
                      tag: `goal-${goal.id}`,
                    });
                  }
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("LocalTaskNotifier error:", error);
      }
    };

    // Check immediately on mount, then every 10 seconds for tight precision
    checkTasks();
    const interval = setInterval(checkTasks, 10000);

    return () => {
      clearInterval(interval);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleSwMessage);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {activeToast && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          drag="y"
          dragConstraints={{ top: -100, bottom: 0 }}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.y < -50 || velocity.y < -500) {
              setActiveToast(null);
            }
          }}
          className="toast-glass fixed top-4 left-3 right-3 z-[150] text-[var(--text-primary)] p-3.5 rounded-[1.25rem] shadow-2xl border border-[var(--border)] flex flex-col gap-2 cursor-grab active:cursor-grabbing max-w-md mx-auto"
        >
          {/* Header Row */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 shadow-sm border border-[var(--border)] flex items-center justify-center bg-[var(--bg-card)]">
              <img src="/logo.jpg" alt="Pinboard" className="w-full h-full object-cover" />
            </div>
            <span className="text-[12px] font-bold text-[var(--text-primary)] tracking-wide">
              Pinboard
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] shrink-0 font-medium">&bull; now</span>
            
            <div className="ml-auto flex items-center gap-2 text-[var(--text-secondary)]">
              <svg className="w-3.5 h-3.5 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/></svg>
              <div className="w-5 h-5 rounded-full bg-[var(--bg-card)]/70 border border-[var(--border)] flex items-center justify-center">
                <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          
          {/* Content Row */}
          <div className="flex flex-col px-1 pb-1">
            <div className="text-[14px] font-bold text-[var(--text-primary)] leading-snug">
              {activeToast.title || "Notification"}
            </div>
            <div className="text-[13px] text-[var(--text-secondary)] leading-snug line-clamp-2 mt-0.5">
              {activeToast.body}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
