import React, { useState, useEffect } from 'react';
import MonthlyGoalCard from './MonthlyGoalCard';
import confetti from 'canvas-confetti';
import { getLocalYMD } from '../utils';

export default function MonthlyGoalsSection() {
  const [goals, setGoals] = useState([]);
  const [currentMonth, setCurrentMonth] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '', category: 'Body', target: '', unit: '', trackingType: 'count_toward', linkedHabitId: ''
  });
  const [availableHabits, setAvailableHabits] = useState([]);
  const [summaryData, setSummaryData] = useState(null); // { oldMonth, goals }

  useEffect(() => {
    // Load habits for linking
    const savedRitualsStr = localStorage.getItem('pinboard_rituals_data');
    if (savedRitualsStr) {
      try {
        const parsed = JSON.parse(savedRitualsStr);
        setAvailableHabits(parsed.habits || []);
      } catch (e) {}
    }

    // Load monthly goals
    loadData();
  }, []);

  const loadData = () => {
    const d = new Date();
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    let loadedData = { currentMonth: monthKey, goals: [] };
    const saved = localStorage.getItem('pinboard_monthly_goals');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.currentMonth === monthKey) {
          loadedData = parsed;
        } else if (parsed.currentMonth && parsed.goals && parsed.goals.length > 0) {
          // Month changed, show summary
          setSummaryData({ oldMonth: parsed.currentMonth, goals: parsed.goals });
          // Initialize empty for new month, we'll duplicate if they choose to
          loadedData = { currentMonth: monthKey, goals: [] };
        } else {
          loadedData = { currentMonth: monthKey, goals: [] };
        }
      } catch(e) {}
    }
    
    setGoals(loadedData.goals || []);
    setCurrentMonth(loadedData.currentMonth);
  };

  const handleDuplicateGoals = (goalsToDuplicate) => {
    const newGoals = goalsToDuplicate.map(g => ({
      ...g,
      id: `mg_${Date.now()}_${Math.random()}`,
      progress: 0,
      history: [],
      isCompleted: false
    }));
    saveData([...goals, ...newGoals]);
    setSummaryData(null);
  };

  const handleDismissSummary = () => {
    setSummaryData(null);
  };

  const saveData = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem('pinboard_monthly_goals', JSON.stringify({
      currentMonth,
      goals: newGoals
    }));
  };

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (!newGoal.name) return;

    const goal = {
      id: `mg_${Date.now()}`,
      name: newGoal.name,
      category: newGoal.category,
      target: parseFloat(newGoal.target) || 1,
      unit: newGoal.unit,
      trackingType: newGoal.trackingType,
      linkedHabitId: newGoal.linkedHabitId,
      progress: 0,
      history: [],
      isCompleted: false
    };

    saveData([...goals, goal]);
    setNewGoal({ name: '', category: 'Body', target: '', unit: '', trackingType: 'count_toward', linkedHabitId: '' });
    setIsAdding(false);
  };

  const handleLog = (id, amount) => {
    const todayStr = getLocalYMD();
    const newGoals = goals.map(g => {
      if (g.id !== id) return g;
      
      let newProgress = g.progress;
      let newHistory = [...g.history];
      
      if (g.trackingType === 'cumulative' || g.trackingType === 'count_toward') {
        newProgress += amount;
      } else if (g.trackingType === 'daily_log') {
        // Average or just storing
        // Soft method: average over days tracked
        const existingToday = newHistory.findIndex(h => h.date === todayStr);
        if (existingToday >= 0) {
          newHistory[existingToday].value = amount;
        } else {
          newHistory.push({ date: todayStr, value: amount });
        }
        
        // compute new progress (average)
        const sum = newHistory.reduce((acc, h) => acc + h.value, 0);
        newProgress = parseFloat((sum / newHistory.length).toFixed(1));
        
        // if user wants to hit target at least once, we can just say isCompleted if any day >= target
        // But let's assume progress is average and they need average >= target
      }

      // Append history for cumulative/count_toward
      if (g.trackingType !== 'daily_log') {
        const existingToday = newHistory.findIndex(h => h.date === todayStr);
        if (existingToday >= 0) {
          newHistory[existingToday].value += amount;
        } else {
          newHistory.push({ date: todayStr, value: amount });
        }
      }

      let isCompleted = false;
      if (g.trackingType === 'daily_log') {
        // Is any single day >= target? (Hard method fallback) or average? Let's use average for progress, but complete if any log >= target?
        // Let's use average >= target for completion.
        isCompleted = newProgress >= g.target;
      } else {
        isCompleted = newProgress >= g.target;
      }

      if (isCompleted && !g.isCompleted) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      return {
        ...g,
        progress: newProgress,
        history: newHistory,
        isCompleted
      };
    });
    saveData(newGoals);
  };

  const handleComplete = (id) => {
    const newGoals = goals.map(g => {
      if (g.id !== id) return g;
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      return {
        ...g,
        isCompleted: true,
        progress: g.target,
        history: [...g.history, { date: getLocalYMD(), value: 1 }]
      };
    });
    saveData(newGoals);
  };

  const handleUndo = (id) => {
    // Basic undo logic: remove last history entry, recalculate progress
    const todayStr = getLocalYMD();
    const newGoals = goals.map(g => {
      if (g.id !== id) return g;
      
      const newHistory = [...g.history];
      if (newHistory.length === 0) return g;

      const lastEntry = newHistory[newHistory.length - 1];
      if (lastEntry.date !== todayStr) return g; // Only allow undoing today's logs

      let newProgress = g.progress;
      if (g.trackingType === 'cumulative' || g.trackingType === 'count_toward') {
        // We don't know the exact "last log amount" if they logged multiple times today, so we just remove the entire day.
        // For better UX, we just remove the whole day.
        newProgress -= lastEntry.value;
        newHistory.pop();
      } else if (g.trackingType === 'daily_log') {
        newHistory.pop();
        if (newHistory.length > 0) {
          const sum = newHistory.reduce((acc, h) => acc + h.value, 0);
          newProgress = parseFloat((sum / newHistory.length).toFixed(1));
        } else {
          newProgress = 0;
        }
      }

      return {
        ...g,
        progress: Math.max(0, newProgress),
        history: newHistory,
        isCompleted: false
      };
    });
    saveData(newGoals);
  };

  return (
    <div className="w-full max-w-md pb-24">
      {summaryData && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 text-center border-b border-gray-800">
              <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                End of Month Summary
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Here's how you did in {summaryData.oldMonth}!
              </p>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1">
              <div className="flex flex-col gap-3">
                {summaryData.goals.map(g => (
                  <div key={g.id} className="bg-gray-800 border border-gray-700 p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className={`font-semibold ${g.isCompleted ? 'text-emerald-400' : 'text-gray-300'}`}>{g.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Total: {g.progress} / {g.target} {g.unit}</p>
                    </div>
                    <div>
                      {g.isCompleted ? (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md text-xs font-bold border border-emerald-500/30">HIT! 🎯</span>
                      ) : (
                        <span className="bg-gray-700 text-gray-400 px-2 py-1 rounded-md text-xs font-bold">Missed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-800 flex flex-col gap-2">
              <button 
                onClick={() => handleDuplicateGoals(summaryData.goals)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
              >
                Duplicate All to {currentMonth}
              </button>
              <button 
                onClick={handleDismissSummary}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition-all"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          Monthly Goals
        </h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-gray-700"
        >
          {isAdding ? 'Cancel' : '+ New Goal'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAddGoal} className="mb-6 bg-gray-800 p-5 rounded-xl border border-gray-700 animate-fade-in-down shadow-lg">
          <input 
            type="text" 
            placeholder="Goal Name (e.g. Read 500 Pages)" 
            required
            value={newGoal.name}
            onChange={e => setNewGoal({...newGoal, name: e.target.value})}
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:border-indigo-500 focus:outline-none"
          />
          
          <div className="flex gap-2 mb-3">
            <div className="w-1/2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Category</label>
              <select 
                value={newGoal.category}
                onChange={e => setNewGoal({...newGoal, category: e.target.value})}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="Body">Body</option>
                <option value="Performance">Performance</option>
                <option value="Learning">Learning</option>
                <option value="Life">Life</option>
              </select>
            </div>
            <div className="w-1/2">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Tracking Type</label>
              <select 
                value={newGoal.trackingType}
                onChange={e => setNewGoal({...newGoal, trackingType: e.target.value})}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value="count_toward">Count Toward</option>
                <option value="cumulative">Cumulative Total</option>
                <option value="daily_log">Daily Average Log</option>
                <option value="binary">Binary (Done/Not Done)</option>
              </select>
            </div>
          </div>

          {newGoal.trackingType !== 'binary' && (
            <div className="flex gap-2 mb-3">
              <div className="w-1/2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Target</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="any"
                  value={newGoal.target}
                  onChange={e => setNewGoal({...newGoal, target: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="w-1/2">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Unit</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. pages"
                  value={newGoal.unit}
                  onChange={e => setNewGoal({...newGoal, unit: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Link to Daily Ritual (Optional)</label>
            <select 
              value={newGoal.linkedHabitId}
              onChange={e => setNewGoal({...newGoal, linkedHabitId: e.target.value})}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- No link --</option>
              {availableHabits.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1 leading-tight">If linked, completing the daily ritual will automatically log progress here.</p>
          </div>
          
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-bold transition-all active:scale-95">
            Create Goal
          </button>
        </form>
      )}

      <div className="flex flex-col gap-4">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-16 h-16 text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <p className="text-sm font-medium">No monthly goals set.</p>
            <p className="text-xs mt-1">What do you want to achieve this month?</p>
          </div>
        ) : (
          goals.map(goal => (
            <MonthlyGoalCard 
              key={goal.id} 
              goal={goal} 
              onLog={handleLog} 
              onComplete={handleComplete} 
              onUndo={handleUndo} 
            />
          ))
        )}
      </div>
    </div>
  );
}
