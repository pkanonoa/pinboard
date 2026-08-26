import React, { useState, useEffect } from 'react';
import { logCompletion, removeCompletionToday, syncStateToBackend } from '../utils';
import { checkAndUnlockBadges } from '../utils/badgeUtils';
import confetti from 'canvas-confetti';

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Drink Water', goal: 8, unit: 'glasses', count: 0, streak: 0, lastCompletedDate: null, reminderMode: 'off', reminderSettings: {} },
  { id: 'h2', name: 'Exercise', goal: 1, unit: 'session', count: 0, streak: 0, lastCompletedDate: null, reminderMode: 'off', reminderSettings: {} },
  { id: 'h3', name: 'Sleep Early', goal: 1, unit: 'time', count: 0, streak: 0, lastCompletedDate: null, reminderMode: 'off', reminderSettings: {} },
  { id: 'h4', name: 'Wake up Early', goal: 1, unit: 'time', count: 0, streak: 0, lastCompletedDate: null, reminderMode: 'fixed', reminderSettings: { hours: 2, times: ['05:30'] } }
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
  const [newHabit, setNewHabit] = useState({ name: '', goal: '', unit: '' });
  
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editHabitData, setEditHabitData] = useState({ name: '', goal: '', unit: '', reminderMode: 'off', reminderHours: 2, reminderTimes: ['09:00'] });
  const [expandedHabitId, setExpandedHabitId] = useState(null);

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
          streak: newStreak
        };
      });
      loadedResetDate = todayStr;
    }

    setHabits(loadedHabits);
    setLastResetDate(loadedResetDate);
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
    
    setHabits(currentHabits => currentHabits.map(habit => {
      if (habit.id === id && habit.count > 0) {
        const newCount = habit.count - 1;
        let newStreak = habit.streak;
        let newLastCompletedDate = habit.lastCompletedDate;

        if (habit.count === habit.goal && habit.lastCompletedDate === todayStr) {
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

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newHabit.name || !newHabit.goal || !newHabit.unit) return;

    const habit = {
      id: `custom_${Date.now()}`,
      name: newHabit.name,
      goal: parseInt(newHabit.goal, 10),
      unit: newHabit.unit,
      count: 0,
      streak: 0,
      lastCompletedDate: null,
      reminderMode: 'off',
      reminderSettings: {}
    };

    setHabits([...habits, habit]);
    setNewHabit({ name: '', goal: '', unit: '' });
    setIsAdding(false);
  };

  const handleDeleteHabit = (id) => {
    setHabits(currentHabits => currentHabits.filter(h => h.id !== id));
  };

  const startEditHabit = (habit) => {
    setEditingHabitId(habit.id);
    setEditHabitData({ 
      name: habit.name, 
      goal: habit.goal, 
      unit: habit.unit,
      reminderMode: habit.reminderMode || 'off',
      reminderHours: habit.reminderSettings?.hours || 2,
      reminderTimes: habit.reminderSettings?.times || ['09:00']
    });
  };

  const saveEditHabit = (e) => {
    e.preventDefault();
    if (!editHabitData.name || !editHabitData.goal || !editHabitData.unit) return;
    setHabits(currentHabits => currentHabits.map(h => 
      h.id === editingHabitId 
        ? { 
            ...h, 
            name: editHabitData.name, 
            goal: parseInt(editHabitData.goal, 10), 
            unit: editHabitData.unit,
            reminderMode: editHabitData.reminderMode,
            reminderSettings: { hours: editHabitData.reminderHours, times: editHabitData.reminderTimes }
          } 
        : h
    ));
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
          <input 
            type="text" 
            placeholder="Ritual Name (e.g. Read Book)" 
            required
            value={newHabit.name}
            onChange={e => setNewHabit({...newHabit, name: e.target.value})}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white mb-2 focus:border-emerald-500 focus:outline-none"
          />
          <div className="flex gap-2 mb-3">
            <input 
              type="number" 
              placeholder="Goal (e.g. 20)" 
              required
              min="1"
              value={newHabit.goal}
              onChange={e => setNewHabit({...newHabit, goal: e.target.value})}
              className="w-1/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
            <input 
              type="text" 
              placeholder="Unit (e.g. pages)" 
              required
              value={newHabit.unit}
              onChange={e => setNewHabit({...newHabit, unit: e.target.value})}
              className="w-2/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded text-sm font-medium transition-all active:scale-95">
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
                  <input 
                    type="text" 
                    placeholder="Ritual Name" 
                    required
                    value={editHabitData.name}
                    onChange={e => setEditHabitData({...editHabitData, name: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white mb-2 focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex gap-2 mb-3">
                    <input 
                      type="number" 
                      placeholder="Goal" 
                      required
                      min="1"
                      value={editHabitData.goal}
                      onChange={e => setEditHabitData({...editHabitData, goal: e.target.value})}
                      className="w-1/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Unit" 
                      required
                      value={editHabitData.unit}
                      onChange={e => setEditHabitData({...editHabitData, unit: e.target.value})}
                      className="w-2/3 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Reminder Mode</label>
                    <select
                      value={editHabitData.reminderMode}
                      onChange={e => setEditHabitData({...editHabitData, reminderMode: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 mb-2"
                    >
                      <option value="off">Off</option>
                      <option value="interval">Interval (Every X hours)</option>
                      <option value="smart">Smart (If inactive for X hours)</option>
                      <option value="fixed">Fixed Time</option>
                    </select>

                    {(editHabitData.reminderMode === 'interval' || editHabitData.reminderMode === 'smart') && (
                      <div className="animate-fade-in-down">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                          {editHabitData.reminderMode === 'interval' ? 'Remind every (hours)' : 'Remind if inactive for (hours)'}
                        </label>
                        <input 
                          type="number" 
                          min="1"
                          max="24"
                          value={editHabitData.reminderHours}
                          onChange={e => setEditHabitData({...editHabitData, reminderHours: parseInt(e.target.value, 10) || 1})}
                          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {editHabitData.reminderMode === 'fixed' && (
                      <div className="animate-fade-in-down">
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Time</label>
                        <input 
                          type="time" 
                          value={editHabitData.reminderTimes[0]}
                          onChange={e => setEditHabitData({...editHabitData, reminderTimes: [e.target.value]})}
                          className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                        />
                      </div>
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
                        <span>{habit.count} / {habit.goal} {habit.unit}</span>
                        {habit.reminderMode && habit.reminderMode !== 'off' && (
                          <span className="text-emerald-500/70 text-[10px] bg-emerald-900/30 px-1.5 py-0.5 rounded" title="Reminder Active">
                            {habit.reminderMode === 'interval' ? `Every ${habit.reminderSettings?.hours}h` : 
                             habit.reminderMode === 'smart' ? `Smart (${habit.reminderSettings?.hours}h)` : 
                             habit.reminderMode === 'fixed' && habit.reminderSettings?.times?.[0] ? `@${formatTime12h(habit.reminderSettings.times[0])}` : 
                             ''}
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
                            -1
                          </button>
                        )}
                        <button 
                          onClick={() => handleTap(habit.id)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-transform active:scale-90 ${isCompleted ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                        >
                          +1
                        </button>
                      </div>
                      {habit.streak > 0 && (
                        <span className="text-xs font-bold text-orange-400 flex items-center gap-1" title="Current Streak">
                          🔥 {habit.streak}
                        </span>
                      )}
                    </div>
                  </div>

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
              
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full transition-all duration-500 ease-out ${isCompleted ? 'bg-emerald-500' : 'bg-emerald-400/70'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
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
