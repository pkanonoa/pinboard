import React, { useState, useEffect } from 'react';
import { getLocalYMD, getUserStats } from '../utils';
import { getClosestBadgeProgress } from '../utils/badgeUtils';
import { getClosestBadgeProgress } from '../utils/badgeUtils';

const MOTIVATIONAL_QUOTES = [
  "Small steps every day.", "You are what you do consistently.", "Win the morning, win the day.",
  "Focus on the process.", "Progress, not perfection.", "Make it happen.",
  "One day at a time.", "Consistency is the key to success.", "Keep pushing forward.",
  "Every expert was once a beginner.", "Don't stop until you're proud.", "Believe you can.",
  "Action is the foundational key to success.", "Do it for your future self.", "Strive for progress.",
  "Dream big, start small.", "Make today count.", "Discipline equals freedom.",
  "Great things take time.", "Keep the momentum going.", "Your only limit is you.",
  "Stay focused, stay humble.", "Push yourself.", "Trust the process.",
  "Rise and grind.", "Be stronger than your excuses.", "The secret of getting ahead is getting started.",
  "You can and you will.", "Success is a series of small wins.", "Never give up on your goals."
];

export default function Dashboard({ setCurrentTab }) {
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [completionLog, setCompletionLog] = useState([]);
  const [completionLog, setCompletionLog] = useState([]);

  useEffect(() => {
    const savedTasks = localStorage.getItem('pinboard_tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }

    const savedRitualsStr = localStorage.getItem('pinboard_rituals_data');
    if (savedRitualsStr) {
      try {
        const savedData = JSON.parse(savedRitualsStr);
        setHabits(savedData.habits || []);
      } catch (e) {
        // ignore
      }
    }

    const logStr = localStorage.getItem('pinboard_completion_log');
    if (logStr) {
      try {
        setCompletionLog(JSON.parse(logStr));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const todayStr = getLocalYMD();

  useEffect(() => {
    // Only run this once on mount
    const savedTasks = JSON.parse(localStorage.getItem('pinboard_tasks') || '[]');
    const savedRituals = JSON.parse(localStorage.getItem('pinboard_rituals_data') || '{}');
    const h = savedRituals.habits || [];
    
    // Previous mascot logic was here
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once

  const completedTasksToday = tasks.filter(t => t.done && t.completedDate === todayStr).length;
  const habitsDoneToday = habits.filter(h => h.count >= h.goal && h.lastCompletedDate === todayStr).length;
  const bestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;

  const pendingTasks = tasks.filter(t => !t.done);
  
  // Tasks due today or overdue
  // But wait, what if they don't have a dueDate? Prompt says: "tasks due today or overdue".
  // To keep it simple, we can just show the first few pending tasks, prioritizing ones with due dates.
  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
  
  const displayTasks = sortedPendingTasks.slice(0, 3);
  const displayHabits = habits.slice(0, 3);

  // Compute this week's days (Mon - Sun)
  const getWeekDays = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(d.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      days.push(current);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Greeting & Quote
  const currentHour = new Date().getHours();
  let greeting = "Good evening";
  if (currentHour < 12) greeting = "Good morning";
  else if (currentHour < 18) greeting = "Good afternoon";

  const getDayOfYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };
  const quote = MOTIVATIONAL_QUOTES[getDayOfYear() % MOTIVATIONAL_QUOTES.length];

  // User Stats & Badge
  const stats = getUserStats();
  const badgeProgress = getClosestBadgeProgress();

  return (
    <div className="w-full max-w-md flex flex-col gap-6 z-10 pb-8">
      
      {/* Header Section */}
      <div className="flex flex-col mb-2">
        <div className="flex justify-between items-end mb-1">
          <h1 className="text-2xl font-bold text-white">{greeting}!</h1>
          <div className="flex items-center gap-1.5 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">{stats.currentLevel.name}</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400"></span>
            <span className="text-[10px] font-bold text-amber-400">{stats.points} pts</span>
          </div>
        </div>
        <p className="text-sm text-gray-400 italic">"{quote}"</p>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-3xl font-bold text-indigo-400 mb-1">{completedTasksToday}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Tasks Done</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-3xl font-bold text-emerald-400 mb-1">{habitsDoneToday}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Rituals Done</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-3xl font-bold text-amber-400 mb-1">{bestStreak}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Best Streak</span>
        </div>
      </div>

      {/* Today's Badge Progress */}
      {badgeProgress && (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-lg p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Next Badge in Sight</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center border border-gray-700 shadow-inner flex-shrink-0">
              {badgeProgress.badge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-end mb-1">
                <h3 className="text-white font-bold truncate">{badgeProgress.badge.name}</h3>
                <span className="text-xs text-amber-500 font-bold whitespace-nowrap ml-2">
                  {badgeProgress.current} / {badgeProgress.goal}
                </span>
              </div>
              <div className="w-full bg-gray-900 rounded-full h-2 mb-1 border border-gray-800">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-orange-400 h-2 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min(100, (badgeProgress.current / badgeProgress.goal) * 100)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500 truncate">{badgeProgress.unit} remaining</p>
            </div>
          </div>
        </div>
      )}

      {/* This Week Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-5">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          This Week
        </h2>
        
        <div className="flex justify-between items-center">
          {weekDays.map((date, i) => {
            const dateYMD = getLocalYMD(date);
            
            // Check completions for this date
            const dateLogs = completionLog.filter(log => {
              const logDate = new Date(log.timestamp);
              return getLocalYMD(logDate) === dateYMD;
            });
            
            const hasTask = dateLogs.some(log => log.type === 'task');
            const hasHabit = dateLogs.some(log => log.type === 'habit');
            const isCompleted = hasTask && hasHabit;
            const isToday = dateYMD === todayStr;

            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <span className={`text-[10px] font-semibold ${isToday ? 'text-indigo-400' : 'text-gray-500'}`}>
                  {dayNames[i]}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted 
                    ? 'bg-amber-400 border-amber-400 text-gray-900 shadow-[0_0_10px_rgba(251,191,36,0.3)]' 
                    : isToday 
                      ? 'border-indigo-400 bg-gray-800'
                      : 'border-gray-700 bg-gray-800'
                }`}>
                  {isCompleted && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Rituals Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Today's Rituals
          </h2>
          <button onClick={() => setCurrentTab('rituals')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
        </div>
        
        <div className="flex flex-col gap-3">
          {displayHabits.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-2">No rituals added yet.</p>
          ) : (
            displayHabits.map(habit => {
              const isDone = habit.count >= habit.goal && habit.lastCompletedDate === todayStr;
              const progress = isDone ? 100 : Math.min(100, Math.round((habit.count / habit.goal) * 100));
              
              return (
                <div key={habit.id} onClick={() => setCurrentTab('rituals')} className="bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-750 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`font-medium ${isDone ? 'text-gray-400 line-through' : 'text-white'}`}>{habit.name}</span>
                    <span className="text-xs text-gray-400 font-medium">{habit.count} / {habit.goal} {habit.unit}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pending Tasks Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
            </svg>
            Pending Tasks
          </h2>
          <button onClick={() => setCurrentTab('tasks')} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View All</button>
        </div>

        <div className="flex flex-col gap-2">
          {displayTasks.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-2">No pending tasks. You're caught up!</p>
          ) : (
            displayTasks.map(task => (
              <div key={task.id} onClick={() => setCurrentTab('tasks')} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                <div className="w-4 h-4 mt-0.5 rounded border border-gray-500 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium break-words leading-tight">{task.name}</p>
                  {task.dueDate && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {new Date(task.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
