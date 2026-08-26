import React, { useState, useEffect } from 'react';
import { logCompletion, removeCompletionToday } from '../utils';
import { checkAndUnlockBadges } from '../utils/badgeUtils';

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Drink Water', goal: 8, unit: 'glasses', count: 0, streak: 0, lastCompletedDate: null, reminderTime: null },
  { id: 'h2', name: 'Exercise', goal: 1, unit: 'session', count: 0, streak: 0, lastCompletedDate: null, reminderTime: null },
  { id: 'h3', name: 'Sleep Early', goal: 1, unit: 'time', count: 0, streak: 0, lastCompletedDate: null, reminderTime: null }
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
  const [editHabitData, setEditHabitData] = useState({ name: '', goal: '', unit: '' });

  // State for time picker
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [tempTime, setTempTime] = useState('');
  const [isSchedulingId, setIsSchedulingId] = useState(null);

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
      reminderTime: null
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
    setEditHabitData({ name: habit.name, goal: habit.goal, unit: habit.unit });
    setEditingReminderId(null);
  };

  const saveEditHabit = (e) => {
    e.preventDefault();
    if (!editHabitData.name || !editHabitData.goal || !editHabitData.unit) return;
    setHabits(currentHabits => currentHabits.map(h => 
      h.id === editingHabitId 
        ? { ...h, name: editHabitData.name, goal: parseInt(editHabitData.goal, 10), unit: editHabitData.unit } 
        : h
    ));
    setEditingHabitId(null);
  };

  const scheduleReminder = async (habitId, habitName, time) => {
    if (!('serviceWorker' in navigator)) return;
    
    setIsSchedulingId(habitId);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        setIsSchedulingId(null);
        return;
      }

      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          title: 'Daily Ritual Reminder',
          body: `Time to work on your habit: ${habitName}`,
          recurringTime: time,
          habitId: habitId
        })
      });
    } catch (e) {
      console.error('Failed to schedule recurring notification', e);
    } finally {
      setIsSchedulingId(null);
    }
  };

  const handleSaveReminder = async (id, name) => {
    setHabits(currentHabits => currentHabits.map(h => 
      h.id === id ? { ...h, reminderTime: tempTime } : h
    ));
    
    // Call API to schedule or clear
    await scheduleReminder(id, name, tempTime);
    setEditingReminderId(null);
  };

  const handleClearReminder = async (id, name) => {
    setHabits(currentHabits => currentHabits.map(h => 
      h.id === id ? { ...h, reminderTime: null } : h
    ));
    
    // Pass null/empty to API to clear it
    await scheduleReminder(id, name, null);
    setEditingReminderId(null);
  };

  const openTimePicker = (habit) => {
    setTempTime(habit.reminderTime || '09:00');
    setEditingReminderId(habit.id);
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
                      <div className="flex items-start gap-1 flex-wrap">
                        <h3 className={`font-semibold mr-1 mt-0.5 ${isCompleted ? 'text-emerald-400' : 'text-gray-100'}`}>
                          {habit.name}
                        </h3>
                        <div className="flex items-center flex-shrink-0 mt-0.5">
                          <button 
                            onClick={() => openTimePicker(habit)}
                            className={`p-1 rounded transition-colors ${habit.reminderTime ? 'text-emerald-400 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}
                            title={habit.reminderTime ? `Reminder set for ${formatTime12h(habit.reminderTime)}` : 'Set reminder'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </button>
                          
                          <button 
                            onClick={() => startEditHabit(habit)}
                            className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors ml-0.5"
                            title="Edit ritual"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded transition-colors ml-0.5"
                            title="Delete ritual"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{habit.count} / {habit.goal} {habit.unit}</span>
                        {habit.reminderTime && (
                          <span className="text-emerald-500/70 text-[10px] bg-emerald-900/30 px-1.5 py-0.5 rounded">
                            @{formatTime12h(habit.reminderTime)}
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

              {/* Time Picker Dropdown */}
              {editingReminderId === habit.id && (
                <div className="mt-3 mb-2 bg-gray-900 p-3 rounded-lg border border-gray-600 animate-fade-in-down flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={parseInt(tempTime.split(':')[0], 10) % 12 || 12}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const isPm = parseInt(tempTime.split(':')[0], 10) >= 12;
                        let h = val === 12 ? (isPm ? 12 : 0) : val + (isPm ? 12 : 0);
                        setTempTime(`${String(h).padStart(2, '0')}:${tempTime.split(':')[1]}`);
                      }}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {[...Array(12).keys()].map(i => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                    <span className="text-gray-400 font-bold">:</span>
                    <select
                      value={tempTime.split(':')[1]}
                      onChange={(e) => {
                        setTempTime(`${tempTime.split(':')[0]}:${e.target.value}`);
                      }}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                      {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={parseInt(tempTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                      onChange={(e) => {
                        const isPm = e.target.value === 'PM';
                        const currentHr12 = parseInt(tempTime.split(':')[0], 10) % 12 || 12;
                        let h = currentHr12 === 12 ? (isPm ? 12 : 0) : currentHr12 + (isPm ? 12 : 0);
                        setTempTime(`${String(h).padStart(2, '0')}:${tempTime.split(':')[1]}`);
                      }}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-emerald-500 ml-1"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSaveReminder(habit.id, habit.name)}
                      disabled={isSchedulingId === habit.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded transition-all active:scale-95 font-medium disabled:opacity-70 flex justify-center items-center gap-1"
                    >
                      {isSchedulingId === habit.id ? (
                        <>
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving
                        </>
                      ) : 'Save'}
                    </button>
                    {habit.reminderTime && (
                      <button 
                        onClick={() => handleClearReminder(habit.id, habit.name)}
                        disabled={isSchedulingId === habit.id}
                        className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 text-xs px-3 py-2 rounded transition-all active:scale-95 disabled:opacity-70"
                      >
                        Clear
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingReminderId(null)}
                      disabled={isSchedulingId === habit.id}
                      className="text-gray-400 hover:text-white px-3 py-2 bg-gray-800 rounded transition-all active:scale-95 text-xs disabled:opacity-70"
                    >
                      Cancel
                    </button>
                  </div>
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
