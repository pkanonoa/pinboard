import React, { useState, useEffect } from "react";
import GoalCard from "./GoalCard";
import confetti from "canvas-confetti";
import { getLocalYMD, syncStateToBackend } from "../utils";

export default function GoalsSection() {
  const [goals, setGoals] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [newGoal, setNewGoal] = useState({
    name: "",
    category: "Body",
    target: "",
    unit: "",
    trackingType: "count_toward",
    linkedHabitIds: [],
    dueDate: "",
  });
  const [availableHabits, setAvailableHabits] = useState([]);

  useEffect(() => {
    // Load habits for linking
    const savedRitualsStr = localStorage.getItem("pinboard_rituals_data");
    if (savedRitualsStr) {
      try {
        const parsed = JSON.parse(savedRitualsStr);
        setAvailableHabits(parsed.habits || []);
      } catch (e) {}
    }

    const loadGoals = () => {
      const saved = localStorage.getItem("pinboard_goals");
      if (saved) {
        try {
          setGoals(JSON.parse(saved));
        } catch (e) {}
      } else {
        // Migration from old monthly goals
        const oldSaved = localStorage.getItem("pinboard_monthly_goals");
        if (oldSaved) {
          try {
            const parsed = JSON.parse(oldSaved);
            if (parsed && parsed.goals) {
              setGoals(parsed.goals);
              localStorage.setItem(
                "pinboard_goals",
                JSON.stringify(parsed.goals),
              );
            }
          } catch (e) {}
        }
      }
    };

    loadGoals();

    const handleGoalsUpdated = () => loadGoals();
    window.addEventListener("pinboard_goals_updated", handleGoalsUpdated);
    return () =>
      window.removeEventListener("pinboard_goals_updated", handleGoalsUpdated);
  }, []);

  const saveData = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem("pinboard_goals", JSON.stringify(newGoals));
    window.dispatchEvent(new Event("pinboard_goals_updated"));
    syncStateToBackend();
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.name) return;

    if (editingGoalId) {
      const updatedGoals = goals.map((g) => {
        if (g.id === editingGoalId) {
          return {
            ...g,
            name: newGoal.name,
            category: newGoal.category,
            target: parseFloat(newGoal.target) || 1,
            unit: newGoal.unit,
            trackingType: newGoal.trackingType,
            linkedHabitIds: newGoal.linkedHabitIds,
            dueDate: newGoal.dueDate || null,
          };
        }
        return g;
      });
      saveData(updatedGoals);
    } else {
      const goal = {
        id: `g_${Date.now()}`,
        name: newGoal.name,
        category: newGoal.category,
        target: parseFloat(newGoal.target) || 1,
        unit: newGoal.unit,
        trackingType: newGoal.trackingType,
        linkedHabitIds: newGoal.linkedHabitIds,
        dueDate: newGoal.dueDate || null,
        progress: 0,
        history: [],
        isCompleted: false,
        createdAt: new Date().toISOString(),
      };
      saveData([goal, ...goals]); // Add to top
    }

    setNewGoal({
      name: "",
      category: "Body",
      target: "",
      unit: "",
      trackingType: "count_toward",
      linkedHabitIds: [],
      dueDate: "",
    });
    setIsAdding(false);
    setEditingGoalId(null);
  };

  const handleEdit = (goal) => {
    setNewGoal({
      name: goal.name,
      category: goal.category,
      target: goal.target,
      unit: goal.unit || "",
      trackingType: goal.trackingType,
      linkedHabitIds: goal.linkedHabitIds || [],
      dueDate: goal.dueDate || "",
    });
    setEditingGoalId(goal.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLog = (id, amount) => {
    const todayStr = getLocalYMD();
    const newGoals = goals.map((g) => {
      if (g.id !== id) return g;

      let newProgress = g.progress;
      let newHistory = [...g.history];

      if (
        g.trackingType === "cumulative" ||
        g.trackingType === "count_toward"
      ) {
        newProgress += amount;
      } else if (g.trackingType === "daily_log") {
        const existingToday = newHistory.findIndex((h) => h.date === todayStr);
        if (existingToday >= 0) {
          const sum =
            newHistory[existingToday].sum || newHistory[existingToday].value;
          const count = newHistory[existingToday].count || 1;
          newHistory[existingToday] = {
            date: todayStr,
            value: (sum + amount) / (count + 1),
            sum: sum + amount,
            count: count + 1,
          };
          newProgress =
            newHistory.reduce((acc, h) => acc + h.value, 0) / newHistory.length;
        } else {
          newHistory.push({
            date: todayStr,
            value: amount,
            sum: amount,
            count: 1,
          });
          newProgress =
            newHistory.reduce((acc, h) => acc + h.value, 0) / newHistory.length;
        }
      }

      let completed = g.isCompleted;
      if (newProgress >= g.target && !completed) {
        completed = true;
        triggerConfetti();
      }

      if (
        g.trackingType === "cumulative" ||
        g.trackingType === "count_toward"
      ) {
        const existingToday = newHistory.findIndex((h) => h.date === todayStr);
        if (existingToday >= 0) {
          newHistory[existingToday].value = newProgress;
        } else {
          newHistory.push({ date: todayStr, value: newProgress });
        }
      }

      return {
        ...g,
        progress: newProgress,
        history: newHistory.slice(-30),
        isCompleted: completed,
        lastLoggedDate: todayStr,
      };
    });
    window.dispatchEvent(new CustomEvent("neo-bounce"));
    saveData(newGoals);
  };

  const handleComplete = (id) => {
    const todayStr = getLocalYMD();
    const newGoals = goals.map((g) => {
      if (g.id === id) {
        triggerConfetti();
        window.dispatchEvent(new CustomEvent("neo-bounce"));
        return {
          ...g,
          progress: g.target || 1,
          isCompleted: true,
          lastLoggedDate: todayStr,
          history: [
            ...g.history,
            { date: todayStr, value: g.target || 1 },
          ].slice(-30),
        };
      }
      return g;
    });
    saveData(newGoals);
  };

  const handleUndo = (id) => {
    const todayStr = getLocalYMD();
    const newGoals = goals.map((g) => {
      if (g.id !== id) return g;

      let newHistory = [...g.history];
      let newProgress = g.progress;
      let completed = g.isCompleted;

      if (g.trackingType === "binary") {
        newProgress = 0;
        completed = false;
        newHistory = newHistory.filter((h) => h.date !== todayStr);
      } else if (g.trackingType === "count_toward") {
        newProgress = Math.max(0, newProgress - 1);
        if (newProgress < g.target) completed = false;

        const todayIdx = newHistory.findIndex((h) => h.date === todayStr);
        if (todayIdx >= 0) {
          if (newProgress === 0 && newHistory.length === 1) {
            newHistory = [];
          } else {
            newHistory[todayIdx].value = newProgress;
          }
        }
      } else if (g.trackingType === "cumulative") {
        if (newHistory.length > 0) {
          newHistory.pop();
          newProgress =
            newHistory.length > 0 ? newHistory[newHistory.length - 1].value : 0;
          if (newProgress < g.target) completed = false;
        }
      } else if (g.trackingType === "daily_log") {
        const existingToday = newHistory.findIndex((h) => h.date === todayStr);
        if (existingToday >= 0) {
          newHistory.splice(existingToday, 1);
          if (newHistory.length === 0) {
            newProgress = 0;
          } else {
            newProgress =
              newHistory.reduce((acc, h) => acc + h.value, 0) /
              newHistory.length;
          }
          if (newProgress < g.target) completed = false;
        }
      }

      return {
        ...g,
        progress: newProgress,
        history: newHistory,
        isCompleted: completed,
      };
    });
    saveData(newGoals);
  };

  const handleTogglePause = (id) => {
    const newGoals = goals.map((g) => {
      if (g.id === id) {
        const now = Date.now();
        if (g.paused) {
          return {
            ...g,
            paused: false,
            pausedAt: null,
            totalPausedMs:
              (g.totalPausedMs || 0) +
              (g.pausedAt
                ? Math.max(0, now - new Date(g.pausedAt).getTime())
                : 0),
          };
        } else {
          return { ...g, paused: true, pausedAt: new Date(now).toISOString() };
        }
      }
      return g;
    });
    saveData(newGoals);
  };

  const handleDelete = (id) => {
    saveData(goals.filter((g) => g.id !== id));
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#4ade80", "#60a5fa", "#f472b6", "#a78bfa"],
    });
  };

  return (
    <div className="w-full max-w-md z-10 flex flex-col gap-4">
      <div className="flex justify-between items-center pr-14">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          Goals
        </h1>
      </div>

      {!isAdding && (
        <button
          onClick={() => {
            setIsAdding(true);
          }}
          className="fixed bottom-28 right-6 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex items-center justify-center transition-transform active:scale-95 z-[50]"
        >
          <svg
            className="w-6 h-6"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-[var(--bg-card)]/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-[var(--border)]/50 animate-fade-in-down my-8">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-5 text-center">
              {editingGoalId ? "Edit Goal" : "New Goal"}
            </h3>
            <form onSubmit={handleAddGoal} className="flex flex-col">
              <input
                type="text"
                placeholder="Goal Name (e.g. Read 500 Pages)"
                required
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl px-4 py-3 text-[15px] text-[var(--text-primary)] mb-4 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-gray-500"
              />
    
              <div className="flex gap-3 mb-4">
                <div className="w-1/2">
                  <label className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-1.5 pl-1">
                    Category
                  </label>
                  <select
                    value={newGoal.category}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, category: e.target.value })
                    }
                    className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none appearance-none"
                  >
                    <option value="Body">Body</option>
                    <option value="Performance">Performance</option>
                    <option value="Learning">Learning</option>
                    <option value="Life">Life</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-1.5 pl-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newGoal.dueDate}
                    onChange={(e) =>
                      setNewGoal({ ...newGoal, dueDate: e.target.value })
                    }
                    className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
    
              <div className="mb-4">
                <label className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-1.5 pl-1">
                  Tracking Type
                </label>
                <select
                  value={newGoal.trackingType}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, trackingType: e.target.value })
                  }
                  className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none appearance-none"
                >
                  <option value="count_toward">
                    Number of Times (e.g. 20 gym visits)
                  </option>
                  <option value="cumulative">Total Amount (e.g. 500 pages)</option>
                  <option value="daily_log">Daily Average (e.g. 175 lbs)</option>
                  <option value="binary">
                    Done / Not Done (e.g. Run a marathon)
                  </option>
                </select>
              </div>
    
              {newGoal.trackingType !== "binary" && (
                <div className="flex gap-3 mb-4">
                  <div className="w-1/2">
                    <label className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-1.5 pl-1">
                      Target
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={newGoal.target}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, target: e.target.value })
                      }
                      className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-1.5 pl-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. pages"
                      value={newGoal.unit}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, unit: e.target.value })
                      }
                      className="w-full bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl px-4 py-3 text-[14px] text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-gray-500"
                    />
                  </div>
                </div>
              )}
    
              <div className="mb-6">
                <label className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider block mb-2 pl-1">
                  Link to Daily Rituals (Optional)
                </label>
                <div className="bg-[var(--bg-primary)]/50 border border-[var(--border)]/30 rounded-xl p-2 max-h-32 overflow-y-auto flex flex-col gap-1">
                  {availableHabits.length === 0 && (
                    <span className="text-xs text-[var(--text-muted)] p-2">
                      No rituals found.
                    </span>
                  )}
                  {availableHabits.map((h) => (
                    <label
                      key={h.id}
                      className="flex items-center gap-3 text-[14px] text-[var(--text-primary)] font-medium p-2 cursor-pointer hover:bg-[var(--bg-card)]/50 rounded-lg transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={newGoal.linkedHabitIds.includes(h.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGoal({
                              ...newGoal,
                              linkedHabitIds: [...newGoal.linkedHabitIds, h.id],
                            });
                          } else {
                            setNewGoal({
                              ...newGoal,
                              linkedHabitIds: newGoal.linkedHabitIds.filter(
                                (id) => id !== h.id,
                              ),
                            });
                          }
                        }}
                        className="accent-indigo-500 rounded-sm w-4 h-4 focus:ring-indigo-500 bg-[var(--bg-primary)] border-[var(--border)]"
                      />
                      <span>{h.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2 leading-tight pl-1">
                  If linked, completing any of the selected rituals will
                  automatically log progress here.
                </p>
              </div>
    
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-1/3 bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-medium py-3.5 rounded-xl transition-all active:scale-95 flex justify-center items-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-indigo-500/90 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-[15px] transition-all active:scale-95 shadow-lg"
                >
                  {editingGoalId ? "Save Changes" : "Create Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {goals.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] text-center px-4">
            <svg
              className="w-16 h-16 text-[var(--text-secondary)] mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              ></path>
            </svg>
            <p className="text-[15px] font-medium text-[var(--text-secondary)]">
              No goals set yet.
            </p>
            <p className="text-[13px] mt-1.5">
              Tap the button above to create your first goal.
            </p>
          </div>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onLog={handleLog}
              onComplete={handleComplete}
              onUndo={handleUndo}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onTogglePause={handleTogglePause}
            />
          ))
        )}
      </div>
    </div>
  );
}
