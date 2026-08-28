import React, { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { syncStateToBackend } from '../utils';
import { saveNotification } from '../db';

export default function SettingsSection() {
  const [theme, setTheme] = useState(localStorage.getItem('pinboard_theme') || 'darker');
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem('pinboard_push_subscribed') === 'true'
  );
  
  const [dailyReviewTime, setDailyReviewTime] = useState(
    localStorage.getItem('pinboard_daily_review_time') || '20:00'
  );

  const [habits, setHabits] = useState([]);
  const [editingHabitId, setEditingHabitId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('pinboard_rituals_data');
    if (saved) {
      try { setHabits(JSON.parse(saved).habits || []); } catch (e) {}
    }
  }, []);

  const saveHabits = (newHabits) => {
    setHabits(newHabits);
    const existing = JSON.parse(localStorage.getItem('pinboard_rituals_data') || '{}');
    existing.habits = newHabits;
    localStorage.setItem('pinboard_rituals_data', JSON.stringify(existing));
    syncStateToBackend();
  };

  const handleReorder = (newOrder) => {
    saveHabits(newOrder);
  };
  
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('pinboard_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleDailyReviewTimeChange = (e) => {
    const val = e.target.value;
    setDailyReviewTime(val);
    localStorage.setItem('pinboard_daily_review_time', val);
    syncStateToBackend();
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      // Trying to enable
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationsEnabled(true);
          localStorage.setItem('pinboard_push_subscribed', 'true');
          syncStateToBackend();
        } else {
          alert('Notification permission denied by browser.');
        }
      } else {
        alert('Notifications are not supported in this browser.');
      }
    } else {
      // Trying to disable
      setNotificationsEnabled(false);
      localStorage.setItem('pinboard_push_subscribed', 'false');
      syncStateToBackend();
    }
  };

  const testNotification = async () => {
    if (Notification.permission === 'granted') {
      try {
        const reg = await navigator.serviceWorker.ready;
        const title = 'Test Notification';
        const body = 'This is a test notification from Pinboard Settings!';
        
        reg.showNotification(title, {
          body: body,
          icon: '/logo.jpg',
          vibrate: [200, 100, 200]
        });

        // Save it to the in-app drawer
        await saveNotification({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          title: title,
          body: body,
          type: 'summary',
          timestamp: Date.now(),
          read: false
        });
        
        // Notify App to update the bell
        window.dispatchEvent(new Event('notifications_read'));
        
      } catch (e) {
        console.error(e);
        alert('Database Error: ' + e.message);
      }
    } else {
      alert('Please enable notifications first.');
    }
  };

  const updateHabit = (id, updates) => {
    const newHabits = habits.map(h => h.id === id ? { ...h, ...updates } : h);
    saveHabits(newHabits);
  };

  const deleteHabit = (id) => {
    if (window.confirm('Delete this habit?')) {
      saveHabits(habits.filter(h => h.id !== id));
    }
  };

  const clearCompletedTasks = () => {
    const tasks = JSON.parse(localStorage.getItem('pinboard_tasks') || '[]');
    const newTasks = tasks.filter(t => !t.done);
    localStorage.setItem('pinboard_tasks', JSON.stringify(newTasks));
    syncStateToBackend();
    alert('Completed tasks cleared.');
  };

  const resetStreaks = () => {
    if (window.confirm('Are you sure you want to reset all streaks to 0?')) {
      const newHabits = habits.map(h => ({ ...h, streak: 0, count: 0, lastCompletedDate: null }));
      saveHabits(newHabits);
    }
  };

  const clearAllData = () => {
    if (window.confirm('WARNING: This will delete ALL data. Are you absolutely sure?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="w-full max-w-md flex flex-col gap-6 z-10 pb-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
      </div>

      {/* Notifications */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Notifications</h3>
        
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-medium">Master Toggle</span>
          <button 
            onClick={handleToggleNotifications}
            className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notificationsEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-medium">Daily Review Time</span>
          <input 
            type="time" 
            value={dailyReviewTime} 
            onChange={handleDailyReviewTimeChange}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500"
          />
        </div>

        <button 
          onClick={testNotification}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-indigo-400 font-bold rounded-lg transition-colors border border-gray-700"
        >
          Test Notification
        </button>
      </section>

      {/* Habits Management */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Rituals Management</h3>
        <p className="text-xs text-gray-500 mb-3">Drag to reorder. Tap a habit to edit.</p>
        
        {habits.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No rituals to manage.</p>
        ) : (
          <Reorder.Group axis="y" values={habits} onReorder={handleReorder} className="flex flex-col gap-3">
            {habits.map((habit) => (
              <Reorder.Item key={habit.id} value={habit} className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path></svg>
                    <span className="text-white font-medium">{habit.name}</span>
                  </div>
                  <button 
                    onClick={() => setEditingHabitId(editingHabitId === habit.id ? null : habit.id)}
                    className="text-xs text-indigo-400 font-bold px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    {editingHabitId === habit.id ? 'Close' : 'Edit'}
                  </button>
                </div>
                
                {editingHabitId === habit.id && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-gray-700 pt-3">
                    <input 
                      type="text" 
                      value={habit.name} 
                      onChange={(e) => updateHabit(habit.id, { name: e.target.value })}
                      placeholder="Habit name"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={habit.goal} 
                        onChange={(e) => updateHabit(habit.id, { goal: parseInt(e.target.value) || 1 })}
                        className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                      />
                      <input 
                        type="text" 
                        value={habit.unit} 
                        onChange={(e) => updateHabit(habit.id, { unit: e.target.value })}
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-300">Habit Reminder</span>
                      <button 
                        onClick={() => updateHabit(habit.id, { reminderEnabled: !habit.reminderEnabled })}
                        className={`w-10 h-5 rounded-full transition-colors relative ${habit.reminderEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${habit.reminderEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                    {habit.reminderEnabled && (
                      <input 
                        type="time" 
                        value={habit.reminderTime || '09:00'} 
                        onChange={(e) => updateHabit(habit.id, { reminderTime: e.target.value })}
                        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-indigo-500 self-end"
                      />
                    )}

                    <button 
                      onClick={() => deleteHabit(habit.id)}
                      className="mt-2 text-red-400 text-sm font-bold w-full text-center py-2 bg-red-500/10 rounded-lg hover:bg-red-500/20"
                    >
                      Delete Ritual
                    </button>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </section>

      {/* App Preferences */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">App</h3>
        
        <div className="mb-6">
          <span className="text-white font-medium block mb-2">Theme</span>
          <div className="flex gap-2">
            <button 
              onClick={() => handleThemeChange('dark')}
              className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${theme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
            >
              Dark
            </button>
            <button 
              onClick={() => handleThemeChange('darker')}
              className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${theme === 'darker' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
            >
              Darker
            </button>
            <button 
              onClick={() => handleThemeChange('amoled')}
              className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${theme === 'amoled' ? 'bg-indigo-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
            >
              AMOLED
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={clearCompletedTasks}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700"
          >
            Clear Completed Tasks
          </button>
          <button 
            onClick={resetStreaks}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-amber-400 font-medium rounded-lg transition-colors border border-gray-700"
          >
            Reset All Streaks
          </button>
          <button 
            onClick={clearAllData}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg transition-colors border border-red-500/20"
          >
            Clear All Data
          </button>
        </div>
      </section>

      {/* About */}
      <section className="flex flex-col items-center justify-center py-6 gap-2 opacity-60">
        <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg" />
        </div>
        <p className="text-sm font-bold text-white">Pinboard <span className="font-normal text-gray-400">v1.0.0</span></p>
        <p className="text-xs text-gray-500">Made for you 🌱</p>
      </section>

    </div>
  );
}
