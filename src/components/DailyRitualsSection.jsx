import React, { useState, useEffect } from "react";
import {
  logCompletion,
  removeCompletionToday,
  syncStateToBackend,
  syncMonthlyGoalProgress,
} from "../utils";
import { checkAndUnlockBadges } from "../utils/badgeUtils";
import confetti from "canvas-confetti";
import neoImg from "../assets/neo.png";

const DEFAULT_HABITS = [
  {
    id: "h1",
    name: "Drink Water",
    goal: 8,
    unit: "glasses",
    count: 0,
    streak: 0,
    lastCompletedDate: null,
    reminderEnabled: false,
    reminderTime: "09:00",
    type: "countable",
  },
  {
    id: "h2",
    name: "Exercise",
    goal: 1,
    unit: "session",
    count: 0,
    streak: 0,
    lastCompletedDate: null,
    reminderEnabled: false,
    reminderTime: "09:00",
    type: "one_time",
  },
  {
    id: "h3",
    name: "Sleep Early",
    count: 0,
    streak: 0,
    lastCompletedDate: null,
    reminderEnabled: false,
    reminderTime: "22:00",
    type: "time_locked",
    targetTime: "22:00",
    graceWindow: 30,
  },
  {
    id: "h4",
    name: "Wake up Early",
    count: 0,
    streak: 0,
    lastCompletedDate: null,
    reminderEnabled: true,
    reminderTime: "05:30",
    type: "time_locked",
    targetTime: "05:30",
    graceWindow: 30,
  },
];

const getLocalYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getYesterdayYMD = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatTime12h = (time24) => {
  if (!time24) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12; // Convert 0 to 12
  return `${hour}:${minute} ${ampm}`;
};

export default function DailyRitualsSection() {
  const [habits, setHabits] = useState([]);
  const [lastResetDate, setLastResetDate] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: "",
    goal: "",
    unit: "",
    type: "countable",
    targetTime: "09:00",
    graceWindow: "30",
  });

  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editHabitData, setEditHabitData] = useState({
    name: "",
    goal: "",
    unit: "",
    type: "countable",
    targetTime: "09:00",
    graceWindow: "30",
    reminderEnabled: false,
    reminderType: "fixed",
    reminderTime: "09:00",
    reminderInterval: 2,
    reminderIntervalUnit: "hours",
    reminderDays: [],
    checkInTimes: ["12:00", "18:00"],
    alertThreshold: 0.5,
    messageTemplate:
      "You're {remaining} away from your goal. Let's get moving! 🚶",
  });
  const [expandedHabitId, setExpandedHabitId] = useState(null);
  const [bigNumberInputs, setBigNumberInputs] = useState({});
  const [now, setNow] = useState(new Date());

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [pauseModalId, setPauseModalId] = useState(null);
  const [longPressTimer, setLongPressTimer] = useState(null);

  const getDefaultResumeDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getMinResumeDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getMaxResumeDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const [resumeDateInput, setResumeDateInput] = useState(
    getDefaultResumeDate(),
  );

  const getWindowBounds = (targetTimeStr, graceMins, baseDate) => {
    const [th, tm] = targetTimeStr.split(":").map(Number);
    const targetDate = new Date(baseDate);
    targetDate.setHours(th, tm, 0, 0);
    const start = new Date(targetDate.getTime() - graceMins * 60000);
    const end = new Date(targetDate.getTime() + graceMins * 60000);
    return { start, end };
  };

  const startLongPress = (habitId) => {
    const timer = setTimeout(() => {
      setActiveMenuId(habitId);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
    setLongPressTimer(timer);
  };

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const getTimeLockedStatus = (habit, currentNow) => {
    if (!habit.targetTime) return "open";
    const { start, end } = getWindowBounds(
      habit.targetTime,
      habit.graceWindow || 30,
      currentNow,
    );
    if (currentNow < start) return "before";
    if (currentNow > end) return "missed";
    return "open";
  };

  const loadAndResetHabits = () => {
    const savedDataStr = localStorage.getItem("pinboard_rituals_data");
    let loadedHabits = DEFAULT_HABITS;
    let loadedResetDate = "";

    if (savedDataStr) {
      try {
        const savedData = JSON.parse(savedDataStr);
        loadedHabits = savedData.habits || DEFAULT_HABITS;
        loadedResetDate = savedData.lastResetDate || "";
      } catch (e) {
        console.error("Failed to parse rituals data", e);
      }
    }

    const todayStr = getLocalYMD();
    const yesterdayStr = getYesterdayYMD();

    if (loadedResetDate !== todayStr) {
      loadedHabits = loadedHabits.map((habit) => {
        let newStreak = habit.streak;
        if (
          habit.lastCompletedDate !== yesterdayStr &&
          habit.lastCompletedDate !== todayStr
        ) {
          newStreak = 0;
        }
        return {
          ...habit,
          count: 0,
          streak: newStreak,
          failedDate: null,
          lastCompletedDate:
            habit.lastCompletedDate === todayStr ? todayStr : null,
        };
      });
      loadedResetDate = todayStr;
    }

    // Check if there is a pending edit request (e.g. from a Smart Suggestion action)
    const pendingEditId = sessionStorage.getItem("pinboard_pending_edit_habit");
    if (pendingEditId) {
      sessionStorage.removeItem("pinboard_pending_edit_habit");
      const habit = loadedHabits.find((h) => h.id === pendingEditId);
      if (habit) {
        setEditingHabitId(habit.id);
        setEditHabitData({
          name: habit.name,
          type: habit.type || "countable",
          goal: habit.goal || "",
          unit: habit.unit || "",
          targetTime: habit.targetTime || "09:00",
          graceWindow: habit.graceWindow || "30",
          reminderEnabled: habit.reminderEnabled || false,
          reminderType: habit.reminderType || "fixed",
          reminderTime: habit.reminderTime || "09:00",
          reminderInterval: habit.reminderInterval || 2,
          reminderIntervalUnit: habit.reminderIntervalUnit || "hours",
          reminderDays: habit.reminderDays || [],
        });
        setExpandedHabitId(habit.id);
      }
    }

    // Check if there is a pending pause request (e.g. from "Learn about pausing" suggestion)
    const pendingPauseId = sessionStorage.getItem(
      "pinboard_pending_pause_habit",
    );
    if (pendingPauseId) {
      sessionStorage.removeItem("pinboard_pending_pause_habit");
      const habit = loadedHabits.find((h) => h.id === pendingPauseId);
      if (habit) {
        setPauseModalId(habit.id);
      }
    }

    setHabits(loadedHabits);
    setLastResetDate(loadedResetDate);
  };

  // Load from local storage and handle daily reset
  useEffect(() => {
    loadAndResetHabits();

    window.addEventListener("pinboard_rituals_updated", loadAndResetHabits);

    // Track last reset date so the interval can detect day rollover
    let lastKnownDate = getLocalYMD();

    // Setup 1-minute ticker for time-locked habits + midnight reset
    const interval = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);

      // ── Midnight daily reset ──────────────────────────────────────────
      const currentDateStr = getLocalYMD();
      if (currentDateStr !== lastKnownDate) {
        lastKnownDate = currentDateStr;
        const yesterdayStr = getYesterdayYMD();
        setHabits((current) =>
          current.map((habit) => {
            let newStreak = habit.streak;
            if (
              habit.lastCompletedDate !== yesterdayStr &&
              habit.lastCompletedDate !== currentDateStr
            ) {
              newStreak = 0;
            }
            return {
              ...habit,
              count: 0,
              streak: newStreak,
              failedDate: null,
              lastCompletedDate:
                habit.lastCompletedDate === currentDateStr
                  ? currentDateStr
                  : null,
            };
          }),
        );
        setLastResetDate(currentDateStr);
        return; // Skip the rest of this tick
      }
      // ─────────────────────────────────────────────────────────────────

      setHabits((current) => {
        let changed = false;
        let unpausedCount = 0;
        let unpausedHabitIds = [];
        const next = current.map((h) => {
          if (h.paused && h.resumeDate) {
            const todayStr = getLocalYMD();
            if (todayStr >= h.resumeDate) {
              changed = true;
              unpausedCount++;
              unpausedHabitIds.push(h.id);
              return { ...h, paused: false, pausedAt: null, resumeDate: null };
            }
          }
          if (h.type === "time_locked" && !h.paused) {
            const status = getTimeLockedStatus(h, currentNow);
            if (
              status === "missed" &&
              h.lastCompletedDate !== todayStr &&
              h.failedDate !== todayStr
            ) {
              changed = true;
              return { ...h, streak: 0, failedDate: todayStr };
            }
          }
          return h;
        });
        if (unpausedCount > 0) {
          window.dispatchEvent(new CustomEvent("neo-bounce"));

          try {
            const savedGoals = localStorage.getItem("pinboard_goals");
            if (savedGoals) {
              const goals = JSON.parse(savedGoals);
              let goalsChanged = false;
              const updatedGoals = goals.map((g) => {
                const isLinked = unpausedHabitIds.some((id) =>
                  g.linkedHabitIds?.includes(id),
                );
                if (isLinked && g.paused) {
                  goalsChanged = true;
                  const now = Date.now();
                  const pauseStart = g.pausedAt
                    ? new Date(g.pausedAt).getTime()
                    : now;
                  return {
                    ...g,
                    paused: false,
                    pausedAt: null,
                    totalPausedMs:
                      (g.totalPausedMs || 0) + Math.max(0, now - pauseStart),
                  };
                }
                return g;
              });
              if (goalsChanged) {
                localStorage.setItem(
                  "pinboard_goals",
                  JSON.stringify(updatedGoals),
                );
                window.dispatchEvent(new Event("pinboard_goals_updated"));
              }
            }
          } catch (e) {}
        }
        return changed ? next : current;
      });
    }, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        "pinboard_rituals_updated",
        loadAndResetHabits,
      );
    };
  }, []);

  // Global click listener to close menu
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Save to local storage whenever habits or reset date changes
  useEffect(() => {
    if (lastResetDate) {
      const dataToSave = {
        habits,
        lastResetDate,
      };
      localStorage.setItem("pinboard_rituals_data", JSON.stringify(dataToSave));
      // Check badges after a state change is saved
      checkAndUnlockBadges();
      syncStateToBackend();
    }
  }, [habits, lastResetDate]);

  const handleTap = (id) => {
    const todayStr = getLocalYMD();
    const targetHabit = habits.find((h) => h.id === id);
    if (!targetHabit || targetHabit.paused) return;

    // Call sync exactly once (avoiding React Strict Mode double-invocation of state updaters)
    syncMonthlyGoalProgress(id, 1);

    window.dispatchEvent(new CustomEvent("neo-bounce"));

    setHabits((currentHabits) =>
      currentHabits.map((habit) => {
        if (habit.id === id) {
          const newCount = habit.count + 1;
          let newStreak = habit.streak;
          let newLastCompletedDate = habit.lastCompletedDate;

          if (newCount === habit.goal && habit.lastCompletedDate !== todayStr) {
            newStreak += 1;
            newLastCompletedDate = todayStr;
            logCompletion("habit", id);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            window.dispatchEvent(new CustomEvent("neo_celebration"));
          }

          return {
            ...habit,
            count: newCount,
            streak: newStreak,
            lastCompletedDate: newLastCompletedDate,
          };
        }
        return habit;
      }),
    );
  };

  const handleUndo = (id) => {
    const todayStr = getLocalYMD();
    const targetHabit = habits.find((h) => h.id === id);
    if (!targetHabit || targetHabit.count === 0 || targetHabit.paused) return;

    if (targetHabit.type === "big_number") {
      syncMonthlyGoalProgress(id, -targetHabit.count);
    } else {
      syncMonthlyGoalProgress(id, -1);
    }

    setHabits((currentHabits) =>
      currentHabits.map((habit) => {
        if (habit.id === id && habit.count > 0) {
          let newCount = habit.count - 1;
          if (
            habit.type === "one_time" ||
            habit.type === "time_locked" ||
            habit.type === "big_number"
          ) {
            newCount = 0; // completely undo
          }

          let newStreak = habit.streak;
          let newLastCompletedDate = habit.lastCompletedDate;

          if (
            habit.count >= habit.goal &&
            newCount < habit.goal &&
            habit.lastCompletedDate === todayStr
          ) {
            newStreak = Math.max(0, newStreak - 1);
            newLastCompletedDate = "";
            removeCompletionToday("habit", id);
          }

          return {
            ...habit,
            count: newCount,
            streak: newStreak,
            lastCompletedDate: newLastCompletedDate,
          };
        }
        return habit;
      }),
    );
  };

  const handleResetHabit = (id) => {
    const todayStr = getLocalYMD();
    const targetHabit = habits.find((h) => h.id === id);
    if (!targetHabit || targetHabit.count === 0 || targetHabit.paused) return;

    // Deduct today's full logged count from linked goals
    syncMonthlyGoalProgress(id, -targetHabit.count);

    setHabits((currentHabits) =>
      currentHabits.map((habit) => {
        if (habit.id === id) {
          let newStreak = habit.streak;
          let newLastCompletedDate = habit.lastCompletedDate;

          if (
            habit.count >= habit.goal &&
            habit.lastCompletedDate === todayStr
          ) {
            newStreak = Math.max(0, newStreak - 1);
            newLastCompletedDate = "";
            removeCompletionToday("habit", id);
          }

          return {
            ...habit,
            count: 0,
            streak: newStreak,
            lastCompletedDate: newLastCompletedDate,
          };
        }
        return habit;
      }),
    );
    setBigNumberInputs((prev) => ({ ...prev, [id]: undefined }));
  };

  const handleLogBigNumber = (id, e) => {
    e.preventDefault();
    const val = parseInt(bigNumberInputs[id], 10);
    if (isNaN(val) || val <= 0) return;

    const targetHabit = habits.find((h) => h.id === id);
    if (!targetHabit || targetHabit.paused) return;

    // Synchronize addition with linked goals
    syncMonthlyGoalProgress(id, val);

    const todayStr = getLocalYMD();
    setHabits((currentHabits) =>
      currentHabits.map((habit) => {
        if (habit.id === id) {
          const newCount = habit.count + val;
          let newStreak = habit.streak;
          let newLastCompletedDate = habit.lastCompletedDate;

          if (newCount >= habit.goal && habit.lastCompletedDate !== todayStr) {
            newStreak += 1;
            newLastCompletedDate = todayStr;
            logCompletion("habit", id);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            window.dispatchEvent(new CustomEvent("neo_celebration"));
          } else if (
            habit.count >= habit.goal &&
            newCount < habit.goal &&
            habit.lastCompletedDate === todayStr
          ) {
            newStreak = Math.max(0, newStreak - 1);
            newLastCompletedDate = "";
            removeCompletionToday("habit", id);
          }

          return {
            ...habit,
            count: newCount,
            streak: newStreak,
            lastCompletedDate: newLastCompletedDate,
          };
        }
        return habit;
      }),
    );
    setBigNumberInputs((prev) => ({ ...prev, [id]: undefined }));
  };

  const handlePauseSubmit = () => {
    if (!pauseModalId || !resumeDateInput) return;

    setHabits((currentHabits) => {
      const newHabits = currentHabits.map((habit) => {
        if (habit.id === pauseModalId) {
          return {
            ...habit,
            paused: true,
            pausedAt: new Date().toISOString(),
            resumeDate: resumeDateInput,
          };
        }
        return habit;
      });
      return newHabits;
    });

    try {
      const savedGoals = localStorage.getItem("pinboard_goals");
      if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        let changed = false;
        const updatedGoals = goals.map((g) => {
          if (g.linkedHabitIds?.includes(pauseModalId) && !g.paused) {
            changed = true;
            return {
              ...g,
              paused: true,
              pausedAt: new Date().toISOString(),
            };
          }
          return g;
        });
        if (changed) {
          localStorage.setItem("pinboard_goals", JSON.stringify(updatedGoals));
          window.dispatchEvent(new Event("pinboard_goals_updated"));
        }
      }
    } catch (e) {}

    setPauseModalId(null);
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newHabit.name) return;
    if (
      (newHabit.type === "countable" || newHabit.type === "big_number") &&
      (!newHabit.goal || !newHabit.unit)
    )
      return;

    const habit = {
      id: `custom_${Date.now()}`,
      name: newHabit.name,
      type: newHabit.type,
      count: 0,
      streak: 0,
      lastCompletedDate: null,
      failedDate: null,
      reminderEnabled: false,
      reminderType: "fixed",
      reminderTime: "09:00",
      reminderInterval: 2,
      reminderIntervalUnit: "hours",
    };

    if (newHabit.type === "countable" || newHabit.type === "big_number") {
      habit.goal = parseInt(newHabit.goal, 10);
      habit.unit = newHabit.unit;
    } else if (newHabit.type === "time_locked") {
      habit.targetTime = newHabit.targetTime;
      habit.graceWindow = parseInt(newHabit.graceWindow, 10) || 30;
      habit.goal = 1;
    } else if (newHabit.type === "one_time") {
      habit.goal = 1;
    }

    setHabits([...habits, habit]);
    setNewHabit({
      name: "",
      goal: "",
      unit: "",
      type: "countable",
      targetTime: "09:00",
      graceWindow: "30",
    });
    setIsAdding(false);
  };

  const handleDeleteHabit = (id) => {
    setHabits((currentHabits) => currentHabits.filter((h) => h.id !== id));
  };

  const addCheckInTime = () => {
    const currentTimes = editHabitData.checkInTimes || [];
    let nextTime = "18:00";
    if (currentTimes.includes("18:00")) nextTime = "21:00";
    else if (currentTimes.includes("12:00")) nextTime = "18:00";
    setEditHabitData((prev) => ({
      ...prev,
      checkInTimes: [...(prev.checkInTimes || []), nextTime],
    }));
  };

  const removeCheckInTime = (indexToRemove) => {
    setEditHabitData((prev) => {
      const currentTimes = prev.checkInTimes || [];
      if (currentTimes.length <= 1) return prev;
      return {
        ...prev,
        checkInTimes: currentTimes.filter((_, i) => i !== indexToRemove),
      };
    });
  };

  const updateCheckInTime = (index, val) => {
    setEditHabitData((prev) => {
      const currentTimes = [...(prev.checkInTimes || [])];
      currentTimes[index] = val;
      return {
        ...prev,
        checkInTimes: currentTimes,
      };
    });
  };

  const startEditHabit = (habit) => {
    setEditingHabitId(habit.id);
    setEditHabitData({
      name: habit.name,
      type: habit.type || "countable",
      goal: habit.goal || "",
      unit: habit.unit || "",
      targetTime: habit.targetTime || "09:00",
      graceWindow: habit.graceWindow || "30",
      reminderEnabled: habit.reminderEnabled || false,
      reminderType: habit.reminderType || "fixed",
      reminderTime: habit.reminderTime || "09:00",
      reminderInterval: habit.reminderInterval || 2,
      reminderIntervalUnit: habit.reminderIntervalUnit || "hours",
      reminderDays: habit.reminderDays || [],
      checkInTimes:
        Array.isArray(habit.checkInTimes) && habit.checkInTimes.length > 0
          ? [...habit.checkInTimes]
          : ["12:00", "18:00"],
      alertThreshold:
        habit.alertThreshold !== undefined ? habit.alertThreshold : 0.5,
      messageTemplate:
        habit.messageTemplate ||
        "You're {remaining} away from your goal. Let's get moving! 🚶",
    });
  };

  const saveEditHabit = (e) => {
    e.preventDefault();
    if (!editHabitData.name) return;

    setHabits((currentHabits) =>
      currentHabits.map((h) => {
        if (h.id !== editingHabitId) return h;

        const updated = {
          ...h,
          name: editHabitData.name,
          type: editHabitData.type,
          reminderEnabled: editHabitData.reminderEnabled,
          reminderType: editHabitData.reminderType || "fixed",
          reminderTime: editHabitData.reminderTime,
          reminderInterval:
            editHabitData.reminderInterval === ""
              ? 2
              : parseInt(editHabitData.reminderInterval, 10),
          reminderIntervalUnit: editHabitData.reminderIntervalUnit || "hours",
          reminderDays: editHabitData.reminderDays || [],
          checkInTimes: editHabitData.checkInTimes || ["12:00", "18:00"],
          alertThreshold:
            editHabitData.alertThreshold !== undefined
              ? Number(editHabitData.alertThreshold)
              : 0.5,
          messageTemplate:
            editHabitData.messageTemplate ||
            "You're {remaining} away from your goal. Let's get moving! 🚶",
        };

        if (
          editHabitData.type === "countable" ||
          editHabitData.type === "big_number"
        ) {
          updated.goal = parseInt(editHabitData.goal, 10);
          updated.unit = editHabitData.unit;
        } else if (editHabitData.type === "time_locked") {
          updated.targetTime = editHabitData.targetTime;
          updated.graceWindow = parseInt(editHabitData.graceWindow, 10) || 30;
        }

        return updated;
      }),
    );
    setEditingHabitId(null);
  };

  return (
    <div className="w-full max-w-md z-10 flex flex-col gap-4">
      <div className="flex justify-between items-center pr-14">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          Rituals
        </h1>
      </div>

      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="fixed bottom-20 right-4 z-[50] w-12 h-12 flex items-center justify-center bg-[var(--bg-card)] rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] active:scale-95 transition-all"
        >
          <svg
            className="w-5 h-5 text-[var(--accent-purple)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            ></path>
          </svg>
        </button>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-card)]/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-[var(--border)]/50 animate-fade-in-down">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-5 text-center">
              New Ritual
            </h3>
            <form onSubmit={handleAddCustom} className="flex flex-col gap-2">
              <select
                value={newHabit.type}
                onChange={(e) => setNewHabit({ ...newHabit, type: e.target.value })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] mb-2 focus:border-emerald-500 focus:outline-none"
              >
                <option value="countable">+1 (water, pages)</option>
                <option value="one_time">Mark Done (exercise, shower)</option>
                <option value="time_locked">Window only (sleep, wake up)</option>
                <option value="big_number">Single log (steps, calories)</option>
              </select>
    
              <input
                type="text"
                placeholder="Ritual Name"
                required
                value={newHabit.name}
                onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] mb-2 focus:border-emerald-500 focus:outline-none"
              />
    
              {(newHabit.type === "countable" ||
                newHabit.type === "big_number") && (
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="Goal (e.g. 20)"
                    required
                    min="1"
                    value={newHabit.goal}
                    onChange={(e) =>
                      setNewHabit({ ...newHabit, goal: e.target.value })
                    }
                    className="w-1/3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g. pages)"
                    required
                    value={newHabit.unit}
                    onChange={(e) =>
                      setNewHabit({ ...newHabit, unit: e.target.value })
                    }
                    className="w-2/3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
    
              {newHabit.type === "time_locked" && (
                <div className="flex gap-2 mb-2">
                  <div className="w-1/2">
                    <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                      Target Time
                    </label>
                    <input
                      type="time"
                      required
                      value={newHabit.targetTime}
                      onChange={(e) =>
                        setNewHabit({ ...newHabit, targetTime: e.target.value })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none "
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                      Grace Window (mins)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={newHabit.graceWindow}
                      onChange={(e) =>
                        setNewHabit({ ...newHabit, graceWindow: e.target.value })
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
    
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-1/3 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-medium py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-indigo-500/90 hover:bg-indigo-600 text-white font-medium py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center shadow-lg"
                >
                  Add Ritual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
            <svg
              className="w-16 h-16 text-[var(--text-secondary)] mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              ></path>
            </svg>
            <p className="text-sm">No rituals found. Start building one!</p>
          </div>
        ) : (
          habits.map((habit, index) => {
            const progressPercent = Math.min(
              100,
              Math.round((habit.count / habit.goal) * 100),
            );
            const isCompleted = habit.count >= habit.goal;
            const openUpward = habits.length > 2 && index >= habits.length - 2;

            return (
              <div
                key={habit.id}
                className={`p-4 rounded-2xl flex flex-col gap-3 relative transition-all duration-300 bg-[var(--bg-card)] border border-[var(--border)] shadow-sm select-none ${habit.paused ? "opacity-50 grayscale" : ""} ${activeMenuId === habit.id ? "z-[60]" : "z-10"}`}
                onTouchStart={() => !editingHabitId && startLongPress(habit.id)}
                onTouchEnd={clearLongPress}
                onMouseDown={() => !editingHabitId && startLongPress(habit.id)}
                onMouseUp={clearLongPress}
                onMouseLeave={clearLongPress}
              >
                {editingHabitId === habit.id ? (
                  <form
                    onSubmit={saveEditHabit}
                    className="animate-fade-in-down z-10"
                  >
                    <h3 className="text-sm font-medium text-[var(--accent-purple)] mb-3">
                      Edit Ritual
                    </h3>
                    <select
                      value={editHabitData.type}
                      onChange={(e) =>
                        setEditHabitData({
                          ...editHabitData,
                          type: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--bg-card)] border-none rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] mb-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="countable">+1 (water, pages)</option>
                      <option value="one_time">
                        Mark Done (exercise, shower)
                      </option>
                      <option value="time_locked">
                        Window only (sleep, wake up)
                      </option>
                      <option value="big_number">
                        Single log (steps, calories)
                      </option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ritual Name"
                      required
                      value={editHabitData.name}
                      onChange={(e) =>
                        setEditHabitData({
                          ...editHabitData,
                          name: e.target.value,
                        })
                      }
                      className="w-full bg-[var(--bg-card)] border-none rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] mb-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />

                    {(editHabitData.type === "countable" ||
                      editHabitData.type === "big_number") && (
                      <div className="flex gap-2 mb-3">
                        <input
                          type="number"
                          placeholder="Goal"
                          required
                          min="1"
                          value={editHabitData.goal}
                          onChange={(e) =>
                            setEditHabitData({
                              ...editHabitData,
                              goal: e.target.value,
                            })
                          }
                          className="w-1/3 bg-[var(--bg-card)] border-none rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Unit"
                          required
                          value={editHabitData.unit}
                          onChange={(e) =>
                            setEditHabitData({
                              ...editHabitData,
                              unit: e.target.value,
                            })
                          }
                          className="w-2/3 bg-[var(--bg-card)] border-none rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {editHabitData.type === "time_locked" && (
                      <div className="flex gap-2 mb-3">
                        <div className="w-1/2">
                          <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                            Target Time
                          </label>
                          <input
                            type="time"
                            required
                            value={editHabitData.targetTime}
                            onChange={(e) =>
                              setEditHabitData({
                                ...editHabitData,
                                targetTime: e.target.value,
                              })
                            }
                            className="w-full bg-[var(--bg-card)] border-none rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none "
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                            Grace Window (mins)
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editHabitData.graceWindow}
                            onChange={(e) =>
                              setEditHabitData({
                                ...editHabitData,
                                graceWindow: e.target.value,
                              })
                            }
                            className="w-full bg-[var(--bg-card)] border-none rounded-xl px-3 py-3 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {(() => {
                      const isNumericRitual =
                        editHabitData.type === "countable" ||
                        editHabitData.type === "big_number" ||
                        parseInt(editHabitData.goal, 10) > 1;
                      const currentTarget =
                        parseInt(editHabitData.goal, 10) || 6000;
                      const currentHabitObj = habits.find(
                        (h) => h.id === editingHabitId,
                      );
                      const currentCount = currentHabitObj
                        ? currentHabitObj.count || 0
                        : 1500;
                      const currentUnit = editHabitData.unit
                        ? ` ${editHabitData.unit}`
                        : " steps";
                      const remainingCount = Math.max(
                        0,
                        currentTarget - currentCount,
                      );
                      const remainingStr = `${remainingCount.toLocaleString()}${currentUnit}`;
                      const percentStr = `${Math.round(currentTarget > 0 ? (currentCount / currentTarget) * 100 : 0)}%`;
                      const thresholdPct = Math.round(
                        (editHabitData.alertThreshold !== undefined
                          ? editHabitData.alertThreshold
                          : 0.5) * 100,
                      );
                      const resolvedPreviewMessage = (
                        editHabitData.messageTemplate ||
                        "You're {remaining} away from your goal. Let's get moving! 🚶"
                      )
                        .replace(/{remaining}/g, remainingStr)
                        .replace(/{percent}/g, percentStr);

                      return (
                        <div className="mb-3 p-3 bg-[var(--bg-card)] rounded-xl flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0">
                              Enable Reminder
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setEditHabitData({
                                  ...editHabitData,
                                  reminderEnabled:
                                    !editHabitData.reminderEnabled,
                                })
                              }
                              className={`w-10 h-5 rounded-full transition-colors relative border border-[var(--border)] ${editHabitData.reminderEnabled ? "bg-indigo-500" : "bg-gray-300 dark:bg-gray-600"}`}
                            >
                              <div
                                className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${editHabitData.reminderEnabled ? "translate-x-5" : "translate-x-0.5"}`}
                              ></div>
                            </button>
                          </div>

                          {editHabitData.reminderEnabled && (
                            <div className="flex flex-col gap-3.5 pt-1">
                              {/* REMINDER TYPE */}
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                                  Reminder Type
                                </label>
                                <select
                                  value={editHabitData.reminderType || "fixed"}
                                  onChange={(e) =>
                                    setEditHabitData({
                                      ...editHabitData,
                                      reminderType: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[var(--bg-card)] border border-indigo-500/40 rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                >
                                  <option value="fixed">Fixed Time</option>
                                  <option value="interval">
                                    Time Interval
                                  </option>
                                  <option
                                    value="goal_progress"
                                    disabled={!isNumericRitual}
                                  >
                                    Goal / Progress Based 🎯{" "}
                                    {!isNumericRitual
                                      ? "(Requires numeric target)"
                                      : ""}
                                  </option>
                                </select>
                              </div>

                              {/* FIXED TIME */}
                              {(!editHabitData.reminderType ||
                                editHabitData.reminderType === "fixed") && (
                                <>
                                  <div className="animate-fade-in-down flex items-center justify-between pt-1">
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-0">
                                      Time
                                    </label>
                                    <input
                                      type="time"
                                      value={editHabitData.reminderTime}
                                      onChange={(e) =>
                                        setEditHabitData({
                                          ...editHabitData,
                                          reminderTime: e.target.value,
                                        })
                                      }
                                      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 "
                                    />
                                  </div>

                                  <div className="animate-fade-in-down flex flex-col gap-1.5 pt-2">
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1">
                                      Reminder Days
                                    </label>
                                    <div className="flex justify-between gap-1">
                                      {["S", "M", "T", "W", "T", "F", "S"].map(
                                        (day, idx) => {
                                          const selected =
                                            editHabitData.reminderDays?.includes(
                                              idx,
                                            ) ||
                                            !editHabitData.reminderDays ||
                                            editHabitData.reminderDays
                                              .length === 0;
                                          return (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() => {
                                                let currentDays =
                                                  editHabitData.reminderDays
                                                    ? [
                                                        ...editHabitData.reminderDays,
                                                      ]
                                                    : [];
                                                if (currentDays.length === 0) {
                                                  currentDays = [
                                                    0, 1, 2, 3, 4, 5, 6,
                                                  ].filter((d) => d !== idx);
                                                } else {
                                                  if (
                                                    currentDays.includes(idx)
                                                  ) {
                                                    currentDays =
                                                      currentDays.filter(
                                                        (d) => d !== idx,
                                                      );
                                                  } else {
                                                    currentDays.push(idx);
                                                  }
                                                }
                                                if (currentDays.length === 7) {
                                                  currentDays = [];
                                                }
                                                setEditHabitData({
                                                  ...editHabitData,
                                                  reminderDays: currentDays,
                                                });
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                                                selected
                                                  ? "bg-indigo-500 text-[var(--text-primary)] shadow-sm"
                                                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
                                              }`}
                                            >
                                              {day}
                                            </button>
                                          );
                                        },
                                      )}
                                    </div>
                                    <span className="text-[10px] text-[var(--text-muted)] italic mt-0.5">
                                      {!editHabitData.reminderDays ||
                                      editHabitData.reminderDays.length === 0
                                        ? "Fires every day"
                                        : `Fires on: ${editHabitData.reminderDays.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}`}
                                    </span>
                                  </div>
                                </>
                              )}

                              {/* TIME INTERVAL */}
                              {editHabitData.reminderType === "interval" && (
                                <div className="animate-fade-in-down flex items-center justify-between pt-1">
                                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-0">
                                    Every
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      value={
                                        editHabitData.reminderInterval === ""
                                          ? ""
                                          : editHabitData.reminderInterval
                                      }
                                      onChange={(e) =>
                                        setEditHabitData({
                                          ...editHabitData,
                                          reminderInterval:
                                            e.target.value === ""
                                              ? ""
                                              : parseInt(e.target.value, 10),
                                        })
                                      }
                                      className="bg-[var(--bg-card)] w-20 border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                    <select
                                      value={
                                        editHabitData.reminderIntervalUnit ||
                                        "hours"
                                      }
                                      onChange={(e) =>
                                        setEditHabitData({
                                          ...editHabitData,
                                          reminderIntervalUnit: e.target.value,
                                        })
                                      }
                                      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      <option value="hours">Hours</option>
                                      <option value="minutes">Minutes</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                              {/* GOAL / PROGRESS BASED */}
                              {editHabitData.reminderType ===
                                "goal_progress" && (
                                <div className="animate-fade-in-down flex flex-col gap-4 pt-1">
                                  {/* CHECK-IN TIMES */}
                                  <div>
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                                      Check-in times
                                    </label>
                                    <div className="flex flex-col gap-2">
                                      {(
                                        editHabitData.checkInTimes || ["12:00"]
                                      ).map((t, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3"
                                        >
                                          <input
                                            type="time"
                                            value={t}
                                            onChange={(e) =>
                                              updateCheckInTime(
                                                idx,
                                                e.target.value,
                                              )
                                            }
                                            className="bg-transparent text-[var(--text-primary)] font-medium text-sm focus:outline-none flex-1 cursor-pointer"
                                          />
                                          {(editHabitData.checkInTimes
                                            ?.length || 1) > 1 && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeCheckInTime(idx)
                                              }
                                              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1 transition-colors"
                                              title="Remove check-in time"
                                            >
                                              ✕
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={addCheckInTime}
                                        className="w-full py-3 border border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-[var(--accent-purple)] text-sm font-medium flex items-center justify-center gap-1.5 transition-colors bg-indigo-500/5 hover:bg-indigo-500/10 active:scale-[0.99]"
                                      >
                                        <span className="text-base leading-none">
                                          +
                                        </span>
                                        <span>Add check-in time</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* ALERT THRESHOLD */}
                                  <div>
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                                      Alert Threshold
                                    </label>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
                                      <div className="flex justify-between items-center text-sm mb-3">
                                        <span className="text-[var(--text-secondary)] font-medium">
                                          Remind if below
                                        </span>
                                        <span className="font-bold text-[var(--accent-purple)]">
                                          {thresholdPct}%
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        step="5"
                                        value={thresholdPct}
                                        onChange={(e) =>
                                          setEditHabitData({
                                            ...editHabitData,
                                            alertThreshold:
                                              parseInt(e.target.value, 10) /
                                              100,
                                          })
                                        }
                                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                                        style={{
                                          background: `linear-gradient(to right, #818cf8 0%, #818cf8 ${thresholdPct}%, #2d2e3f ${thresholdPct}%, #2d2e3f 100%)`,
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* MESSAGE */}
                                  <div>
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                                      Message
                                    </label>
                                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3.5 focus-within:border-indigo-500/60 transition-colors">
                                      <textarea
                                        rows={2}
                                        value={
                                          editHabitData.messageTemplate ||
                                          "You're {remaining} away from your goal. Let's get moving! 🚶"
                                        }
                                        onChange={(e) =>
                                          setEditHabitData({
                                            ...editHabitData,
                                            messageTemplate: e.target.value,
                                          })
                                        }
                                        className="w-full bg-transparent text-indigo-100 text-sm font-mono focus:outline-none resize-none leading-relaxed"
                                        placeholder="You're {remaining} away from your goal. Let's get moving! 🚶"
                                      />
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-2 font-normal leading-relaxed">
                                      Preview: "{resolvedPreviewMessage}"
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex gap-3 mt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-[var(--text-primary)] py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 shadow-md"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingHabitId(null)}
                        className="flex-1 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] text-[var(--text-secondary)] py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-center z-10">
                      <div className="flex flex-col flex-1 min-w-0 pr-3">
                        <div className="text-[var(--text-primary)] font-medium text-base truncate">
                          {habit.name}
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] truncate mt-0.5">
                          {habit.type === "countable" && (
                            <span>
                              {habit.count} / {habit.goal} {habit.unit}
                            </span>
                          )}
                          {habit.type === "countable" &&
                            habit.reminderEnabled &&
                            habit.reminderType === "interval" && (
                              <span>
                                {" "}
                                · every {habit.reminderInterval || 2}
                                {habit.reminderIntervalUnit === "minutes"
                                  ? "m"
                                  : "h"}
                              </span>
                            )}
                          {habit.reminderEnabled &&
                            habit.reminderType === "goal_progress" && (
                              <span>
                                {" "}
                                · 🎯{" "}
                                {(habit.checkInTimes || [])
                                  .map((t) => formatTime12h(t))
                                  .join(", ")}
                              </span>
                            )}

                          {habit.type === "big_number" && (
                            <span>
                              {habit.count} / {habit.goal} {habit.unit}
                            </span>
                          )}

                          {habit.type === "time_locked" && (
                            <span>
                              Target {formatTime12h(habit.targetTime)} · ±
                              {habit.graceWindow}m
                            </span>
                          )}

                          {habit.type === "one_time" && (
                            <span>Daily check-off</span>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 relative">
                        {habit.paused ? (
                          <div className="px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center bg-[var(--bg-card)] text-[var(--text-secondary)]">
                            Paused
                          </div>
                        ) : (
                          <>
                            {/* Action Pills */}
                            {habit.type === "time_locked" &&
                              (() => {
                                const status = getTimeLockedStatus(habit, now);
                                if (isCompleted) {
                                  return (
                                    <div
                                      className="px-4 py-2 bg-emerald-900/30 text-[var(--success)] rounded-lg font-medium text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                                      onClick={() => handleUndo(habit.id)}
                                    >
                                      Done
                                    </div>
                                  );
                                }
                                if (status === "before") {
                                  const { start } = getWindowBounds(
                                    habit.targetTime,
                                    habit.graceWindow || 30,
                                    now,
                                  );
                                  return (
                                    <div className="px-4 py-2 bg-[var(--bg-card-hover)] text-[var(--text-secondary)] rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 whitespace-nowrap">
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        ></path>
                                      </svg>
                                      {formatTime12h(
                                        `${start.getHours()}:${start.getMinutes()}`,
                                      )}
                                    </div>
                                  );
                                }
                                if (status === "missed") {
                                  return (
                                    <div className="px-4 py-2 bg-red-500/10 text-[var(--danger)] rounded-lg font-medium text-sm flex items-center justify-center whitespace-nowrap">
                                      Missed
                                    </div>
                                  );
                                }
                                return (
                                  <button
                                    onClick={() => handleTap(habit.id)}
                                    className="px-4 py-2 bg-emerald-500/10 text-[var(--success)] hover:bg-emerald-500/20 rounded-lg font-medium text-sm flex items-center justify-center transition-colors active:scale-95 whitespace-nowrap"
                                  >
                                    Mark done
                                  </button>
                                );
                              })()}

                            {habit.type === "countable" && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleUndo(habit.id)}
                                  disabled={habit.count <= 0}
                                  className={`px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center transition-colors min-w-[2.5rem] ${
                                    habit.count <= 0
                                      ? "bg-[var(--bg-card-hover)]/40 text-[var(--text-muted)] cursor-not-allowed"
                                      : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] active:scale-95"
                                  }`}
                                  title="Decrease 1"
                                >
                                  -1
                                </button>
                                {isCompleted ? (
                                  <div
                                    className="px-4 py-2 bg-emerald-500/10 text-[var(--success)] rounded-lg font-medium text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                                    onClick={() => handleUndo(habit.id)}
                                  >
                                    Done
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleTap(habit.id)}
                                    className="px-4 py-2 bg-indigo-500/20 text-[var(--accent-purple)] hover:bg-indigo-500/30 rounded-lg font-medium text-sm flex items-center justify-center transition-colors active:scale-95 min-w-[3rem]"
                                  >
                                    +1
                                  </button>
                                )}
                              </div>
                            )}

                            {habit.type === "one_time" &&
                              (isCompleted ? (
                                <div
                                  className="px-4 py-2 bg-emerald-500/10 text-[var(--success)] rounded-lg font-medium text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                                  onClick={() => handleUndo(habit.id)}
                                >
                                  Done
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleTap(habit.id)}
                                  className="px-4 py-2 bg-emerald-500/10 text-[var(--success)] hover:bg-emerald-500/20 rounded-lg font-medium text-sm flex items-center justify-center transition-colors active:scale-95 whitespace-nowrap"
                                >
                                  Mark done
                                </button>
                              ))}

                            {habit.type === "big_number" && (
                              <div className="flex items-center gap-1.5">
                                {habit.count > 0 && (
                                  <button
                                    onClick={() => handleResetHabit(habit.id)}
                                    className="px-3 py-2 bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] rounded-lg font-medium text-sm flex items-center justify-center transition-colors active:scale-95 whitespace-nowrap"
                                    title="Reset today's log"
                                  >
                                    Reset
                                  </button>
                                )}
                                {isCompleted ? (
                                  <div
                                    className="px-4 py-2 bg-emerald-900/30 text-[var(--success)] rounded-lg font-medium text-sm flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                                    onClick={() =>
                                      setBigNumberInputs((prev) => ({
                                        ...prev,
                                        [habit.id]:
                                          prev[habit.id] !== undefined
                                            ? undefined
                                            : "",
                                      }))
                                    }
                                    title="Click to add more"
                                  >
                                    Done
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      setBigNumberInputs((prev) => ({
                                        ...prev,
                                        [habit.id]:
                                          prev[habit.id] !== undefined
                                            ? undefined
                                            : "",
                                      }))
                                    }
                                    className="px-4 py-2 bg-indigo-500/20 text-[var(--accent-purple)] hover:bg-indigo-500/30 rounded-lg font-medium text-sm flex items-center justify-center transition-colors active:scale-95 whitespace-nowrap"
                                  >
                                    {bigNumberInputs[habit.id] !== undefined
                                      ? "Cancel"
                                      : "+ Log"}
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Action Sheet (Long Press) */}
                        {activeMenuId === habit.id && (
                          <div
                            className={
                              openUpward
                                ? "absolute bottom-full right-0 mb-2 w-36 bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in-up origin-bottom-right"
                                : "absolute top-full right-0 mt-2 w-36 bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-xl shadow-2xl overflow-hidden z-[60] animate-fade-in-down origin-top-right"
                            }
                          >
                            {habit.count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  handleResetHabit(habit.id);
                                }}
                                className="w-full text-left px-4 py-3 text-sm text-[var(--warning)] hover:bg-[var(--bg-card)] transition-colors flex items-center gap-2"
                              >
                                <span>🔄</span> Reset today
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                startEditHabit(habit);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors flex items-center gap-2"
                            >
                              <span>✏️</span> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setPauseModalId(habit.id);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors flex items-center gap-2"
                            >
                              <span>⏸</span> Pause
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleDeleteHabit(habit.id);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--bg-card)] transition-colors flex items-center gap-2"
                            >
                              <span>🗑</span> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Big Number Form */}
                    {habit.type === "big_number" &&
                      bigNumberInputs[habit.id] !== undefined && (
                        <form
                          onSubmit={(e) => handleLogBigNumber(habit.id, e)}
                          className="flex gap-2 mt-2 z-10 animate-fade-in-up"
                        >
                          <input
                            type="number"
                            min="1"
                            placeholder={`+ Amount in ${habit.unit || "units"}...`}
                            value={bigNumberInputs[habit.id] ?? ""}
                            onChange={(e) =>
                              setBigNumberInputs({
                                ...bigNumberInputs,
                                [habit.id]: e.target.value,
                              })
                            }
                            className="flex-1 bg-[var(--bg-card)] border-none rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="bg-indigo-500 hover:bg-indigo-600 text-[var(--text-primary)] px-5 py-2 rounded-xl font-semibold text-sm transition-colors"
                          >
                            Save
                          </button>
                          {habit.count > 0 && (
                            <button
                              type="button"
                              onClick={() => handleResetHabit(habit.id)}
                              className="bg-red-500/20 text-[var(--danger)] hover:bg-red-500/30 px-3 py-2 rounded-xl font-semibold text-sm transition-colors"
                            >
                              Reset
                            </button>
                          )}
                        </form>
                      )}

                    {/* Progress Bar for Countable and Big Number */}
                    {(habit.type === "countable" ||
                      habit.type === "big_number") && (
                      <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden mt-2 pointer-events-none">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${isCompleted ? "bg-emerald-400" : "bg-indigo-500"}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pause Modal */}
      {pauseModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col items-center text-center animate-fade-in-up">
            <img
              src={neoImg}
              alt="Sleepy Neo"
              className="w-[100px] mb-4 filter grayscale-[60%] opacity-80 neo-gentle-rock"
            />
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Pause {habits.find((h) => h.id === pauseModalId)?.name}?
            </h3>
            <p className="text-sm text-[var(--accent-teal)]/80 mb-6 font-medium">
              Life happens. Neo holds your streak while you rest.
            </p>

            <div className="w-full text-left mb-6">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                Resume on
              </label>
              <input
                type="date"
                min={getMinResumeDate()}
                max={getMaxResumeDate()}
                value={resumeDateInput}
                onChange={(e) => setResumeDateInput(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-teal-500 "
              />
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={() => setPauseModalId(null)}
                className="flex-1 py-3 px-4 bg-transparent hover:bg-[var(--bg-card)] text-[var(--text-secondary)] font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePauseSubmit}
                className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-500 text-[var(--text-primary)] font-bold rounded-xl transition-colors shadow-lg shadow-teal-900/50"
              >
                ⏸ Pause it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
