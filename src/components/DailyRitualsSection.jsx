import React, { useState, useEffect } from 'react';
import { logCompletion, removeCompletionToday, syncStateToBackend, syncMonthlyGoalProgress } from '../utils';
import { checkAndUnlockBadges } from '../utils/badgeUtils';
import confetti from 'canvas-confetti';

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Drink Water', goal: 8, unit: 'glasses', count: 0, streak: 0, lastCompletedDate: null, reminderEnabled: false, reminderTime: '09:00', type: 'countable' },
  { id: 'h2', name: 'Exercise', goal: 1, unit: 'session', count: 0, streak: 0, lastCompletedDate: null, reminderEnabled: false, reminderTime: '09:00', type: 'one_time' },
  { id: 'h3', name: 'Sleep Early', count: 0, streak: 0, lastCompletedDate: null, reminderEnabled: false, reminderTime: '22:00', type: 'time_locked', targetTime: '22:00', graceWindow: 30 },
  { id: 'h4', name: 'Wake up Early', count: 0, streak: 0, lastCompletedDate: null, reminderEnabled: true, reminderTime: '05:30', type: 'time_locked', targetTime: '05:30', graceWindow: 30 }
];

const getLocalYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayYMD = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatTime12h = (time24) => {
  if (!time24) return '';
  const [hourStr, minute] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12; // Convert 0 to 12
  return `${hour}:${minute} ${ampm}`;
};

export default function DailyRitualsSection() {
  const [habits, setHabits] = useState([]);
  const [lastResetDate, setLastResetDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', goal: '', unit: '', type: 'countable', targetTime: '09:00', graceWindow: '30' });

  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editHabitData, setEditHabitData] = useState({ name: '', goal: '', unit: '', type: 'countable', targetTime: '09:00', graceWindow: '30', reminderEnabled: false, reminderType: 'fixed', reminderTime: '09:00', reminderInterval: 2, reminderIntervalUnit: 'hours' });
  const [expandedHabitId, setExpandedHabitId] = useState(null);
  const [bigNumberInputs, setBigNumberInputs] = useState({});
  const [now, setNow] = useState(new Date());

  const getWindowBounds = (targetTimeStr, graceMins, baseDate) => {
    const [th, tm] = targetTimeStr.split(':').map(Number);
    const targetDate = new Date(baseDate);
    targetDate.setHours(th, tm, 0, 0);
    const start = new Date(targetDate.getTime() - graceMins * 60000);
    const end = new Date(targetDate.getTime() + graceMins * 60000);
    return { start, end };
  };

  const getTimeLockedStatus = (habit, currentNow) => {
    if (!habit.targetTime) return 'open';
    const { start, end } = getWindowBounds(habit.targetTime, habit.graceWindow || 30, currentNow);
    if (currentNow < start) return 'before';
    if (currentNow > end) return 'missed';
    return 'open';
  };

  // Load from local storage and handle daily reset
  useEffect(() => {
    const savedDataStr = localStorage.getItem('pinboard_rituals_data');
    let loadedHabits = DEFAULT_HABITS;
    let loadedResetDate = getLocalYMD();

    if (savedDataStr) {
      try {
        const savedData = JSON.parse(savedDataStr);
        loadedHabits = savedData.habits || DEFAULT_HABITS;
        loadedResetDate = savedData.lastResetDate || getLocalYMD();
      } catch (e) {
        console.error("Failed to parse rituals data", e);
      }
    }

    const todayStr = getLocalYMD();
    const yesterdayStr = getYesterdayYMD();

    // Reset counts if it's a new day
    if (loadedResetDate !== todayStr) {
      loadedHabits = loadedHabits.map(habit => {
        let newStreak = habit.streak;
        if (habit.lastCompletedDate !== yesterdayStr && habit.lastCompletedDate !== todayStr) {
          newStreak = 0;
        }
        return {
          ...habit,
          count: 0,
          streak: newStreak,
          failedDate: null
        };
      });
      loadedResetDate = todayStr;
    }

    setHabits(loadedHabits);
    setLastResetDate(loadedResetDate);

    // Setup 1-minute ticker for time-locked habits
    const interval = setInterval(() => {
      const currentNow = new Date();
      setNow(currentNow);

      setHabits(current => {
        let changed = false;
        const next = current.map(h => {
          if (h.type === 'time_locked') {
            const status = getTimeLockedStatus(h, currentNow);
            if (status === 'missed' && h.lastCompletedDate !== todayStr && h.failedDate !== todayStr) {
              changed = true;
              return { ...h, streak: 0, failedDate: todayStr };
            }
          }
          return h;
        });
        return changed ? next : current;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Save to local storage whenever habits or reset date changes
  useEffect(() => {
    if (lastResetDate) {
      const dataToSave = {
        habits,
        lastResetDate
      };
      localStorage.setItem('pinboard_rituals_data', JSON.stringify(dataToSave));
      // Check badges after a state change is saved
      checkAndUnlockBadges();
      syncStateToBackend();
    }
  }, [habits, lastResetDate]);

  const handleTap = (id) => {
    const todayStr = getLocalYMD();
    const targetHabit = habits.find(h => h.id === id);
    if (!targetHabit) return;

    // Call sync exactly once (avoiding React Strict Mode double-invocation of state updaters)
    syncMonthlyGoalProgress(id, 1);
    
    setHabits(currentHabits => currentHabits.map(habit => {
      if (habit.id === id) {
        const newCount = habit.count + 1;
        let newStreak = habit.streak;
        let newLastCompletedDate = habit.lastCompletedDate;

        if (newCount === habit.goal && habit.lastCompletedDate !== todayStr) {
          newStreak += 1;
          newLastCompletedDate = todayStr;
          logCompletion('habit', id);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        return {
          ...habit,
          count: newCount,
          streak: newStreak,
          lastCompletedDate: newLastCompletedDate
        };
      }
      return habit;
    }));
  };

  const handleUndo = (id) => {
    const todayStr = getLocalYMD();
    const targetHabit = habits.find(h => h.id === id);
    if (!targetHabit || targetHabit.count === 0) return;

    if (targetHabit.type === 'big_number') {
      syncMonthlyGoalProgress(id, -targetHabit.count);
    } else {
      syncMonthlyGoalProgress(id, -1);
    }
    
    setHabits(currentHabits => currentHabits.map(habit => {
      if (habit.id === id && habit.count > 0) {
        let newCount = habit.count - 1;
        if (habit.type === 'one_time' || habit.type === 'time_locked' || habit.type === 'big_number') {
          newCount = 0; // completely undo
        }

        let newStreak = habit.streak;
        let newLastCompletedDate = habit.lastCompletedDate;

        if (habit.count >= habit.goal && newCount < habit.goal && habit.lastCompletedDate === todayStr) {
          newStreak = Math.max(0, newStreak - 1);
          newLastCompletedDate = '';
          removeCompletionToday('habit', id);
        }

        return {
          ...habit,
          count: newCount,
          streak: newStreak,
          lastCompletedDate: newLastCompletedDate
        };
      }
      return habit;
    }));
  };

  const handleLogBigNumber = (id, e) => {
    e.preventDefault();
    const val = parseInt(bigNumberInputs[id], 10);
    if (!val || val <= 0) return;

    const targetHabit = habits.find(h => h.id === id);
    if (!targetHabit) return;

    syncMonthlyGoalProgress(id, val - targetHabit.count);

    const todayStr = getLocalYMD();
    setHabits(currentHabits => currentHabits.map(habit => {
      if (habit.id === id) {
        const newCount = val;
        let newStreak = habit.streak;
        let newLastCompletedDate = habit.lastCompletedDate;

        if (newCount >= habit.goal && habit.lastCompletedDate !== todayStr) {
          newStreak += 1;
          newLastCompletedDate = todayStr;
          logCompletion('habit', id);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        return {
          ...habit,
          count: newCount,
          streak: newStreak,
          lastCompletedDate: newLastCompletedDate
        };
      }
      return habit;
    }));
    setBigNumberInputs(prev => ({ ...prev, [id]: '' }));
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newHabit.name) return;
    if ((newHabit.type === 'countable' || newHabit.type === 'big_number') && (!newHabit.goal || !newHabit.unit)) return;

    const habit = {
      id: `custom_${Date.now()}`,
      name: newHabit.name,
      type: newHabit.type,
      count: 0,
      streak: 0,
      lastCompletedDate: null,
      failedDate: null,
      reminderEnabled: false,
      reminderType: 'fixed',
      reminderTime: '09:00',
      reminderInterval: 2,
      reminderIntervalUnit: 'hours'
    };

    if (newHabit.type === 'countable' || newHabit.type === 'big_number') {
      habit.goal = parseInt(newHabit.goal, 10);
      habit.unit = newHabit.unit;
    } else if (newHabit.type === 'time_locked') {
      habit.targetTime = newHabit.targetTime;
      habit.graceWindow = parseInt(newHabit.graceWindow, 10) || 30;
      habit.goal = 1;
    } else if (newHabit.type === 'one_time') {
      habit.goal = 1;
    }

    setHabits([...habits, habit]);
    setNewHabit({ name: '', goal: '', unit: '', type: 'countable', targetTime: '09:00', graceWindow: '30' });
    setIsAdding(false);
  };

  const handleDeleteHabit = (id) => {
    setHabits(currentHabits => currentHabits.filter(h => h.id !== id));
  };

  const startEditHabit = (habit) => {
    setEditingHabitId(habit.id);
    setEditHabitData({
      name: habit.name,
      type: habit.type || 'countable',
      goal: habit.goal || '',
      unit: habit.unit || '',
      targetTime: habit.targetTime || '09:00',
      graceWindow: habit.graceWindow || '30',
      reminderEnabled: habit.reminderEnabled || false,
      reminderType: habit.reminderType || 'fixed',
      reminderTime: habit.reminderTime || '09:00',
      reminderInterval: habit.reminderInterval || 2,
      reminderIntervalUnit: habit.reminderIntervalUnit || 'hours'
    });
  };

  const saveEditHabit = (e) => {
    e.preventDefault();
    if (!editHabitData.name) return;

    setHabits(currentHabits => currentHabits.map(h => {
      if (h.id !== editingHabitId) return h;

      const updated = {
        ...h,
        name: editHabitData.name,
        type: editHabitData.type,
        reminderEnabled: editHabitData.reminderEnabled,
        reminderType: editHabitData.reminderType || 'fixed',
        reminderTime: editHabitData.reminderTime,
        reminderInterval: editHabitData.reminderInterval === '' ? 2 : parseInt(editHabitData.reminderInterval, 10),
        reminderIntervalUnit: editHabitData.reminderIntervalUnit || 'hours'
      };

      if (editHabitData.type === 'countable' || editHabitData.type === 'big_number') {
        updated.goal = parseInt(editHabitData.goal, 10);
        updated.unit = editHabitData.unit;
      } else if (editHabitData.type === 'time_locked') {
        updated.targetTime = editHabitData.targetTime;
        updated.graceWindow = parseInt(editHabitData.graceWindow, 10) || 30;
      }

      return updated;
    }));
    setEditingHabitId(null);
  };

  return (
    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-5 z-10 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Daily Rituals
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-md transition-all active:scale-95"
        >
          {isAdding ? 'Cancel' : '+ Custom'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddCustom} className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700 animate-fade-in-down">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Add Custom Ritual</h3>

          <select
            value={newHabit.type}
            onChange={e => setNewHabit({ ...newHabit, type: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white mb-2 focus:border-emerald-500 focus:outline-none"
          >
            <option value="countable">Countable (e.g. 8 glasses of water)</option>
            <option value="one_time">One-time (e.g. Exercise)</option>
            <option value="time_locked">Time-locked (e.g. Wake up early)</option>
            <option value="big_number">Big Number (e.g. 10000 steps)</option>
          </select>

          <input
            type="text"
            placeholder="Ritual Name"
            required
            value={newHabit.name}
            onChange={e => setNewHabit({ ...newHabit, name: e.target.value })}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white mb-2 focus:border-emerald-500 focus:outline-none"
          />

          {(newHabit.type === 'countable' || newHabit.type === 'big_number') && (
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                placeholder="Goal (e.g. 20)"
                required
                min="1"
                value={newHabit.goal}
                onChange={e => setNewHabit({ ...newHabit, goal: e.target.value })}
                className="w-1/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Unit (e.g. pages)"
                required
                value={newHabit.unit}
                onChange={e => setNewHabit({ ...newHabit, unit: e.target.value })}
                className="w-2/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {newHabit.type === 'time_locked' && (
            <div className="flex gap-2 mb-3">
              <div className="w-1/2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Target Time</label>
                <input
                  type="time"
                  required
                  value={newHabit.targetTime}
                  onChange={e => setNewHabit({ ...newHabit, targetTime: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div className="w-1/2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Grace Window (mins)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newHabit.graceWindow}
                  onChange={e => setNewHabit({ ...newHabit, graceWindow: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button type="submit" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-sm font-medium transition-all active:scale-95">
            Add Ritual
          </button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <svg className="w-16 h-16 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
            </svg>
            <p className="text-sm">No rituals found. Start building one!</p>
          </div>
        ) : (
          habits.map(habit => {
            const progressPercent = Math.min(100, Math.round((habit.count / habit.goal) * 100));
            const isCompleted = habit.count >= habit.goal;

            return (
              <div key={habit.id} className={`p-4 rounded-lg border transition-all duration-300 ${isCompleted ? 'bg-emerald-900/20 border-emerald-800/50' : 'bg-gray-800 border-gray-700'}`}>
                {editingHabitId === habit.id ? (
                  <form onSubmit={saveEditHabit} className="animate-fade-in-down">
                    <h3 className="text-sm font-medium text-emerald-400 mb-3">Edit Ritual</h3>
                    <select
                      value={editHabitData.type}
                      onChange={e => setEditHabitData({ ...editHabitData, type: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white mb-2 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="countable">Countable</option>
                      <option value="one_time">One-time</option>
                      <option value="time_locked">Time-locked</option>
                      <option value="big_number">Big Number</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ritual Name"
                      required
                      value={editHabitData.name}
                      onChange={e => setEditHabitData({ ...editHabitData, name: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white mb-2 focus:border-emerald-500 focus:outline-none"
                    />

                    {(editHabitData.type === 'countable' || editHabitData.type === 'big_number') && (
                      <div className="flex gap-2 mb-3">
                        <input
                          type="number"
                          placeholder="Goal"
                          required
                          min="1"
                          value={editHabitData.goal}
                          onChange={e => setEditHabitData({ ...editHabitData, goal: e.target.value })}
                          className="w-1/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Unit"
                          required
                          value={editHabitData.unit}
                          onChange={e => setEditHabitData({ ...editHabitData, unit: e.target.value })}
                          className="w-2/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {editHabitData.type === 'time_locked' && (
                      <div className="flex gap-2 mb-3">
                        <div className="w-1/2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Target Time</label>
                          <input
                            type="time"
                            required
                            value={editHabitData.targetTime}
                            onChange={e => setEditHabitData({ ...editHabitData, targetTime: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none [color-scheme:dark]"
                          />
                        </div>
                        <div className="w-1/2">
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Grace Window (mins)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={editHabitData.graceWindow}
                            onChange={e => setEditHabitData({ ...editHabitData, graceWindow: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0">Enable Reminder</label>
                        <button
                          type="button"
                          onClick={() => setEditHabitData({ ...editHabitData, reminderEnabled: !editHabitData.reminderEnabled })}
                          className={`w-10 h-5 rounded-full transition-colors relative ${editHabitData.reminderEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${editHabitData.reminderEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                      </div>

                      {editHabitData.reminderEnabled && (
                        <>
                          <div className="animate-fade-in-down flex items-center justify-between pt-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0">Reminder Type</label>
                            <select
                              value={editHabitData.reminderType || 'fixed'}
                              onChange={e => setEditHabitData({ ...editHabitData, reminderType: e.target.value })}
                              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                            >
                              <option value="fixed">Fixed Time</option>
                              <option value="interval">Time Interval</option>
                            </select>
                          </div>
                          
                          {(!editHabitData.reminderType || editHabitData.reminderType === 'fixed') && (
                            <div className="animate-fade-in-down flex items-center justify-between pt-1">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0">Time</label>
                              <input
                                type="time"
                                value={editHabitData.reminderTime}
                                onChange={e => setEditHabitData({ ...editHabitData, reminderTime: e.target.value })}
                                className="bg-gray-900 border border-gray-600 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                              />
                            </div>
                          )}

                          {editHabitData.reminderType === 'interval' && (
                            <div className="animate-fade-in-down flex items-center justify-between pt-1">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0">Every</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={editHabitData.reminderInterval === '' ? '' : editHabitData.reminderInterval}
                                  onChange={e => setEditHabitData({ ...editHabitData, reminderInterval: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                                  className="bg-gray-900 w-16 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                                />
                                <select
                                  value={editHabitData.reminderIntervalUnit || 'hours'}
                                  onChange={e => setEditHabitData({ ...editHabitData, reminderIntervalUnit: e.target.value })}
                                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="hours">Hours</option>
                                  <option value="minutes">Minutes</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-sm font-medium transition-all active:scale-95">
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingHabitId(null)} className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-medium transition-all active:scale-95">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <button
                          onClick={() => setExpandedHabitId(expandedHabitId === habit.id ? null : habit.id)}
                          className={`font-semibold mt-0.5 text-left transition-colors hover:text-emerald-300 focus:outline-none ${isCompleted ? 'text-emerald-400' : 'text-gray-100'}`}
                        >
                          {habit.name}
                        </button>

                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                          {habit.type === 'countable' && <span>{habit.count} / {habit.goal} {habit.unit}</span>}
                          {habit.type === 'big_number' && <span>{habit.count} / {habit.goal} {habit.unit}</span>}
                          {habit.type === 'time_locked' && <span>Target: {formatTime12h(habit.targetTime)} (±{habit.graceWindow}m)</span>}
                          {habit.type === 'one_time' && <span>One-time ritual</span>}

                          {habit.reminderEnabled && habit.reminderType !== 'interval' && habit.reminderTime && (
                            <span className="text-emerald-500/70 text-[10px] bg-emerald-900/30 px-1.5 py-0.5 rounded" title="Reminder Active">
                              @{formatTime12h(habit.reminderTime)}
                            </span>
                          )}
                          {habit.reminderEnabled && habit.reminderType === 'interval' && (
                            <span className="text-emerald-500/70 text-[10px] bg-emerald-900/30 px-1.5 py-0.5 rounded" title="Reminder Active">
                              Every {habit.reminderInterval || 2}{habit.reminderIntervalUnit === 'minutes' ? 'm' : 'h'}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex gap-2">
                          {habit.count > 0 && (
                            <button
                              onClick={() => handleUndo(habit.id)}
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-transform active:scale-90 bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                              title="Undo"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                            </button>
                          )}

                          {/* Countable UI */}
                          {habit.type === 'countable' && (
                            <button
                              onClick={() => handleTap(habit.id)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-transform active:scale-90 ${isCompleted ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                            >
                              +1
                            </button>
                          )}

                          {/* One-time UI */}
                          {habit.type === 'one_time' && !isCompleted && (
                            <button
                              onClick={() => handleTap(habit.id)}
                              className="h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm transition-transform active:scale-95 bg-gray-700 text-gray-200 hover:bg-gray-600"
                            >
                              Mark Done
                            </button>
                          )}
                          {habit.type === 'one_time' && isCompleted && (
                            <div className="h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-500 text-emerald-950">
                              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              Done
                            </div>
                          )}

                          {/* Time-locked UI */}
                          {habit.type === 'time_locked' && (
                            () => {
                              const status = getTimeLockedStatus(habit, now);
                              if (isCompleted) {
                                return (
                                  <div className="h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-500 text-emerald-950">
                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Done
                                  </div>
                                );
                              }
                              if (status === 'before') {
                                const { start } = getWindowBounds(habit.targetTime, habit.graceWindow || 30, now);
                                return (
                                  <div className="h-10 px-3 rounded-full flex items-center justify-center font-semibold text-xs bg-gray-800 text-gray-500 border border-gray-700">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    Opens {formatTime12h(`${start.getHours()}:${start.getMinutes()}`)}
                                  </div>
                                );
                              }
                              if (status === 'missed') {
                                return (
                                  <div className="h-10 px-3 rounded-full flex items-center justify-center font-semibold text-xs bg-red-900/30 text-red-500 border border-red-900/50">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    Missed
                                  </div>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handleTap(habit.id)}
                                  className="h-10 px-4 rounded-full flex items-center justify-center font-bold text-sm transition-transform active:scale-95 bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                                >
                                  Mark Done
                                </button>
                              );
                            }
                          )()}
                        </div>
                        {habit.streak > 0 && (
                          <span className="text-xs font-bold text-orange-400 flex items-center gap-1" title="Current Streak">
                            🔥 {habit.streak}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Big Number Form */}
                    {habit.type === 'big_number' && !isCompleted && (
                      <form onSubmit={(e) => handleLogBigNumber(habit.id, e)} className="flex gap-2 mt-2 mb-2">
                        <input
                          type="number"
                          min="1"
                          placeholder={`Log ${habit.unit}...`}
                          value={bigNumberInputs[habit.id] || ''}
                          onChange={(e) => setBigNumberInputs({ ...bigNumberInputs, [habit.id]: e.target.value })}
                          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
                          Log
                        </button>
                      </form>
                    )}

                    {/* Action Buttons when Expanded */}
                    {expandedHabitId === habit.id && (
                      <div className="flex items-center gap-2 mt-3 mb-2 animate-fade-in-down border-t border-gray-700/50 pt-3">
                        <button
                          onClick={() => startEditHabit(habit)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-300 bg-gray-700/50 hover:bg-gray-700 hover:text-gray-100 rounded text-xs transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 bg-gray-700/50 hover:bg-red-900/40 hover:text-red-400 rounded text-xs transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          Delete
                        </button>
                      </div>
                    )}

                    {/* Progress Bar for Countable and Big Number */}
                    {(habit.type === 'countable' || habit.type === 'big_number') && (
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-400/70'}`}
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
    </div>
  );
}
