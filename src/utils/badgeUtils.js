import { getLocalYMD } from "../utils";

export const BADGE_DEFINITIONS = [
  // Existing
  {
    id: "first_step",
    name: "First Step",
    icon: "🔥",
    description: "Complete your first task.",
  },
  {
    id: "hydrated",
    name: "Hydrated",
    icon: "💧",
    description: "Log water 7 days in a row.",
  },
  {
    id: "consistent",
    name: "Consistent",
    icon: "💪",
    description: "Complete all rituals in a single day.",
  },
  {
    id: "trusted",
    name: "Trusted",
    icon: "📋",
    description: "Complete 10 tasks assigned by others.",
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    icon: "🏆",
    description: "Maintain a 30-day streak on any ritual.",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    icon: "⚡️",
    description: "Complete a task before 9am.",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    icon: "🌙",
    description: "Complete a task after 9pm.",
  },
  {
    id: "perfect_week",
    name: "Perfect Week",
    icon: "🎯",
    description: "Complete all rituals every day for 7 days.",
  },
  // New
  {
    id: "task_5",
    name: "Getting Started",
    icon: "📌",
    description: "Complete 5 tasks.",
  },
  {
    id: "task_25",
    name: "Task Master",
    icon: "🗂️",
    description: "Complete 25 tasks.",
  },
  {
    id: "task_50",
    name: "Powerhouse",
    icon: "⚙️",
    description: "Complete 50 tasks.",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    icon: "🗓️",
    description: "Maintain a 7-day streak on any ritual.",
  },
  {
    id: "streak_14",
    name: "Two Weeks Strong",
    icon: "📅",
    description: "Maintain a 14-day streak on any ritual.",
  },
  {
    id: "goal_getter",
    name: "Goal Getter",
    icon: "🎖️",
    description: "Complete your first goal.",
  },
  {
    id: "multitasker",
    name: "Multitasker",
    icon: "🔀",
    description: "Complete 3 tasks in a single day.",
  },
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    icon: "🔄",
    description: "Return and complete a task after a 7-day gap.",
  },
  {
    id: "ritualist",
    name: "Ritualist",
    icon: "🧘",
    description: "Complete any ritual 50 times total.",
  },
  {
    id: "overachiever",
    name: "Overachiever",
    icon: "🚀",
    description: "Complete all rituals for 30 consecutive days.",
  },
];

export const checkAndUnlockBadges = () => {
  try {
    const earnedLogStr = localStorage.getItem("pinboard_earned_badges");
    const earnedBadges = earnedLogStr ? JSON.parse(earnedLogStr) : [];

    // We only evaluate badges that are not already earned
    const unlockedIds = new Set(earnedBadges.map((b) => b.id));

    let newlyEarned = [];

    // Load necessary data
    const tasks = JSON.parse(localStorage.getItem("pinboard_tasks") || "[]");

    let habits = [];
    try {
      const ritualsData = JSON.parse(
        localStorage.getItem("pinboard_rituals_data") || "{}",
      );
      habits = ritualsData.habits || [];
    } catch (e) {}

    const completionLog = JSON.parse(
      localStorage.getItem("pinboard_completion_log") || "[]",
    );
    const todayStr = getLocalYMD();
    const currentHour = new Date().getHours();

    // 1. 🔥 First Step
    if (!unlockedIds.has("first_step")) {
      if (tasks.some((t) => t.done)) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "first_step"));
      }
    }

    // 2. 💧 Hydrated
    if (!unlockedIds.has("hydrated")) {
      const waterHabit = habits.find((h) =>
        h.name.toLowerCase().includes("water"),
      );
      if (waterHabit && waterHabit.streak >= 7) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "hydrated"));
      }
    }

    // 3. 💪 Consistent
    if (!unlockedIds.has("consistent")) {
      if (
        habits.length > 0 &&
        habits.every(
          (h) => h.count >= h.goal && h.lastCompletedDate === todayStr,
        )
      ) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "consistent"));
      }
    }

    // 4. 📋 Trusted
    if (!unlockedIds.has("trusted")) {
      const trustedCount = tasks.filter(
        (t) => t.done && t.person && t.person.trim() !== "",
      ).length;
      if (trustedCount >= 10) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "trusted"));
      }
    }

    // 5. 🏆 Unstoppable
    if (!unlockedIds.has("unstoppable")) {
      if (habits.some((h) => h.streak >= 30)) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "unstoppable"));
      }
    }

    // 6. ⚡️ Early Bird
    if (!unlockedIds.has("early_bird")) {
      // We check if there's any task completed today before 9am, or just check right now.
      // Easiest is to check the completion log for a task completed < 9am.
      const hasEarlyTask = completionLog.some((log) => {
        if (log.type === "task") {
          const d = new Date(log.timestamp);
          return d.getHours() < 9;
        }
        return false;
      });
      if (
        hasEarlyTask ||
        (tasks.some((t) => t.done && t.completedDate === todayStr) &&
          currentHour < 9)
      ) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "early_bird"));
      }
    }

    // 7. 🌙 Night Owl
    if (!unlockedIds.has("night_owl")) {
      const hasLateTask = completionLog.some((log) => {
        if (log.type === "task") {
          const d = new Date(log.timestamp);
          return d.getHours() >= 21;
        }
        return false;
      });
      if (
        hasLateTask ||
        (tasks.some((t) => t.done && t.completedDate === todayStr) &&
          currentHour >= 21)
      ) {
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "night_owl"));
      }
    }

    // 8. 🎯 Perfect Week
    if (!unlockedIds.has("perfect_week") && habits.length > 0) {
      // Check last 7 days
      let perfect = true;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = getLocalYMD(d);

        // Ensure every habit has a log on `ymd`
        const habitsCompletedThatDay = completionLog.filter(
          (l) =>
            l.type === "habit" && getLocalYMD(new Date(l.timestamp)) === ymd,
        );

        const allCompleted = habits.every((h) =>
          habitsCompletedThatDay.some((l) => l.id === h.id),
        );
        if (!allCompleted) {
          perfect = false;
          break;
        }
      }

      if (perfect) {
        newlyEarned.push(
          BADGE_DEFINITIONS.find((b) => b.id === "perfect_week"),
        );
      }
    }

    const doneTasks = tasks.filter((t) => t.done);

    if (!unlockedIds.has("task_5") && doneTasks.length >= 5)
      newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "task_5"));

    if (!unlockedIds.has("task_25") && doneTasks.length >= 25)
      newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "task_25"));

    if (!unlockedIds.has("task_50") && doneTasks.length >= 50)
      newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "task_50"));

    if (!unlockedIds.has("streak_7") && habits.some((h) => h.streak >= 7))
      newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "streak_7"));

    if (!unlockedIds.has("streak_14") && habits.some((h) => h.streak >= 14))
      newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "streak_14"));

    if (!unlockedIds.has("goal_getter")) {
      const goals = JSON.parse(localStorage.getItem("pinboard_goals") || "[]");
      if (goals.some((g) => g.isCompleted || g.progress >= g.target))
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "goal_getter"));
    }

    if (!unlockedIds.has("multitasker")) {
      const tasksDoneToday = completionLog.filter(
        (l) =>
          l.type === "task" && getLocalYMD(new Date(l.timestamp)) === todayStr,
      );
      if (tasksDoneToday.length >= 3)
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "multitasker"));
    }

    if (!unlockedIds.has("comeback_kid")) {
      const taskLogs = completionLog
        .filter((l) => l.type === "task")
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      for (let i = 1; i < taskLogs.length; i++) {
        const gap =
          (new Date(taskLogs[i].timestamp) -
            new Date(taskLogs[i - 1].timestamp)) /
          (1000 * 60 * 60 * 24);
        if (gap >= 7) {
          newlyEarned.push(
            BADGE_DEFINITIONS.find((b) => b.id === "comeback_kid"),
          );
          break;
        }
      }
    }

    if (!unlockedIds.has("ritualist")) {
      const habitCounts = {};
      completionLog
        .filter((l) => l.type === "habit")
        .forEach((l) => {
          habitCounts[l.id] = (habitCounts[l.id] || 0) + 1;
        });
      if (Object.values(habitCounts).some((c) => c >= 50))
        newlyEarned.push(BADGE_DEFINITIONS.find((b) => b.id === "ritualist"));
    }

    if (!unlockedIds.has("overachiever") && habits.length > 0) {
      let perfectDays = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = getLocalYMD(d);
        const done = completionLog.filter(
          (l) =>
            l.type === "habit" && getLocalYMD(new Date(l.timestamp)) === ymd,
        );
        if (habits.every((h) => done.some((l) => l.id === h.id))) {
          perfectDays++;
        } else {
          break;
        }
      }
      if (perfectDays >= 30)
        newlyEarned.push(
          BADGE_DEFINITIONS.find((b) => b.id === "overachiever"),
        );
    }

    if (newlyEarned.length > 0) {
      const now = new Date().toISOString();
      newlyEarned.forEach((badge) => {
        earnedBadges.push({
          id: badge.id,
          timestamp: now,
        });
        // Dispatch event for UI
        window.dispatchEvent(
          new CustomEvent("badgeUnlocked", { detail: badge }),
        );
      });
      localStorage.setItem(
        "pinboard_earned_badges",
        JSON.stringify(earnedBadges),
      );
    }
  } catch (e) {
    console.error("Error evaluating badges:", e);
  }
};

export const getClosestBadgeProgress = () => {
  try {
    const earnedLogStr = localStorage.getItem("pinboard_earned_badges");
    const earnedBadges = earnedLogStr ? JSON.parse(earnedLogStr) : [];
    const unlockedIds = new Set(earnedBadges.map((b) => b.id));

    const tasks = JSON.parse(localStorage.getItem("pinboard_tasks") || "[]");
    let habits = [];
    try {
      const ritualsData = JSON.parse(
        localStorage.getItem("pinboard_rituals_data") || "{}",
      );
      habits = ritualsData.habits || [];
    } catch (e) {}

    const completionLog = JSON.parse(
      localStorage.getItem("pinboard_completion_log") || "[]",
    );
    const todayStr = getLocalYMD();

    let progressList = [];

    // Evaluate progress for each unearned badge
    if (!unlockedIds.has("first_step")) {
      const current = tasks.filter((t) => t.done).length;
      progressList.push({ id: "first_step", current, goal: 1, unit: "tasks" });
    }

    if (!unlockedIds.has("hydrated")) {
      const waterHabit = habits.find((h) =>
        h.name.toLowerCase().includes("water"),
      );
      const current = waterHabit ? waterHabit.streak : 0;
      progressList.push({
        id: "hydrated",
        current,
        goal: 7,
        unit: "days streak",
      });
    }

    if (!unlockedIds.has("consistent")) {
      const habitsDone = habits.filter(
        (h) => h.count >= h.goal && h.lastCompletedDate === todayStr,
      ).length;
      progressList.push({
        id: "consistent",
        current: habitsDone,
        goal: Math.max(1, habits.length),
        unit: "rituals today",
      });
    }

    if (!unlockedIds.has("trusted")) {
      const trustedCount = tasks.filter(
        (t) => t.done && t.person && t.person.trim() !== "",
      ).length;
      progressList.push({
        id: "trusted",
        current: trustedCount,
        goal: 10,
        unit: "trusted tasks",
      });
    }

    if (!unlockedIds.has("unstoppable")) {
      const maxStreak =
        habits.length > 0 ? Math.max(...habits.map((h) => h.streak)) : 0;
      progressList.push({
        id: "unstoppable",
        current: maxStreak,
        goal: 30,
        unit: "days max streak",
      });
    }

    if (!unlockedIds.has("early_bird")) {
      progressList.push({
        id: "early_bird",
        current: 0,
        goal: 1,
        unit: "task before 9am",
      });
    }

    if (!unlockedIds.has("night_owl")) {
      progressList.push({
        id: "night_owl",
        current: 0,
        goal: 1,
        unit: "task after 9pm",
      });
    }

    if (!unlockedIds.has("perfect_week")) {
      // Find consecutive perfect days
      let currentPerfect = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = getLocalYMD(d);
        const habitsCompletedThatDay = completionLog.filter(
          (l) =>
            l.type === "habit" && getLocalYMD(new Date(l.timestamp)) === ymd,
        );

        const allCompleted =
          habits.length > 0 &&
          habits.every((h) =>
            habitsCompletedThatDay.some((l) => l.id === h.id),
          );
        if (allCompleted) {
          currentPerfect++;
        } else {
          break; // Streak broken
        }
      }
      progressList.push({
        id: "perfect_week",
        current: currentPerfect,
        goal: 7,
        unit: "perfect days",
      });
    }

    if (progressList.length === 0) return null;

    // Find the one closest to completion based on percentage
    const closest = progressList.reduce((prev, curr) => {
      const prevPercent = prev.current / prev.goal;
      const currPercent = curr.current / curr.goal;
      return currPercent > prevPercent ? curr : prev;
    });

    const badgeDef = BADGE_DEFINITIONS.find((b) => b.id === closest.id);
    return { ...closest, badge: badgeDef };
  } catch (e) {
    console.error("Error calculating badge progress:", e);
    return null;
  }
};
