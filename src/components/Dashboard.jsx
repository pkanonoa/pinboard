import React, { useState, useEffect, useMemo } from 'react';
import { Target, Repeat, ClipboardList, X } from 'lucide-react';
import { getLocalYMD, getUserStats, logCompletion } from '../utils';
import { checkAndUnlockBadges } from '../utils/badgeUtils';
import { generateSuggestions, dismissSuggestion } from '../utils/smartSuggestions';
import NeoAvatar from './NeoAvatar';

const DEFAULT_SAMPLE_HABITS = [
  { id: 'h4', name: 'Wake up early', goal: 1, unit: 'session', count: 0, streak: 0, failedDate: getLocalYMD(), type: 'time_locked' },
  { id: 'h1', name: 'Drink water', goal: 8, unit: 'glasses', count: 0, streak: 0, type: 'counter' },
  { id: 'h2', name: 'Exercise', goal: 1, unit: 'session', count: 0, streak: 0, type: 'one_time' }
];

export default function Dashboard({ setCurrentTab }) {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [monthlyGoals, setMonthlyGoals] = useState([]);
  const [stats, setStats] = useState(() => getUserStats());
  const [completionLog, setCompletionLog] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pinboard_dismissed_suggestions') || '[]')); }
    catch (e) { return new Set(); }
  });
  const [promptDismissed, setPromptDismissed] = useState(() => {
    const dismissedAt = localStorage.getItem('goalPromptDismissedAt');
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      return elapsed < 3 * 24 * 60 * 60 * 1000;
    }
    return false;
  });

  const loadAllData = () => {
    const savedTasks = localStorage.getItem('pinboard_tasks');
    if (savedTasks) {
      try { setTasks(JSON.parse(savedTasks)); } catch (e) {}
    }

    const savedRitualsStr = localStorage.getItem('pinboard_rituals_data');
    if (savedRitualsStr) {
      try {
        const savedData = JSON.parse(savedRitualsStr);
        setHabits(savedData.habits || []);
      } catch (e) {}
    }

    const savedGoals = localStorage.getItem('pinboard_goals');
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals);
        if (Array.isArray(parsed)) setMonthlyGoals(parsed);
      } catch (e) {}
    }

    try {
      const log = JSON.parse(localStorage.getItem('pinboard_completion_log') || '[]');
      setCompletionLog(Array.isArray(log) ? log : []);
    } catch (e) { setCompletionLog([]); }

    setStats(getUserStats());
  };

  useEffect(() => {
    loadAllData();

    window.addEventListener('pinboard_goals_updated', loadAllData);
    return () => window.removeEventListener('pinboard_goals_updated', loadAllData);
  }, []);

  const todayStr = getLocalYMD();

  // Metrics
  const completedTasksToday = tasks.filter(t => t.done && t.completedDate === todayStr).length;
  const habitsDoneToday = habits.filter(h => h.count >= h.goal && h.lastCompletedDate === todayStr && !h.paused).length;
  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak || 0)) : 0;

  // Goal pace calculation (client-side)
  const goalPaceList = monthlyGoals.filter(g => !g.isCompleted).map(g => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const progress = g.progress || 0;
    const target = g.target || 1;
    const progressPct = progress / target;
    const expectedPct = daysPassed / daysInMonth;
    const pace = expectedPct > 0 ? progressPct / expectedPct : (progressPct > 0 ? 999 : 0);
    let status = 'on_track';
    if (pace < 0.6) status = 'behind';
    else if (pace < 0.9) status = 'at_risk';
    return { ...g, status };
  });
  const allGoalsOnTrack = goalPaceList.length > 0 && goalPaceList.every(g => g.status === 'on_track');

  // Level & Points calculation
  const points = stats.points || 0;
  const currentLevelName = stats.currentLevel?.name || 'Beginner';
  const pointsToNextLevel = stats.currentLevel?.max
    ? Math.max(0, stats.currentLevel.max + 1 - points)
    : 101;

  // Active Goal calculation (most recently created/updated)
  const sortedGoals = [...monthlyGoals].sort((a, b) => {
    const timeA = new Date(a.lastLoggedDate || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastLoggedDate || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  const activeGoal = sortedGoals[0];
  let goalName = '';
  let goalProgressPct = 0;
  if (activeGoal) {
    goalName = activeGoal.name;
    if (activeGoal.target > 0) {
      goalProgressPct = Math.min(100, Math.round(((activeGoal.progress || 0) / activeGoal.target) * 100));
    } else {
      goalProgressPct = activeGoal.isCompleted ? 100 : 0;
    }
  }

  // Smart suggestions (useMemo, only when ≥14 days of data)
  const suggestions = useMemo(
    () => generateSuggestions(habits, tasks, monthlyGoals, completionLog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, tasks, monthlyGoals, completionLog, dismissedIds]
  );
  const visibleSuggestions = suggestions;

  const handleDismissSuggestion = (id) => {
    dismissSuggestion(id);
    setDismissedIds(prev => new Set([...prev, id]));
  };

  // Route action button taps
  const handleSuggestionAction = (suggestion) => {
    if (suggestion.action.type === 'dismiss') {
      handleDismissSuggestion(suggestion.id);
      return;
    }

    if (suggestion.action.label === 'Unpause' && suggestion.habitId) {
      // 1. Unpause habit instantly
      const savedDataStr = localStorage.getItem('pinboard_rituals_data');
      if (savedDataStr) {
        try {
          const savedData = JSON.parse(savedDataStr);
          savedData.habits = (savedData.habits || []).map(h => {
            if (h.id === suggestion.habitId) {
              return { ...h, paused: false, pausedAt: null, resumeDate: null };
            }
            return h;
          });
          localStorage.setItem('pinboard_rituals_data', JSON.stringify(savedData));
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Unpause linked goals instantly
      try {
        const savedGoals = localStorage.getItem('pinboard_goals');
        if (savedGoals) {
          const goals = JSON.parse(savedGoals);
          let changed = false;
          const updatedGoals = goals.map(g => {
            if ((g.linkedHabitId === suggestion.habitId || g.linkedHabitIds?.includes(suggestion.habitId)) && g.paused) {
              changed = true;
              return { ...g, paused: false, pausedAt: null };
            }
            return g;
          });
          if (changed) {
            localStorage.setItem('pinboard_goals', JSON.stringify(updatedGoals));
            window.dispatchEvent(new Event('pinboard_goals_updated'));
          }
        }
      } catch (e) {}

      // 3. Dispatch global reload event and refresh dashboard state
      window.dispatchEvent(new Event('pinboard_rituals_updated'));
      loadAllData();
      handleDismissSuggestion(suggestion.id);
      return;
    }

    // For other actions (e.g. 'add_reminder', 'adjust_goal', 'pause'):
    if (suggestion.habitId) {
      if (suggestion.action.type === 'pause') {
        sessionStorage.setItem('pinboard_pending_pause_habit', suggestion.habitId);
      } else {
        sessionStorage.setItem('pinboard_pending_edit_habit', suggestion.habitId);
      }
    }
    setCurrentTab('rituals');
    handleDismissSuggestion(suggestion.id);
  };

  // Today's Rituals list
  const displayHabits = habits.length > 0 ? habits.slice(0, 3) : DEFAULT_SAMPLE_HABITS;

  // Up Next Task calculation
  const pendingTasks = tasks.filter(t => !t.done);
  const upNextTask = pendingTasks.length > 0 ? pendingTasks[0] : null;

  const formatTaskTime = (task) => {
    if (!task) return '4:00 PM';
    if (task.time) return task.time;
    if (task.dueDate) {
      try {
        const d = new Date(task.dueDate);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
      } catch (e) {}
    }
    return '4:00 PM';
  };

  // Quick mark habit done from Home
  const handleQuickMarkDone = (habitId) => {
    const updated = habits.map(h => {
      if (h.id === habitId) {
        return {
          ...h,
          count: h.goal || 1,
          lastCompletedDate: todayStr,
          streak: (h.streak || 0) + 1
        };
      }
      return h;
    });

    setHabits(updated);
    try {
      const savedDataStr = localStorage.getItem('pinboard_rituals_data');
      const savedData = savedDataStr ? JSON.parse(savedDataStr) : {};
      savedData.habits = updated;
      localStorage.setItem('pinboard_rituals_data', JSON.stringify(savedData));
    } catch (e) {}

    logCompletion('habit', habitId);
    window.dispatchEvent(new CustomEvent('neo_celebration'));
    checkAndUnlockBadges();
    setStats(getUserStats());
  };

  // Quick mark task complete from Home
  const handleQuickCompleteTask = (taskId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, done: true, completedDate: todayStr };
      }
      return t;
    });

    setTasks(updated);
    localStorage.setItem('pinboard_tasks', JSON.stringify(updated));

    logCompletion('task', taskId);
    window.dispatchEvent(new CustomEvent('neo_celebration'));
    checkAndUnlockBadges();
    setStats(getUserStats());
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-3.5 z-10 pb-8 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col pr-14 pt-1">
        {/* Level badge & points line */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-semibold px-3 py-1 rounded-full shadow-sm tracking-wide">
            {currentLevelName}
          </span>
          <div className="flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)]/80 px-3 py-1 rounded-full text-xs shadow-sm">
            <span className="text-[var(--warning)] font-bold">{points} pts</span>
            <span className="text-gray-600 font-bold">·</span>
            <span className="text-gray-300 font-medium">{pointsToNextLevel} to next level</span>
          </div>
        </div>
      </div>

      {/* Floating Neo */}
      <NeoAvatar
        habits={habits}
        tasks={tasks}
        allGoalsOnTrack={allGoalsOnTrack}
        suggestions={visibleSuggestions}
        onSuggestionAction={handleSuggestionAction}
        onDismissSuggestion={handleDismissSuggestion}
      />

      {/* Stat Tiles */}
      <div className="grid grid-cols-3 gap-3 mt-1">
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-2xl font-bold text-[var(--accent-purple)] leading-none">{completedTasksToday}</span>
          <span className="text-xs text-[var(--text-secondary)] font-medium mt-1.5">tasks</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-2xl font-bold text-[var(--success)] leading-none">{habitsDoneToday}</span>
          <span className="text-xs text-[var(--text-secondary)] font-medium mt-1.5">rituals</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl py-3.5 px-2 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-2xl font-bold text-[var(--warning)] leading-none">{bestStreak}</span>
          <span className="text-xs text-[var(--text-secondary)] font-medium mt-1.5">streak</span>
        </div>
      </div>

      {/* Active Goal Card */}
      {(!promptDismissed || monthlyGoals.length > 0) && (
        <div className={`border rounded-2xl p-4 shadow-sm transition-all ${
          monthlyGoals.length > 0 
            ? 'bg-[var(--bg-card)] border-[var(--border)]/60' 
            : 'border-dashed border-gray-700/60 bg-transparent'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--accent-purple)]" />
              <span className="text-sm font-semibold text-gray-200">Active goal</span>
            </div>
            <button 
              onClick={() => setCurrentTab('goals')}
              className="text-xs text-[var(--accent-purple)] hover:text-indigo-300 font-medium transition-colors"
            >
              View all
            </button>
          </div>

          {monthlyGoals.length > 0 ? (
            <>
              <div className="text-[15px] font-semibold text-[var(--text-primary)] mt-1.5 mb-2.5 truncate">
                {goalName}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800/90 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${goalProgressPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[var(--success)] shrink-0">
                  {goalProgressPct}%
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-2 px-1">
              <span className="text-2xl mb-1.5">🎯</span>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">No active goal yet</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4 max-w-[260px] leading-relaxed">
                Set one to track progress right from Home
              </p>
              <div className="flex items-center gap-3 w-full justify-center">
                <button
                  onClick={() => setCurrentTab('goals')}
                  className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-[var(--text-primary)] rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  Set a goal
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('goalPromptDismissedAt', Date.now().toString());
                    setPromptDismissed(true);
                  }}
                  className="px-3 py-1.5 text-[var(--text-secondary)] hover:text-gray-300 text-xs font-medium transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Rituals Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[var(--success)]" />
            <span className="text-sm font-semibold text-gray-200">Today's rituals</span>
          </div>
          <button 
            onClick={() => setCurrentTab('rituals')}
            className="text-xs text-[var(--accent-purple)] hover:text-indigo-300 font-medium transition-colors"
          >
            View all
          </button>
        </div>

        <div className="flex flex-col divide-y divide-gray-800/50">
          {displayHabits.map((ritual) => {
            const isMissed = ritual.failedDate === todayStr;
            const isDone = (ritual.count >= ritual.goal || ritual.lastCompletedDate === todayStr) && !isMissed;

            return (
              <div key={ritual.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                <span className={`text-sm font-medium ${isDone ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {ritual.name}
                </span>

                {isMissed ? (
                  <span className="bg-red-950/40 border border-red-800/40 text-[var(--danger)] text-xs px-2.5 py-0.5 rounded-lg font-medium">
                    Missed
                  </span>
                ) : isDone ? (
                  <span className="bg-emerald-950/40 border border-emerald-800/40 text-[var(--success)] text-xs px-2.5 py-0.5 rounded-lg font-medium">
                    Done
                  </span>
                ) : ritual.type === 'counter' || ritual.goal > 1 ? (
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {ritual.count || 0} / {ritual.goal}
                  </span>
                ) : (
                  <button
                    onClick={() => handleQuickMarkDone(ritual.id)}
                    className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-[var(--success)] text-xs px-3 py-1 rounded-lg font-medium transition-colors active:scale-95"
                  >
                    Mark done
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Up Next Task Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)]/60 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-[var(--accent-purple)]" />
          <span className="text-sm font-semibold text-gray-200">Up next</span>
        </div>

        {upNextTask ? (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button 
                onClick={() => handleQuickCompleteTask(upNextTask.id)}
                className="w-5 h-5 rounded-md border border-gray-600 hover:border-indigo-400 flex items-center justify-center transition-colors shrink-0 active:scale-90"
              />
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {upNextTask.name}
              </span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] shrink-0 ml-3 font-normal">
              {formatTaskTime(upNextTask)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-md border border-gray-600 shrink-0" />
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">Laundry</span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] shrink-0 ml-3 font-normal">4:00 PM</span>
          </div>
        )}
      </div>

    </div>
  );
}
